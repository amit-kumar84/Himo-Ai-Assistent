import { useState, useEffect } from 'react';

interface UserMemory {
  name: string;
  preferences: Record<string, any>;
  relationshipLevel: number; // 0: stranger, 1: friend, 2: close, 3: girlfriend
  lastInteraction: string;
}

const MEMORY_KEY = 'himo_memory';

export function useHimoMemory() {
  const [memory, setMemory] = useState<UserMemory>(() => {
    const saved = localStorage.getItem(MEMORY_KEY);
    return saved ? JSON.parse(saved) : {
      name: 'Amit',
      preferences: {
        voiceName: 'Kore',
        autoVision: false,
        romanticMode: true,
        appearance: {
          orbColor: 'pink',
          orbShape: 'circle',
          particleEffect: 'orbit'
        }
      },
      relationshipLevel: 0,
      lastInteraction: new Date().toISOString()
    };
  });

  useEffect(() => {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  }, [memory]);

  const updatePreference = (key: string, value: any) => {
    setMemory(prev => ({
      ...prev,
      preferences: { ...prev.preferences, [key]: value }
    }));
  };

  const increaseRelationship = () => {
    setMemory(prev => ({
      ...prev,
      relationshipLevel: Math.min(prev.relationshipLevel + 0.1, 3)
    }));
  };

  const getRelationshipStatus = () => {
    if (memory.relationshipLevel >= 3) return 'Girlfriend';
    if (memory.relationshipLevel >= 2) return 'Close Friend';
    if (memory.relationshipLevel >= 1) return 'Friend';
    return 'Stranger';
  };

  return {
    memory,
    setMemory,
    updatePreference,
    increaseRelationship,
    getRelationshipStatus
  };
}
