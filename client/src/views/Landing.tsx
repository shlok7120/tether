import React, { useState } from "react";
import { useTransfer } from "../context/TransferContext";
import { Button } from "../components/Button";

export function Landing() {
  const { createRoom, joinRoom, isSignalingConnected, setIsSender, setView } = useTransfer();
  const [code, setCode] = useState("");

  const handleCreate = () => {
    setIsSender(true);
    createRoom();
    setView("sender-room");
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 0) return;
    setIsSender(false);
    joinRoom(code.trim().toLowerCase());
    setView("receiver-room");
  };

  return (
    <div className="flex flex-col items-center mt-8">
      <div className="mb-12 text-center">
        <p className="text-[1.125rem] text-text-muted">
          Send files straight from one device to another. Nothing is uploaded.
        </p>
      </div>

      <div className="w-full bg-surface border border-border rounded-[10px] p-8 mb-8 flex flex-col gap-6 shadow-sm">
        <Button 
          variant="primary" 
          size="md" 
          className="w-full py-4 text-base" 
          onClick={handleCreate}
          disabled={!isSignalingConnected}
        >
          Send a file
        </Button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink-0 mx-4 text-text-faint text-[0.6875rem] font-mono uppercase tracking-[0.12em]">OR</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <form onSubmit={handleJoin} className="flex gap-3">
          <input 
            type="text" 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter a code"
            className="flex-1 bg-bg border border-border rounded-[6px] px-4 py-2 text-text font-mono text-center focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <Button type="submit" variant="secondary" size="md" disabled={!isSignalingConnected || !code.trim()}>
            Join
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-3 text-center w-full max-w-sm">
        <div className="text-[0.9375rem] text-text-muted flex justify-between border-b border-border pb-3">
          <span>No uploads</span>
          <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <div className="text-[0.9375rem] text-text-muted flex justify-between border-b border-border pb-3">
          <span>No file size limit</span>
          <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <div className="text-[0.9375rem] text-text-muted flex justify-between pb-3">
          <span>Nothing stored</span>
          <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
      </div>
    </div>
  );
}
