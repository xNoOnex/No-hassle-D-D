import React, { useState, useEffect } from 'react';
import { Shield, Users, Play, Plus, Wifi } from 'lucide-react';
import { GameNetwork } from './utils/peerSync';
import { getSessions, createNewSession, saveSession } from './utils/storage';
import DMDashboard from './components/DMDashboard';
import PlayerScreen from './components/PlayerScreen';

const generateRoomCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  
  // Network & Join State
  const [network, setNetwork] = useState(null);
  const [status, setStatus] = useState('Disconnected');
  const [joinCode, setJoinCode] = useState('');
  const [newCampaignName, setNewCampaignName] = useState('');

  useEffect(() => {
    setSessions(getSessions().sort((a, b) => b.lastPlayed - a.lastPlayed));
  }, [activeSession]);

  const handleNetworkData = (data) => {
    if (activeSession.role === 'player' && data.type === 'SYNC_STATE') {
      const updated = { ...activeSession, gameState: data.payload };
      setActiveSession(updated);
      saveSession(updated);
    } else if (activeSession.role === 'dm' && data.type === 'PLAYER_ROLL') {
      alert(`Player rolled a ${data.payload.result}!`);
      // Future: automatically inject into DM combat log
    }
  };

  const startSession = (session) => {
    let currentCode = session.roomCode;
    
    // Generate a fresh code if DM is hosting
    if (session.role === 'dm') {
      currentCode = generateRoomCode();
      session.roomCode = currentCode;
    }
    
    setActiveSession(session);
    saveSession(session);
    setStatus(session.role === 'dm' ? 'Initializing Server...' : 'Awaiting Room Code...');

    if (session.role === 'dm' || (session.role === 'player' && currentCode)) {
      connectToNetwork(session.role === 'dm', currentCode, session);
    }
  };

  const connectToNetwork = (isHost, code, session) => {
    const net = new GameNetwork(isHost, code, handleNetworkData);
    net.init(() => {
      setStatus(isHost ? 'Hosting Active' : 'Connected to DM');
      setNetwork(net);
      
      // Save code to session if player just joined
      if (!isHost) {
        const updated = { ...session, roomCode: code };
        setActiveSession(updated);
        saveSession(updated);
      }
    });
  };

  const handleCreate = (role) => {
    if (!newCampaignName) return alert('Enter a campaign name');
    const s = createNewSession(newCampaignName, role);
    setNewCampaignName('');
    startSession(s);
  };

  // --- RENDERS ---

  if (activeSession) {
    return (
      <div className="container">
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="flex-center" style={{justifyContent: 'space-between', marginBottom: '10px'}}>
            <h2 style={{textTransform: 'uppercase'}}>{activeSession.name}</h2>
            <button className="btn-outline" style={{padding: '4px 8px', fontSize: '12px', width: 'auto'}} onClick={() => { setActiveSession(null); setNetwork(null); }}>Save & Exit</button>
          </div>
          
          <div className="flex-center" style={{justifyContent: 'space-between'}}>
            <div className="flex-center" style={{color: status.includes('Active') || status.includes('Connected') ? 'var(--success)' : 'var(--text-muted)'}}>
              <Wifi size={16} /> <small>{status}</small>
            </div>
            {activeSession.role === 'dm' && (
              <span style={{fontSize: '12px', background: 'var(--bg-dark)', padding: '4px 8px', borderRadius: '4px'}}>
                ROOM: {activeSession.roomCode}
              </span>
            )}
          </div>
        </div>

        {activeSession.role === 'player' && !network && (
          <div className="card flex-center">
            <input type="text" maxLength={4} placeholder="ENTER DM ROOM CODE" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
            <button className="btn-primary flex-center" onClick={() => connectToNetwork(false, joinCode, activeSession)}>Join</button>
          </div>
        )}

        {activeSession.role === 'dm' ? (
          <DMDashboard network={network} gameState={activeSession.gameState} setGameState={(state) => {
            const updated = {...activeSession, gameState: state};
            setActiveSession(updated);
            saveSession(updated);
          }} />
        ) : (
          network && <PlayerScreen network={network} gameState={activeSession.gameState} />
        )}
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>No-hassle-D-D</h1>
        <p style={{color: 'var(--text-muted)'}}>Campaign Lobby</p>
      </div>

      <div className="card">
        <h3>New Campaign</h3>
        <input type="text" placeholder="CAMPAIGN NAME" value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} style={{marginTop: '10px'}}/>
        <div className="flex-center" style={{gap: '10px'}}>
          <button className="btn-primary flex-center" onClick={() => handleCreate('dm')}><Shield size={18}/> Host</button>
          <button className="btn-outline flex-center" onClick={() => handleCreate('player')}><Users size={18}/> Play</button>
        </div>
      </div>

      {sessions.length > 0 && (
        <div className="card">
          <h3 style={{marginBottom: '10px'}}>Load Campaign</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {sessions.map(s => (
              <button key={s.id} className="btn-outline flex-center" style={{justifyContent: 'space-between', padding: '16px'}} onClick={() => startSession(s)}>
                <div style={{textAlign: 'left'}}>
                  <div style={{fontWeight: 'bold', color: 'white'}}>{s.name}</div>
                  <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>Role: {s.role.toUpperCase()}</div>
                </div>
                <Play size={20} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
