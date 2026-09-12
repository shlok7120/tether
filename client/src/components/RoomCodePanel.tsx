import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { Button } from "./Button";

export function RoomCodePanel({ code }: { code: string }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  const joinUrl = `${window.location.origin}/?code=${code}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, joinUrl, {
        width: 160,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    }
  }, [joinUrl]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeString = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-2 rounded-md mb-6">
        <canvas ref={canvasRef} width="160" height="160" />
      </div>
      
      <div className="flex items-center gap-3 mb-4">
        <div className="font-mono text-[2.5rem] font-medium tracking-[0.02em] text-text">
          {code}
        </div>
        <Button variant="secondary" size="sm" onClick={copyCode} className="focus-visible:ring-2 focus-visible:ring-accent">
          {copiedCode ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-2 bg-surface-raised px-3 py-1.5 rounded border border-border">
        <span className="font-mono text-[0.8125rem] text-text-muted truncate max-w-[200px] sm:max-w-[300px]">
          {joinUrl}
        </span>
        <button onClick={copyLink} className="text-[0.8125rem] text-accent hover:text-accent-hover font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded px-1">
          {copiedLink ? "Copied" : "Copy link"}
        </button>
      </div>

      <div className="text-[0.8125rem] text-text-faint font-mono tabular-nums">
        Expires in {timeString}
      </div>
    </div>
  );
}
