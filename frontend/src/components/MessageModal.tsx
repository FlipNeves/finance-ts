import React from 'react';
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container alert-modal" style={{ maxWidth: '400px' }}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>
        <div className="modal-content" style={{ marginTop: '16px', marginBottom: '24px' }}>
          <p>{message}</p>
        </div>
        <footer className="modal-footer flex justify-end gap-2">
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
        .alert-modal {
          animation: slideIn 0.2s ease-out;
          border-top: 4px solid ${isDestructive ? 'var(--danger)' : 'var(--primary)'};
        }
        .btn-danger {
          background-color: var(--danger);
          color: white;
        }
        .btn-danger:hover {
          filter: brightness(0.9);
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default MessageModal;
