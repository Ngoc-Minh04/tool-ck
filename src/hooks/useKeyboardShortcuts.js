import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      // Bỏ qua nếu đang gõ trong các ô nhập liệu
      const tag = e.target.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.target.isContentEditable) {
        return;
      }

      // Ctrl + K hoặc Meta + K để focus vào ô nhập mã cổ phiếu
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('ticker-input');
        if (input) {
          input.focus();
          input.select();
        }
      }

      // Escape để hủy focus
      if (e.key === 'Escape') {
        if (document.activeElement) {
          document.activeElement.blur();
        }
      }

      // Phím số 1-5 để chuyển đổi trang nhanh
      if (e.key === '1') navigate('/analyze');
      if (e.key === '2') navigate('/market');
      if (e.key === '3') navigate('/chat');
      if (e.key === '4') navigate('/history');
      if (e.key === '5') navigate('/watchlist');
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}

export default useKeyboardShortcuts;
