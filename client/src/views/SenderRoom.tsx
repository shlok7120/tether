import { useTransfer } from "../context/TransferContext";
import { RoomCodePanel } from "../components/RoomCodePanel";
import { DropZone } from "../components/DropZone";
import { FileRow } from "../components/FileRow";
import { Button } from "../components/Button";
import { ErrorPanel } from "../components/ErrorPanel";

export function SenderRoom() {
  const { roomCode, connectionState, connectionError, files, setFiles, sendFiles, setView } = useTransfer();

  const handleFilesAdded = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (files.length > 0) {
      sendFiles(files);
      setView("transfer");
    }
  };

  const isConnected = connectionState.startsWith("connected");
  
  if (connectionError) {
    let msg = "An error occurred.";
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

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col">
      <div className="bg-surface border border-border rounded-[10px] p-6 shadow-sm mb-8">
        {roomCode ? (
          <RoomCodePanel code={roomCode} />
        ) : (
          <div className="h-[260px] flex items-center justify-center font-mono text-text-muted">
            Generating code...
          </div>
        )}
      </div>

      <div className="mb-6">
        <DropZone onFilesAdded={handleFilesAdded} />
      </div>

      {files.length > 0 && (
        <div className="bg-surface border border-border rounded-[10px] shadow-sm mb-8 overflow-hidden">
          {files.map((file, i) => (
            <FileRow 
              key={`${file.name}-${i}`} 
              file={file} 
              onRemove={() => handleRemoveFile(i)} 
            />
          ))}
        </div>
      )}

      <Button 
        variant="primary" 
        size="md" 
        className="w-full py-4 text-base"
        disabled={!isConnected || files.length === 0}
        onClick={handleSend}
      >
        {!isConnected 
          ? "Waiting for someone to join" 
          : files.length === 0 
            ? "Add files to send" 
            : `Send ${files.length} file${files.length > 1 ? 's' : ''} · ${formatBytes(totalSize)}`
        }
      </Button>
    </div>
  );
}
