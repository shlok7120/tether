import { WebSocketServer, WebSocket } from "ws";
import { RoomManager } from "./rooms";
import { ClientMessage, ServerMessage } from "../../shared/protocol";

const PORT = parseInt(process.env.PORT || "8080");
const wss = new WebSocketServer({ port: PORT });
console.log(`Signalling server started on ws://localhost:${PORT}`);

wss.on("connection", (ws: WebSocket) => {
  let currentRoom: string | null = null;

  const send = (msg: ServerMessage) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  ws.on("message", (data: string) => {
    try {
      const msg = JSON.parse(data.toString()) as ClientMessage;

      switch (msg.t) {
        case "create": {
          if (currentRoom) {
            RoomManager.getRoom(currentRoom)?.removePeer(ws);
          }
          const room = RoomManager.createRoom();
          room.addPeer(ws);
          currentRoom = room.code;
          send({ t: "created", code: room.code });
          break;
        }

        case "join": {
          const room = RoomManager.getRoom(msg.code);
          if (!room) {
            send({ t: "error", reason: "room-not-found" });
            return;
          }
          if (room.peers.size >= 2) {
            send({ t: "error", reason: "room-full" });
            return;
          }

          if (currentRoom) {
            RoomManager.getRoom(currentRoom)?.removePeer(ws);
          }
          
          room.addPeer(ws);
          currentRoom = room.code;
          
          send({ t: "joined" });
          room.broadcast({ t: "peer-joined" }, ws);
          
          // If I am joining, and there is already someone there, tell me they are there
          if (room.peers.size === 2) {
            send({ t: "peer-joined" });
          }
          break;
        }

        case "signal": {
          if (!currentRoom) return;
          const room = RoomManager.getRoom(currentRoom);
          if (room) {
            room.broadcast({ t: "signal", data: msg.data }, ws);
          }
          break;
        }

        case "leave": {
          if (currentRoom) {
            const room = RoomManager.getRoom(currentRoom);
            if (room) {
              room.broadcast({ t: "peer-left" }, ws);
              room.removePeer(ws);
            }
            currentRoom = null;
          }
          break;
        }
      }
    } catch (e) {
      console.error("Invalid message", data.toString(), e);
    }
  });

  ws.on("close", () => {
    if (currentRoom) {
      const room = RoomManager.getRoom(currentRoom);
      if (room) {
        room.broadcast({ t: "peer-left" }, ws);
        room.removePeer(ws);
      }
    }
  });
});
