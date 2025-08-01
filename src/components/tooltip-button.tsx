import { FluentIcon } from "@fluentui/react-icons";

interface TooltipButtonProps {
  onClick: () => void;
  tooltip: string;
  tooltip_options? : string;
  button_options?: string;
  label?: string;
  btn_icon?: FluentIcon;
  disabled?: boolean;
}

export function TooltipButton({
  onClick,
  tooltip,
  tooltip_options,
  button_options,
  btn_icon,
  label,
  disabled = false,
}: TooltipButtonProps) {
  const IconComponent = btn_icon;
  
  return (
    <div className={"tooltip" + (tooltip_options ? " " + tooltip_options : "")} data-tip={tooltip}>
      <button className={"btn" + (button_options ? " " + button_options : "") + (!label ? " btn-square" : "")} disabled={disabled} onClick={onClick}>
        {IconComponent && <IconComponent fontSize={20} />}
        {label}
      </button>
    </div>
  );
}
