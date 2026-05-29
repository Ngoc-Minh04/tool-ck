// ===== HOOK: CLAUDE AI =====
// Wrapper hook để gọi Claude API với state management

import { useState, useCallback } from 'react';
import { callClaude, parseClaudeError } from '../services/claudeService';
import useAppStore from '../store/appStore';
import toast from 'react-hot-toast';

const useClaude = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const settings = useAppStore((s) => s.settings);

  /**
   * Gọi Claude để phân tích một prompt đơn lẻ
   */
  const analyze = useCallback(
    async ({ systemPrompt, userPrompt, bypassCache = false, onSuccess, onError }) => {
      setLoading(true);
      setError(null);

      try {
        const result = await callClaude({
          apiKey: settings.apiKey, // truyền key nếu có, nếu không backend sẽ tự động dùng key của backend
          model: settings.model,
          systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          maxTokens: 4096,
          googleSearch: settings.googleSearch,
          bypassCache,

        if (onSuccess) onSuccess(result);
        return result;
      } catch (err) {
        const friendlyMsg = parseClaudeError(err);
        setError(friendlyMsg);
        toast.error(friendlyMsg, { duration: 5000 });
        if (onError) onError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [settings.apiKey, settings.model, settings.googleSearch]
  );

  /**
   * Gọi Claude với đa lượt hội thoại (chat)
   */
  const chat = useCallback(
    async ({ systemPrompt, messages, onSuccess, onError }) => {
      setLoading(true);
      setError(null);

      try {
        const result = await callClaude({
          apiKey: settings.apiKey, // truyền key nếu có, nếu không backend sẽ tự động dùng key của backend
          model: settings.model,
          systemPrompt,
          messages,
          maxTokens: 2048,
          googleSearch: settings.googleSearch,
        });

        if (onSuccess) onSuccess(result);
        return result;
      } catch (err) {
        const friendlyMsg = parseClaudeError(err);
        setError(friendlyMsg);
        toast.error(friendlyMsg, { duration: 5000 });
        if (onError) onError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [settings.apiKey, settings.model, settings.googleSearch]
  );

  return { loading, error, analyze, chat, clearError: () => setError(null) };
};

export default useClaude;
