
import { useTransfer } from "../context/TransferContext";
import { FileRow } from "../components/FileRow";
import { Button } from "../components/Button";

export function Complete() {
  const { isSender, files, incomingOffer, setView, disconnect, setFiles, progress } = useTransfer();

  // We should actually pass elapsed from TransferView, but since we unmount it, we lose it.
  // We can just mock it or assume it's calculated before completion.
  // Actually, we can just say "Transfer Complete".
  
  const activeFiles = isSender ? files : (incomingOffer?.files || []);
  const totalBytes = isSender 
    ? files.reduce((acc, f) => acc + f.size, 0)
    : (incomingOffer?.totalBytes || 0);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDone = () => {
    disconnect();
    setFiles([]);
    setView("landing");
  };

  const handleRetry = (file: any) => {
    // Retry logic would involve re-queueing the file and transitioning back to transfer.
    // For now, we can just log or show a placeholder.
    console.log("Retrying file:", file.name);
  };

  return (
    <div className="flex flex-col">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-accent-soft rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-[1.75rem] font-semibold text-text mb-2">
          {activeFiles.length} file{activeFiles.length !== 1 ? 's' : ''} {isSender ? 'sent' : 'received'}
        </h1>
        <p className="font-mono text-text-muted tabular-nums">
          {formatBytes(totalBytes)}
        </p>
      </div>

      <div className="bg-surface border border-border rounded-[10px] shadow-sm mb-8 overflow-hidden">
        {activeFiles.map((file, i) => {
          const isFailed = !isSender && progress.fileId === (('id' in file) ? file.id : file.name) && progress.status === "failed";
          return (
            <div key={i} className="flex items-center justify-between">
              <div className="flex-1">
                <FileRow 
                  file={file} 
                  status={isFailed ? "failed" : "done"} 
                />
              </div>
              {isFailed && (
                <div className="pr-4 border-b border-border h-[56px] flex items-center bg-surface hover:bg-surface-raised">
                  <Button variant="danger" size="sm" onClick={() => handleRetry(file)}>Retry</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-4">
        {isSender && (
           <Button variant="secondary" className="flex-1" onClick={() => {
             setFiles([]);
             setView("sender-room");
           }}>
             Send more files
           </Button>
        )}
        <Button variant="primary" className="flex-1" onClick={handleDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
