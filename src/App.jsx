import React, { useState, useEffect, useRef } from 'react';
import { Shield, Users, Play, ArrowLeft, Settings, Key, X, Check } from 'lucide-react';
import { GameNetwork } from './utils/peerSync';
import { getSessions, saveSession } from './utils/storage';
import { getApiKey, setApiKey, getSelectedModel, setSelectedModel } from './utils/aiConfig';
import { generateNarrativeTurn } from './utils/aiEngine';
import { getMonster } from './data/index';
import PlayerScreen from './components/PlayerScreen';

const generateRoomCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();

const normalizeGameState = (raw = {}, fallbackName = 'Campaign') => ({
  campaignName: raw.campaignName || fallbackName,
  currentModule: raw.currentModule || 'The Stolen Core of Oakhaven',
  combatActive: Boolean(raw.combatActive),
  party: Array.isArray(raw.party) ? raw.party : Object.values(raw.party || {}),
  activeMonsters: Array.isArray(raw.activeMonsters) ? raw.activeMonsters : [],
  turnQueue: Array.isArray(raw.turnQueue) ? raw.turnQueue : [],
  currentTurnIndex: typeof raw.currentTurnIndex === 'number' ? raw.currentTurnIndex : 0,
  round: typeof raw.round === 'number' ? raw.round : 1,
  storyLog: Array.isArray(raw.storyLog) && raw.storyLog.length > 0
    ? raw.storyLog
    : [
        {
          id: 'init_1',
          timestamp: Date.now(),
          actor: 'Director',
          text: 'You sit in the dimly lit parlor of Madame Elara. The town power crystal was stolen last night, and your party has been summoned.',
          mechanicalSummary: 'Session Ready.'
        }
      ],
  journal: Array.isArray(raw.journal)
    ? raw.journal
    : (typeof raw.journal === 'string' && raw.journal.trim() ? [raw.journal.trim()] : ['Quest: Recover the Stolen Core of Oakhaven.']),
  lootPool: Array.isArray(raw.lootPool) ? raw.lootPool : []
});

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [network, setNetwork] = useState(null);
  const [status, setStatus] = useState('Disconnected');
  const [joinCode, setJoinCode] = useState('');
  const [newCampaignName, setNewCampaignName] = useState('');

  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey());
  const [modelInput, setModelInput] = useState(getSelectedModel());
  const [isProcessingAi, setIsProcessingAi] = useState(false);

  const activeSessionRef = useRef(null);
  activeSessionRef.current = activeSession;

  const networkRef = useRef(null);
  networkRef.current = network;

  useEffect(() => {
    setSessions(getSessions().sort((a, b) => b.lastPlayed - a.lastPlayed));
  }, [activeSession]);

  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      if (activeSession && 'wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.error(`Wake Lock error: ${err.message}`);
        }
      }
    };
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock !== null) wakeLock.release().then(() => { wakeLock = null; });
    };
  }, [activeSession]);

  const processHostAction = async (actionPayload, currentGameState) => {
    const state = { ...normalizeGameState(currentGameState) };
    const {
      actionType,
      actorName,
      summary,
      character,
      updatedParty,
      updatedMonsters,
      combatActive,
      turnQueue,
      currentTurnIndex,
      round,
      newJournalEntry,
      newLootItem,
      skipAi
    } = actionPayload;

    if (actionType === 'SYNC_CHARACTER' && character) {
      const exists = state.party.some(p => p.id === character.id);
      state.party = exists
        ? state.party.map(p => (p.id === character.id ? character : p))
        : [...state.party, character];
      return state;
    }

    if (Array.isArray(updatedParty)) state.party = updatedParty;
    if (Array.isArray(updatedMonsters)) {
      state.activeMonsters = updatedMonsters.filter(m => (m.hpCurrent ?? m.hp ?? 0) > 0);
      if (state.activeMonsters.length === 0 && state.combatActive) {
        state.combatActive = false;
        state.turnQueue = [];
      }
    }
    if (typeof combatActive === 'boolean') state.combatActive = combatActive;
    if (Array.isArray(turnQueue)) state.turnQueue = turnQueue;
    if (typeof currentTurnIndex === 'number') state.currentTurnIndex = currentTurnIndex;
    if (typeof round === 'number') state.round = round;
    if (newJournalEntry) state.journal = [...state.journal, newJournalEntry];
    if (newLootItem) state.lootPool = [...state.lootPool, newLootItem];

    if (skipAi) {
      if (summary) {
        state.storyLog = [
          ...state.storyLog,
          {
            id: `log_${Date.now()}_${Math.random()}`,
            timestamp: Date.now(),
            actor: actorName || 'System',
            text: summary,
            mechanicalSummary: null
          }
        ];
      }
      return state;
    }

    const resolvedSummary = summary || `${actorName || 'Party'} took action.`;
    setIsProcessingAi(true);
    try {
      const recentHistory = state.storyLog.slice(-6).map(entry => ({
        role: entry.actor === 'Director' ? 'assistant' : 'user',
        content: entry.mechanicalSummary ? `[${entry.mechanicalSummary}] ${entry.text}` : entry.text
      }));

      const aiRes = await generateNarrativeTurn({
        gameState: state,
        resolvedAction: resolvedSummary,
        recentHistory
      });

      if (aiRes.spawnedMonsters?.length) {
        const newlySpawned = [];
        aiRes.spawnedMonsters.forEach(req => {
          const baseMob = getMonster(req.name) || {
            id: req.name.toLowerCase(),
            name: req.name,
            cr: 1,
            ac: 12,
            hp: 15,
            maxHp: 15,
            stats: { str: 12, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
            actions: [{ name: 'Strike', attackBonus: 3, damageDice: '1d6', damageBonus: 1 }]
          };
          for (let i = 0; i < req.count; i++) {
            newlySpawned.push({
              ...baseMob,
              instanceId: `mob_${Date.now()}_${Math.floor(Math.random() * 10000)}_${i}`,
              name: req.count > 1 ? `${baseMob.name} ${i + 1}` : baseMob.name,
              hpCurrent: baseMob.hp
            });
          }
        });
        state.activeMonsters = [...state.activeMonsters, ...newlySpawned];
      }

      if (aiRes.journalEntries?.length) {
        state.journal = [...state.journal, ...aiRes.journalEntries];
      }

      if (aiRes.lootItems?.length) {
        state.lootPool = [...state.lootPool, ...aiRes.lootItems];
      }

      state.storyLog = [
        ...state.storyLog,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actor: 'Director',
          text: aiRes.narration,
          mechanicalSummary: resolvedSummary
        }
      ];
    } catch (err) {
      state.storyLog = [
        ...state.storyLog,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actor: 'System',
          text: `[AI Director Error: ${err.message}]`,
          mechanicalSummary: resolvedSummary
        }
      ];
    } finally {
      setIsProcessingAi(false);
    }

    return state;
  };

  const handleNetworkData = async (data) => {
    const current = activeSessionRef.current;
    if (!current || !data) return;

    if (current.role === 'player' && data.type === 'SYNC_STATE') {
      setActiveSession(prev => ({
        ...prev,
        gameState: normalizeGameState(data.payload, prev?.name)
      }));
      return;
    }

    if (current.role === 'host') {
      if (data.type === 'SYNC_CHARACTER') {
        const nextState = await processHostAction(
          { actionType: 'SYNC_CHARACTER', character: data.payload, skipAi: true },
          current.gameState
        );
        const updated = { ...current, gameState: nextState, lastPlayed: Date.now() };
        setActiveSession(updated);
        saveSession(updated);
        if (networkRef.current) networkRef.current.broadcastState(nextState);
      } else if (data.type === 'DISPATCH_ACTION') {
        const nextState = await processHostAction(data.payload, current.gameState);
        const updated = { ...current, gameState: nextState, lastPlayed: Date.now() };
        setActiveSession(updated);
        saveSession(updated);
        if (networkRef.current) networkRef.current.broadcastState(nextState);
      }
    }
  };

  const dispatchAction = async (actionPayload) => {
    const current = activeSessionRef.current;
    if (!current) return;

    if (current.role === 'host') {
      const nextState = await processHostAction(actionPayload, current.gameState);
      const updated = { ...current, gameState: nextState, lastPlayed: Date.now() };
      setActiveSession(updated);
      saveSession(updated);
      if (networkRef.current) networkRef.current.broadcastState(nextState);
    } else {
      if (networkRef.current) {
        networkRef.current.sendAction('DISPATCH_ACTION', actionPayload);
      }
    }
  };

  const startHostSession = (existingSession = null) => {
    const campaignTitle = existingSession ? existingSession.name : (newCampaignName.trim() || 'New Campaign');
    const roomId = existingSession?.roomId || existingSession?.roomCode || generateRoomCode();
    const net = new GameNetwork(true, roomId, handleNetworkData);
    networkRef.current = net;

    const gameState = normalizeGameState(existingSession?.gameState, campaignTitle);

    const sessionObj = {
      id: existingSession?.id || `session_${Date.now()}`,
      name: campaignTitle,
      role: 'host',
      roomId,
      roomCode: roomId,
      gameState,
      lastPlayed: Date.now()
    };

    net.init(() => {
      setStatus('Hosting Active');
    });

    setActiveSession(sessionObj);
    saveSession(sessionObj);
  };

  const startClientJoin = () => {
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) return;

    const net = new GameNetwork(false, cleanCode, handleNetworkData);
    networkRef.current = net;

    const sessionObj = {
      id: `client_${Date.now()}`,
      name: `Room ${cleanCode}`,
      role: 'player',
      roomId: cleanCode,
      gameState: normalizeGameState({}, `Room ${cleanCode}`),
      lastPlayed: Date.now()
    };

    net.init(() => {
      setStatus('Connected to Host');
    });

    setActiveSession(sessionObj);
  };

  const handleSaveSettings = () => {
    setApiKey(apiKeyInput);
    setSelectedModel(modelInput);
    setShowSettings(false);
  };

  const handleLeaveSession = () => {
    if (networkRef.current?.peer) {
      networkRef.current.peer.destroy();
    }
    networkRef.current = null;
    setNetwork(null);
    setActiveSession(null);
    setStatus('Disconnected');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      <header style={{ padding: '12px 16px', background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield style={{ width: '22px', height: '22px', color: '#818cf8' }} />
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>No-Hassle D&D</h1>
          {activeSession && (
            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#1e1b4b', color: '#c7d2fe', border: '1px solid #3730a3', fontFamily: 'monospace' }}>
              ROOM: {activeSession.roomId} ({activeSession.role === 'host' ? 'HOST' : 'PLAYER'})
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowSettings(true)}
            style={{ padding: '8px', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
            title="AI Director Settings"
          >
            <Settings style={{ width: '18px', height: '18px' }} />
          </button>
          {activeSession && (
            <button
              onClick={handleLeaveSession}
              style={{ padding: '6px 12px', background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5', fontSize: '12px', fontWeight: '600', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeft style={{ width: '14px', height: '14px' }} /> Leave
            </button>
          )}
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '800px', width: '100%', margin: '0 auto', padding: '16px', boxSizing: 'border-box', overflowY: 'auto' }}>
        {!activeSession ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8' }}>
                <Shield style={{ width: '20px', height: '20px' }} />
                <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>Host a Campaign (AI Director + Host Player)</h2>
              </div>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                Generates a room code, runs the OpenRouter AI Director on your phone, and lets you play alongside your party.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="NEW CAMPAIGN NAME"
                  value={newCampaignName}
                  onChange={e => setNewCampaignName(e.target.value)}
                  style={{ flex: 1, background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#fff', outline: 'none' }}
                />
                <button
                  onClick={() => startHostSession(null)}
                  style={{ padding: '10px 20px', background: '#4f46e5', border: 'none', color: '#fff', fontWeight: '600', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                >
                  Host World
                </button>
              </div>
            </div>

            <div style={{ padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
                <Users style={{ width: '20px', height: '20px' }} />
                <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>Join a Game (Client Player)</h2>
              </div>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                Enter the Host's 4-letter room code. Your character syncs automatically and uses the Host's AI Director.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="4-LETTER CODE"
                  maxLength={6}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  style={{ flex: 1, background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#fff', textTransform: 'uppercase', fontFamily: 'monospace', outline: 'none' }}
                />
                <button
                  onClick={startClientJoin}
                  style={{ padding: '10px 24px', background: '#059669', border: 'none', color: '#fff', fontWeight: '600', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                >
                  Join Room
                </button>
              </div>
            </div>

            {sessions.length > 0 && (
              <div style={{ padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#cbd5e1', margin: 0 }}>Resume Saved Campaign (Host)</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sessions.map(s => (
                    <div
                      key={s.id}
                      style={{ padding: '12px', background: '#020617', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#818cf8' }}>{s.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Last played: {new Date(s.lastPlayed).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => startHostSession(s)}
                        style={{ padding: '6px 12px', background: '#1e1b4b', border: '1px solid #3730a3', color: '#c7d2fe', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Play style={{ width: '12px', height: '12px' }} /> Host Saved
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <PlayerScreen
            network={network}
            gameState={activeSession.gameState}
            isHost={activeSession.role === 'host'}
            dispatchAction={dispatchAction}
            isProcessingAi={isProcessingAi}
          />
        )}
      </main>

      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', maxWidth: '400px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontWeight: 'bold', fontSize: '15px' }}>
                <Key style={{ width: '18px', height: '18px' }} />
                <span>OpenRouter AI Settings</span>
              </div>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: '1.4' }}>
              Your API key is stored strictly in your phone's local storage. It is never included in git commits or sent to other players.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>OpenRouter API Key</label>
                <input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  style={{ width: '100%', background: '#020617', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', color: '#fff', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Model ID</label>
                <input
                  type="text"
                  placeholder="nousresearch/hermes-3-llama-3.1-70b"
                  value={modelInput}
                  onChange={e => setModelInput(e.target.value)}
                  style={{ width: '100%', background: '#020617', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', color: '#fff', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={() => setShowSettings(false)}
                style={{ padding: '8px 16px', background: '#1e293b', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', fontSize: '13px', fontWeight: '600', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Check style={{ width: '14px', height: '14px' }} /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
