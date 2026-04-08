import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface MessageModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  isConfirmRequired: boolean;
  isDestructive?: boolean;
}

const MessageModal: React.FC<MessageModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
  onConfirm,
  isConfirmRequired,
  isDestructive
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container alert-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>
        <div className="modal-content">
          <p>{message}</p>
        </div>
        <footer className="modal-footer">
          {isConfirmRequired ? (
            <>
              <button className="btn btn-outline" onClick={onClose}>
                {t('common.cancel') || 'Cancel'}
              </button>
              <button className={isDestructive ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm}>
                {t('common.confirm') || 'Confirm'}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onConfirm}>
              {t('common.ok') || 'OK'}
            </button>
          )}
        </footer>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease-out;
        }

        .modal-container {
          background-color: var(--bg-card);
          width: 90%;
          max-width: 440px;
          border-radius: 20px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
          position: relative;
          padding: 0;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .alert-modal {
          border-top: 6px solid ${isDestructive ? 'var(--danger)' : 'var(--primary)'};
        }

        .modal-header {
          padding: 24px 24px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
        }

        .close-btn {
          background: var(--bg);
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background-color: var(--border);
          color: var(--text);
        }

        .modal-content {
          padding: 0 24px 24px;
        }

        .modal-content p {
          margin: 0;
          color: var(--text-muted);
          font-size: 15px;
          line-height: 1.6;
        }

        .modal-footer {
          padding: 16px 24px 24px;
          background-color: var(--bg);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn-danger {
          background-color: var(--danger);
          color: white;
        }

        .btn-danger:hover {
          filter: brightness(0.9);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default MessageModal;
