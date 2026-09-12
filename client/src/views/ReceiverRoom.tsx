import { useEffect, useState } from "react";
import { useTransfer } from "../context/TransferContext";
import { Modal } from "../components/Modal";
import { Button } from "../components/Button";
import { ErrorPanel } from "../components/ErrorPanel";

export function ReceiverRoom() {
  const { connectionState, connectionError, incomingOffer, acceptTransfer, rejectTransfer, setView, joinRoom, roomCode, isSignalingConnected } = useTransfer();
  const [codeInput, setCodeInput] = useState("");

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const code = queryParams.get("code");
    if (code && !roomCode && isSignalingConnected) {
      setCodeInput(code);
      joinRoom(code);
    }
  }, [isSignalingConnected, roomCode, joinRoom]);

  const handleAccept = () => {
    acceptTransfer();
    setView("transfer");
  };

  const handleReject = () => {
    rejectTransfer();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (connectionError) {
    let msg = "An error occurred.";
    if (connectionError === "room-not-found") msg = "No room with that code. Check it and try again.";
    if (connectionError === "room-full") msg = "Someone else is already in that room.";
    if (connectionError === "expired") msg = "That code has expired. Ask for a new one.";

    return (
      <div className="flex flex-col">
        <ErrorPanel 
          message={msg} 
          action={<Button variant="secondary" onClick={() => setView("landing")}>Go back</Button>}
        />
      </div>
    );
  }

  if (connectionState === "failed" && !connectionError) {
    return (
      <div className="flex flex-col">
        <ErrorPanel 
          message="Couldn't connect. Your network may be blocking direct connections — try a different network or enable the relay in settings."
          action={<Button variant="secondary" onClick={() => setView("landing")}>Go back</Button>}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="bg-surface border border-border rounded-[10px] p-6 shadow-sm mb-8 text-center">
        <div className="text-text-faint text-[0.6875rem] font-mono uppercase tracking-[0.12em] mb-2">Room Code</div>
        <div className="font-mono text-[2.5rem] tracking-[0.02em] font-medium text-text">
          {roomCode || codeInput || "..."}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center h-32" aria-live="polite">
         {connectionState === "connecting" && (
           <div className="flex flex-col items-center">
             <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
             <p className="text-text-muted">Connecting...</p>
           </div>
         )}
         {connectionState === "idle" && (
           <p className="text-text-muted">Joining room...</p>
         )}
         {connectionState.startsWith("connected") && !incomingOffer && (
           <p className="text-text-muted">Connected. Waiting for files...</p>
         )}
         {(connectionState === "failed" || connectionState === "disconnected") && (
           <p className="text-danger">Connection lost.</p>
         )}
      </div>

      <Modal isOpen={!!incomingOffer} onClose={handleReject}>
        {incomingOffer && (
          <div className="flex flex-col">
            <h2 className="text-[1.125rem] font-semibold mb-4">Incoming Transfer</h2>
            <div className="bg-surface-raised border border-border rounded-md p-4 mb-6 max-h-[200px] overflow-y-auto">
              <ul className="space-y-2">
                {incomingOffer.files.map(f => (
                  <li key={f.id} className="flex justify-between text-[0.9375rem]">
                    <span className="truncate mr-4 text-text">{f.name}</span>
                    <span className="font-mono text-text-muted flex-shrink-0">{formatBytes(f.size)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-between items-center mb-6">
               <span className="text-text-muted text-[0.9375rem]">Total size</span>
               <span className="font-mono text-[1.125rem] font-medium text-text">{formatBytes(incomingOffer.totalBytes)}</span>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={handleReject}>Decline</Button>
              <Button variant="primary" className="flex-1" onClick={handleAccept}>Accept</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
