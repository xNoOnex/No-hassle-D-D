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
    const campaignTitle = existingSession ? existingSession.name : newCampaignName.trim();
    if (!campaignTitle) return;

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
      setNetwork(net);
      setActiveSession(sessionObj);
      saveSession(sessionObj);
    });
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
      setNetwork(net);
      setActiveSession(sessionObj);
    });
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-400" />
          <h1 className="font-bold text-lg tracking-wide">No-Hassle D&D</h1>
          {activeSession && (
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
              ROOM: {activeSession.roomId} ({activeSession.role === 'host' ? 'HOST' : 'PLAYER'})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
            title="AI Director Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          {activeSession && (
            <button
              onClick={handleLeaveSession}
              className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-300 text-xs font-semibold rounded border border-red-800 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Leave
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 overflow-y-auto">
        {!activeSession ? (
          <div className="space-y-6">
            <div className="p-5 bg-slate-900 rounded-xl border border-indigo-900/50 shadow-lg space-y-4">
              <div className="flex items-center gap-2 text-indigo-400">
                <Shield className="w-5 h-5" />
                <h2 className="font-bold text-base">Host a Campaign (AI Director + Host Player)</h2>
              </div>
              <p className="text-sm text-slate-400">
                Generates a room code, runs the OpenRouter AI Director on your phone, and lets you play alongside your party.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="NEW CAMPAIGN NAME"
                  value={newCampaignName}
                  onChange={e => setNewCampaignName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => startHostSession(null)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition"
                >
                  Host World
                </button>
              </div>
            </div>

            <div className="p-5 bg-slate-900 rounded-xl border border-emerald-900/50 shadow-lg space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Users className="w-5 h-5" />
                <h2 className="font-bold text-base">Join a Game (Client Player)</h2>
              </div>
              <p className="text-sm text-slate-400">
                Enter the Host's 4-letter room code. Your character syncs automatically and uses the Host's AI Director.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="4-LETTER CODE"
                  maxLength={6}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white uppercase font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={startClientJoin}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-sm transition"
                >
                  Join Room
                </button>
              </div>
            </div>

            {sessions.length > 0 && (
              <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 shadow-lg space-y-3">
                <h2 className="font-bold text-sm text-slate-300">Resume Saved Campaign (Host)</h2>
                <div className="space-y-2">
                  {sessions.map(s => (
                    <div
                      key={s.id}
                      className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-sm text-indigo-300">{s.name}</div>
                        <div className="text-xs text-slate-500">
                          Last played: {new Date(s.lastPlayed).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => startHostSession(s)}
                        className="px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" /> Host Saved
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <Key className="w-5 h-5" />
                <span>OpenRouter AI Settings</span>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Your API key is stored strictly in your phone's local storage. It is never included in git commits or sent to other players.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">OpenRouter API Key</label>
                <input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Model ID</label>
                <input
                  type="text"
                  placeholder="nousresearch/hermes-3-llama-3.1-70b"
                  value={modelInput}
                  onChange={e => setModelInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-sm font-semibold rounded hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded hover:bg-indigo-500 flex items-center gap-1"
              >
                <Check className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
