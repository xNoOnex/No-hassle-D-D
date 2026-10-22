const DB_KEY = 'dnd_sessions';
const CHAR_DB_KEY = 'dnd_character_vault';

export const getSessions = () => {
  try {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

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

export const deleteSession = (sessionId) => {
  const allSessions = getSessions();
  const target = allSessions.find(s => s.id === sessionId);
  const filtered = allSessions.filter(s => s.id !== sessionId);
  localStorage.setItem(DB_KEY, JSON.stringify(filtered));

  if (target) {
    const code = target.roomId || target.roomCode;
    if (code) unlockCharactersByRoom(code);
  }
  return filtered;
};

export const getCharacters = () => {
  try {
    const data = localStorage.getItem(CHAR_DB_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveCharacter = (charData) => {
  const allChars = getCharacters();
  const index = allChars.findIndex(c => c.id === charData.id);

  if (index >= 0) {
    allChars[index] = { ...allChars[index], ...charData, updatedAt: Date.now() };
  } else {
    allChars.push({ ...charData, updatedAt: Date.now() });
  }

  localStorage.setItem(CHAR_DB_KEY, JSON.stringify(allChars));
  return allChars;
};

export const deleteCharacter = (charId) => {
  const filtered = getCharacters().filter(c => c.id !== charId);
  localStorage.setItem(CHAR_DB_KEY, JSON.stringify(filtered));
  return filtered;
};

export const unlockCharactersByRoom = (roomId) => {
  if (!roomId) return getCharacters();
  const cleanCode = String(roomId).toUpperCase();
  const updated = getCharacters().map(c => {
    if (String(c.lockedRoomId || '').toUpperCase() === cleanCode) {
      return { ...c, lockedRoomId: null, lockedCampaignName: null };
    }
    return c;
  });
  localStorage.setItem(CHAR_DB_KEY, JSON.stringify(updated));
  return updated;
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
      party: [],
      journal: ['Campaign started...'],
      combatLog: []
    },
    lastPlayed: Date.now()
  };
  saveSession(newSession);
  return newSession;
};
