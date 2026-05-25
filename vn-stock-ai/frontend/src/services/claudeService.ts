const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

/**
 * Gọi Claude thông qua backend proxy.
 * API key được lưu ở backend/.env — frontend không bao giờ chứa key.
 * Giữ nguyên signature để không break các callers hiện tại.
 */
export async function callClaude(
  userMessage: string,
  systemPrompt: string,
  history: Array<{ role: string; content: string }> = [],
  apiKey: string,
  model = 'claude-sonnet-4-5',
  onStream?: (chunk: string) => void
): Promise<string> {
  const messages = [
    ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user' as const, content: userMessage },
  ]

  const body = {
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
    stream: !!onStream,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }

  if (onStream) {
    const res = await fetch(`${BACKEND}/claude/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Backend error ${res.status}: ${errText}`)
    }
    return await handleStream(res, onStream)
  } else {
    const res = await fetch(`${BACKEND}/claude/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Backend error ${res.status}: ${errText}`)
    }
    const data = await res.json()
    return data.content?.map((b: any) => b.text || '').join('') || ''
  }
}

async function handleStream(res: Response, onChunk: (chunk: string) => void): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')
  const decoder = new TextDecoder()
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value, { stream: true })
    const lines = text.split('\n')
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data)
        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
          const chunk = json.delta.text
          full += chunk
          onChunk(chunk)
        }
      } catch { /* skip parse errors */ }
    }
  }
  return full
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND}/claude/test-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    })
    if (!res.ok) return false
    const data = await res.json()
    return !!data.ok
  } catch {
    return false
  }
}
