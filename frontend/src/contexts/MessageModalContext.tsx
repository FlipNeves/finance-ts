import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import MessageModal from '../components/MessageModal';

interface MessageModalContextType {
  showMessage: (title: string, message: string, onConfirm?: () => void, isDestructive?: boolean) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

const MessageModalContext = createContext<MessageModalContextType | undefined>(undefined);

export const MessageModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);
  const [isConfirmRequired, setIsConfirmRequired] = useState(false);
  const [isDestructiveAction, setIsDestructiveAction] = useState(false);

  const showMessage = (title: string, message: string, onConfirm?: () => void, isDestructive = false) => {
    setModalTitle(title);
    setModalMessage(message);
    setOnConfirmCallback(() => onConfirm || null);
    setIsConfirmRequired(false);
    setIsDestructiveAction(isDestructive);
    setIsOpen(true);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
    setModalTitle(title);
    setModalMessage(message);
    setOnConfirmCallback(() => onConfirm);
    setIsConfirmRequired(true);
    setIsDestructiveAction(isDestructive);
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const handleConfirm = () => {
    if (onConfirmCallback) {
      onConfirmCallback();
    }
    close();
  };

  return (
    <MessageModalContext.Provider value={{ showMessage, showConfirm }}>
      {children}
      <MessageModal
        isOpen={isOpen}
        title={modalTitle}
        message={modalMessage}
        onClose={close}
        onConfirm={handleConfirm}
        isConfirmRequired={isConfirmRequired}
        isDestructive={isDestructiveAction}
      />
    </MessageModalContext.Provider>
  );
};

export const useMessageModal = () => {
  const context = useContext(MessageModalContext);
  if (!context) {
    throw new Error('useMessageModal must be used within a MessageModalProvider');
  }
  return context;
};
