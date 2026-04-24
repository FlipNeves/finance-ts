import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './ChatWidget.css';

interface ParsedTransaction {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category?: string;
  date?: string;
  bankAccount?: string;
  confidence: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'bot' | 'error';
  text: string;
  parsed?: ParsedTransaction;
  source?: 'regex' | 'llm' | 'none';
  confirmed?: boolean;
  alert?: string;
}

function buildContext(messages: ChatMessage[], limit = 10): { role: string; content: string }[] {
  return messages.slice(-limit).map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.text,
  }));
}

const ChatWidget: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingParsed, setPendingParsed] = useState<ParsedTransaction | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const genId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id'>) => {
    setMessages((prev) => [...prev, { ...msg, id: genId() }]);
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => 
      prev.map(m => m.parsed && !m.confirmed ? { ...m, confirmed: true } : m)
    );
    setPendingParsed(null);

    addMessage({ role: 'user', text });
    setInput('');
    setLoading(true);

    try {
      const context = buildContext(messages);
      const { data } = await api.post('/chat/parse', {
        message: text,
        language: i18n.language,
        context,
      });

      if (data.success && data.parsed) {
        if (data.skipConfirmation) {
          await handleConfirm(data.parsed);
        } else {
          addMessage({
            role: 'bot',
            text: data.message,
            parsed: data.parsed,
            source: data.source,
          });
          setPendingParsed(data.parsed);
        }
      } else {
        addMessage({ role: 'error', text: data.message });
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429) {
        addMessage({ role: 'error', text: t('chat.rateLimitError') });
      } else {
        addMessage({ role: 'error', text: t('chat.genericError') });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (parsed?: ParsedTransaction, msgId?: string) => {
    const data = parsed || pendingParsed;
    if (!data) return;

    setLoading(true);
    setPendingParsed(null);

    if (msgId) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, confirmed: true } : m));
    }

    try {
      const { data: result } = await api.post('/chat/confirm', {
        type: data.type,
        amount: data.amount,
        description: data.description,
        category: data.category || 'Other',
        date: data.date || new Date().toISOString(),
        bankAccount: data.bankAccount || undefined,
        language: i18n.language,
      });

      addMessage({
        role: 'bot',
        text: result.message,
        confirmed: true,
        alert: result.alert,
      });

      if (result.bankAccountCreated) {
        addMessage({
          role: 'bot',
          text: t('chat.bankAccountCreated', { account: data.bankAccount }),
        });
      }
    } catch {
      if (msgId) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, confirmed: false } : m));
      }
      addMessage({ role: 'error', text: t('chat.saveError') });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (msgId?: string) => {
    setPendingParsed(null);
    if (msgId) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, confirmed: true } : m));
    }
    addMessage({ role: 'bot', text: t('chat.cancelled') });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) return null;

  return (
    <>
      <button
        className={`chat-fab ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? t('chat.close') : t('chat.open')}
        id="chat-fab-button"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      <div className={`chat-window ${isOpen ? 'open' : ''}`} id="chat-window">
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-header-text">
              <h4>{t('chat.title')}</h4>
              <span>{t('chat.subtitle')}</span>
            </div>
          </div>
          <button
            className="chat-header-close"
            onClick={() => setIsOpen(false)}
            aria-label={t('chat.close')}
          >
            ✕
          </button>
        </div>

        <div className="chat-messages" id="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <div className="chat-welcome-icon">💰</div>
              <p>{t('chat.welcomeMessage')}</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id}>
              <div className={`chat-bubble ${msg.role}`}>
                <span style={{ whiteSpace: 'pre-line' }}>{msg.text}</span>

                {msg.source && msg.source !== 'none' && (
                  <div className={`chat-source-badge ${msg.source}`}> </div>
                )}

                {msg.parsed && !msg.confirmed && (
                  <div className="chat-confirm-actions">
                    <button
                      className="chat-confirm-btn primary"
                      onClick={() => handleConfirm(msg.parsed, msg.id)}
                      disabled={loading}
                    >
                      ✅ {t('common.confirm')}
                    </button>
                    <button
                      className="chat-confirm-btn danger"
                      onClick={() => handleCancel(msg.id)}
                      disabled={loading}
                    >
                      ❌ {t('common.cancel')}
                    </button>
                  </div>
                )}
              </div>

              {msg.alert && (
                <div className="chat-alert">⚠️ {msg.alert}</div>
              )}
            </div>
          ))}

          {loading && (
            <div className="chat-typing">
              <span />
              <span />
              <span />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <input
            ref={inputRef}
            className="chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.inputPlaceholder')}
            disabled={loading}
            id="chat-input-field"
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            aria-label={t('chat.send')}
            id="chat-send-button"
          >
            ➤
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatWidget;
