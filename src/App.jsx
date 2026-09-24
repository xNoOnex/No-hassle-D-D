import React, { useState, useEffect } from 'react';
import { Shield, Users, Play, Wifi, ArrowLeft } from 'lucide-react';
import { GameNetwork } from './utils/peerSync';
import { getSessions, createNewSession, saveSession } from './utils/storage';
import DMDashboard from './components/DMDashboard';
import PlayerScreen from './components/PlayerScreen';

const generateRoomCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [network, setNetwork] = useState(null);
  const [status, setStatus] = useState('Disconnected');
  const [joinCode, setJoinCode] = useState('');
  const [newCampaignName, setNewCampaignName] = useState('');

  useEffect(() => {
    setSessions(getSessions().sort((a, b) => b.lastPlayed - a.lastPlayed));
  }, [activeSession]);

  const handleNetworkData = (data, senderConn) => {
    // Players only receive state updates; their UI state is ephemeral
    if (activeSession.role === 'player' && data.type === 'SYNC_STATE') {
      setActiveSession(prev => ({ ...prev, gameState: data.payload }));
    } 
    // DMs process incoming player actions and save the master state
    else if (activeSession.role === 'dm') {
      const state = activeSession.gameState;
      
      if (data.type === 'SYNC_CHARACTER') {
        const playerId = data.payload.id;
        const updatedState = { ...state, party: { ...state.party, [playerId]: data.payload } };
        const updatedSession = { ...activeSession, gameState: updatedState };
        setActiveSession(updatedSession);
        saveSession(updatedSession);
        network.broadcastState(updatedState);
      } 
      else if (data.type === 'PLAYER_ROLL') {
        let logMsg = `⚔️ ${data.payload.characterName} used ${data.payload.actionName}\n🎲 Hit: ${data.payload.result} (Base ${data.payload.rawRoll} + ${data.payload.modifier})`;
        if (data.payload.damage !== undefined) {
          logMsg += `\n💥 Dmg: ${data.payload.damage} (Base ${data.payload.rawDmg} + ${data.payload.dmgMod})`;
        }
        
        const updatedState = { ...state, combatLog: [logMsg, ...(state.combatLog || [])].slice(0, 50) };
        const updatedSession = { ...activeSession, gameState: updatedState };
        setActiveSession(updatedSession);
        saveSession(updatedSession);
        network.broadcastState(updatedState);
      }
      else if (data.type === 'UPDATE_JOURNAL') {
        const updatedState = { ...state, journal: data.payload.text };
        const updatedSession = { ...activeSession, gameState: updatedState };
        setActiveSession(updatedSession);
        saveSession(updatedSession);
        network.broadcastState(updatedState);
      }
    }
  };

  const startDMSession = (session) => {
    let currentCode = session.roomCode;
    if (!currentCode) {
      currentCode = generateRoomCode();
      session.roomCode = currentCode;
    }
    setActiveSession(session);
    saveSession(session);
    setStatus('Initializing Server...');

    const net = new GameNetwork(true, currentCode, handleNetworkData);
    net.init(() => {
      setStatus('Hosting Active');
      setNetwork(net);
    });
  };

  const handleCreateDM = () => {
    if (!newCampaignName) return alert('Enter a campaign name');
    const s = createNewSession(newCampaignName, 'dm');
    setNewCampaignName('');
    startDMSession(s);
  };

  const handlePlayerJoin = () => {
    if (joinCode.length !== 4) return alert('Enter a valid 4-letter DM room code.');
    
    // Players get an ephemeral session just for the active connection. 
    // Their character is already safely stored in localStorage.
    const ephemeralPlayerSession = {
      id: `player_${Date.now()}`,
      name: `Room ${joinCode}`,
      role: 'player',
      roomCode: joinCode,
      gameState: { quest: 'Awaiting DM Sync...', turn: 0, combatLog: [], journal: '' }
    };
    
    setActiveSession(ephemeralPlayerSession);
    setStatus('Connecting to DM...');
    
    const net = new GameNetwork(false, joinCode, handleNetworkData);
    net.init(() => {
      setStatus('Connected to DM');
      setNetwork(net);
    });
    setJoinCode('');
  };

  const leaveSession = () => {
    setActiveSession(null);
    setNetwork(null);
  };

  if (activeSession) {
    return (
      <div className="container">
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="flex-center" style={{justifyContent: 'space-between', marginBottom: '10px'}}>
            <h2 style={{textTransform: 'uppercase'}}>{activeSession.name}</h2>
            <button className="btn-outline" style={{padding: '4px 8px', fontSize: '12px', width: 'auto'}} onClick={leaveSession}>
              <ArrowLeft size={14} style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/> Leave
            </button>
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

        {activeSession.role === 'dm' ? (
          <DMDashboard network={network} gameState={activeSession.gameState} setGameState={(state) => {
            const updated = {...activeSession, gameState: state};
            setActiveSession(updated);
            saveSession(updated);
            network?.broadcastState(state);
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

      <div className="card" style={{ borderTop: '4px solid var(--accent)', marginBottom: '16px' }}>
        <h3><Shield size={18} style={{verticalAlign: 'text-bottom', marginRight: '8px'}}/> Host a Campaign (DM)</h3>
        <p style={{fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px'}}>Create the world, spawn monsters, and generate a room code.</p>
        <input type="text" placeholder="CAMPAIGN NAME" value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} />
        <button className="btn-primary flex-center" onClick={handleCreateDM}>Host World</button>
      </div>

      <div className="card" style={{ borderTop: '4px solid var(--success)', marginBottom: '16px' }}>
        <h3><Users size={18} style={{verticalAlign: 'text-bottom', marginRight: '8px'}}/> Join a Game (Player)</h3>
        <p style={{fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px'}}>Enter the DM's 4-letter code. Your character is loaded automatically.</p>
        <div style={{display: 'flex', gap: '8px'}}>
          <input type="text" maxLength={4} placeholder="CODE" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} style={{textTransform: 'uppercase', marginBottom: 0}} />
          <button className="btn-outline flex-center" onClick={handlePlayerJoin} style={{borderColor: 'var(--success)', color: 'var(--success)', width: 'auto', padding: '0 20px'}}>Join</button>
        </div>
      </div>

      {sessions.filter(s => s.role === 'dm').length > 0 && (
        <div className="card">
          <h3 style={{marginBottom: '10px'}}>Load Previous Campaigns</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {sessions.filter(s => s.role === 'dm').map(s => (
              <button key={s.id} className="btn-outline flex-center" style={{justifyContent: 'space-between', padding: '16px'}} onClick={() => startDMSession(s)}>
                <div style={{textAlign: 'left'}}>
                  <div style={{fontWeight: 'bold', color: 'white'}}>{s.name}</div>
                  <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>Last played: {new Date(s.lastPlayed).toLocaleDateString()}</div>
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
