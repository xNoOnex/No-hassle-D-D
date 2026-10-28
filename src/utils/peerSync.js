import { Peer } from 'peerjs';

const PEER_PREFIX = 'nhdnd_v2_room_';

// Simultaneous Local LAN + Long-Distance Cellular (5G/LTE CGNAT) ICE Configuration
const HYBRID_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

export class GameNetwork {
  constructor(isHost, roomCode, onDataCallback, onErrorCallback) {
    this.isHost = isHost;
    this.roomCode = String(roomCode || '').trim().toUpperCase();
    this.onData = onDataCallback;
    this.onError = onErrorCallback;
    this.peer = null;
    this.connections = [];
    this.hostConn = null;
    this.offlineChannels = [];
    this.pendingRtc = null;
    this.heartbeatTimer = null;
    this.wakeLock = null;
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (e) {
      // Ignore if unsupported
    }
  }

  init(onReadyCallback) {
    this.requestWakeLock();

    const peerId = this.isHost
      ? `${PEER_PREFIX}${this.roomCode}`
      : `${PEER_PREFIX}client_${Math.random().toString(36).substring(2, 8)}`;

    try {
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: HYBRID_ICE_SERVERS,
          iceCandidatePoolSize: 10
        }
      });
    } catch (err) {
      if (this.isHost && onReadyCallback) {
        onReadyCallback();
      } else if (this.onError) {
        this.onError('Offline mode: Use Direct Hotspot Link to pair without service.');
      }
      return;
    }

    let settled = false;
    const joinTimeout = !this.isHost
      ? setTimeout(() => {
          if (!settled) {
            settled = true;
            if (this.onError) {
              this.onError(
                `Could not reach Room ${this.roomCode} over cell/Wi-Fi. Verify the Host is inside the room, or use Direct Local Link if offline.`
              );
            }
          }
        }, 15000)
      : null;

    this.peer.on('open', () => {
      if (this.isHost) {
        settled = true;
        this.startHeartbeat();
        if (onReadyCallback) onReadyCallback();
      } else {
        const conn = this.peer.connect(`${PEER_PREFIX}${this.roomCode}`, {
          reliable: true
        });
        this.hostConn = conn;

        conn.on('open', () => {
          if (settled) return;
          settled = true;
          if (joinTimeout) clearTimeout(joinTimeout);
          this.startHeartbeat();
          if (onReadyCallback) onReadyCallback();
        });

        conn.on('data', (data) => {
          if (data?.type === 'PING') return;
          if (this.onData) this.onData(data);
        });

        conn.on('error', (err) => {
          if (!settled) {
            settled = true;
            if (joinTimeout) clearTimeout(joinTimeout);
            if (this.onError) this.onError(`Connection failed: ${err.message || err}`);
          }
        });
      }
    });

    this.peer.on('connection', (conn) => {
      if (!this.isHost) return;
      conn.on('open', () => {
        this.connections.push(conn);
      });
      conn.on('data', (data) => {
        if (data?.type === 'PING') return;
        if (this.onData) this.onData(data);
      });
      conn.on('close', () => {
        this.connections = this.connections.filter(c => c !== conn);
      });
    });

    this.peer.on('error', (err) => {
      if (this.isHost) {
        // If Host has zero internet/cell service, still allow local/offline hosting
        if (!settled) {
          settled = true;
          if (onReadyCallback) onReadyCallback();
        }
        return;
      }
      if (!settled) {
        settled = true;
        if (joinTimeout) clearTimeout(joinTimeout);
        const msg = err.type === 'peer-unavailable'
          ? `Room ${this.roomCode} was not found or the Host is offline.`
          : `Network error (${err.type || 'cellular'}): Check signal or use Direct Local Link.`;
        if (this.onError) this.onError(msg);
      }
    });
  }

  // Direct Zero-Internet Local Wi-Fi / Hotspot WebRTC Pairing (Works alongside Cellular Peers)
  async createOfflineInvite() {
    const pc = new RTCPeerConnection({ iceServers: [] });
    const channel = pc.createDataChannel('nhdnd_offline_lan');
    this.setupOfflineChannel(channel);
    this.pendingRtc = pc;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await this.waitForIceGathering(pc);

    return btoa(JSON.stringify(pc.localDescription));
  }

  async acceptOfflineInvite(offerCode, onConnectedCallback) {
    const pc = new RTCPeerConnection({ iceServers: [] });
    this.pendingRtc = pc;

    pc.ondatachannel = (event) => {
      this.setupOfflineChannel(event.channel, onConnectedCallback);
    };

    const offerDesc = JSON.parse(atob(offerCode.trim()));
    await pc.setRemoteDescription(new RTCSessionDescription(offerDesc));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await this.waitForIceGathering(pc);

    return btoa(JSON.stringify(pc.localDescription));
  }

  async completeOfflineLink(answerCode) {
    if (!this.pendingRtc) throw new Error('Generate an Offline Invite first.');
    const answerDesc = JSON.parse(atob(answerCode.trim()));
    await this.pendingRtc.setRemoteDescription(new RTCSessionDescription(answerDesc));
    this.pendingRtc = null;
  }

  setupOfflineChannel(channel, onOpenCallback) {
    channel.onopen = () => {
      this.offlineChannels.push(channel);
      if (onOpenCallback) onOpenCallback();
    };
    channel.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.type === 'PING') return;
        if (this.onData) this.onData(parsed);
      } catch (e) {
        // Ignore malformed packet
      }
    };
    channel.onclose = () => {
      this.offlineChannels = this.offlineChannels.filter(c => c !== channel);
    };
  }

  waitForIceGathering(pc) {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const timeout = setTimeout(resolve, 2500);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          resolve();
        }
      };
    });
  }

  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.isHost) {
        this.connections.forEach(c => {
          if (c.open) c.send({ type: 'PING' });
        });
      } else if (this.hostConn?.open) {
        this.hostConn.send({ type: 'PING' });
      }
      this.offlineChannels.forEach(ch => {
        if (ch.readyState === 'open') {
          ch.send(JSON.stringify({ type: 'PING' }));
        }
      });
    }, 3000);
  }

  // Broadcasts simultaneously to Cellular/Online peers AND Local Offline Hotspot peers
  broadcastState(gameState) {
    if (!this.isHost) return;
    const packet = { type: 'SYNC_STATE', payload: gameState };
    this.connections.forEach(conn => {
      if (conn.open) conn.send(packet);
    });
    const rawJson = JSON.stringify(packet);
    this.offlineChannels.forEach(ch => {
      if (ch.readyState === 'open') ch.send(rawJson);
    });
  }

  sendAction(type, payload) {
    const packet = { type, payload };
    if (this.hostConn?.open) {
      this.hostConn.send(packet);
    }
    const rawJson = JSON.stringify(packet);
    this.offlineChannels.forEach(ch => {
      if (ch.readyState === 'open') ch.send(rawJson);
    });
  }
}
