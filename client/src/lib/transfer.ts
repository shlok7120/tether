import { sha256 } from "js-sha256";
import type { FileInfo, TransferMessage } from "../../../shared/protocol";
import { FileWriter } from "./fileWriter";

const CHUNK_SIZE = 16384; // 16 KiB
const HIGH_WATER_MARK = 8388608; // 8 MiB
const LOW_WATER_MARK = 1048576; // 1 MiB

export class SenderTransfer {
  files: File[];
  channel: RTCDataChannel;
  onProgress: (fileId: string, bytes: number, status?: "queued" | "sending" | "verifying" | "done" | "failed") => void;
  onStateChange: (state: string) => void;
  private cancelFlag = false;

  constructor(
    files: File[], 
    channel: RTCDataChannel, 
    onProgress: (fileId: string, bytes: number, status?: "queued" | "sending" | "verifying" | "done" | "failed") => void,
    onStateChange: (state: string) => void
  ) {
    this.files = files;
    this.channel = channel;
    this.onProgress = onProgress;
    this.onStateChange = onStateChange;
    this.channel.bufferedAmountLowThreshold = LOW_WATER_MARK;
  }

  start() {
    const fileInfos: FileInfo[] = this.files.map((f, i) => ({
      id: `file-${i}`,
      name: f.name,
      size: f.size,
      type: f.type
    }));
    const totalBytes = fileInfos.reduce((acc, f) => acc + f.size, 0);

    this.sendControl({ t: "offer-files", files: fileInfos, totalBytes });
    this.onStateChange("Waiting for receiver to accept...");
  }

  cancel() {
    this.cancelFlag = true;
    this.sendControl({ t: "cancel", id: "all" });
    this.onStateChange("Cancelled");
  }

  private sendControl(msg: TransferMessage) {
    if (this.channel.readyState === "open") {
      this.channel.send(JSON.stringify(msg));
    }
  }

  private waitForBuffer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.channel.bufferedAmount <= HIGH_WATER_MARK) {
        resolve();
      } else {
        const listener = () => {
          this.channel.removeEventListener("bufferedamountlow", listener);
          resolve();
        };
        this.channel.addEventListener("bufferedamountlow", listener);
      }
    });
  }

  async handleMessage(e: MessageEvent) {
    if (typeof e.data === "string") {
      const msg = JSON.parse(e.data) as TransferMessage;
      if (msg.t === "accept") {
        await this.sendAccepted();
      } else if (msg.t === "reject") {
        this.onStateChange("Receiver rejected the files.");
      } else if (msg.t === "cancel") {
        this.cancelFlag = true;
        this.onStateChange("Receiver cancelled the transfer.");
      }
    }
  }

  async sendAccepted() {
    for (let i = 0; i < this.files.length; i++) {
      if (this.cancelFlag) break;
      const file = this.files[i];
      const fileId = `file-${i}`;
      
      this.sendControl({ t: "file-start", id: fileId, chunkSize: CHUNK_SIZE });
      this.onStateChange(`Sending ${file.name}`);
      this.onProgress(fileId, 0, "sending");

      const hash = sha256.create();
      let offset = 0;

      while (offset < file.size) {
        if (this.cancelFlag) break;
        await this.waitForBuffer();

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const chunk = await slice.arrayBuffer();
        
        hash.update(chunk);
        this.channel.send(chunk);
        
        offset += chunk.byteLength;
        this.onProgress(fileId, offset, "sending");
      }

      if (!this.cancelFlag) {
        this.onProgress(fileId, file.size, "verifying");
        this.sendControl({ t: "file-end", id: fileId, sha256: hash.hex() });
        this.onProgress(fileId, file.size, "done");
      }
    }

    if (!this.cancelFlag) {
      this.sendControl({ t: "all-done" });
      this.onStateChange("All Done");
    }
  }
}

export class ReceiverTransfer {
  channel: RTCDataChannel;
  onOffer: (files: FileInfo[], totalBytes: number) => void;
  onProgress: (fileId: string, bytes: number, status?: "queued" | "sending" | "verifying" | "done" | "failed") => void;
  onComplete: () => void;
  onError: (msg: string) => void;

  private offeredFiles: FileInfo[] = [];
  private currentFile: FileInfo | null = null;
  private writer: FileWriter | null = null;
  private hash: any = null;
  private receivedBytes = 0;
  private lastProgressTime = 0;

  constructor(
    channel: RTCDataChannel,
    onOffer: (files: FileInfo[], totalBytes: number) => void,
    onProgress: (fileId: string, bytes: number, status?: "queued" | "sending" | "verifying" | "done" | "failed") => void,
    onComplete: () => void,
    onError: (msg: string) => void
  ) {
    this.channel = channel;
    this.channel.binaryType = "arraybuffer"; // Ensure we receive ArrayBuffer
    this.onOffer = onOffer;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;
  }

  private sendControl(msg: TransferMessage) {
    if (this.channel.readyState === "open") {
      this.channel.send(JSON.stringify(msg));
    }
  }

  accept() {
    this.sendControl({ t: "accept" });
  }

  reject() {
    this.sendControl({ t: "reject" });
  }

  cancel() {
    this.sendControl({ t: "cancel", id: "all" });
    if (this.writer) {
      this.writer.abort();
    }
  }

  async handleMessage(e: MessageEvent) {
    if (typeof e.data === "string") {
      const msg = JSON.parse(e.data) as TransferMessage;
      
      switch (msg.t) {
        case "offer-files":
          this.offeredFiles = msg.files;
          this.onOffer(msg.files, msg.totalBytes);
          break;
        case "file-start": {
          this.currentFile = this.offeredFiles.find(f => f.id === msg.id) || null;
          if (!this.currentFile) {
            this.onError("Received file-start for unknown file");
            return;
          }
          this.writer = new FileWriter(this.currentFile.name);
          this.hash = sha256.create();
          this.receivedBytes = 0;
          this.onProgress(this.currentFile.id, 0, "sending");
          try {
            await this.writer.init(this.currentFile.size);
          } catch (err: any) {
            this.onError("Connection failed");
            this.cancel();
          }
          break;
        }
        case "file-end": {
          if (!this.currentFile) return;
          this.onProgress(this.currentFile.id, this.receivedBytes, "verifying");
          const finalHash = this.hash.hex();
          if (finalHash !== msg.sha256) {
            this.onError(`Hash mismatch for file ${this.currentFile.name}`);
            this.onProgress(this.currentFile.id, this.receivedBytes, "failed");
          } else {
            this.onProgress(this.currentFile.id, this.receivedBytes, "done");
          }
          await this.writer?.close();
          this.writer = null;
          this.currentFile = null;
          break;
        }
        case "all-done":
          this.onComplete();
          break;
        case "cancel":
          this.writer?.abort();
          this.onError("Transfer cancelled by sender");
          break;
      }
    } else if (e.data instanceof ArrayBuffer) {
      if (this.writer && this.currentFile) {
        await this.writer.write(e.data);
        this.hash.update(e.data);
        this.receivedBytes += e.data.byteLength;

        const now = Date.now();
        if (now - this.lastProgressTime > 250) {
          this.onProgress(this.currentFile.id, this.receivedBytes, "sending");
          this.sendControl({ t: "progress", id: this.currentFile.id, receivedBytes: this.receivedBytes });
          this.lastProgressTime = now;
        }
      }
    }
  }

  cleanup() {
    if (this.writer) {
      this.writer.abort();
    }
  }
}
