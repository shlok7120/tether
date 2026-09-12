Project: Tether

A peer-to-peer file transfer web app. Two browsers connect directly over WebRTC and send files to each other. The server only introduces the two browsers; file bytes never pass through it and nothing is ever stored.

The primary use case is a person sending a large file from their laptop to their phone, or to a friend's laptop across the room, without uploading it anywhere.

Non-negotiable principles
File data travels only over an RTCDataChannel. Never upload file content to the signalling server or any other HTTP endpoint.
There is no database. Room state lives in memory on the signalling server and expires. Nothing about a transfer is persisted server-side.
The receiver must stream chunks to disk as they arrive. Never accumulate an entire file in memory as a growing array of chunks, except in the explicitly-bounded fallback path described below.
Every transfer must handle backpressure. Ignoring bufferedAmount will crash the tab on large files.
Tech stack — use exactly this, do not substitute

Frontend (/client)

React 18 + TypeScript
Vite as the build tool
Tailwind CSS for styling
qrcode npm package for QR generation
No UI component library. No Redux. Use React hooks and a single context for transfer state.
No router — the app is a single page with view states.

Signalling server (/server)

Node.js + TypeScript
ws package for WebSockets
No Express unless a health-check endpoint is needed
In-memory Map for rooms, with TTL cleanup

Shared (/shared)

TypeScript type definitions for all protocol messages, imported by both sides
Repository structure
tether/
├── client/
│   ├── src/
│   │   ├── components/      # presentational components
│   │   ├── hooks/           # useSignalling, usePeerConnection, useFileTransfer
│   │   ├── lib/             # webrtc.ts, transfer.ts, fileWriter.ts, format.ts
│   │   ├── context/         # TransferContext.tsx
│   │   ├── views/           # Landing, SenderRoom, ReceiverRoom, TransferView, Complete
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.ts
├── server/
│   └── src/
│       ├── index.ts
│       └── rooms.ts
├── shared/
│   └── protocol.ts
└── README.md
Architecture and data flow
Sender browser                Signalling server               Receiver browser
      |                       (WebSocket only)                      |
      |---- create room ------------->|                             |
      |<--- room code ----------------|                             |
      |                               |<--------- join(code) -------|
      |<--- peer-joined --------------|---------- joined ---------->|
      |---- SDP offer --------------->|--------- SDP offer -------->|
      |<--- SDP answer ---------------|<-------- SDP answer --------|
      |<--> ICE candidates <--------->|<---> ICE candidates <------->|
      |                               |                             |
      |============ RTCDataChannel (direct, DTLS encrypted) ========>|
      |                 file bytes never touch the server            |
Signalling protocol (WebSocket, JSON)

Client to server:

ts
{ t: "create" }
{ t: "join", code: string }
{ t: "signal", data: unknown }   // SDP or ICE, relayed verbatim to the other peer
{ t: "leave" }

Server to client:

ts
{ t: "created", code: string }
{ t: "joined" }
{ t: "peer-joined" }
{ t: "peer-left" }
{ t: "signal", data: unknown }
{ t: "error", reason: "room-not-found" | "room-full" | "expired" }

Rules:

A room holds a maximum of 2 peers.
Room codes are three lowercase words joined by hyphens, drawn from a 256-word list (example: brisk-otter-lamp). Never random alphanumeric strings — people read these aloud.
Rooms expire 10 minutes after creation if no peer joins, and are deleted immediately when both peers disconnect.
Transfer protocol (over the RTCDataChannel)

Two kinds of messages travel on the channel:

Control messages: JSON strings
File data: raw ArrayBuffer chunks

Control messages:

ts
{ t: "offer-files", files: { id: string; name: string; size: number; type: string }[]; totalBytes: number }
{ t: "accept" }
{ t: "reject" }
{ t: "file-start", id: string, chunkSize: number }
{ t: "file-end",   id: string, sha256: string }
{ t: "progress",   id: string, receivedBytes: number }   // receiver -> sender, every ~250ms
{ t: "cancel",     id: string }
{ t: "all-done" }

Transfer rules — follow these exactly:

Files are sent one at a time, sequentially. Never interleave chunks from two files.
Because of that, binary chunks need no header. After file-start, every binary message belongs to that file, in order, until file-end.
Chunk size: 16384 bytes (16 KiB). Never exceed 65536; the practical data channel message ceiling is around 256 KiB and behaviour near it is inconsistent across browsers.
Backpressure: set channel.bufferedAmountLowThreshold = 1048576 (1 MiB). Before sending a chunk, if channel.bufferedAmount > 8388608 (8 MiB), await the bufferedamountlow event before continuing.
Read the source file with file.stream().getReader() or sliced Blob.arrayBuffer() calls. Never call readAsArrayBuffer on the whole file.
Compute SHA-256 incrementally while sending, and again while receiving, then compare.
Receiver disk writing
Preferred: window.showSaveFilePicker() → createWritable() → write each chunk as it arrives → close() at the end. This keeps memory flat regardless of file size.
Fallback when the File System Access API is unavailable (Firefox, Safari): accumulate chunks in an array and build a Blob at the end, but only for files under 500 MB. For anything larger, show a clear message: "Your browser can't stream large files to disk. Use Chrome or Edge for files over 500 MB."
WebRTC configuration
ts
const config: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // TURN credentials injected from env vars, added in a later task
  ],
};

Create the data channel on the sender side with:

ts
pc.createDataChannel("tether", { ordered: true });

Ordered delivery is required — the protocol depends on chunk order.

After connection, read pc.getStats() to determine whether the selected candidate pair is host/srflx (direct) or relay (TURN), and surface that in the UI.

UI Design System

Follow this exactly. Do not introduce other colours, fonts, or radii.

Colour tokens

Define these as CSS custom properties on :root and extend Tailwind's theme to use them. Dark is the default look; light mode is supported via prefers-color-scheme and an explicit toggle.

Dark (default)

Token	Value	Use
--bg	
#0C1215	page background
--surface	
#141C20	cards, panels
--surface-raised	
#1B2429	drop zone, hovered rows
--border	
#243036	all hairlines
--border-strong	
#334349	emphasised edges
--text	
#E4ECEE	primary text
--text-muted	
#92A5AC	secondary text, labels
--text-faint	
#6E838B	metadata, hints
--accent	
#3CC5A8	primary actions, progress, connected state
--accent-hover	
#4FD9BB	hover on accent
--accent-soft	
#123029	accent-tinted backgrounds
--warn	
#D79052	relayed connection, non-fatal warnings
--danger	
#E06C6C	errors, cancel, failed transfers

Light

Token	Value
--bg	
#ECEFF1
--surface	
#FFFFFF
--surface-raised	
#F4F6F7
--border	
#D5DDE0
--border-strong	
#B9C5CA
--text	
#111A1E
--text-muted	
#55677F
--text-faint	
#7F9097
--accent	
#0E7A68
--accent-hover	
#0B6252
--accent-soft	
#D7EBE6
--warn	
#9A5518
--danger	
#B4433F
Typography

Load from Google Fonts:

html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
IBM Plex Sans — all interface text. Weights 400 / 500 / 600 only.
IBM Plex Mono — room codes, file sizes, transfer speeds, byte counts, percentages, ETAs, technical labels. Any number that changes while you watch it is mono.
Always declare a fallback stack: "IBM Plex Sans", system-ui, sans-serif.

Type scale (rem, do not deviate):

Role	Size	Weight	Notes
Room code	2.5rem	500	mono, letter-spacing 0.02em
Page heading	1.75rem	600	
Section heading	1.125rem	600	
Body	0.9375rem	400	line-height 1.6
Label / eyebrow	0.6875rem	500	mono, uppercase, letter-spacing 0.12em, muted
Metadata	0.8125rem	400	mono for numbers

Use font-variant-numeric: tabular-nums on every element containing a changing number, so progress figures do not jitter.

Spacing, shape, motion
Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64 px only.
Border radius: 6px on buttons, inputs and small chips; 10px on cards and the drop zone. Nothing is fully rounded except the connection status dot.
Borders are 1px solid var(--border). The drop zone uses 2px dashed.
Shadows: none, except a subtle one on modals. This is a technical tool — depth comes from surface colour, not drop shadows.
Transitions: 150ms ease for colour and border changes, 250ms ease-out for layout.
Respect prefers-reduced-motion: reduce — disable the progress shimmer and any pulsing.
Components to build

Button — variants primary (accent fill, dark text), secondary (transparent, border, muted text), danger (transparent, danger border and text), ghost (text only). Sizes md (40px) and sm (32px). Every button has a visible :focus-visible ring in accent.

DropZone — large area, 2px dashed var(--border-strong), radius 10px, minimum height 200px. On dragover: border becomes accent, background becomes --accent-soft, and the label changes to "Release to add". Contains an upload glyph, the text "Drop files here", and a smaller "or click to browse" line. Entire zone is clickable and keyboard-focusable.

RoomCodePanel — the room code in large mono with a copy button, a QR code (160×160, white quiet zone even in dark mode so phone cameras read it reliably), and the joinable URL in small mono with its own copy button. A muted line underneath: "Expires in 9:58", counting down.

FileRow — file type glyph, name (truncated with ellipsis in the middle, never at the end, so extensions stay visible), size in mono, and a remove button before transfer starts or a per-file progress bar during transfer. Fixed height 56px. Rows are separated by 1px borders, not gaps.

ProgressBar — 6px tall, radius 3px, track --surface-raised, fill --accent, width transitions at 150ms. A file-level bar sits inside its row; the session-level bar is 8px and sits above the queue.

ConnectionBadge — a small dot plus a label. States and colours:

State	Dot	Label
idle	--text-faint	Waiting for peer
connecting	--warn, slow pulse	Connecting
connected direct	--accent	Connected · direct
connected relay	--warn	Connected · via relay
disconnected	--danger	Peer disconnected
failed	--danger	Connection failed

StatBlock — used for speed, ETA and bytes transferred. A mono value at 1.125rem with an uppercase mono label above it in --text-faint. Three of these sit in a row during transfer.

Modal — used only for the receiver's accept prompt. Centred, max-width 420px, --surface background, 1px border, subtle shadow, backdrop rgba(0,0,0,0.6). Closes on Escape. Focus is trapped inside while open.

Toast — bottom-centre on mobile, bottom-right on desktop. Auto-dismiss after 4s. Variants: info, success, error. Used for copy confirmations and non-blocking errors.

Layout
One centred column, max-width: 560px, horizontally centred, with padding-inline: 20px at every width.
Vertical rhythm: 32px between major blocks, 16px within a block.
A slim header bar at the top: the wordmark "tether" in mono lowercase on the left, and the theme toggle plus ConnectionBadge on the right.
Content is top-aligned with 48px of top padding on desktop, 24px on mobile. Do not vertically centre the whole app — it jumps as content grows.
Screen specifications

1. Landing — wordmark, a one-line description ("Send files straight from one device to another. Nothing is uploaded."), then two primary paths: a "Send a file" button that creates a room, and a "Enter a code" input with a "Join" button. Below, three short value lines in muted text: "No uploads", "No file size limit", "Nothing stored".

2. Sender room (waiting) — RoomCodePanel at the top, DropZone below it, then the file queue as the user adds files, then a disabled "Send" button reading "Waiting for someone to join". ConnectionBadge shows idle. When the peer joins, the badge flips to connected and the button becomes enabled and reads "Send 3 files · 1.2 GB".

3. Receiver room (joining) — code input state, then "Connecting…" with the badge in its connecting state, then the accept Modal listing incoming files with names, sizes and the total, with "Accept" and "Decline" buttons. Nothing downloads before Accept is pressed.

4. Transfer view — session ProgressBar at the top with a large mono percentage beside it, then the three StatBlocks (speed, elapsed, remaining), then the file queue with each row showing its own progress and a per-file status: queued, sending, verifying, done, failed. A "Cancel transfer" danger button at the bottom.

5. Complete — a success heading ("3 files sent · 1.2 GB"), the file list with verified checkmarks, total time taken and average speed, then "Send more files" and "Done" buttons. If any file failed integrity verification, show that file with a danger state and a "Retry" button instead of a checkmark.

6. Error states — these are full-width inline panels, never toasts:

Room not found: "No room with that code. Check it and try again."
Room full: "Someone else is already in that room."
Room expired: "That code has expired. Ask for a new one."
Connection failed: "Couldn't connect. Your network may be blocking direct connections — try a different network or enable the relay in settings."
Peer disconnected mid-transfer: "The other device disconnected. 340 MB of 1.2 GB was transferred." with a "Try again" button.

Every error message says what happened and what to do next. Never show a raw exception.

Responsive rules
Design for 390px width first. The centred column simply narrows; nothing reflows into a different layout.
The QR code stays visible on mobile but drops to 128×128.
The three StatBlocks wrap to two-then-one as width shrinks. They never shrink their text.
Tap targets are minimum 44×44px.
Nothing horizontally scrolls except, if necessary, a code block in the README.
Accessibility
Every interactive element is reachable by keyboard with a visible focus ring.
Progress is announced with role="progressbar" and correct aria-valuenow / aria-valuemax.
Connection state changes are announced in an aria-live="polite" region.
Colour is never the only signal — the ConnectionBadge always carries a text label.
Contrast: body text against its surface must reach at least 4.5:1 in both themes.
Coding rules
TypeScript strict mode on. No any. Define shared types once in /shared/protocol.ts.
Keep WebRTC and transfer logic in /client/src/lib as plain functions and classes. React components must not call WebRTC APIs directly — they consume hooks.
Every async operation has explicit error handling that maps to one of the UI error states above.
Clean up on unmount and on disconnect: close data channels, close peer connections, abort file writers, clear intervals.
Comment the non-obvious parts: backpressure handling, chunk ordering, and the hashing flow. Do not comment obvious code.
Include a README.md with setup, environment variables, and how to run both client and server locally.
Out of scope for v1 — do not build these

Folder transfer, resumable transfers, passphrase encryption, multi-peer broadcast, text chat, transfer history, PWA install, trusted devices, offline mailbox, screen sharing. These come later. If you think one is needed, note it in the walkthrough instead of building it.