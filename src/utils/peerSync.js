import Peer from 'peerjs';

export class GameNetwork {
  constructor(isHost, roomId, onDataReceived, onError = null) {
    this.isHost = isHost;
    this.roomId = `nohasslednd_${String(roomId).trim().toUpperCase()}`;
    this.onDataReceived = onDataReceived;
    this.onError = onError;
    this.peer = null;
    this.connections = {};
    this.hostConnection = null;
    this.pingInterval = null;
    this.connectTimeout = null;
    this.hasConnected = false;
  }

  init(onReady) {
    this.peer = new Peer(this.isHost ? this.roomId : undefined, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    this.peer.on('open', () => {
      if (this.isHost) {
        this.hasConnected = true;
        if (onReady) onReady();
      } else {
        this.connectToHost(onReady);
      }
    });

    if (this.isHost) {
      this.peer.on('connection', (conn) => this.setupConnection(conn));
    }

    this.peer.on('disconnected', () => {
      if (this.hasConnected && this.peer && !this.peer.destroyed) {
        this.peer.reconnect();
      }
    });

    this.peer.on('error', (err) => {
      if (this.connectTimeout) clearTimeout(this.connectTimeout);
      if (!this.isHost && !this.hasConnected) {
        if (this.peer) this.peer.destroy();
        if (this.onError) {
          this.onError(
            err.type === 'peer-unavailable'
              ? 'No active Host found at that room code.'
              : `Connection error: ${err.type || err.message}`
          );
        }
      } else if (this.isHost && err.type === 'unavailable-id') {
        if (this.onError) this.onError('Room code is already in use. Try again.');
      }
    });
  }

  connectToHost(onReady) {
    const conn = this.peer.connect(this.roomId, { reliable: true });
    this.hostConnection = conn;
    this.setupConnection(conn);

    this.connectTimeout = setTimeout(() => {
      if (!this.hasConnected) {
        if (this.peer) this.peer.destroy();
        if (this.onError) {
          this.onError('Connection timed out. Make sure the Host has the room open.');
        }
      }
    }, 7000);

    conn.on('open', () => {
      if (this.connectTimeout) clearTimeout(this.connectTimeout);
      this.hasConnected = true;
      if (onReady) onReady();
      this.pingInterval = setInterval(() => {
        if (conn.open) conn.send({ type: 'PING' });
      }, 3000);
    });
  }

  setupConnection(conn) {
    conn.on('data', (data) => {
      if (data && data.type === 'PING') return;
      if (this.onDataReceived) this.onDataReceived(data, conn);
    });

    if (this.isHost) {
      conn.on('open', () => {
        this.connections[conn.peer] = conn;
      });
      conn.on('close', () => {
        delete this.connections[conn.peer];
      });
    } else {
      conn.on('close', () => {
        if (this.pingInterval) clearInterval(this.pingInterval);
      });
    }
  }

  sendAction(type, payload) {
    const data = { type, payload };
    if (this.isHost) {
      Object.values(this.connections).forEach(conn => {
        if (conn.open) conn.send(data);
      });
    } else if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send(data);
    }
  }

  broadcastState(gameState) {
    if (this.isHost) this.sendAction('SYNC_STATE', gameState);
  }
}
