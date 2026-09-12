import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { usePeerConnection } from "../hooks/usePeerConnection";

type ViewState = "landing" | "sender-room" | "receiver-room" | "transfer" | "complete";

type TransferContextType = ReturnType<typeof usePeerConnection> & {
  isSender: boolean;
  setIsSender: (v: boolean) => void;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  view: ViewState;
  setView: (v: ViewState) => void;
  connectionError: string | null;
  forceRelay: boolean;
  setForceRelay: React.Dispatch<React.SetStateAction<boolean>>;
};

const Context = createContext<TransferContextType | null>(null);

export function TransferProvider({ children }: { children: ReactNode }) {
  const [isSender, setIsSender] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [forceRelay, setForceRelay] = useState(false);

  const peer = usePeerConnection(`ws://${window.location.hostname}:8080`, forceRelay);
  
  // URL auto-fill
  const queryParams = new URLSearchParams(window.location.search);
  const initialCode = queryParams.get("code");
  
  const [view, setView] = useState<ViewState>(initialCode ? "receiver-room" : "landing");

  return (
    <Context.Provider value={{ ...peer, isSender, setIsSender, files, setFiles, view, setView, forceRelay, setForceRelay }}>
      {children}
    </Context.Provider>
  );
}

export function useTransfer() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useTransfer must be used within TransferProvider");
  return ctx;
}
