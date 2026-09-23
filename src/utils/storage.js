const DB_KEY = 'dnd_sessions';

export const saveSession = (sessionData) => {
  const allSessions = getSessions();
  const index = allSessions.findIndex(s => s.id === sessionData.id);
  
  if (index >= 0) {
    allSessions[index] = { ...allSessions[index], ...sessionData, lastPlayed: Date.now() };
  } else {
    allSessions.push({ ...sessionData, lastPlayed: Date.now() });
  }
  
  localStorage.setItem(DB_KEY, JSON.stringify(allSessions));
};

export const getSessions = () => {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : [];
};

export const createNewSession = (name, role) => {
  const newSession = {
    id: `session_${Date.now()}`,
    name,
    role,
    roomCode: null,
    gameState: { 
      quest: 'Awaiting Orders...', 
      turn: 0, 
      party: {}, // Stores connected player stats
      timeline: { past: [], active: { title: 'Tavern Brawl', details: 'A fight breaks out.' }, upcoming: [] },
      combatLog: [] 
    },
    lastPlayed: Date.now()
  };
  saveSession(newSession);
  return newSession;
};
