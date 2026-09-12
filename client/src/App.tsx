import { useEffect, useState } from "react";
import { TransferProvider, useTransfer } from "./context/TransferContext";
import { ConnectionBadge } from "./components/ConnectionBadge";
import { Landing } from "./views/Landing";
import { SenderRoom } from "./views/SenderRoom";
import { ReceiverRoom } from "./views/ReceiverRoom";
import { TransferView } from "./views/TransferView";
import { Complete } from "./views/Complete";
import { SettingsPanel } from "./components/SettingsPanel";

function AppContent() {
  const { view, connectionState, isSignalingConnected } = useTransfer();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    // Sync initial theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
       document.documentElement.classList.add("light");
    }
  }, []);

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      <header className="h-[60px] flex items-center justify-between px-5 max-w-[560px] mx-auto border-b border-border sm:border-none">
        <div className="font-mono lowercase text-[1.25rem] font-medium tracking-wide">
          tether
        </div>
        <div className="flex items-center gap-4">
          <ConnectionBadge state={connectionState} isSignalingConnected={isSignalingConnected} />
          <button onClick={() => setIsSettingsOpen(true)} className="text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded p-1" aria-label="Open settings">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="max-w-[560px] mx-auto px-[20px] pt-[24px] sm:pt-[48px] pb-[48px]">
        {view === "landing" && <Landing />}
        {view === "sender-room" && <SenderRoom />}
        {view === "receiver-room" && <ReceiverRoom />}
        {view === "transfer" && <TransferView />}
        {view === "complete" && <Complete />}
      </main>

      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <TransferProvider>
      <AppContent />
    </TransferProvider>
  );
}
