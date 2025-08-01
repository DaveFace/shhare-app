import { useState, useEffect } from "react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { CopyFilled, EyeFilled, EyeOffFilled, NumberSymbolFilled, DeleteFilled } from "@fluentui/react-icons";
import { TooltipButton } from "./tooltip-button";

interface KeyRowProps {
  keyValue: string; // Hex value
  index: number;
  onRemove: (index: number) => void;
}

export function KeyRow({ keyValue, index, onRemove }: KeyRowProps) {
  const [showFullKey, setShowFullKey] = useState(false);
  const [displayPassphrase, setDisplayPassphrase] = useState<string>("");

  // Convert hex to passphrase for display
  useEffect(() => {
    const convertToPassphrase = async () => {
      try {
        const passphrase = await invoke<string>("convert_hex_to_passphrase", {
          hexString: keyValue,
        });
        setDisplayPassphrase(passphrase);
      } catch (error) {
        console.error("Failed to convert hex to passphrase:", error);
        // Fallback to showing the hex value if something goes tits up
        setDisplayPassphrase(keyValue);
      }
    };

    convertToPassphrase();
  }, [keyValue]);

  const obfuscateKey = (key: string): string => {
    return key
      .split(" ")
      .map((word) => {
        if (word.length <= 2) return word;
        return word.substring(0, 2) + "***";
      })
      .join(" ");
  };

  const copyPassphraseToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(displayPassphrase);
    } catch (error) {
      toast.error("Failed to copy passphrase to clipboard: " + error);
    }
  };

  const copyKeyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(keyValue);
    } catch (error) {
      toast.error("Failed to copy hex key: " + error);
    } 
  };

  const displayedKey = showFullKey ? displayPassphrase : obfuscateKey(displayPassphrase);

  return (
    <tr className="hover:bg-base-200">
      <td className="font-medium font-mono">{displayedKey}</td>
      <td className="flex justify-end space-x-2">
        <TooltipButton
          onClick={() => setShowFullKey(!showFullKey)}
          tooltip={showFullKey ? "Hide Key" : "Show Key"}
          btn_icon={showFullKey ? EyeOffFilled : EyeFilled}
          button_options="btn-sm btn-soft"
        />
        <TooltipButton
          onClick={copyPassphraseToClipboard}
          tooltip="Copy Passphrase"
          btn_icon={CopyFilled}
          button_options="btn-sm btn-soft"
        />
        <TooltipButton
          onClick={copyKeyToClipboard}
          tooltip="Copy Key (Hex)"
          btn_icon={NumberSymbolFilled}
          button_options="btn-sm btn-soft"
        />
        <TooltipButton
          button_options="btn-error btn-sm btn-soft"
          onClick={() => onRemove(index)}
          tooltip="Remove"
          btn_icon={DeleteFilled}
        />
      </td>
    </tr>
  );
}
