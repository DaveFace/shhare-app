import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useKeys } from "@/contexts/app-context";
import { WandFilled, PeopleLockFilled, NumberSymbolFilled, } from "@fluentui/react-icons";
import { TooltipButton } from "./tooltip-button";

interface GenerateKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GenerateKeysModal({ isOpen, onClose }: GenerateKeysModalProps) {
  const { setKeys } = useKeys();
  const [numberOfKeys, setNumberOfKeys] = useState([3]);
  const [threshold, setThreshold] = useState([2]);
  const byteCount = 32; // 256 bits = 32 bytes

  const handleNumberOfKeysChange = (value: number[]) => {
    setNumberOfKeys(value);
    if (threshold[0] > value[0]) {
      setThreshold([value[0]]);
    }
  };

  const handleThresholdChange = (value: number[]) => {
    setThreshold(value);
    if (numberOfKeys[0] < value[0]) {
      setNumberOfKeys([value[0]]);
    }
  };

  const generatePassphrases = async (count: number, thresholdCount: number, bytes: number): Promise<string[]> => {
    const passphrases = await invoke<string[]>("generate_shamir_keys", {
      keyCount: count,
      threshold: thresholdCount,
      byteCount: bytes,
    });
    return passphrases;
  };

  const handleGenerate = async () => {
    try {
      const keys = await generatePassphrases(numberOfKeys[0], threshold[0], byteCount);
      setKeys(keys);
      onClose();
    } catch (error) {
      toast.error("Error generating keys: " + error);
    }
  };

  const isThresholdValid = numberOfKeys[0] === 1 || (threshold[0] <= numberOfKeys[0] && threshold[0] >= 2);

  return (
    <dialog className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="modal-box ">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>
          ✕
        </button>
        <p className="text-lg font-bold">Generate Encryption Keys</p>
        <p className="">
          Shhare generates a 248-bit (31 byte) encryption key by default, so that the secret shares can be created without additional padding.
        </p>
        <div className="space-y-6 mt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <NumberSymbolFilled />
                <label className="text-sm font-medium">Number of keys to generate</label>
              </div>
              <span className="text-sm opacity-70">{numberOfKeys[0]}</span>
            </div>
            <input
              type="range"
              min={2}
              max={10}
              onChange={(e) => handleNumberOfKeysChange([parseInt(e.target.value)])}
              value={numberOfKeys[0]}
              className="range range-sm w-full"
              step={1}
            />
            <p className="text-xs opacity-70">
              Generate 1 key for simple encryption, or multiple keys for secret sharing
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PeopleLockFilled  />
                <label className="text-sm font-medium">Threshold to unlock</label>
              </div>
              <span className="text-sm opacity-70">
                {threshold[0]} of {numberOfKeys[0]}
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={10}
              onChange={(e) => handleThresholdChange([parseInt(e.target.value)])}
              value={threshold[0]}
              className="range range-sm w-full"
              step={1}
            />
            <p className="text-xs opacity-70">Minimum number of keys needed to decrypt the data</p>
            {!isThresholdValid && (
              <p className="text-xs text-error">
                Threshold must be between 2 and {numberOfKeys[0]} (currently {numberOfKeys[0]} key
                {numberOfKeys[0] > 1 ? "s" : ""} selected)
              </p>
            )}
          </div>
        </div>
        <div className="modal-action">
          <TooltipButton onClick={onClose} tooltip="" label="Cancel" />
          <TooltipButton
            button_options="btn-primary"
            onClick={handleGenerate}
            tooltip=""
            label="Generate Keys"
            disabled={!isThresholdValid}
            btn_icon={WandFilled}
          />
        </div>
      </div>
      {isOpen && <div className="modal-backdrop" onClick={onClose}></div>}
    </dialog>
  );
}
