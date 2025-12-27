'use client';

import { useState, useEffect } from 'react';

// デフォルトエージェント定義
const DEFAULT_AGENT_DEFS = [
  { id: '01', name: 'Facilitator', role: '司会', model: 'gpt-5.2', icon: '🎙️', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: '02', name: 'Innovator', role: '起業家', model: 'gemini-3-pro-preview', icon: '🚀', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { id: '03', name: 'Critic', role: '批評家', model: 'gpt-5.2', icon: '🧐', color: 'text-red-600', bg: 'bg-red-50' },
  { id: '04', name: 'Strategist', role: '戦略家', model: 'gpt-5.2', icon: '♟️', color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: '05', name: 'Marketer', role: 'マーケター', model: 'gemini-3-pro-preview', icon: '📣', color: 'text-pink-600', bg: 'bg-pink-50' },
  { id: '06', name: 'Tech Lead', role: '技術者', model: 'gpt-5.2', icon: '🔧', color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

interface CustomAgent {
  id?: string;  // 永続化エージェントの場合はUUID
  name: string;
  role: string;
  responsibility: string;
  personality: string;
  model: string;
}

interface SavedAgent {
  id: string;
  name: string;
  role: string;
  responsibility: string;
  personality: string;
  model: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  enabledAgentIds: string[];
  setEnabledAgentIds: (ids: string[]) => void;
  customAgents: CustomAgent[];
  setCustomAgents: (agents: CustomAgent[]) => void;
}

export default function AgentSettingsModal({
  isOpen,
  onClose,
  enabledAgentIds,
  setEnabledAgentIds,
  customAgents,
  setCustomAgents,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<SavedAgent | null>(null);
  const [savedAgents, setSavedAgents] = useState<SavedAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [newAgent, setNewAgent] = useState<CustomAgent>({
    name: '',
    role: '',
    responsibility: '',
    personality: '',
    model: 'gpt-5.2',
  });

  // 永続化されたエージェントを取得
  useEffect(() => {
    if (isOpen) {
      fetchSavedAgents();
    }
  }, [isOpen]);

  const fetchSavedAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setSavedAgents(data);
      }
    } catch (e) {
      console.error('Failed to fetch saved agents:', e);
    }
  };

  if (!isOpen) return null;

  const toggleAgent = (agentId: string) => {
    if (enabledAgentIds.includes(agentId)) {
      // Prevent disabling all agents (at least facilitator + 1 must remain)
      if (enabledAgentIds.length <= 2 && agentId !== '01') return;
      if (agentId === '01') return; // Always keep facilitator
      setEnabledAgentIds(enabledAgentIds.filter((id) => id !== agentId));
    } else {
      setEnabledAgentIds([...enabledAgentIds, agentId]);
    }
  };

  // 永続化エージェントを追加
  const addSavedAgent = async () => {
    if (!newAgent.name || !newAgent.role) return;
    setLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent),
      });
      if (res.ok) {
        await fetchSavedAgents();
        setNewAgent({ name: '', role: '', responsibility: '', personality: '', model: 'gpt-5.2' });
        setShowAddForm(false);
      }
    } catch (e) {
      console.error('Failed to create agent:', e);
    } finally {
      setLoading(false);
    }
  };

  // 永続化エージェントを更新
  const updateSavedAgent = async () => {
    if (!editingAgent) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${editingAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingAgent.name,
          role: editingAgent.role,
          responsibility: editingAgent.responsibility,
          personality: editingAgent.personality,
          model: editingAgent.model,
        }),
      });
      if (res.ok) {
        await fetchSavedAgents();
        setEditingAgent(null);
      }
    } catch (e) {
      console.error('Failed to update agent:', e);
    } finally {
      setLoading(false);
    }
  };

  // 永続化エージェントを削除
  const deleteSavedAgent = async (agentId: string) => {
    if (!confirm('このエージェントを削除しますか？')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchSavedAgents();
        // enabledAgentIdsからも削除
        setEnabledAgentIds(enabledAgentIds.filter((id) => id !== agentId));
      }
    } catch (e) {
      console.error('Failed to delete agent:', e);
    } finally {
      setLoading(false);
    }
  };

  // セッション開始時にカスタムエージェントとして使用
  const useSavedAgentsForSession = () => {
    const enabledSaved = savedAgents.filter(a => enabledAgentIds.includes(a.id));
    const converted = enabledSaved.map(a => ({
      id: a.id,  // 永続化エージェントのIDを含める
      name: a.name,
      role: a.role,
      responsibility: a.responsibility,
      personality: a.personality,
      model: a.model,
    }));
    setCustomAgents(converted);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              ⚙️ エージェント設定
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-indigo-100 text-sm mt-2">
            チェックボックスで議論に参加するエージェントを選択
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[55vh]">
          {/* Default Agents */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
              デフォルトエージェント
            </h3>
            <div className="space-y-2">
              {DEFAULT_AGENT_DEFS.map((agent) => (
                <label
                  key={agent.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    enabledAgentIds.includes(agent.id)
                      ? `${agent.bg} border-current ${agent.color}`
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  } ${agent.id === '01' ? 'cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={enabledAgentIds.includes(agent.id)}
                    onChange={() => toggleAgent(agent.id)}
                    disabled={agent.id === '01'}
                    className="w-5 h-5 rounded text-indigo-600"
                  />
                  <span className="text-2xl">{agent.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">
                      {agent.role} ({agent.name})
                    </div>
                    <div className="text-xs text-slate-500">
                      {agent.model.includes('gpt') ? 'ChatGPT' : 'Gemini'}
                    </div>
                  </div>
                  {agent.id === '01' && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                      必須
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Saved Custom Agents */}
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              カスタムエージェント（永続）
              {loading && <span className="text-xs text-indigo-500 animate-pulse">読込中...</span>}
            </h3>

            {savedAgents.length > 0 && (
              <div className="space-y-2 mb-4">
                {savedAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      enabledAgentIds.includes(agent.id)
                        ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={enabledAgentIds.includes(agent.id)}
                      onChange={() => toggleAgent(agent.id)}
                      className="w-5 h-5 rounded text-indigo-600"
                    />
                    <span className="text-2xl">🤖</span>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">
                        {agent.role} ({agent.name})
                      </div>
                      <div className="text-xs text-slate-500">
                        {agent.model.includes('gpt') ? 'ChatGPT' : 'Gemini'}
                        {agent.personality && ` • ${agent.personality.slice(0, 20)}...`}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingAgent(agent)}
                        className="text-indigo-500 hover:text-indigo-700 text-xs font-bold px-2 py-1 bg-indigo-50 rounded"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => deleteSavedAgent(agent.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 bg-red-50 rounded"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Edit Form */}
            {editingAgent && (
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3 mb-4">
                <h4 className="font-bold text-amber-800 text-sm">✏️ エージェントを編集</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    className="px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                    placeholder="名前 *"
                    value={editingAgent.name}
                    onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                  />
                  <input
                    type="text"
                    className="px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                    placeholder="役割 *"
                    value={editingAgent.role}
                    onChange={(e) => setEditingAgent({ ...editingAgent, role: e.target.value })}
                  />
                </div>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                  placeholder="責任・担当"
                  value={editingAgent.responsibility || ''}
                  onChange={(e) => setEditingAgent({ ...editingAgent, responsibility: e.target.value })}
                />
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                  placeholder="性格"
                  value={editingAgent.personality || ''}
                  onChange={(e) => setEditingAgent({ ...editingAgent, personality: e.target.value })}
                />
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-600">モデル:</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={editingAgent.model === 'gpt-5.2'}
                      onChange={() => setEditingAgent({ ...editingAgent, model: 'gpt-5.2' })}
                    />
                    <span className="text-sm">ChatGPT</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={editingAgent.model === 'gemini-3-pro-preview'}
                      onChange={() => setEditingAgent({ ...editingAgent, model: 'gemini-3-pro-preview' })}
                    />
                    <span className="text-sm">Gemini</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={updateSavedAgent}
                    disabled={loading || !editingAgent.name || !editingAgent.role}
                    className="flex-1 bg-amber-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-amber-700 disabled:opacity-50"
                  >
                    更新
                  </button>
                  <button
                    onClick={() => setEditingAgent(null)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            {/* Add new custom agent form */}
            {showAddForm && !editingAgent ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    className="px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                    placeholder="名前 *"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  />
                  <input
                    type="text"
                    className="px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                    placeholder="役割 *"
                    value={newAgent.role}
                    onChange={(e) => setNewAgent({ ...newAgent, role: e.target.value })}
                  />
                </div>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                  placeholder="責任・担当"
                  value={newAgent.responsibility}
                  onChange={(e) => setNewAgent({ ...newAgent, responsibility: e.target.value })}
                />
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                  placeholder="性格"
                  value={newAgent.personality}
                  onChange={(e) => setNewAgent({ ...newAgent, personality: e.target.value })}
                />
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-600">モデル:</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={newAgent.model === 'gpt-5.2'}
                      onChange={() => setNewAgent({ ...newAgent, model: 'gpt-5.2' })}
                    />
                    <span className="text-sm">ChatGPT</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={newAgent.model === 'gemini-3-pro-preview'}
                      onChange={() => setNewAgent({ ...newAgent, model: 'gemini-3-pro-preview' })}
                    />
                    <span className="text-sm">Gemini</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addSavedAgent}
                    disabled={loading || !newAgent.name || !newAgent.role}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? '保存中...' : '永続保存'}
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : !editingAgent ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-xl">+</span>
                <span>カスタムエージェントを追加</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => {
              useSavedAgentsForSession();
              onClose();
            }}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-3 rounded-xl shadow-lg hover:from-indigo-700 hover:to-violet-700"
          >
            設定を保存して閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
