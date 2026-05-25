// ===== TRANG CÀI ĐẶT =====

import { useState } from 'react';
import { Eye, EyeOff, Save, Key, Cpu, Globe, Moon, Sun, RefreshCw } from 'lucide-react';
import Header from '../components/Layout/Header';
import { Button, Divider } from '../components/UI';
import useAppStore from '../store/appStore';
import { MODELS, DATA_SOURCES } from '../constants/sources';
import toast from 'react-hot-toast';

const SettingsSection = ({ icon: Icon, title, children }) => (
  <div className="glass-card p-5 space-y-4">
    <div className="flex items-center gap-2">
      <Icon size={16} className="text-cyan-400" />
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
    </div>
    {children}
  </div>
);

const SettingsPage = () => {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const toggleSource = useAppStore((s) => s.toggleSource);

  const [localApiKey, setLocalApiKey] = useState(settings.apiKey || '');
  const [showKey, setShowKey] = useState(false);

  const handleSaveApiKey = () => {
    updateSettings({ apiKey: localApiKey.trim() });
    toast.success('Đã lưu API Key!');
  };

  const handleResetSources = () => {
    updateSettings({ sources: DATA_SOURCES });
    toast.success('Đã đặt lại nguồn mặc định');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Cài đặt" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-5">
          {/* API Key */}
          <SettingsSection icon={Key} title="Anthropic API Key">
            <div>
              <label className="text-xs text-slate-500 block mb-2">
                API Key (từ{' '}
                <a
                  href="https://console.anthropic.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  console.anthropic.com
                </a>
                )
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={localApiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="input-dark pr-10"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 cursor-pointer border-none bg-transparent"
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <Button onClick={handleSaveApiKey} icon={Save}>
                  Lưu
                </Button>
              </div>
              {settings.apiKey ? (
                <p className="text-xs text-green-400 mt-2">✅ API Key đã được cấu hình</p>
              ) : (
                <p className="text-xs text-yellow-400 mt-2">⚠️ Chưa có API Key - Phân tích AI sẽ không hoạt động</p>
              )}
            </div>
          </SettingsSection>

          {/* Model */}
          <SettingsSection icon={Cpu} title="Model AI">
            <div className="space-y-2">
              {MODELS.map((model) => (
                <label
                  key={model.value}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: settings.model === model.value ? 'rgba(79,195,247,0.1)' : 'rgba(13,27,42,0.5)',
                    border: `1px solid ${settings.model === model.value ? 'rgba(79,195,247,0.3)' : 'rgba(79,195,247,0.08)'}`,
                  }}
                >
                  <input
                    type="radio"
                    name="model"
                    value={model.value}
                    checked={settings.model === model.value}
                    onChange={() => updateSettings({ model: model.value })}
                    className="accent-cyan-400"
                  />
                  <div>
                    <div className="text-sm text-slate-200 font-medium">{model.label}</div>
                    <div className="text-xs text-slate-500">{model.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </SettingsSection>

          {/* Nguồn dữ liệu */}
          <SettingsSection icon={Globe} title="Nguồn dữ liệu mặc định">
            <div className="space-y-2">
              {settings.sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between p-3 rounded-lg transition-all"
                  style={{
                    background: source.enabled ? `${source.color}0a` : 'rgba(13,27,42,0.5)',
                    border: `1px solid ${source.enabled ? source.color + '30' : 'rgba(79,195,247,0.08)'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: source.enabled ? source.color : '#4a6b8a' }}
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-200">{source.name}</div>
                      <div className="text-xs text-slate-500">{source.description}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSource(source.id)}
                    className="relative inline-flex items-center cursor-pointer border-none bg-transparent"
                  >
                    <div
                      className="w-10 h-5 rounded-full transition-all duration-200"
                      style={{ background: source.enabled ? source.color : '#1a2f45', border: '1px solid rgba(79,195,247,0.1)' }}
                    >
                      <div
                        className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
                        style={{
                          background: '#fff',
                          left: source.enabled ? '22px' : '2px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }}
                      />
                    </div>
                  </button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={handleResetSources} icon={RefreshCw}>
                Đặt lại mặc định
              </Button>
            </div>
          </SettingsSection>

          {/* Theme */}
          <SettingsSection icon={Moon} title="Giao diện">
            <div className="flex gap-3">
              {[
                { value: 'dark', label: 'Tối', icon: Moon },
                { value: 'light', label: 'Sáng (sắp ra mắt)', icon: Sun, disabled: true },
              ].map(({ value, label, icon: Icon, disabled }) => (
                <button
                  key={value}
                  disabled={disabled}
                  onClick={() => !disabled && updateSettings({ theme: value })}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg cursor-pointer border-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: settings.theme === value ? 'rgba(79,195,247,0.15)' : 'rgba(13,27,42,0.5)',
                    border: `1px solid ${settings.theme === value ? 'rgba(79,195,247,0.4)' : 'rgba(79,195,247,0.08)'}`,
                    color: settings.theme === value ? '#4fc3f7' : '#64748b',
                  }}
                >
                  <Icon size={14} />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </SettingsSection>

          {/* Thông tin */}
          <div className="text-center text-xs text-slate-600 pt-2">
            VN Stock AI Analyzer v1.0.0 · Powered by Claude AI · Dữ liệu mock cho demo
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
