import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import './MessageModal.css';

interface MessageModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  isConfirmRequired: boolean;
  isDestructive?: boolean;
}

export default function MessageModal({
  isOpen,
  title,
  message,
  onClose,
  onConfirm,
  isConfirmRequired,
  isDestructive,
}: MessageModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const accent = isDestructive ? 'var(--danger)' : 'var(--primary)';

  return createPortal(
    <div className="msg-overlay" onClick={onClose}>
      <div className="msg-container" onClick={(e) => e.stopPropagation()}>
        <div className="msg-accent" style={{ background: accent }} />
        <header className="msg-header">
          <span className="msg-eyebrow" style={{ color: accent }}>
            {isDestructive ? '!  Attention' : '·  Notice'}
          </span>
          <button className="msg-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <h2 className="msg-title">{title}</h2>
        <p className="msg-text">{message}</p>
        <footer className="msg-footer">
          {isConfirmRequired ? (
            <>
              <button className="btn btn-outline" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button
                className={isDestructive ? 'btn btn-danger' : 'btn btn-primary'}
                onClick={onConfirm}
              >
                {t('common.confirm')}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onConfirm}>
              {t('common.ok')}
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
