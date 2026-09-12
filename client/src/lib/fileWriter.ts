export class FileWriter {
  private writable?: FileSystemWritableFileStream;
  private chunks: ArrayBuffer[] = [];
  private totalSize: number = 0;
  private isNative: boolean = false;
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  async init(size: number) {
    if ("showSaveFilePicker" in window) {
      try {
        // @ts-ignore - TS doesn't have File System Access API types built-in by default
        const handle = await window.showSaveFilePicker({
          suggestedName: this.name,
        });
        this.writable = await handle.createWritable();
        this.isNative = true;
        return;
      } catch (err: any) {
        if (err.name === "AbortError") {
          throw new Error("User cancelled file save");
        }
        // Fallback to memory approach if it fails for other reasons
        console.warn("showSaveFilePicker failed, falling back to memory:", err);
      }
    }

    // Fallback approach
    const MAX_SIZE = 500 * 1024 * 1024;
    if (size > MAX_SIZE) {
      throw new Error("Your browser can't stream large files to disk. Use Chrome or Edge for files over 500 MB.");
    }
    this.isNative = false;
  }

  async write(chunk: ArrayBuffer) {
    this.totalSize += chunk.byteLength;
    if (this.isNative && this.writable) {
      await this.writable.write(chunk);
    } else {
      this.chunks.push(chunk);
    }
  }

  async close() {
    if (this.isNative && this.writable) {
      await this.writable.close();
    } else if (!this.isNative) {
      const blob = new Blob(this.chunks);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = this.name;
      a.click();
      URL.revokeObjectURL(url);
      this.chunks = [];
    }
  }

  async abort() {
    if (this.isNative && this.writable) {
      try {
        await this.writable.abort();
      } catch (e) {
        console.error("Error aborting stream:", e);
      }
    }
    this.chunks = [];
  }
}
