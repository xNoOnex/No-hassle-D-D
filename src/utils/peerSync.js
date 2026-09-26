import Peer from 'peerjs';

export class GameNetwork {
  constructor(isHost, roomId, onDataReceived) {
    this.isHost = isHost;
    this.roomId = `nohasslednd_${roomId}`;
    this.onDataReceived = onDataReceived;
    this.peer = null;
    this.connections = {}; 
    this.hostConnection = null; 
    this.pingInterval = null;
  }

  init(onReady) {
    // Uses Google's ultra-reliable STUN servers to punch through Wi-Fi routers
    this.peer = new Peer(this.isHost ? this.roomId : undefined, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    this.peer.on('open', (id) => {
      console.log('Network connected. ID:', id);
      if (this.isHost) {
        onReady();
      } else {
        this.connectToHost(onReady);
      }
    });

    if (this.isHost) {
      this.peer.on('connection', (conn) => this.setupConnection(conn));
    }

    // Aggressive Auto-Reconnect
    this.peer.on('disconnected', () => {
      console.warn('Connection lost. Reconnecting...');
      this.peer.reconnect();
    });

    this.peer.on('error', (err) => {
      console.error('Network error:', err);
      if (err.type === 'peer-unavailable' && !this.isHost) {
        setTimeout(() => this.connectToHost(onReady), 2000); // Retry every 2s if DM drops
      }
    });
  }

  connectToHost(onReady) {
    const conn = this.peer.connect(this.roomId, { reliable: true });
    this.hostConnection = conn;
    this.setupConnection(conn);
    
    conn.on('open', () => {
      onReady();
      // SILENT HEARTBEAT: Keeps the connection alive indefinitely
      this.pingInterval = setInterval(() => {
        if (conn.open) conn.send({ type: 'PING' });
      }, 3000); 
    });
  }

  setupConnection(conn) {
    conn.on('data', (data) => {
      if (data.type === 'PING') return; // Ignore silent heartbeats
      this.onDataReceived(data, conn);
    });
    
    if (this.isHost) {
      conn.on('open', () => { this.connections[conn.peer] = conn; });
      conn.on('close', () => { delete this.connections[conn.peer]; });
    } else {
      conn.on('close', () => { clearInterval(this.pingInterval); });
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
