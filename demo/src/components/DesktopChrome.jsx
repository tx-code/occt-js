import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Square, SquareStack, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useViewerStore } from "../store/viewerStore";
import { getDesktopChromeMenus } from "../lib/desktop-menu";

function WindowControlButton({ label, onClick, tone = "default", children, testId }) {
  const toneClass = tone === "close"
    ? "hover:bg-red-500 hover:text-white"
    : "hover:bg-white/7";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`desktop-chrome-button ${toneClass}`}
      onClick={onClick}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

export default function DesktopChrome({
  onOpenFile,
  onOpenSample,
  onCloseModel,
  onFitAll,
  onSetProjection,
  onToggleTheme,
  onAbout,
}) {
  const chromeRef = useRef(null);
  const fileName = useViewerStore((s) => s.fileName);
  const hasModel = useViewerStore((s) => Boolean(s.model));
  const projectionMode = useViewerStore((s) => s.projectionMode);
  const theme = useViewerStore((s) => s.theme);
  const [maximized, setMaximized] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const title = useMemo(() => fileName || "occt-js Viewer", [fileName]);
  const windowHandle = useMemo(() => getCurrentWindow(), []);
  const menus = useMemo(() => getDesktopChromeMenus({ hasModel, projectionMode, theme }), [hasModel, projectionMode, theme]);
  const actionHandlers = useMemo(() => ({
    "about": onAbout,
    "close-model": onCloseModel,
    "fit-all": onFitAll,
    "open-file": onOpenFile,
    "open-sample": onOpenSample,
    "projection-orthographic": () => onSetProjection("orthographic"),
    "projection-perspective": () => onSetProjection("perspective"),
    "toggle-theme": onToggleTheme,
  }), [onAbout, onCloseModel, onFitAll, onOpenFile, onOpenSample, onSetProjection, onToggleTheme]);

  useEffect(() => {
    let mounted = true;

    async function syncMaximized() {
      try {
        const next = await windowHandle.isMaximized();
        if (mounted) setMaximized(next);
      } catch {
        // Ignore state sync failures; buttons still invoke the window commands.
      }
    }

    syncMaximized();

    let unlistenResize;
    windowHandle.onResized(() => {
      syncMaximized();
    }).then((dispose) => {
      unlistenResize = dispose;
    }).catch(() => {});

    return () => {
      mounted = false;
      if (unlistenResize) unlistenResize();
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!chromeRef.current?.contains(event.target)) {
        setActiveMenuId(null);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setActiveMenuId(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleMenuTrigger(menuId) {
    setActiveMenuId((current) => current === menuId ? null : menuId);
  }

  function handleMenuItem(itemId) {
    setActiveMenuId(null);
    actionHandlers[itemId]?.();
  }

  return (
    <div ref={chromeRef} className="desktop-chrome fixed inset-x-0 top-0 z-[300] text-zinc-100" data-testid="desktop-chrome">
      <div className="desktop-chrome__left">
        <div className="desktop-chrome__brand" data-tauri-drag-region onDoubleClick={() => windowHandle.toggleMaximize()}>
          <span className="desktop-chrome__mark" aria-hidden="true" />
          <span className="desktop-chrome__app-name">occt-js</span>
        </div>

        <div className="desktop-chrome__menus">
          {menus.map((menu) => (
            <div
              key={menu.id}
              className="desktop-chrome__menu-group"
              onMouseEnter={() => {
                if (activeMenuId) setActiveMenuId(menu.id);
              }}
            >
              <button
                type="button"
                className={`desktop-chrome__menu-trigger ${activeMenuId === menu.id ? "is-open" : ""}`}
                aria-expanded={activeMenuId === menu.id}
                aria-haspopup="menu"
                onClick={() => handleMenuTrigger(menu.id)}
              >
                {menu.label}
              </button>

              {activeMenuId === menu.id && (
                <div className="desktop-chrome__menu-panel" role="menu">
                  {menu.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      className="desktop-chrome__menu-item"
                      disabled={item.disabled}
                      onClick={() => handleMenuItem(item.id)}
                    >
                      <span className="desktop-chrome__menu-check" aria-hidden="true">
                        {item.checked ? "✓" : ""}
                      </span>
                      <span className="desktop-chrome__menu-label">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="desktop-chrome__drag" data-tauri-drag-region onDoubleClick={() => windowHandle.toggleMaximize()} />

      <div className="desktop-chrome__title-overlay" aria-hidden="true">
        <span className="desktop-chrome__title">{title}</span>
      </div>

      <div className="desktop-chrome__controls">
        <WindowControlButton label="Minimize" onClick={() => windowHandle.minimize()} testId="window-minimize">
          <Minus className="h-3.5 w-3.5" strokeWidth={1.8} />
        </WindowControlButton>
        <WindowControlButton
          label={maximized ? "Restore down" : "Maximize"}
          onClick={() => windowHandle.toggleMaximize()}
          testId="window-maximize"
        >
          {maximized
            ? <SquareStack className="h-3.5 w-3.5" strokeWidth={1.8} />
            : <Square className="h-3.5 w-3.5" strokeWidth={1.8} />}
        </WindowControlButton>
        <WindowControlButton label="Close" onClick={() => windowHandle.close()} tone="close" testId="window-close">
          <X className="h-3.5 w-3.5" strokeWidth={1.8} />
        </WindowControlButton>
      </div>
    </div>
  );
}
