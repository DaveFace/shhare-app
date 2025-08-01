import { useNavigate, useLocation } from "react-router-dom";
import {HomeFilled, KeyMultipleFilled, DocumentLockFilled, InfoFilled, FluentIcon } from "@fluentui/react-icons";
import appIcon from "@/assets/icon.svg";

interface NavigationItem {
  path: string;
  icon: FluentIcon;
  label: string;
}

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const iconSize = 30;

  const navigationItems: NavigationItem[] = [
    { path: "/", icon: HomeFilled, label: "Home" },
    { path: "/keys", icon: KeyMultipleFilled, label: "Keys" },
    { path: "/notes", icon: DocumentLockFilled, label: "Notes" },
  ];

  const settingsItems: NavigationItem[] = [{ path: "/info", icon: InfoFilled, label: "Info" }];

  const renderSidebarItem = (item: NavigationItem) => (
    <div className="tooltip tooltip-right" data-tip={item.label}>
      <button
        className={"btn  btn-square" + (location.pathname === item.path ? " btn-primary" : " btn-ghost")}
        onClick={() => navigate(item.path)}
      >
        <item.icon fontSize={iconSize} />
      </button>
    </div>
  );

  return (
    <div className="bg-base-300 p-2 h-full flex flex-col" data-tauri-drag-region>
      {/* Header */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        <img src={appIcon} alt="App Icon" className="h-10 w-10 mx-auto" />
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-2 py-2 flex-1"> {navigationItems.map((item) => renderSidebarItem(item))}</div>
      
      {/* Footer */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        {settingsItems.map((item) => renderSidebarItem(item))}{" "}
      </div>
    </div>
  );
}
