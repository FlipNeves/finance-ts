import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
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
      <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header flex justify-between items-center">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>
        <div className="modal-body">
          {children}
        </div>
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
          z-index: 1000;
          animation: modalFadeIn 0.3s ease-out;
          padding: 16px;
        }
        .modal-content {
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          padding: 28px;
          border-radius: 20px;
          border: none;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          -webkit-overflow-scrolling: touch;
        }
        .modal-content:hover {
          transform: none;
        }
        .modal-header h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
        }
        .close-btn {
          background: var(--bg);
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .close-btn:hover {
          background-color: var(--border);
          color: var(--text);
        }
        .modal-body {
          margin-top: 20px;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* MOBILE: Bottom sheet style */
        @media (max-width: 768px) {
          .modal-overlay {
            align-items: flex-end;
            padding: 0;
          }
          .modal-content {
            max-width: 100%;
            max-height: 92vh;
            border-radius: 20px 20px 0 0;
            padding: 24px 20px;
            padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
            animation: modalSlideUpMobile 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .modal-header h2 {
            font-size: 20px;
          }
          .modal-body {
            margin-top: 16px;
          }
        }

        @keyframes modalSlideUpMobile {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default Modal;
