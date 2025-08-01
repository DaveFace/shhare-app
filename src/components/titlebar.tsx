import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MaximizeFilled, SquareMultipleRegular, DismissFilled, LineHorizontal1Filled } from "@fluentui/react-icons";

export function Titlebar() {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);

      unlisten = await appWindow.onResized(async () => {
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [appWindow]);

  const handleMinimize = async () => {
    await appWindow.minimize();
  };

  const handleMaximize = async () => {
    await appWindow.toggleMaximize();
  };

  const handleClose = async () => {
    await appWindow.close();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-8  pr-0" data-tauri-drag-region>
      <div className="absolute top-0 right-0 h-full flex" style={{ pointerEvents: "auto" }}>
        <button className="btn btn-sm btn-ghost rounded-none rounded-bl-lg" onClick={handleMinimize} style={{ pointerEvents: "auto" }}>
          <LineHorizontal1Filled />
        </button>
        <button  className="btn btn-sm btn-ghost rounded-none" onClick={handleMaximize} style={{ pointerEvents: "auto" }}>
          {isMaximized ? <SquareMultipleRegular /> : <MaximizeFilled />}
        </button>
        <button
          className="btn btn-sm btn-ghost rounded-none btn-error transition-colors"
          onClick={handleClose}
          style={{ pointerEvents: "auto" }}
        >
          <DismissFilled />
        </button>
      </div>  
    </div>
  );
}
