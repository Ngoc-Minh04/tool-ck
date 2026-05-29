from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
import httpx
import asyncio
import os
import json
from app.config import settings
from loguru import logger

router = APIRouter()

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


def _get_key_and_provider(client_key: str = "") -> tuple[str, str]:
    """Trả về (API_KEY, PROVIDER) dựa trên cấu trúc key."""
    key = client_key.strip() if client_key else ""
    
    if key:
        if key.startswith("AIzaSy"):
            return key, "gemini"
        elif key.startswith("sk-ant-"):
            return key, "claude"
        elif key.startswith("sk-"):
            return key, "openai"
        else:
            return key, "claude"
            
    # Fallback to backend settings
    if settings.ANTHROPIC_API_KEY and len(settings.ANTHROPIC_API_KEY) > 15 and not settings.ANTHROPIC_API_KEY.startswith("sk-ant-api03-"):
        return settings.ANTHROPIC_API_KEY, "claude"
    if settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 15:
        return settings.GEMINI_API_KEY, "gemini"
    if settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY) > 15:
        return settings.OPENAI_API_KEY, "openai"
        
    return settings.ANTHROPIC_API_KEY, "claude"


def _get_claude_headers(key: str) -> dict:
    return {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
    }


async def _call_gemini(key: str, body: dict, stream: bool):
    keys = [k.strip() for k in key.split(",") if k.strip()]
    if not keys:
        keys = [key]

    body_model = body.get("model", "")
    if "gemini-" in body_model:
        gemini_model = body_model
        if gemini_model == "gemini-3.0-flash":
            gemini_model = "gemini-3-flash-preview"
        elif gemini_model == "gemini-1.5-flash":
            gemini_model = "gemini-flash-latest"
    else:
        # Fallback mapping for Claude models when using Gemini API Key
        gemini_model = "gemini-2.5-flash"
        if "haiku" in body_model:
            gemini_model = "gemini-2.5-flash"
        elif "sonnet" in body_model:
            gemini_model = "gemini-2.5-flash"
        elif "opus" in body_model:
            gemini_model = "gemini-3.5-flash"

    gemini_body = {
        "contents": [],
    }
    if body.get("google_search", False):
        gemini_body["tools"] = [{"google_search": {}}]
    if body.get("system"):
        gemini_body["systemInstruction"] = {
            "parts": [{"text": body.get("system")}]
        }
    
    for msg in body.get("messages", []):
        role = "user" if msg.get("role") == "user" else "model"
        parts = []
        if msg.get("image"):
            img_data = msg["image"].get("base64", "")
            img_type = msg["image"].get("mimeType", "image/png")
            if "," in img_data:
                img_data = img_data.split(",")[1]
            if img_data:
                parts.append({
                    "inlineData": {
                        "mimeType": img_type,
                        "data": img_data
                    }
                })
        content_text = msg.get("content", "")
        if content_text or not parts:
            parts.append({"text": content_text})
            
        gemini_body["contents"].append({
            "role": role,
            "parts": parts
        })

    if stream:
        async def event_stream():
            async with httpx.AsyncClient(timeout=120) as client:
                for attempt in range(3):
                    curr_key = keys[attempt % len(keys)]
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:streamGenerateContent?alt=sse&key={curr_key}"
                    try:
                        async with client.stream("POST", url, json=gemini_body) as r:
                            if r.status_code == 503:
                                if attempt == 2:
                                    logger.error(f"[Stream] Gemini 503 overload failed after 3 attempts.")
                                    yield f"data: {json.dumps({'type': 'content_block_delta', 'delta': {'type': 'text_delta', 'text': 'Google Gemini API hiện tại đang quá tải (503). Vui lòng thử lại sau.'}})}\n\n".encode("utf-8")
                                    yield b"data: [DONE]\n\n"
                                    return
                                logger.warning(f"[Stream Attempt {attempt+1}] Gemini 503 overload. Retrying in {attempt+1}s...")
                                await asyncio.sleep(attempt + 1)
                                continue

                            if r.status_code == 429:
                                if attempt == 2:
                                    logger.error(f"[Stream] Gemini 429 rate limit exceeded. Failed after 3 attempts.")
                                    yield f"data: {json.dumps({'type': 'content_block_delta', 'delta': {'type': 'text_delta', 'text': 'Giới hạn lượt gọi API Gemini đã hết (429). Vui lòng thử lại sau vài giây.'}})}\n\n".encode("utf-8")
                                    yield b"data: [DONE]\n\n"
                                    return
                                next_key = keys[(attempt + 1) % len(keys)]
                                sleep_time = 1 if next_key != curr_key else 6
                                logger.warning(f"[Stream Attempt {attempt+1}] Gemini 429 rate limit. Retrying in {sleep_time}s...")
                                await asyncio.sleep(sleep_time)
                                continue

                            if r.status_code != 200:
                                err_content = await r.aread()
                                logger.error(f"Gemini API returned status {r.status_code}: {err_content.decode('utf-8', errors='ignore')}")
                                yield f"data: {json.dumps({'type': 'content_block_delta', 'delta': {'type': 'text_delta', 'text': f'Lỗi kết nối Gemini API ({r.status_code}).'}})}\n\n".encode("utf-8")
                                yield b"data: [DONE]\n\n"
                                return

                            buffer = ""
                            async for chunk in r.aiter_text():
                                buffer += chunk
                                while "\n" in buffer:
                                    line, buffer = buffer.split("\n", 1)
                                    line = line.strip()
                                    if not line.startswith("data: "):
                                        continue
                                    data_str = line[6:].strip()
                                    try:
                                        data_json = json.loads(data_str)
                                        text_delta = data_json["candidates"][0]["content"]["parts"][0]["text"]
                                        yield f"data: {json.dumps({'type': 'content_block_delta', 'delta': {'type': 'text_delta', 'text': text_delta}})}\n\n".encode("utf-8")
                                    except Exception:
                                        pass
                            break
                    except Exception as e:
                        if attempt == 2:
                            logger.error(f"Stream failed after 3 attempts: {e}")
                            yield f"data: {json.dumps({'type': 'content_block_delta', 'delta': {'type': 'text_delta', 'text': f'Lỗi kết nối máy chủ: {str(e)}'}})}\n\n".encode("utf-8")
                            yield b"data: [DONE]\n\n"
                            return
                        await asyncio.sleep(attempt + 1)
            yield b"data: [DONE]\n\n"
        return StreamingResponse(event_stream(), media_type="text/event-stream")
    else:
        async with httpx.AsyncClient(timeout=60) as client:
            for attempt in range(3):
                curr_key = keys[attempt % len(keys)]
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={curr_key}"
                try:
                    r = await client.post(url, json=gemini_body)
                    res_json = r.json()
                    if r.status_code == 503:
                        if attempt == 2:
                            logger.error(f"Gemini 503 overload failed after 3 attempts.")
                            from fastapi.responses import JSONResponse
                            return JSONResponse(
                                status_code=503,
                                content={"error": {"message": "Google Gemini API hiện tại đang quá tải (503). Vui lòng thử lại sau."}}
                            )
                        logger.warning(f"[Attempt {attempt+1}] Gemini 503 overload. Retrying in {attempt+1}s...")
                        await asyncio.sleep(attempt + 1)
                        continue

                    if r.status_code == 429:
                        if attempt == 2:
                            logger.error(f"Gemini 429 rate limit exceeded. Failed after 3 attempts.")
                            from fastapi.responses import JSONResponse
                            return JSONResponse(
                                status_code=429,
                                content={"error": {"message": "Giới hạn lượt gọi API Gemini đã hết (429). Vui lòng thử lại sau vài giây."}}
                            )
                        next_key = keys[(attempt + 1) % len(keys)]
                        sleep_time = 1 if next_key != curr_key else 6
                        logger.warning(f"[Attempt {attempt+1}] Gemini 429 rate limit. Retrying in {sleep_time}s...")
                        await asyncio.sleep(sleep_time)
                        continue

                    if r.status_code != 200:
                        logger.error(f"Gemini API returned status {r.status_code}: {res_json}")
                        from fastapi.responses import JSONResponse
                        return JSONResponse(
                            status_code=r.status_code,
                            content={"error": {"message": res_json.get("error", {}).get("message", "Lỗi dịch vụ Gemini AI")}}
                        )
                    break
                except Exception as e:
                    if attempt == 2:
                        logger.error(f"Failed after 3 attempts: {e}")
                        return {"error": f"Gemini API Error: {str(e)}", "raw": {}}
                    await asyncio.sleep(attempt + 1)
            try:
                text = res_json["candidates"][0]["content"]["parts"][0]["text"]
                return {
                    "content": [{"type": "text", "text": text}],
                    "role": "assistant"
                }
            except Exception as e:
                logger.error(f"Gemini parse error: {res_json}")
                return {"error": f"Gemini Parse Error: {str(e)}", "raw": res_json}


async def _call_openai(key: str, body: dict, stream: bool):
    openai_model = "gpt-4o-mini"
    body_model = body.get("model", "")
    if "haiku" in body_model:
        openai_model = "gpt-4o-mini"
    elif "opus" in body_model or "sonnet" in body_model:
        openai_model = "gpt-4o"

    openai_body = {
        "model": openai_model,
        "messages": [],
        "stream": stream
    }
    
    if body.get("system"):
        openai_body["messages"].append({
            "role": "system",
            "content": body.get("system")
        })
    
    for msg in body.get("messages", []):
        role = msg.get("role")
        if msg.get("image"):
            img_data = msg["image"].get("base64", "")
            img_type = msg["image"].get("mimeType", "image/png")
            if img_data:
                if not img_data.startswith("data:"):
                    img_data = f"data:{img_type};base64,{img_data}"
                openai_body["messages"].append({
                    "role": role,
                    "content": [
                        {"type": "text", "text": msg.get("content", "")},
                        {"type": "image_url", "image_url": {"url": img_data}}
                    ]
                })
        else:
            openai_body["messages"].append({
                "role": role,
                "content": msg.get("content", "")
            })

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}"
    }
    url = "https://api.openai.com/v1/chat/completions"

    if stream:
        async def event_stream():
            async with httpx.AsyncClient(timeout=120) as client:
                async with client.stream("POST", url, headers=headers, json=openai_body) as r:
                    buffer = ""
                    async for chunk in r.aiter_text():
                        buffer += chunk
                        while "\n" in buffer:
                            line, buffer = buffer.split("\n", 1)
                            line = line.strip()
                            if not line.startswith("data: "):
                                continue
                            data_str = line[6:].strip()
                            if data_str == "[DONE]":
                                continue
                            try:
                                data_json = json.loads(data_str)
                                text_delta = data_json["choices"][0]["delta"].get("content", "")
                                if text_delta:
                                    yield f"data: {json.dumps({'type': 'content_block_delta', 'delta': {'type': 'text_delta', 'text': text_delta}})}\n\n".encode("utf-8")
                            except Exception:
                                pass
            yield b"data: [DONE]\n\n"
        return StreamingResponse(event_stream(), media_type="text/event-stream")
    else:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(url, headers=headers, json=openai_body)
            res_json = r.json()
            try:
                text = res_json["choices"][0]["message"]["content"]
                return {
                    "content": [{"type": "text", "text": text}],
                    "role": "assistant"
                }
            except Exception as e:
                logger.error(f"OpenAI error response: {res_json}")
                return {"error": f"OpenAI API Error: {str(e)}", "raw": res_json}


def _format_claude_messages(body: dict) -> list:
    """Format messages to Anthropic's expected multimodal structure if images are present."""
    claude_messages = []
    for msg in body.get("messages", []):
        role = msg.get("role")
        if msg.get("image"):
            img_data = msg["image"].get("base64", "")
            img_type = msg["image"].get("mimeType", "image/png")
            if "," in img_data:
                img_data = img_data.split(",")[1]
            if img_data:
                claude_messages.append({
                    "role": role,
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": img_type,
                                "data": img_data
                            }
                        },
                        {
                            "type": "text",
                            "text": msg.get("content", "")
                        }
                    ]
                })
        else:
            claude_messages.append({
                "role": role,
                "content": msg.get("content", "")
            })
    return claude_messages


def _get_smart_cache_ttl() -> int:
    """
    Tính toán thời gian cache thông minh dựa trên thời gian giao dịch của VN:
    - Trong giờ giao dịch (Thứ 2 - Thứ 6, từ 9h00 đến 15h00): Cache 4 giờ (14400s)
    - Ngoài giờ giao dịch & Cuối tuần: Cache 24 giờ (86400s)
    """
    import datetime
    now = datetime.datetime.now()
    day = now.weekday()  # 0=T2, ..., 4=T6, 5=T7, 6=CN
    
    # Kiểm tra cuối tuần (Thứ Bảy, Chủ Nhật)
    if day >= 5:
        return 86400  # 24 giờ
        
    # Kiểm tra giờ giao dịch (9h00 đến 15h00)
    time_in_minutes = now.hour * 60 + now.minute
    is_trading_hours = 540 <= time_in_minutes <= 900
    
    if is_trading_hours:
        return 14400  # 4 giờ
        
    return 86400  # 24 giờ


@router.post("/analyze")
async def analyze(request: Request):
    """Proxy endpoint cho AI analysis — tự động nhận diện và định tuyến tới Claude, Gemini hoặc ChatGPT."""
    body = await request.json()
    client_key = request.headers.get("x-api-key", "")
    key, provider = _get_key_and_provider(client_key)
    stream = body.get("stream", False)

    # 1. Kiểm tra cache cho các yêu cầu không stream để tiết kiệm lượt gọi AI
    cache_key = None
    if not stream:
        import hashlib
        from app.services.cache_service import cache_get, cache_set
        hash_input = f"{body.get('system', '')}:{json.dumps(body.get('messages', []))}"
        cache_hash = hashlib.md5(hash_input.encode("utf-8")).hexdigest()
        cache_key = f"ai_analysis:{cache_hash}"
        cached_result = await cache_get(cache_key)
        if cached_result:
            logger.info("AI Analysis Cache HIT! Trả về kết quả phân tích cũ từ cache.")
            return cached_result

    # 2. Xử lý gọi API thực tế
    res_data = None
    if provider == "gemini":
        res_data = await _call_gemini(key, body, stream)
    elif provider == "openai":
        res_data = await _call_openai(key, body, stream)
    else:
        headers = _get_claude_headers(key)
        
        # Map model name to valid Anthropic model identifier
        body_model = body.get("model", "")
        claude_model = "claude-3-5-sonnet-20241022"
        if "haiku" in body_model:
            claude_model = "claude-3-5-haiku-20241022"
        elif "opus" in body_model:
            claude_model = "claude-3-opus-20240229"
        elif "sonnet" in body_model:
            claude_model = "claude-3-5-sonnet-20241022"
        body["model"] = claude_model
        body["messages"] = _format_claude_messages(body)

        if stream:
            async def event_stream():
                async with httpx.AsyncClient(timeout=120) as client:
                    async with client.stream("POST", ANTHROPIC_URL,
                                             headers=headers, json=body) as r:
                        async for chunk in r.aiter_bytes():
                            yield chunk
            return StreamingResponse(event_stream(), media_type="text/event-stream")
        else:
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.post(ANTHROPIC_URL, headers=headers, json=body)
                if r.status_code != 200:
                    from fastapi.responses import JSONResponse
                    try:
                        err_json = r.json()
                        return JSONResponse(status_code=r.status_code, content=err_json)
                    except Exception:
                        return JSONResponse(status_code=r.status_code, content={"error": {"message": r.text}})
                res_data = r.json()

    # 3. Lưu vào cache nếu cuộc gọi thành công và không phải stream
    if cache_key and res_data and isinstance(res_data, dict) and "error" not in res_data:
        from app.services.cache_service import cache_set
        # Cache thông minh
        ttl = _get_smart_cache_ttl()
        await cache_set(cache_key, res_data, ttl=ttl)
        logger.info(f"AI Analysis Cached. TTL: {ttl} seconds.")

    return res_data




@router.post("/chat")
async def chat(request: Request):
    """Proxy endpoint cho AI chat — tự động định tuyến tới Claude, Gemini hoặc ChatGPT."""
    body = await request.json()
    client_key = request.headers.get("x-api-key", "")
    key, provider = _get_key_and_provider(client_key)

    if provider == "gemini":
        return await _call_gemini(key, body, True)
    elif provider == "openai":
        return await _call_openai(key, body, True)
    else:
        headers = _get_claude_headers(key)
        
        # Map model name to valid Anthropic model identifier
        body_model = body.get("model", "")
        claude_model = "claude-3-5-sonnet-20241022"
        if "haiku" in body_model:
            claude_model = "claude-3-5-haiku-20241022"
        elif "opus" in body_model:
            claude_model = "claude-3-opus-20240229"
        elif "sonnet" in body_model:
            claude_model = "claude-3-5-sonnet-20241022"
        body["model"] = claude_model
        body["messages"] = _format_claude_messages(body)

        async def event_stream():
            async with httpx.AsyncClient(timeout=120) as client:
                async with client.stream("POST", ANTHROPIC_URL,
                                         headers=headers,
                                         json={**body, "stream": True}) as r:
                    async for chunk in r.aiter_bytes():
                        yield chunk
        return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/test-key")
async def test_key(request: Request):
    """Kiểm tra tính hợp lệ của API Key đối với nhà cung cấp tương ứng (Claude, Gemini, ChatGPT)."""
    try:
        body = await request.json()
        client_key = body.get("apiKey", "")
        key, provider = _get_key_and_provider(client_key)
        
        if not key:
            return {"ok": False, "error": "Chưa cung cấp API Key"}
            
        if provider == "gemini":
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
            test_body = {"contents": [{"parts": [{"text": "Ping"}]}]}
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(url, json=test_body)
                if r.status_code == 200:
                    return {"ok": True}
                else:
                    return {"ok": False, "status_code": r.status_code, "detail": r.text}
                    
        elif provider == "openai":
            url = "https://api.openai.com/v1/chat/completions"
            test_body = {
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "Ping"}],
                "max_tokens": 1
            }
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {key}"
            }
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(url, headers=headers, json=test_body)
                if r.status_code == 200:
                    return {"ok": True}
                else:
                    return {"ok": False, "status_code": r.status_code, "detail": r.text}
                    
        else:
            headers = _get_claude_headers(key)
            test_body = {
                "model": "claude-3-5-haiku-20241022",
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "Ping"}]
            }
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(ANTHROPIC_URL, headers=headers, json=test_body)
                if r.status_code == 200:
                    return {"ok": True}
                else:
                    return {"ok": False, "status_code": r.status_code, "detail": r.text}
                    
    except Exception as e:
        return {"ok": False, "error": str(e)}
