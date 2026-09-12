import { useState, useEffect, useRef } from "react";
import { useTransfer } from "../context/TransferContext";
import { FileRow } from "../components/FileRow";
import { Button } from "../components/Button";
import { ErrorPanel } from "../components/ErrorPanel";

function StatBlock({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-text-faint text-[0.6875rem] font-mono uppercase tracking-[0.12em] mb-1">{label}</span>
      <span className="font-mono text-[1.125rem] text-text tabular-nums">{value}</span>
    </div>
  );
}

export function TransferView() {
  const { files, incomingOffer, progress, isSender, transferState, setView, cancelTransfer, connectionState } = useTransfer();
  
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Speed calculation buffer for rolling average
  const speedBuffer = useRef<{ timestamp: number, bytes: number }[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    if (transferState === "Complete" || transferState === "All Done") {
      setView("complete");
    }
  }, [transferState, setView]);

  const activeFiles = isSender ? files : (incomingOffer?.files || []);
  const totalBytes = isSender 
    ? files.reduce((acc, f) => acc + f.size, 0)
    : (incomingOffer?.totalBytes || 0);

  let bytesTransferred = 0;
  let activeFileFound = false;

  const fileStatuses = activeFiles.map(f => {
    const id = 'id' in f ? f.id : f.name;
    if (id === progress.fileId || f.name === progress.fileId) {
      activeFileFound = true;
      bytesTransferred += progress.bytes;
      return { file: f, status: progress.status || "sending", progress: progress.bytes };
    } else if (!activeFileFound && progress.fileId) {
      bytesTransferred += f.size;
      return { file: f, status: "done" as const, progress: f.size };
    } else {
      return { file: f, status: "queued" as const, progress: 0 };
    }
  });

  // Calculate rolling speed over last 3 seconds
  useEffect(() => {
    const now = Date.now();
    speedBuffer.current.push({ timestamp: now, bytes: bytesTransferred });
    // Keep only last 3 seconds
    speedBuffer.current = speedBuffer.current.filter(entry => now - entry.timestamp <= 3000);
  }, [bytesTransferred]);

  let speedBytesPerSec = 0;
  if (speedBuffer.current.length > 1) {
    const oldest = speedBuffer.current[0];
    const newest = speedBuffer.current[speedBuffer.current.length - 1];
    const timeDiff = newest.timestamp - oldest.timestamp;
    const bytesDiff = newest.bytes - oldest.bytes;
    if (timeDiff > 0) {
      speedBytesPerSec = bytesDiff / (timeDiff / 1000);
    }
  }

  const percentage = totalBytes > 0 ? Math.min(100, Math.floor((bytesTransferred / totalBytes) * 100)) : 0;
  const remainingBytes = totalBytes - bytesTransferred;
  const remainingSecs = speedBytesPerSec > 0 ? remainingBytes / speedBytesPerSec : 0;

  const formatSpeed = (bps: number) => {
    if (bps < 1024) return `${Math.round(bps)} B/s`;
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || secs <= 0) return "--:--";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCancel = () => {
    cancelTransfer();
    setView("landing");
  };

  // Mid-transfer disconnect
  if (connectionState === "disconnected" || connectionState === "failed") {
    return (
      <div className="flex flex-col">
        <ErrorPanel 
          message={`The other device disconnected. ${formatBytes(bytesTransferred)} of ${formatBytes(totalBytes)} was transferred.`}
          action={<Button variant="secondary" onClick={() => setView("landing")}>Try again</Button>}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="bg-surface border border-border rounded-[10px] p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 h-[8px] bg-surface-raised rounded-[4px] overflow-hidden mr-6" role="progressbar" aria-valuenow={percentage} aria-valuemax={100}>
            <div 
              className="h-full bg-accent transition-[width] duration-150 ease-out" 
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="font-mono text-[1.75rem] font-medium text-text w-16 text-right tabular-nums">
            {percentage}%
          </div>
        </div>

        <div className="flex flex-wrap gap-x-12 gap-y-6 mt-6">
          <StatBlock label="Speed" value={formatSpeed(speedBytesPerSec)} />
          <StatBlock label="Elapsed" value={formatTime(elapsed / 1000)} />
          <StatBlock label="Remaining" value={formatTime(remainingSecs)} />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-[10px] shadow-sm mb-8 overflow-hidden">
        {fileStatuses.map((fs, i) => (
          <FileRow 
            key={i} 
            file={fs.file} 
            status={fs.status} 
            progress={fs.progress} 
          />
        ))}
      </div>

      <Button variant="danger" className="w-full" onClick={handleCancel}>
        Cancel transfer
      </Button>
    </div>
  );
}
