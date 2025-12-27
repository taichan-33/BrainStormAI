'use client';

import React, { useState, useEffect } from 'react';

interface Relationship {
  id: string;
  agent_id_1: string;
  agent_id_2: string;
  relationship_type: 'rival' | 'ally';
  intensity: number;
}

interface Agent {
  id: string;
  name: string;
  role: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
}

export default function RelationshipModal({ isOpen, onClose, agents }: Props) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRel, setNewRel] = useState({
    agent_id_1: '',
    agent_id_2: '',
    relationship_type: 'rival' as 'rival' | 'ally',
    intensity: 5,
  });

  useEffect(() => {
    if (isOpen) {
      fetchRelationships();
    }
  }, [isOpen]);

  const fetchRelationships = async () => {
    try {
      const res = await fetch('/api/relationships');
      if (res.ok) {
        const data = await res.json();
        setRelationships(data);
      }
    } catch (error) {
      console.error('Failed to fetch relationships:', error);
    }
  };

  const createRelationship = async () => {
    if (!newRel.agent_id_1 || !newRel.agent_id_2 || newRel.agent_id_1 === newRel.agent_id_2) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRel),
      });
      if (res.ok) {
        await fetchRelationships();
        setNewRel({ agent_id_1: '', agent_id_2: '', relationship_type: 'rival', intensity: 5 });
      }
    } catch (error) {
      console.error('Failed to create relationship:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRelationship = async (id: string) => {
    try {
      const res = await fetch(`/api/relationships/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRelationships(relationships.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete relationship:', error);
    }
  };

  const getAgentName = (id: string) => {
    const agent = agents.find((a) => a.id === id);
    return agent ? agent.name : `Agent ${id}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">🔗 エージェント関係性設定</h2>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">
              ×
            </button>
          </div>
          <p className="text-sm text-white/80 mt-2">
            エージェント間の対立関係や協力関係を設定して、議論をより活発にできます
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* 新規追加フォーム */}
          <div className="bg-slate-50 p-4 rounded-xl mb-6">
            <h3 className="text-sm font-bold text-slate-700 mb-3">新しい関係を追加</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <select
                value={newRel.agent_id_1}
                onChange={(e) => setNewRel({ ...newRel, agent_id_1: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">エージェント1を選択</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role})
                  </option>
                ))}
              </select>
              <select
                value={newRel.agent_id_2}
                onChange={(e) => setNewRel({ ...newRel, agent_id_2: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">エージェント2を選択</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 items-center mb-3">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="relType"
                    checked={newRel.relationship_type === 'rival'}
                    onChange={() => setNewRel({ ...newRel, relationship_type: 'rival' })}
                    className="text-red-500"
                  />
                  <span className="text-sm">⚔️ 対立関係</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="relType"
                    checked={newRel.relationship_type === 'ally'}
                    onChange={() => setNewRel({ ...newRel, relationship_type: 'ally' })}
                    className="text-green-500"
                  />
                  <span className="text-sm">🤝 協力関係</span>
                </label>
              </div>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs text-slate-500">強度:</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newRel.intensity}
                  onChange={(e) => setNewRel({ ...newRel, intensity: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-sm font-bold">{newRel.intensity}</span>
              </div>
            </div>

            <button
              onClick={createRelationship}
              disabled={loading || !newRel.agent_id_1 || !newRel.agent_id_2 || newRel.agent_id_1 === newRel.agent_id_2}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              追加
            </button>
          </div>

          {/* 既存の関係一覧 */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">既存の関係</h3>
            {relationships.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">まだ関係が設定されていません</p>
            ) : (
              <div className="space-y-2">
                {relationships.map((rel) => (
                  <div
                    key={rel.id}
                    className={`p-3 rounded-lg flex items-center justify-between ${
                      rel.relationship_type === 'rival'
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-green-50 border border-green-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{rel.relationship_type === 'rival' ? '⚔️' : '🤝'}</span>
                      <span className="font-medium">
                        {getAgentName(rel.agent_id_1)} ↔ {getAgentName(rel.agent_id_2)}
                      </span>
                      <span className="text-xs bg-white px-2 py-1 rounded">
                        強度: {rel.intensity}/10
                      </span>
                    </div>
                    <button
                      onClick={() => deleteRelationship(rel.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
