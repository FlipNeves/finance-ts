import { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface PrivacyContextType {
  valuesHidden: boolean;
  toggleValues: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [valuesHidden, setValuesHidden] = useLocalStorage<boolean>('values-hidden', false);

  const toggleValues = useCallback(() => {
    setValuesHidden((prev) => !prev);
  }, [setValuesHidden]);

  return (
    <PrivacyContext.Provider value={{ valuesHidden, toggleValues }}>
      {children}
    </PrivacyContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
}
