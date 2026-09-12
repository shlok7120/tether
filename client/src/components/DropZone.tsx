import React, { useRef, useState } from "react";

export function DropZone({ onFilesAdded }: { onFilesAdded: (files: File[]) => void }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(Array.from(e.target.files));
    }
  };

  return (
    <div 
      className={`min-h-[200px] rounded-[10px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        isDragOver ? "border-accent bg-accent-soft" : "border-border-strong bg-surface"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input 
        type="file" 
        multiple 
        ref={inputRef} 
        onChange={handleChange} 
        className="hidden" 
      />
      
      {/* Upload glyph (SVG) */}
      <svg className={`w-8 h-8 mb-4 ${isDragOver ? 'text-accent' : 'text-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>

      <div className="text-[0.9375rem] font-medium text-text mb-1">
        {isDragOver ? "Release to add" : "Drop files here"}
      </div>
      <div className="text-[0.8125rem] text-text-faint">
        or click to browse
      </div>
    </div>
  );
}
