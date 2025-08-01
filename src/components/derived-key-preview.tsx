import { CopyFilled, EyeFilled, EyeOffFilled } from "@fluentui/react-icons";
import { TooltipButton } from "./tooltip-button";
import { useKeys } from "../contexts/app-context";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function DerivedKeyPreview() {
  const { keys, fullKey, previewEncryptionKey } = useKeys();
  const [showFullKey, setShowFullKey] = useState(false);

  // Generate the derived key when component mounts or keys change
  useEffect(() => {
    if (keys.length > 0) {
      previewEncryptionKey();
    }
  }, [keys, previewEncryptionKey]);

  const obfuscateKey = (key: string): string => {
    if (!key) return '';
    return key.substring(0, 8) + '•'.repeat(Math.max(0, key.length - 16)) + key.substring(Math.max(8, key.length - 8));
  };

  const handleCopyPreviewKey = async () => {
    if (!fullKey) {
      toast.error("No key available to copy");
      return;
    }
    
    try {
      await navigator.clipboard.writeText(fullKey);
      toast.success("Derived key copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy key to clipboard: " + error);
    }
  };

  const displayedKey = showFullKey ? fullKey : obfuscateKey(fullKey);

  return (
      <fieldset className="fieldset flex gap-2 p-0">
        <legend className="fieldset-legend">Derived Key (hex):</legend>
        <input type="text" className="input font-mono flex-1" value={displayedKey} placeholder="No key generated yet" readOnly />
        <TooltipButton 
          onClick={() => setShowFullKey(!showFullKey)} 
          tooltip={showFullKey ? "Hide Key" : "Show Key"} 
          btn_icon={showFullKey ? EyeOffFilled : EyeFilled} 
        />
        <TooltipButton onClick={handleCopyPreviewKey} tooltip="Copy Key" btn_icon={CopyFilled} />
      </fieldset>
  );
}
