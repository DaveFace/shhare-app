import { useState, useEffect } from "react";
import { useKeys } from "@/contexts/app-context";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { PageLayout } from "./page-layout";
import { SaveFilled, OpenFilled } from "@fluentui/react-icons";
import { TooltipButton } from "@/components/tooltip-button";
import { DerivedKeyPreview } from "@/components/derived-key-preview";

export function NotePage() {
  const { keys, encryptedText, decryptedText, setEncryptedText, setDecryptedText } = useKeys();
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [autoSync] = useState(true);
  const [lastChangedField, setLastChangedField] = useState<'encrypted' | 'decrypted' | null>(null);
  const [lastDecryptedValue, setLastDecryptedValue] = useState(decryptedText);
  const [lastEncryptedValue, setLastEncryptedValue] = useState(encryptedText);

  // Update last values when context values change externally (e.g., from other components)
  useEffect(() => {
    setLastDecryptedValue(decryptedText);
    setLastEncryptedValue(encryptedText);
  }, []); // Only run on mount

  // Auto-sync encrypted and decrypted text when enabled
  useEffect(() => {
    if (!autoSync || keys.length === 0 || isEncrypting || isDecrypting || !lastChangedField) return;

    const syncTexts = async () => {
      try {
        if (lastChangedField === 'decrypted') {
          // User changed decrypted text, update encrypted only if the value actually changed
          if (decryptedText !== lastDecryptedValue) {
            setLastDecryptedValue(decryptedText);
            if (decryptedText.trim()) {
              setIsEncrypting(true);
              const result = await invoke<string>("encrypt_text", {
                text: decryptedText,
                keys: keys,
              });
              setEncryptedText(result);
              setLastEncryptedValue(result);
            } else {
              // If decrypted text is cleared, clear encrypted too
              setEncryptedText("");
              setLastEncryptedValue("");
            }
          }
        } else if (lastChangedField === 'encrypted') {
          // User changed encrypted text, update decrypted only if the value actually changed
          if (encryptedText !== lastEncryptedValue) {
            setLastEncryptedValue(encryptedText);
            if (encryptedText.trim()) {
              setIsDecrypting(true);
              const result = await invoke<string>("decrypt_text", {
                encryptedText: encryptedText,
                keys: keys,
              });
              setDecryptedText(result);
              setLastDecryptedValue(result);
            } else {
              // If encrypted text is cleared, clear decrypted too
              setDecryptedText("");
              setLastDecryptedValue("");
            }
          }
        }
      } catch (error) {
        console.error("Auto-sync failed:", error);
        // Don't show toast for auto-sync failures to avoid spam
      } finally {
        setIsEncrypting(false);
        setIsDecrypting(false);
      }
    };

    const timeoutId = setTimeout(syncTexts, 500); // Debounce for 500ms
    return () => clearTimeout(timeoutId);
  }, [decryptedText, encryptedText, keys, autoSync, lastChangedField, isEncrypting, isDecrypting, lastDecryptedValue, lastEncryptedValue, setEncryptedText, setDecryptedText]);

  const handleSaveNote = async () => {
    if (!encryptedText.trim()) {
      toast.error("No encrypted text to save");
      return;
    }

    try {
      const filePath = await save({
        defaultPath: "encrypted_note.txt",
        filters: [
          {
            name: "Text Files",
            extensions: ["txt"],
          },
        ],
      });

      if (filePath) {
        // Use Tauri fs plugin to write the file
        await writeTextFile(filePath, encryptedText);
        toast.success(`Encrypted note saved to ${filePath}`);
      }
    } catch (error) {
      toast.error("Failed to save note: " + error);
    }
  };

  const handleOpenNote = async () => {
    try {
      const filePath = await open({
        filters: [
          {
            name: "Text Files",
            extensions: ["txt", "md"],
          },
        ],
      });

      if (filePath) {
        // Read the file content
        const content = await readTextFile(filePath as string);
        
        // Try to determine if it's encrypted or plain text
        // Simple heuristic: if it looks like base64 or hex, treat as encrypted
        const isLikelyEncrypted = /^[A-Za-z0-9+/=]+$/.test(content.trim()) || 
                                 /^[0-9a-fA-F\s]+$/.test(content.trim());
        
        if (isLikelyEncrypted) {
          setEncryptedText(content);
          setDecryptedText(""); // Clear the other side
          setLastChangedField('encrypted');
          setLastEncryptedValue(content);
          setLastDecryptedValue("");
          toast.success(`Loaded encrypted text from ${filePath}`);
        } else {
          setDecryptedText(content);
          setEncryptedText(""); // Clear the other side
          setLastChangedField('decrypted');
          setLastDecryptedValue(content);
          setLastEncryptedValue("");
          toast.success(`Loaded plain text from ${filePath}`);
        }
      }
    } catch (error) {
      toast.error("Failed to open file: " + error);
    }
  };

  const canProcess = keys.length > 0;

  return (
    <PageLayout pageTitle="Notes" pageDescription="Encrypt and decrypt plain text using your encryption key.">
      <div className="h-full flex flex-col">
        {/* Text Editors */}
        <div className="w-full flex-1 flex flex-col">
          <div className="flex w-full flex-row flex-1 min-h-0">
            <fieldset className="fieldset flex flex-col w-full">
              <legend className="fieldset-legend">Encrypted Text</legend>
              <textarea
                className="textarea w-full h-full resize-none"
                placeholder="Enter encrypted text here..."
                value={encryptedText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setEncryptedText(e.target.value);
                  setLastChangedField('encrypted');
                }}
              />
            </fieldset>

           
            <div className="divider divider-horizontal h-full min-w-[2rem] flex-shrink-0 pd-0" />

            {/* Decrypted Text Side */}
            <fieldset className="fieldset flex flex-col w-full">
              <legend className="fieldset-legend">Plain Text</legend>
              <textarea
                className="textarea w-full h-full resize-none"
                placeholder="Enter plaintext here..."
                value={decryptedText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setDecryptedText(e.target.value);
                  setLastChangedField('decrypted');
                }}
              />
            </fieldset>
          </div>
        </div>

        {/* Bottom action buttons */}
        <div className="flex flex-shrink-0 pt-4 items-end gap-6">
          <div className="flex-1">
            <DerivedKeyPreview />
          </div>
          <div className="flex justify-end gap-2">
            <TooltipButton
              onClick={handleOpenNote}
              button_options="btn-secondary"
              tooltip="Open a .txt or .md file"
              label="Open Note"
              btn_icon={OpenFilled}
              disabled={!canProcess}
            />
            <TooltipButton
              onClick={handleSaveNote}
              button_options="btn-primary"
              tooltip="Save to a .txt file"
              label="Save Note"
              btn_icon={SaveFilled}
              disabled={!encryptedText || !canProcess}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
