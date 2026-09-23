import React from 'react';
import { Swords } from 'lucide-react';
import { rollPhysical } from '../utils/dndEngine';

export default function PlayerScreen({ network, gameState }) {
  const playerSendRoll = () => {
    if (!network) return;
    const result = rollPhysical(20);
    network.sendAction('PLAYER_ROLL', { 
      result: result.total, 
      isCrit: result.isCrit 
    });
  };

  return (
    <div className="card">
      <div style={{background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', marginBottom: '20px'}}>
        <p style={{color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px'}}>CURRENT QUEST</p>
        <p style={{fontWeight: 'bold', fontSize: '18px'}}>{gameState.quest}</p>
      </div>

      <button className="btn-primary flex-center" onClick={playerSendRoll}>
        <Swords size={20} /> Roll d20 Attack
      </button>
      
      {/* Player-specific combat log could go here later */}
    </div>
  );
}
