import { useState, useEffect } from "react";
import { useTransfer } from "../context/TransferContext";

export function SettingsPanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { forceRelay, setForceRelay } = useTransfer();
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains("light"));
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleTheme = () => {
    document.documentElement.classList.toggle("light");
    setIsLight(!isLight);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div 
        className="w-full max-w-[320px] h-full bg-surface border-l border-border shadow-xl p-6 transition-transform flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[1.125rem] font-semibold text-text">Settings</h2>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent p-1 rounded-[6px]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-6 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-text font-medium">Theme</span>
              <span className="text-text-faint text-[0.8125rem]">Toggle light/dark mode</span>
            </div>
            <button 
              onClick={toggleTheme}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-surface-raised border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-text transition ${isLight ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-text font-medium">Force Relay (TURN)</span>
              <span className="text-text-faint text-[0.8125rem]">Force all traffic through TURN</span>
            </div>
            <button 
              onClick={() => setForceRelay(!forceRelay)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${forceRelay ? "bg-accent" : "bg-surface-raised border border-border"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${forceRelay ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
