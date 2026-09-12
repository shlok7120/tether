import type { FileInfo } from "../../../shared/protocol";

interface FileRowProps {
  file: File | FileInfo;
  onRemove?: () => void;
  progress?: number; // bytes
  status?: "queued" | "sending" | "verifying" | "done" | "failed";
}

export function FileRow({ file, onRemove, progress, status }: FileRowProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const percentage = progress !== undefined ? Math.min(100, Math.round((progress / file.size) * 100)) : 0;

  return (
    <div className="h-[56px] border-b border-border last:border-b-0 flex items-center px-4 hover:bg-surface-raised transition-colors group relative overflow-hidden">
      
      {/* Background Progress Bar */}
      {progress !== undefined && status !== "done" && status !== "failed" && (
        <div 
          className="absolute left-0 top-0 bottom-0 bg-surface-raised -z-10 motion-safe:transition-[width] duration-150 ease-out" 
          style={{ width: `${percentage}%` }}
        />
      )}

      {/* File Type Glyph */}
      <div className="flex-shrink-0 mr-3 text-text-muted">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>

      {/* Filename with Middle Ellipsis */}
      <div className="flex-1 min-w-0 mr-4 flex text-[0.9375rem] text-text">
        <div className="truncate shrink">
          {file.name.substring(0, file.name.lastIndexOf('.')) || file.name}
        </div>
        {file.name.includes('.') && (
          <div className="shrink-0">
            {file.name.substring(file.name.lastIndexOf('.'))}
          </div>
        )}
      </div>

      {/* Size / Status */}
      <div className="flex-shrink-0 flex items-center gap-4">
        {status ? (
          <span className={`font-mono text-[0.8125rem] tabular-nums ${status === 'failed' ? 'text-danger' : status === 'done' ? 'text-accent' : 'text-text-muted'}`}>
            {status === "sending" ? `${percentage}%` : status}
          </span>
        ) : (
          <span className="font-mono text-[0.8125rem] text-text-faint tabular-nums">
            {formatBytes(file.size)}
          </span>
        )}
        
        {onRemove && (
          <button 
            onClick={onRemove}
            className="text-text-muted hover:text-danger p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Remove file"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
