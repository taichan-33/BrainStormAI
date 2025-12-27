import { useState, useEffect, useMemo } from 'react';
import { DEFAULT_AGENTS, CustomAgent } from '../constants/agents';

export function useAgents() {
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  
  // Load settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAgents = localStorage.getItem('BRAINSTORM_CUSTOM_AGENTS');
      if (savedAgents) {
        try {
          setCustomAgents(JSON.parse(savedAgents));
        } catch (e) {
          console.error('Failed to parse custom agents:', e);
        }
      }
    }
  }, []);

  // Save custom agents
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('BRAINSTORM_CUSTOM_AGENTS', JSON.stringify(customAgents));
    }
  }, [customAgents]);

  const addCustomAgent = (newAgent: CustomAgent) => {
    if (!newAgent.name || !newAgent.role) return;
    if (customAgents.length >= 3) return;
    
    // ID生成
    const id = newAgent.id || `C_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const agent = { ...newAgent, id };
    
    setCustomAgents([...customAgents, agent]);
  };

  const removeCustomAgent = (index: number) => {
    setCustomAgents(customAgents.filter((_, i) => i !== index));
  };

  // useMemoでエージェントリストを生成（パフォーマンスと安定性のため）
  const relationshipAgents = useMemo(() => {
    const defaultList = Object.entries(DEFAULT_AGENTS).map(([id, agent]) => ({ 
      id, 
      name: agent.role.split(' (')[0], 
      role: agent.role 
    }));
    
    // カスタムエージェントのマッピング（安全策を追加）
    const customList = customAgents.map((a, idx) => ({ 
      id: a.id || `C${String(idx + 1).padStart(2, '0')}`, 
      name: a.name || `Custom Agent ${idx + 1}`, 
      role: a.role || 'User Defined'
    }));
    
    return [...defaultList, ...customList];
  }, [customAgents]);

  return {
    customAgents,
    setCustomAgents,
    addCustomAgent,
    removeCustomAgent,
    relationshipAgents
  };
}
