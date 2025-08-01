import { useState } from "react";
import { GenerateKeysModal } from "@/components/generate-keys-modal";
import { useKeys } from "@/contexts/app-context";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import {
  WandFilled,
  AddFilled,
  ClipboardPasteFilled,
  OpenFilled,
  CopyFilled,
  ArrowDownloadFilled,
  KeyMultipleFilled,
  DismissFilled,
} from "@fluentui/react-icons";
import { PageLayout } from "./page-layout";
import { TooltipButton } from "@/components/tooltip-button";
import { DerivedKeyPreview, KeyRow } from "@/components";

export function KeysPage() {
  const { keys, addKey, removeKey, clearKeys } = useKeys();
  const [newKey, setNewKey] = useState("");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const validateAndProcessKey = async (keyInput: string): Promise<string> => {
    const keyToValidate = keyInput.trim();

    // Check if the input looks like a hex string (only hex characters)
    const hexPattern = /^[0-9a-fA-F\s]+$/;
    const cleanHex = keyToValidate.replace(/\s/g, "");

    if (hexPattern.test(keyToValidate)) {
      // Validate hex key requirements
      if (cleanHex.length !== 64) {
        throw new Error(`Hex keys must be exactly 64 characters (256 bits). Current length: ${cleanHex.length}`);
      }

      // Validate it's valid hex format without processing it
      if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
        throw new Error("Invalid hex characters");
      }

      // Return the hex value as-is (preserve user input)
      return cleanHex;
    } else {
      // Validate passphrase key requirements
      const words = keyToValidate.split(/\s+/);
      if (words.length < 8) {
        throw new Error("Passphrase keys must contain at least 8 words");
      }

      // Check if all words are valid (alphanumeric)
      const invalidWords = words.filter((word) => !/^[a-zA-Z0-9]+$/.test(word));
      if (invalidWords.length > 0) {
        throw new Error("Invalid characters in passphrase. Words must be alphanumeric only.");
      }

      // Convert passphrase to hex for storage
      try {
        const hexValue = await invoke<string>("convert_passphrase_to_hex", {
          passphrase: keyToValidate,
        });
        return hexValue;
      } catch (error) {
        throw new Error("Invalid passphrase format");
      }
    }
  };

  const handleAddKey = async () => {
    if (newKey.trim()) {
      try {
        const hexKey = await validateAndProcessKey(newKey);
        addKey(hexKey);
        setNewKey("");

        // Show appropriate success message based on input format
        const hexPattern = /^[0-9a-fA-F\s]+$/;
        const cleanHex = newKey.trim().replace(/\s/g, "");
        if (hexPattern.test(newKey.trim()) && cleanHex.length === 64) {
          toast.success("Hex key added successfully!");
        } else {
          toast.success("Passphrase validated and stored!");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add key");
      }
    }
  };

  const copyAllKeysToClipboard = async () => {
    try {
      // Convert all hex keys to passphrases
      const passphrases = await Promise.all(
        keys.map(async (hexKey) => {
          try {
            return await invoke<string>("convert_hex_to_passphrase", { hexString: hexKey });
          } catch (error) {
            console.error("Failed to convert hex to passphrase:", error);
            return hexKey; // Fallback to hex if conversion fails
          }
        })
      );

      const allPassphrases = passphrases.join("\n");
      await navigator.clipboard.writeText(allPassphrases);
      toast.success(`All ${keys.length} passphrases copied to clipboard!`);
    } catch (error) {
      toast.error("Failed to copy passphrases to clipboard: " + error);
    }
  };

  const saveKeysToFile = async () => {
    try {
      // Convert all hex keys to passphrases
      const passphrases = await Promise.all(
        keys.map(async (hexKey) => {
          try {
            return await invoke<string>("convert_hex_to_passphrase", { hexString: hexKey });
          } catch (error) {
            console.error("Failed to convert hex to passphrase:", error);
            return hexKey; // Fallback to hex if conversion fails
          }
        })
      );

      const allPassphrases = passphrases.join("\n");
      const filePath = await save({
        defaultPath: "encryption_keys.txt",
        filters: [
          {
            name: "Text Files",
            extensions: ["txt"],
          },
        ],
      });

      if (filePath) {
        // Use Tauri fs plugin to write the file
        await writeTextFile(filePath, allPassphrases);
        toast.success(`Passphrases saved to ${filePath}`);
      }
    } catch (error) {
      toast.error("Failed to save passphrases: " + error);
    }
  };

  const clearAllKeys = () => {
    if (keys.length > 0) {
      clearKeys();
      toast.success(`Cleared ${keys.length} keys`);
    }
  };

  const pasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        try {
          const hexKey = await validateAndProcessKey(text);
          addKey(hexKey);

          // Show appropriate success message based on input format
          const hexPattern = /^[0-9a-fA-F\s]+$/;
          const cleanHex = text.trim().replace(/\s/g, "");
          if (hexPattern.test(text.trim()) && cleanHex.length === 64) {
            toast.success("Hex key pasted and added successfully!");
          } else {
            toast.success("Passphrase pasted, validated and stored!");
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to add key");
        }
      }
    } catch (error) {
      toast.error("Failed to paste from clipboard: " + error);
    }
  };

  const handleSelectKeyFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Text Files",
            extensions: ["txt"],
          },
        ],
      });

      if (selected && Array.isArray(selected)) {
        let totalAdded = 0;
        let totalErrors = 0;
        let totalHexConverted = 0;

        for (const filePath of selected) {
          try {
            // Read the file content using Tauri fs plugin
            const content = await readTextFile(filePath);
            const newKeys = content.split("\n").filter((line) => line.trim());

            let addedCount = 0;
            let errorCount = 0;
            let hexConvertedCount = 0;

            for (const key of newKeys) {
              try {
                const trimmedKey = key.trim();
                if (!trimmedKey) continue;

                // Check if it's a hex key before processing (for counting purposes)
                const hexPattern = /^[0-9a-fA-F\s]+$/;
                const cleanHex = trimmedKey.replace(/\s/g, "");
                const wasOriginallyHex = hexPattern.test(trimmedKey) && cleanHex.length === 64;

                const hexKey = await validateAndProcessKey(trimmedKey);
                addKey(hexKey);
                addedCount++;

                // Count conversions (all keys get stored as hex, but track input format)
                if (!wasOriginallyHex) {
                  hexConvertedCount++; // Passphrase was converted to hex
                }
              } catch (error) {
                errorCount++;
                console.log(`Invalid key skipped: ${key.trim()} - ${error}`);
              }
            }

            totalAdded += addedCount;
            totalErrors += errorCount;
            totalHexConverted += hexConvertedCount;
          } catch (error) {
            console.error(`Failed to read file ${filePath}:`, error);
            toast.error(`Failed to read file: ${filePath}`);
          }
        }

        // Show appropriate toast messages
        if (totalAdded > 0) {
          let message = `Added ${totalAdded} key(s) from ${selected.length} file(s)`;
          if (totalHexConverted > 0) {
            message += ` (${totalHexConverted} passphrase(s) converted to hex)`;
          }
          toast.success(message);
        }
        if (totalErrors > 0) {
          toast.warning(
            `Skipped ${totalErrors} invalid key(s). Check that hex keys are exactly 64 characters and passphrases have at least 8 words.`
          );
        }
        if (totalAdded === 0 && totalErrors === 0) {
          toast.info("No valid keys found in the selected file(s)");
        }
      }
    } catch (error) {
      console.error("File selection failed:", error);
      toast.error("Failed to select files: " + error);
    }
  };

  return (
    <PageLayout pageTitle="Encryption Keys" pageDescription="Load existing keys, or generate new keys for encryption.">
      <div className="h-full flex flex-col">
        {/* Top Bar */}
        <div className="space-y-2 flex-shrink-0 flex items-center gap-4">
          {/* Key Input */}
          <div className="join flex flex-1 m-0">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Enter key (64-char hex or 8+ word passphrase)..."
              className="input join-item flex-1"
            />
            <TooltipButton
              button_options="btn-primary join-item"
              onClick={handleAddKey}
              disabled={!newKey.trim()}
              tooltip="Add Key"
              btn_icon={AddFilled}
            />
            <TooltipButton
              onClick={handleSelectKeyFiles}
              tooltip="Add Key File(s)"
              btn_icon={OpenFilled}
              button_options="join-item"
            />
            <TooltipButton
              onClick={pasteKey}
              tooltip="Paste Key"
              btn_icon={ClipboardPasteFilled}
              button_options="join-item"
            />
          </div>

          {/* Table Operations */}
          <div className="join flex-shrink-0">
            <TooltipButton
              onClick={copyAllKeysToClipboard}
              disabled={keys.length === 0}
              tooltip="Copy passphrases to clipboard"
              btn_icon={CopyFilled}
              button_options="join-item"
            />
            <TooltipButton
              onClick={saveKeysToFile}
              disabled={keys.length === 0}
              tooltip="Save passphrases to file"
              btn_icon={ArrowDownloadFilled}
              button_options="join-item"
            />
            <TooltipButton
              button_options="btn-error join-item"
              onClick={clearAllKeys}
              disabled={keys.length === 0}
              tooltip="Clear All"
              btn_icon={DismissFilled}
            />
          </div>
        </div>

        {/* List of keys */}
        <div className="flex-1 flex flex-col min-h-0 mt-4 overflow-y-auto overflow-x-hidden">
          {keys.length > 0 ? (
            <div className="flex-1 flex flex-col min-h-0">
              <table className="table table-pin-rows">
                {/* head */}
                <thead>
                  <tr>
                    <th>Passphrase</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key, index) => (
                    <KeyRow key={index} keyValue={key} index={index} onRemove={removeKey} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <KeyMultipleFilled className="h-12 w-12 mx-auto text-base-content/30 mb-4" />
              <p className="text-lg font-medium text-base-content/60">No keys loaded</p>
              <p className="text-sm text-base-content/40 mt-2">
                Add keys manually, paste from clipboard, or load from files to get started
              </p>
            </div>
          )}
        </div>

        {/* Bottom action buttons */}
        <div className="flex flex-shrink-0 pt-4 items-end gap-6">
          <div className="flex-1">
            <DerivedKeyPreview />
          </div>

          <TooltipButton
            button_options="btn-primary justify-end"
            onClick={() =>
              keys.length > 0
                ? (document.getElementById("overwrite_keys_warning") as HTMLDialogElement)?.showModal()
                : setIsGenerateModalOpen(true)
            }
            tooltip=""
            label="Generate New Keys"
            btn_icon={WandFilled}
          />
        </div>
      </div>

      {/* Generate Keys Modal */}
      <GenerateKeysModal isOpen={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)} />

      {/* Overwrite Warning Alert Dialog */}
      <dialog id="overwrite_keys_warning" className="modal">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
            <div className="flex flex-col gap-4">
              <p className="text-lg font-bold">⚠️ Overwrite existing keys?</p>
              <p>
                This will replace {keys.length} loaded {keys.length !== 1 ? "keys" : "key"}. This action cannot be
                undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button className="btn">Cancel</button>

                <button className="btn btn-warning" onClick={() => setIsGenerateModalOpen(true)}>
                  Overwrite
                </button>
              </div>
            </div>
          </form>
        </div>
      </dialog>
    </PageLayout>
  );
}
