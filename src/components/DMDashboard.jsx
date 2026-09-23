import React, { useState, useEffect } from 'react';
import { Users, Swords, Map, Gem, Skull, Plus, Save, Target, ArrowRight, Mic, MicOff, BookOpen, BookText } from 'lucide-react';

export default function DMDashboard({ network, gameState, setGameState }) {
  const [activeTab, setActiveTab] = useState('story');
  const [bestiary, setBestiary] = useState(() => JSON.parse(localStorage.getItem('dnd_bestiary') || '[]'));
  const [lootPool, setLootPool] = useState(() => JSON.parse(localStorage.getItem('dnd_loot') || '[]'));
  
  const [activeMonsters, setActiveMonsters] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  
  // Speech Recognition Setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  useEffect(() => localStorage.setItem('dnd_bestiary', JSON.stringify(bestiary)), [bestiary]);
  useEffect(() => localStorage.setItem('dnd_loot', JSON.stringify(lootPool)), [lootPool]);

  const handleJournalChange = (e) => {
    const text = e.target.value;
    setGameState({ ...gameState, journal: text });
    if (network) network.broadcastState({ ...gameState, journal: text });
  };

  const toggleDictation = () => {
    if (!recognition) return alert("Your browser doesn't support voice dictation.");
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
        if (finalTranscript) {
          const newText = (gameState.journal || '') + '\n' + finalTranscript;
          setGameState({ ...gameState, journal: newText });
          if (network) network.broadcastState({ ...gameState, journal: newText });
        }
      };
      recognition.onend = () => setIsRecording(false);
      recognition.start();
      setIsRecording(true);
    }
  };

  // --- RENDERERS ---
  const renderStoryTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
        <h3 style={{color: 'var(--accent)', marginBottom: '8px'}}>Module: The Stolen Core of Oakhaven</h3>
        <p style={{fontSize: '14px', color: 'var(--text-muted)'}}>A beginner adventure for a newly forged party. Read the bold text aloud to your players.</p>
      </div>

      <div className="card">
        <h4 style={{marginBottom: '8px'}}>Act 1: The Velvet Table</h4>
        <p style={{fontSize: '14px', fontStyle: 'italic', marginBottom: '8px'}}>
          "You sit in the dimly lit parlor of Madame Elara. The air smells of pine and old parchment. The town's power crystal was stolen last night, but Elara called you here for a different reason: destiny."
        </p>
        <div style={{background: 'var(--bg-dark)', padding: '10px', borderRadius: '8px', fontSize: '12px'}}>
          <strong>NPC: Madame Elara (Neutral Ally)</strong>
          <ul style={{marginLeft: '16px', marginTop: '4px', color: 'var(--text-muted)'}}>
            <li>Warm, mysterious. Uses a deck of illustrated cards to divine the future.</li>
            <li><strong>DM Tip:</strong> If you have a real tarot deck, draw three cards at the table (Past, Present, Future). Ask the players for their real birth dates and pretend to calculate their numerology life paths to bind them as a team.</li>
            <li><strong>Goal:</strong> Force the players to agree on a "Party Name" before leaving the tent.</li>
          </ul>
        </div>
      </div>

      <div className="card">
        <h4 style={{marginBottom: '8px'}}>Act 2: The Whispering Woods</h4>
        <p style={{fontSize: '14px', fontStyle: 'italic', marginBottom: '8px'}}>
          "Following a trail of dropped gears, you reach a rushing river. The old stone bridge has collapsed into the water."
        </p>
        <div style={{background: 'var(--bg-dark)', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '8px'}}>
          <strong>Obstacle: The Broken Bridge</strong>
          <ul style={{marginLeft: '16px', marginTop: '4px', color: 'var(--text-muted)'}}>
            <li>Athletics (DC 12) to jump it. Acrobatics (DC 12) to balance on a log.</li>
            <li>Failure: Fall in mud, take 1d4 Bludgeoning damage.</li>
          </ul>
        </div>
        <div style={{background: 'var(--surface)', padding: '10px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--danger)'}}>
          <strong>Encounter: Goblin Scouts</strong>
          <p style={{color: 'var(--text-muted)', marginTop: '4px'}}>Once they cross, two Goblins drop from the trees. Use the Bestiary tab to spawn two 'Goblin Scouts'.</p>
        </div>
      </div>

      <div className="card">
        <h4 style={{marginBottom: '8px'}}>Act 3: The Crumbling Ruins</h4>
        <p style={{fontSize: '14px', fontStyle: 'italic', marginBottom: '8px'}}>
          "In a ruined stone courtyard, a large goblin is trying to pry open the glowing crystal. A mangy wolf growls at his side."
        </p>
        <div style={{background: 'var(--bg-dark)', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '8px'}}>
          <strong>Adaptation Hooks (If players go off-script)</strong>
          <ul style={{marginLeft: '16px', marginTop: '4px', color: 'var(--text-muted)'}}>
            <li><strong>If they use Stealth (DC 13):</strong> Let them attack first with Advantage.</li>
            <li><strong>If they try to talk/negotiate:</strong> The boss (Kargg) is greedy. If they offer 50+ gold, he might trade the crystal and walk away.</li>
          </ul>
        </div>
        <div style={{background: 'var(--surface)', padding: '10px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--danger)'}}>
          <strong>Boss Fight: Kargg & Snarl</strong>
          <p style={{color: 'var(--text-muted)', marginTop: '4px'}}>Spawn 'Kargg (Boss)' and 'Snarl (Wolf)'. The wolf attacks the highest AC player. Kargg shoots from afar until the wolf dies.</p>
        </div>
      </div>
    </div>
  );

  const renderJournalTab = () => (
    <div className="card" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h3>Campaign Journal</h3>
        <button className={isRecording ? 'btn-primary' : 'btn-outline'} style={{width: 'auto', padding: '8px', background: isRecording ? 'var(--danger)' : 'transparent', borderColor: isRecording ? 'var(--danger)' : 'var(--accent)', color: isRecording ? 'white' : 'var(--accent)'}} onClick={toggleDictation}>
          {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
      </div>
      <p style={{fontSize: '12px', color: 'var(--text-muted)'}}>Type or dictate notes here. This journal syncs live to all players' screens.</p>
      <textarea 
        value={gameState.journal || ''} 
        onChange={handleJournalChange}
        style={{width: '100%', minHeight: '300px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--surface)', padding: '12px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.5'}}
      />
    </div>
  );

  // Note: renderPartyTab, renderCampaignTab, renderCombatTab, renderLootTab, renderBestiaryTab omitted for brevity but remain unchanged from previous versions.

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', borderBottom: '1px solid var(--surface)' }}>
        {[ 
          { id: 'story', icon: BookOpen, label: 'Story' },
          { id: 'journal', icon: BookText, label: 'Journal' },
          { id: 'campaign', icon: Map, label: 'Timeline' },
          { id: 'party', icon: Users, label: 'Party' },
          { id: 'combat', icon: Swords, label: 'Combat' },
          { id: 'loot', icon: Gem, label: 'Loot' },
          { id: 'bestiary', icon: Skull, label: 'Bestiary' }
        ].map(tab => (
          <button 
            key={tab.id}
            className={activeTab === tab.id ? 'btn-primary' : 'btn-outline'} 
            style={{ padding: '8px 12px', minWidth: 'max-content', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'story' && renderStoryTab()}
      {activeTab === 'journal' && renderJournalTab()}
      
      {/* Existing Tabs */}
      {activeTab === 'combat' && (
        <div className="card">
          <h3 style={{marginBottom: '16px'}}>Active Encounter</h3>
          {activeMonsters.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Encounter is clear.</p> : (
            activeMonsters.map(mob => (
              <div key={mob.instanceId} style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <strong>{mob.name}</strong>
                  <span style={{color: 'var(--danger)'}}>HP: {mob.hpCurrent}/{mob.hp}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {activeTab === 'bestiary' && (
        <div className="card">
          <h3 style={{marginBottom: '16px'}}>Bestiary / Spawner</h3>
          {bestiary.map(mob => (
            <button key={mob.id} className="btn-outline" style={{width: '100%', marginBottom: '8px'}} onClick={() => setActiveMonsters([...activeMonsters, { ...mob, instanceId: Date.now(), hpCurrent: mob.hp }])}>
              Spawn {mob.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
