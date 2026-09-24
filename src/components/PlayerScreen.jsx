import React, { useState, useEffect } from 'react';
import { Swords, Shield, Heart, User, CheckCircle, Zap, Footprints, Backpack, BookOpen, Mic, MicOff, BookText } from 'lucide-react';
// ... (Keep existing imports and SKILLS array) ...

export default function PlayerScreen({ network, gameState }) {
  const [view, setView] = useState(() => { const saved = localStorage.getItem('dnd_character'); return (saved && JSON.parse(saved).name) ? 'combat' : 'builder'; });
  const [isRecording, setIsRecording] = useState(false);
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;
  
  // ... (Keep existing character state, math hooks, and network sync functions) ...

  const handleJournalChange = (e) => {
    if (!network) return;
    network.sendAction('UPDATE_JOURNAL', { text: e.target.value });
  };

  const toggleDictation = () => {
    if (!recognition) return alert("Browser does not support voice dictation.");
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
        }
        if (finalTranscript && network) {
          const newText = (gameState.journal || '') + '\n' + finalTranscript;
          network.sendAction('UPDATE_JOURNAL', { text: newText });
        }
      };
      recognition.onend = () => setIsRecording(false);
      recognition.start();
      setIsRecording(true);
    }
  };

  // ... (Keep existing builder and combat renderers) ...

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '80px' }}>
      
      {/* ... (Keep top bar and stats HUD) ... */}

      {view === 'journal' && (
        <div className="card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3>Party Journal</h3>
            <button className={isRecording ? 'btn-primary' : 'btn-outline'} style={{width: 'auto', padding: '8px', background: isRecording ? 'var(--danger)' : 'transparent', borderColor: isRecording ? 'var(--danger)' : 'var(--accent)', color: isRecording ? 'white' : 'var(--accent)'}} onClick={toggleDictation}>
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          </div>
          <textarea 
            value={gameState.journal || ''} 
            onChange={handleJournalChange}
            style={{width: '100%', minHeight: '300px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--surface)', padding: '12px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.5'}}
            placeholder="Dictate or type campaign notes here..."
          />
        </div>
      )}

      {/* Fixed Bottom Navigation */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', padding: '12px', display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #334155', maxWidth: '600px', margin: '0 auto' }}>
        <button style={{background: 'transparent', color: view === 'combat' ? 'var(--accent)' : 'var(--text-muted)'}} onClick={() => setView('combat')}><Swords size={20} /><div style={{fontSize: '10px'}}>Combat</div></button>
        <button style={{background: 'transparent', color: view === 'inventory' ? 'var(--accent)' : 'var(--text-muted)'}} onClick={() => setView('inventory')}><Backpack size={20} /><div style={{fontSize: '10px'}}>Bag</div></button>
        <button style={{background: 'transparent', color: view === 'bio' ? 'var(--accent)' : 'var(--text-muted)'}} onClick={() => setView('bio')}><BookOpen size={20} /><div style={{fontSize: '10px'}}>Bio</div></button>
        <button style={{background: 'transparent', color: view === 'journal' ? 'var(--accent)' : 'var(--text-muted)'}} onClick={() => setView('journal')}><BookText size={20} /><div style={{fontSize: '10px'}}>Notes</div></button>
      </div>
    </div>
  );
}
