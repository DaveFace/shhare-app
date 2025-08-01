import { createContext, useContext, useState, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface AppContextType {
  keys: string[];
  addKey: (key: string) => void;
  removeKey: (index: number) => void;
  setKeys: (keys: string[]) => void;
  clearKeys: () => void;
  validateKey: (key: string) => { isValid: boolean; error?: string };
  previewEncryptionKey: () => Promise<string>;
  encryptedText: string;
  decryptedText: string;
  setEncryptedText: (text: string) => void;
  setDecryptedText: (text: string) => void;
  clearNoteTexts: () => void;
  fullKey: string;
}

const KeysContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function KeysProvider({ children }: AppProviderProps) {
  const [keys, setKeysState] = useState<string[]>([]);
  const [encryptedText, setEncryptedTextState] = useState<string>('');
  const [decryptedText, setDecryptedTextState] = useState<string>('');
  const [fullKey, setFullKeyState] = useState<string>('');

  const setEncryptedText = (text: string) => {
    setEncryptedTextState(text);
  };

  const setDecryptedText = (text: string) => {
    setDecryptedTextState(text);
  };

  const clearNoteTexts = () => {
    setEncryptedTextState('');
    setDecryptedTextState('');
  };

  // Helper function to update fullKey based on current keys
  const updateFullKey = async (currentKeys: string[]) => {
    if (currentKeys.length < 2) {
      setFullKeyState('');
      return;
    }
    
    try {
      const derivedKey = await invoke<string>('derive_encryption_key', { keys: currentKeys });
      setFullKeyState(derivedKey);
    } catch (error) {
      console.error('Error deriving key:', error);
      setFullKeyState('');
    }
  };

  const validateKey = (key: string): { isValid: boolean; error?: string } => {
    const trimmedKey = key.trim();
    
    if (!trimmedKey) {
      return { isValid: false, error: "Key cannot be empty" };
    }
    
    if (trimmedKey.length < 12) {
      return { isValid: false, error: "Key must be at least 12 characters long" };
    }
    
    if (keys.includes(trimmedKey)) {
      return { isValid: false, error: "Key already exists" };
    }
    
    return { isValid: true };
  };

  const addKey = (key: string) => {
    const validation = validateKey(key);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    setKeysState(prev => {
      const newKeys = [...prev, key.trim()];
      updateFullKey(newKeys);
      return newKeys;
    });
  };

  const removeKey = (index: number) => {
    setKeysState(prev => {
      const newKeys = prev.filter((_, i) => i !== index);
      updateFullKey(newKeys);
      return newKeys;
    });
  };

  const setKeys = (newKeys: string[]) => {
    setKeysState(newKeys);
    updateFullKey(newKeys);
  };

  const clearKeys = () => {
    setKeysState([]);
    setFullKeyState('');
  };

  const previewEncryptionKey = async (): Promise<string> => {
    if (keys.length === 0) {
      return "No keys available";
    }
    
    await updateFullKey(keys);
    return fullKey || "Error deriving key";
  };

  const value: AppContextType = {
    keys,
    addKey,
    removeKey,
    setKeys,
    clearKeys,
    validateKey,
    previewEncryptionKey,
    encryptedText,
    decryptedText,
    setEncryptedText,
    setDecryptedText,
    clearNoteTexts,
    fullKey,
  };

  return (
    <KeysContext.Provider value={value}>
      {children}
    </KeysContext.Provider>
  );
}

export function useKeys() {
  const context = useContext(KeysContext);
  if (context === undefined) {
    throw new Error('useKeys must be used within a KeysProvider');
  }
  return context;
}
