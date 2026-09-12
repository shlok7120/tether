
import type { ConnectionState } from "../lib/webrtc";

export function ConnectionBadge({ state, isSignalingConnected }: { state: ConnectionState, isSignalingConnected: boolean }) {
  let dotColor = "";
  let label = "";
  let pulse = false;

  if (!isSignalingConnected) {
    dotColor = "bg-danger";
    label = "Server disconnected";
  } else if (state === "idle") {
    dotColor = "bg-text-faint";
    label = "Waiting for peer";
  } else if (state === "connecting") {
    dotColor = "bg-warn";
    label = "Connecting";
    pulse = true;
  } else if (state === "connected direct") {
    dotColor = "bg-accent";
    label = "Connected · direct";
  } else if (state === "connected relay") {
    dotColor = "bg-warn";
    label = "Connected · via relay";
  } else if (state === "disconnected") {
    dotColor = "bg-danger";
    label = "Peer disconnected";
  } else if (state === "failed") {
    dotColor = "bg-danger";
    label = "Connection failed";
  }

  return (
    <div className="flex items-center gap-2" aria-live="polite" aria-atomic="true">
      <div className={`w-2 h-2 rounded-full ${dotColor} ${pulse ? "motion-safe:animate-pulse" : ""}`} aria-hidden="true" />
      <span className="text-text-muted text-[0.8125rem] font-mono">{label}</span>
    </div>
  );
}
