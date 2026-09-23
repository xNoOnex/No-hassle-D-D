import { Peer } from "peerjs";

export class GameNetwork {
  constructor(isHost, roomCode, onStateReceived) {
    this.isHost = isHost;
    this.roomCode = roomCode.toLowerCase();
    this.onStateReceived = onStateReceived;
    this.connections = [];
    this.peer = null;
    this.hostConn = null;
    this.lastState = null;
  }

  init(onReady) {
    // DM uses a fixed ID based on the room code. Players use random IDs.
    const peerId = this.isHost ? `nohassle-${this.roomCode}` : undefined;
    this.peer = new Peer(peerId);

    this.peer.on("open", (id) => {
      if (!this.isHost) {
        this.hostConn = this.peer.connect(`nohassle-${this.roomCode}`);
        this.setupClientEvents(this.hostConn);
      }
      if (onReady) onReady(id);
    });

    if (this.isHost) {
      this.peer.on("connection", (conn) => {
        conn.on("open", () => {
          this.connections.push(conn);
          // Immediately sync the new player with the current game state
          if (this.lastState) {
            conn.send({ type: "SYNC_STATE", payload: this.lastState });
          }
          conn.on("data", (data) => this.handleHostIncomingData(data, conn));
          conn.on("close", () => {
            this.connections = this.connections.filter(c => c.peer !== conn.peer);
          });
        });
      });
    }
  }

  broadcastState(state) {
    if (!this.isHost) return;
    this.lastState = state;
    const packet = { type: "SYNC_STATE", payload: state };
    this.connections.forEach((conn) => {
      if (conn.open) conn.send(packet);
    });
  }

  sendAction(actionType, payload) {
    if (this.hostConn && this.hostConn.open) {
      this.hostConn.send({ type: actionType, payload });
    }
  }

  setupClientEvents(conn) {
    conn.on("data", (data) => {
      if (data.type === "SYNC_STATE" && this.onStateReceived) {
        this.onStateReceived(data.payload);
      }
    });
  }

  handleHostIncomingData(data, senderConn) {
    if (this.onStateReceived) {
      this.onStateReceived(data, senderConn);
    }
  }
}
