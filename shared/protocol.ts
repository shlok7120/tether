// Signaling Messages (Client -> Server)
export type ClientMessage =
  | { t: "create" }
  | { t: "join"; code: string }
  | { t: "signal"; data: unknown }
  | { t: "leave" };

// Signaling Messages (Server -> Client)
export type ServerMessage =
  | { t: "created"; code: string }
  | { t: "joined" }
  | { t: "peer-joined" }
  | { t: "peer-left" }
  | { t: "signal"; data: unknown }
  | { t: "error"; reason: "room-not-found" | "room-full" | "expired" };

// Transfer Protocol Messages (DataChannel)
export type FileInfo = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type TransferMessage =
  | { t: "offer-files"; files: FileInfo[]; totalBytes: number }
  | { t: "accept" }
  | { t: "reject" }
  | { t: "file-start"; id: string; chunkSize: number }
  | { t: "file-end"; id: string; sha256: string }
  | { t: "progress"; id: string; receivedBytes: number } // receiver -> sender, every ~250ms
  | { t: "cancel"; id: string }
  | { t: "all-done" };
