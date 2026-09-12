import { useState, useEffect, useRef, useCallback } from "react";
import { RTCManager } from "../lib/webrtc";
import type { ConnectionState } from "../lib/webrtc";
import type { ServerMessage, FileInfo } from "../../../shared/protocol";
import { SenderTransfer, ReceiverTransfer } from "../lib/transfer";

export function usePeerConnection(wsUrl: string, forceRelay: boolean = false) {
  const ws = useRef<WebSocket | null>(null);
  const rtcManager = useRef<RTCManager | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  
  const senderTransfer = useRef<SenderTransfer | null>(null);
  const receiverTransfer = useRef<ReceiverTransfer | null>(null);
  
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);

  // Transfer state
  const [transferState, setTransferState] = useState<string>("idle");
  const [progress, setProgress] = useState<{ fileId: string, bytes: number, status?: "queued" | "sending" | "verifying" | "done" | "failed" }>({ fileId: "", bytes: 0 });
  const [incomingOffer, setIncomingOffer] = useState<{ files: FileInfo[], totalBytes: number } | null>(null);

  useEffect(() => {
    let active = true;
    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      if (!active) return;
      setIsSignalingConnected(true);
    };

    socket.onclose = () => {
      if (!active) return;
      setIsSignalingConnected(false);
    };

    socket.onmessage = async (e) => {
      if (!active) return;
      const msg = JSON.parse(e.data) as ServerMessage;
      
      switch (msg.t) {
        case "created":
          setRoomCode(msg.code);
          break;
        case "joined":
          setConnectionState("idle");
          setConnectionError(null);
          setReceivedMessages([]);
          setTransferState("idle");
          setIncomingOffer(null);
          break;
        case "peer-joined":
          if (!rtcManager.current) {
            initRTC();
          }
          await rtcManager.current?.createOffer();
          break;
        case "peer-left":
          setConnectionState("disconnected");
          break;
        case "signal":
          if (!rtcManager.current) {
            initRTC();
          }
          await rtcManager.current?.handleSignal(msg.data);
          break;
        case "error":
          console.error("Signaling error:", msg.reason);
          setConnectionState("failed");
          setConnectionError(msg.reason);
          break;
      }
    };
    
    return () => {
      active = false;
      socket.close();
      if (senderTransfer.current) senderTransfer.current.cancel();
      if (receiverTransfer.current) receiverTransfer.current.cleanup();
      rtcManager.current?.close();
      rtcManager.current = null;
    };
  }, [wsUrl]);

  const initRTC = useCallback(() => {
    rtcManager.current = new RTCManager({
      forceRelay,
      onStateChange: (state) => setConnectionState(state),
      onDataChannel: (dc) => {
        dcRef.current = dc;
        
        receiverTransfer.current = new ReceiverTransfer(
          dc,
          (files, totalBytes) => setIncomingOffer({ files, totalBytes }),
          (fileId, bytes, status) => setProgress({ fileId, bytes, status }),
          () => { setTransferState("Complete"); },
          (msg) => setTransferState(`Error: ${msg}`)
        );

        dc.onmessage = (e) => {
          if (typeof e.data === "string") {
            try {
              const msg = JSON.parse(e.data);
              if (msg.t && ["offer-files", "accept", "reject", "file-start", "file-end", "progress", "cancel", "all-done"].includes(msg.t)) {
                if (senderTransfer.current) senderTransfer.current.handleMessage(e);
                if (receiverTransfer.current) receiverTransfer.current.handleMessage(e);
                return;
              }
            } catch (err) {
              // Not JSON, just text
            }
            setReceivedMessages(prev => [...prev, e.data]);
          } else {
             if (receiverTransfer.current) receiverTransfer.current.handleMessage(e);
          }
        };
      },
      sendSignaling: (msg) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify(msg));
        }
      }
    });
  }, []);

  const createRoom = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ t: "create" }));
    }
  }, []);

  const joinRoom = useCallback((code: string) => {
    setRoomCode(code);
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ t: "join", code }));
    }
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (dcRef.current?.readyState === "open") {
      dcRef.current.send(text);
    } else {
      console.error("Data channel not open");
    }
  }, []);

  const sendFiles = useCallback((files: File[]) => {
    if (dcRef.current) {
      senderTransfer.current = new SenderTransfer(
        files,
        dcRef.current,
        (fileId, bytes, status) => setProgress({ fileId, bytes, status }),
        (state) => setTransferState(state)
      );
      senderTransfer.current.start();
    }
  }, []);

  const acceptTransfer = useCallback(() => {
    receiverTransfer.current?.accept();
    setTransferState("Receiving...");
  }, []);

  const rejectTransfer = useCallback(() => {
    receiverTransfer.current?.reject();
    setIncomingOffer(null);
    setTransferState("Rejected");
  }, []);

  const cancelTransfer = useCallback(() => {
    if (senderTransfer.current) senderTransfer.current.cancel();
    if (receiverTransfer.current) receiverTransfer.current.cancel();
    setTransferState("Cancelled");
  }, []);

  const disconnect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ t: "leave" }));
    }
    rtcManager.current?.close();
    rtcManager.current = null;
    setConnectionState("idle");
    setRoomCode(null);
  }, []);

  return {
    isSignalingConnected,
    roomCode,
    connectionState,
    connectionError,
    receivedMessages,
    transferState,
    progress,
    incomingOffer,
    createRoom,
    joinRoom,
    sendMessage,
    sendFiles,
    acceptTransfer,
    rejectTransfer,
    cancelTransfer,
    disconnect
  };
}
