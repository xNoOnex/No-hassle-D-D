import React, { useState } from 'react';
import { Shield, Swords, Wifi, Users } from 'lucide-react';
import { GameNetwork } from './utils/peerSync';
import DMDashboard from './components/DMDashboard';

const generateRoomCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();

export default function App() {
  const [role, setRole] = useState(null); 
  const [roomCode, setRoomCode] = useState('');
  const [network, setNetwork] = useState(null);
  const [status, setStatus] = useState('Disconnected');
  const [gameState, setGameState] = useState({ quest: 'Awaiting Orders...', turn: 0 });

  const handleNetworkData = (data) => {
    if (role === 'player') {
      setGameState(data);
    } else if (role === 'dm') {
      if (data.type === 'PLAYER_ROLL') {
        alert(`Player rolled a ${data.payload.result}!`);
      }
    }
  };

  const startHosting = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setRole('dm');
    setStatus('Initializing Server...');
    
    const net = new GameNetwork(true, code, handleNetworkData);
    net.init(() => {
      setStatus('Hosting Active');
      setNetwork(net);
    });
  };

  const joinGame = () => {
    if (roomCode.length !== 4) return alert('Enter a 4-letter room code');
    setRole('player');
    setStatus('Connecting to DM...');
    
    const net = new GameNetwork(false, roomCode, handleNetworkData);
    net.init(() => {
      setStatus('Connected to DM');
      setNetwork(net);
    });
  };

  const playerSendRoll = () => {
    if (!network) return;
    const roll = Math.floor(Math.random() * 20) + 1;
    network.sendAction('PLAYER_ROLL', { result: roll });
  };

  if (!role) {
    return (
      <div className="container">
        <div className="header">
          <h1>No-hassle-D-D</h1>
          <p style={{color: 'var(--text-muted)'}}>Zero-server tabletop syncing</p>
        </div>
        <button className="btn-primary flex-center" onClick={startHosting} style={{padding: '24px'}}>
          <Shield size={24} /> Host Campaign (DM)
        </button>
        <div className="card" style={{marginTop: '20px'}}>
          <input type="text" maxLength={4} placeholder="ROOM CODE" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
          <button className="btn-outline flex-center" onClick={joinGame}>
            <Users size={20} /> Join as Player
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="flex-center" style={{justifyContent: 'space-between', marginBottom: '10px'}}>
          <h2 style={{textTransform: 'uppercase'}}>{role === 'dm' ? 'DM Dashboard' : 'Player Screen'}</h2>
          <span style={{fontSize: '12px', background: 'var(--bg-dark)', padding: '4px 8px', borderRadius: '4px'}}>
            Code: {roomCode.toUpperCase()}
          </span>
        </div>
        <div className="flex-center" style={{color: status.includes('Active') || status.includes('Connected') ? 'var(--success)' : 'var(--text-muted)', justifyContent: 'flex-start'}}>
          <Wifi size={16} /> <small>{status}</small>
        </div>
      </div>

      {role === 'dm' ? (
        <DMDashboard network={network} gameState={gameState} setGameState={setGameState} />
      ) : (
        <div className="card">
          <div style={{background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', marginBottom: '20px'}}>
            <p style={{color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px'}}>CURRENT QUEST</p>
            <p style={{fontWeight: 'bold', fontSize: '18px'}}>{gameState.quest}</p>
          </div>
          <button className="btn-primary flex-center" onClick={playerSendRoll}>
            <Swords size={20} /> Roll d20 Attack
          </button>
        </div>
      )}
    </div>
  );
}
