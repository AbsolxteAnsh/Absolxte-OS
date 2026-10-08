import { Copy, Maximize2, Minimize2, Search, X } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";

import {
  closeWindow,
  isWindowMaximized,
  minimizeWindow,
  startWindowDrag,
  toggleMaximizeWindow,
  type CommandResult,
} from "../lib/tauri";
import { isWindowDragTarget } from "./windowInteraction";

type TitleBarProps = {
  activeLabel: string;
  onOpenCommand: () => void;
  onError: (message: string) => void;
};

export function TitleBar({
  activeLabel,
  onOpenCommand,
  onError,
}: TitleBarProps) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    void isWindowMaximized().then((result) => {
      if (result.ok) setMaximized(result.data);
    });
  }, []);

  const reportFailure = (result: CommandResult<boolean>) => {
    if (!result.ok) onError(result.message);
  };

  const handleDrag = (event: MouseEvent<HTMLElement>) => {
    if (!isWindowDragTarget(event)) return;
    void startWindowDrag().then(reportFailure);
  };

  const handleToggleMaximize = async () => {
    const result = await toggleMaximizeWindow();
    if (result.ok) setMaximized(result.data);
    else onError(result.message);
  };

  const handleDoubleClick = (event: MouseEvent<HTMLElement>) => {
    if (!isWindowDragTarget({ button: 0, target: event.target })) return;
    void handleToggleMaximize();
  };

  return (
    <header
      className="titlebar"
      onMouseDown={handleDrag}
      onDoubleClick={handleDoubleClick}
    >
      <div className="titlebar-heading">
        <div className="eyebrow">SYSTEM CONTROL CENTER</div>
        <h1>{activeLabel}</h1>
      </div>
      <div className="titlebar-actions" data-no-drag>
        <button
          className="command-button"
          type="button"
          onClick={onOpenCommand}
        >
          <Search size={16} />
          <span>Command Center</span>
          <kbd>Ctrl K</kbd>
        </button>
        <div className="window-controls">
          <button
            className="icon-button"
            type="button"
            title="Minimize"
            aria-label="Minimize"
            onClick={() => void minimizeWindow().then(reportFailure)}
          >
            <Minimize2 size={15} />
          </button>
          <button
            className="icon-button"
            type="button"
            title={maximized ? "Restore" : "Maximize"}
            aria-label={maximized ? "Restore" : "Maximize"}
            onClick={() => void handleToggleMaximize()}
          >
            {maximized ? <Copy size={14} /> : <Maximize2 size={15} />}
          </button>
          <button
            className="icon-button danger"
            type="button"
            title="Close"
            aria-label="Close"
            onClick={() => void closeWindow().then(reportFailure)}
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
