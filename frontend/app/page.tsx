'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { SessionStatus } from './types';

import { DEFAULT_AGENTS, CustomAgent, CUSTOM_COLORS } from './constants/agents';
import { useAgents } from './hooks/useAgents';
import { useBrainstorming } from './hooks/useBrainstorming';
import { sessionService } from './services/sessions';



import HistorySidebar from './components/HistorySidebar';
import AgentSettingsModal from './components/AgentSettingsModal';
import TimelineView from './components/TimelineView';
import VoiceInput from './components/VoiceInput';
import TTSPlayer from './components/TTSPlayer';
import RelationshipModal from './components/RelationshipModal';

export default function Home() {
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [turnCount, setTurnCount] = useState(6); // Default 1 round

  const {
    session,
    setSession,
    loading,
    progress,
    error,
    startSession,
    resumeSession,
    setError
  } = useBrainstorming();
  
  // Custom agents state
  const { 
    customAgents, 
    setCustomAgents, 
    addCustomAgent: addAgent, 
    removeCustomAgent, 
    relationshipAgents 
  } = useAgents();

  const [showAgentForm, setShowAgentForm] = useState(false);
  const [newAgent, setNewAgent] = useState<CustomAgent>({
    name: '',
    role: '',
    responsibility: '',
    personality: '',
    model: 'gpt-5.2',
  });

  // Agent settings modal state
  const [showAgentSettings, setShowAgentSettings] = useState(false);
  const [enabledAgentIds, setEnabledAgentIds] = useState<string[]>(['01', '02', '03', '04', '05', '06']);
  
  // 表示モード切り替え（カード or タイムライン）
  const [viewMode, setViewMode] = useState<'card' | 'timeline'>('card');
  
  // 関係性モーダル
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);



  // Dynamic AGENTS map
  const getAgentsMap = () => {
    const agents: Record<string, { role: string; color: string; bg: string; icon: string }> = { ...DEFAULT_AGENTS };
    
    // ローカルのcustomAgentsから追加
    customAgents.forEach((agent, idx) => {
      const id = agent.id || `C${String(idx + 1).padStart(2, '0')}`;
      agents[id] = {
        role: `${agent.role} (${agent.name})`,
        ...CUSTOM_COLORS[idx % CUSTOM_COLORS.length],
      };
    });
    
    // セッションに保存されているカスタムエージェントからも追加（過去セッション読み込み時）
    if (session?.custom_agents) {
      session.custom_agents.forEach((agent: any, idx: number) => {
        const id = agent.id || `C${String(idx + 1).padStart(2, '0')}`;
        if (!agents[id]) {  // まだ追加されていなければ追加
          agents[id] = {
            role: `${agent.role} (${agent.name})`,
            ...CUSTOM_COLORS[idx % CUSTOM_COLORS.length],
          };
        }
      });
    }
    
    return agents;
  };
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  const handleNewSession = () => {
      setSession(null);
      setTopic('');
      setContext('');
      // customAgents clear logic if needed, but maybe keep them?
      // setCustomAgents([]); // Optional: keep agents across sessions
  };

  const loadSession = async (sessionId: string) => {
      try {
          const data = await sessionService.get(sessionId);
          setSession(data);
      } catch (e: any) {
          setError(e.message);
      }
  };

  const addCustomAgent = () => {
    if (!newAgent.name || !newAgent.role) return;
    if (customAgents.length >= 3) return;
    
    // フックの関数を使用
    addAgent(newAgent);
    
    setNewAgent({ name: '', role: '', responsibility: '', personality: '', model: 'gpt-5.2' });
    setShowAgentForm(false);
  };



  const handleRunSession = () => {
    if (!topic) return;
    startSession({
        topic,
        context_details: context,
        custom_agents: customAgents.length > 0 ? customAgents : undefined,
        enabled_agent_ids: enabledAgentIds,
    }, turnCount);
  };

  const handleResumeSession = () => {
    if (!session) return;
    if (turnCount <= 0) {
      setError('ターン数を1以上に設定してください');
      return;
    }
    resumeSession(turnCount);
  };

  const exportSummary = () => {
      if (!session || !session.summary) return;
      const element = document.createElement("a");
      const file = new Blob([session.summary], {type: 'text/markdown'});
      element.href = URL.createObjectURL(file);
      element.download = `meeting_summary_${session.session_id.slice(0,8)}.md`;
      document.body.appendChild(element);
      element.click();
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // useMemoロジックはフックに移動したため削除

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar - Mobile responsive & Toggleable */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-slate-900 transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 relative`}>
        <HistorySidebar 
            currentSessionId={session?.session_id} 
            onSelectSession={loadSession}
            onNewSession={handleNewSession}
            onOpenAgentSettings={() => setShowAgentSettings(true)}
        />
      </div>

      {/* Agent Settings Modal */}
      <AgentSettingsModal
        isOpen={showAgentSettings}
        onClose={() => setShowAgentSettings(false)}
        enabledAgentIds={enabledAgentIds}
        setEnabledAgentIds={setEnabledAgentIds}
        customAgents={customAgents}
        setCustomAgents={setCustomAgents}
      />
      
      {/* Relationship Modal */}
      <RelationshipModal
        isOpen={showRelationshipModal}
        onClose={() => setShowRelationshipModal(false)}
        agents={relationshipAgents}
      />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-300">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button 
                onClick={toggleSidebar}
                className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 transition-colors rounded-lg hover:bg-slate-100"
                title={isSidebarOpen ? "サイドバーを隠す" : "サイドバーを表示"}
             >
                 {isSidebarOpen ? (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                     </svg>
                 ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                     </svg>
                 )}
             </button>
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-2xl shadow-indigo-200 shadow-lg">
               🧠
             </div>
             <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
               BrainStorm AI
             </h1>
          </div>
          {session && (
            <div className="flex items-center gap-4">
               <button
                 onClick={() => setShowRelationshipModal(true)}
                 className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-full hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/30"
               >
                   🔗 関係性設定
               </button>
               {session.summary && (
                   <button 
                    onClick={exportSummary}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-full hover:bg-slate-700 transition-colors shadow-lg shadow-slate-500/30"
                   >
                       📄 要約を保存
                   </button>
               )}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto w-full">
      <div className="max-w-5xl mx-auto p-6 md:p-8">
        {!session ? (
          <div className="max-w-xl mx-auto mt-10 animate-in fade-in zoom-in duration-300">
            <div className="bg-white rounded-2xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">新しい会議を始める</h2>
                <p className="text-slate-500">
                  テーマを入力して、AIチームによる<br/>自動ブレインストーミングを開始します。
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    議題・テーマ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                    placeholder="例: 若者向けの新しい和菓子ブランド"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <div className="mt-2">
                    <VoiceInput onTranscript={(text) => setTopic(prev => prev ? `${prev} ${text}` : text)} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    背景・補足情報
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none resize-none"
                    placeholder="ターゲット層、予算感、現在の課題など..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                  />
                  <div className="mt-2">
                    <VoiceInput onTranscript={(text) => setContext(prev => prev ? `${prev} ${text}` : text)} />
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">
                    自動進行ターン数
                    <span className="text-xs text-slate-400 ml-2">
                      (参加エージェント: {enabledAgentIds.length}体)
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <select 
                      value={turnCount}
                      onChange={(e) => setTurnCount(Number(e.target.value))}
                      className="w-2/3 px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none"
                    >
                        <option value={enabledAgentIds.length}>{enabledAgentIds.length}ターン (1周)</option>
                        <option value={enabledAgentIds.length * 2}>{enabledAgentIds.length * 2}ターン (2周)</option>
                        <option value={enabledAgentIds.length * 3}>{enabledAgentIds.length * 3}ターン (3周)</option>
                        <option value={0}>カスタム設定</option>
                    </select>
                    {turnCount === 0 || ![3, 6, 12, 18].includes(turnCount) ? (
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={turnCount === 0 ? '' : turnCount}
                            onChange={(e) => setTurnCount(Number(e.target.value))}
                            placeholder="回数"
                            className="w-1/3 px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none"
                        />
                    ) : null}
                  </div>
                </div>

                {/* Custom Agents Section */}
                <div className="border-t border-slate-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-semibold text-slate-700">
                      カスタムエージェント追加（任意）
                    </label>
                    <span className="text-xs text-slate-400">{customAgents.length}/3</span>
                  </div>

                  {/* Added custom agents */}
                  {customAgents.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {customAgents.map((agent, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-lg border border-cyan-200">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{CUSTOM_COLORS[idx % CUSTOM_COLORS.length].icon}</span>
                            <div>
                              <span className="font-medium text-slate-800">{agent.name}</span>
                              <span className="text-slate-500 text-sm ml-2">({agent.role})</span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${agent.model.includes('gpt') ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                              {agent.model.includes('gpt') ? 'ChatGPT' : 'Gemini'}
                            </span>
                          </div>
                          <button
                            onClick={() => removeCustomAgent(idx)}
                            className="text-red-500 hover:text-red-700 text-sm font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new agent form */}
                  {showAgentForm ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          className="px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                          placeholder="エージェント名 *"
                          value={newAgent.name}
                          onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                        />
                        <input
                          type="text"
                          className="px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                          placeholder="役割（例: デザイナー）*"
                          value={newAgent.role}
                          onChange={(e) => setNewAgent({ ...newAgent, role: e.target.value })}
                        />
                      </div>
                      <input
                        type="text"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                        placeholder="責任・担当範囲"
                        value={newAgent.responsibility}
                        onChange={(e) => setNewAgent({ ...newAgent, responsibility: e.target.value })}
                      />
                      <input
                        type="text"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                        placeholder="性格・特徴"
                        value={newAgent.personality}
                        onChange={(e) => setNewAgent({ ...newAgent, personality: e.target.value })}
                      />
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600">モデル:</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="model"
                            checked={newAgent.model === 'gpt-5.2'}
                            onChange={() => setNewAgent({ ...newAgent, model: 'gpt-5.2' })}
                            className="text-indigo-600"
                          />
                          <span className="text-sm">ChatGPT</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="model"
                            checked={newAgent.model === 'gemini-3-pro-preview'}
                            onChange={() => setNewAgent({ ...newAgent, model: 'gemini-3-pro-preview' })}
                            className="text-indigo-600"
                          />
                          <span className="text-sm">Gemini</span>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={addCustomAgent}
                          disabled={!newAgent.name || !newAgent.role}
                          className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          追加
                        </button>
                        <button
                          onClick={() => setShowAgentForm(false)}
                          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : customAgents.length < 3 ? (
                    <button
                      onClick={() => setShowAgentForm(true)}
                      className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="text-xl">+</span>
                      <span>カスタムエージェントを追加</span>
                    </button>
                  ) : null}
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleRunSession}
                    disabled={loading || !topic}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/30 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {progress}
                      </>
                    ) : (
                      '自動ブレインストーミング開始 🚀'
                    )}
                  </button>
                  {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                       ⚠️ {error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="pb-12">
               <div className="text-center py-6">
                 {/*  Ideally we show stored topic, but currently SessionStatus schema doesn't have topic. using local state if new, generic if loaded. */}
                 <h2 className="text-2xl font-bold text-slate-800">{topic || '過去のセッションログ'}</h2>
                 {context && <p className="text-slate-500 mt-2 text-sm max-w-2xl mx-auto">{context}</p>}
                 
                 {/* 表示モード切替ボタン */}
                 <div className="flex justify-center gap-2 mt-4">
                   <button
                     onClick={() => setViewMode('card')}
                     className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                       viewMode === 'card'
                         ? 'bg-indigo-600 text-white shadow-md'
                         : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                     }`}
                   >
                     📋 カード表示
                   </button>
                   <button
                     onClick={() => setViewMode('timeline')}
                     className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                       viewMode === 'timeline'
                         ? 'bg-indigo-600 text-white shadow-md'
                         : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                     }`}
                   >
                     📊 タイムライン
                   </button>
                   <button
                     onClick={() => window.open(`/api/sessions/${session.session_id}/export/pdf`, '_blank')}
                     className="px-4 py-2 rounded-lg text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-md"
                   >
                     📄 PDF出力
                   </button>
                 </div>
                 
                 {/* 音声読み上げ */}
                 <div className="mt-4">
                   <TTSPlayer messages={session.messages} agents={getAgentsMap()} />
                 </div>
               </div>

              {/* タイムライン表示 */}
              {viewMode === 'timeline' ? (
                <TimelineView messages={session.messages} agents={getAgentsMap()} />
              ) : (
                <>
                  {/* カード表示（既存） */}
                  {session.messages.map((msg, idx) => {
                    const AGENTS = getAgentsMap();
                    const agent = AGENTS[msg.agent_id] || { role: "不明", color: "text-gray-600", bg: "bg-white", icon: "👤" };
                    const isSystem = msg.agent_id === '01'; 
                
                    return (
                  <div key={msg.id} className={`flex w-full mb-8 group ${isSystem ? 'justify-center' : ''} animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards`} style={{ animationDelay: `${idx * 0.1}s` }}>
                    <div className={`relative w-full max-w-4xl p-8 rounded-2xl shadow-md border-2 ${agent.bg} ${isSystem ? 'text-center border-blue-300 bg-gradient-to-br from-blue-50 to-white' : 'bg-white border-slate-200 hover:shadow-lg transition-shadow'}`}>
                      <div className={`flex items-center gap-4 mb-5 pb-4 border-b border-slate-100 ${isSystem ? 'justify-center flex-col border-blue-100' : ''}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br from-white to-slate-50 shadow-md border-2 ${isSystem ? 'border-blue-200' : 'border-slate-200'}`}>
                          {agent.icon}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold tracking-wide ${agent.color}`}>
                            {agent.role}
                          </span>
                          {!isSystem && <span className="text-xs text-slate-400 mt-0.5">Agent {msg.agent_id}</span>}
                        </div>
                      </div>
                      <div className="prose prose-slate prose-base max-w-none text-slate-800 leading-loose">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({children}) => (
                              <h1 className="text-2xl font-bold text-slate-900 mt-6 mb-4 pb-2 border-b-2 border-slate-200">{children}</h1>
                            ),
                            h2: ({children}) => (
                              <h2 className="text-xl font-bold text-slate-800 mt-5 mb-3">{children}</h2>
                            ),
                            h3: ({children}) => (
                              <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">{children}</h3>
                            ),
                            p: ({children}) => (
                              <p className="text-base leading-relaxed mb-4 text-slate-700">{children}</p>
                            ),
                            ul: ({children}) => (
                              <ul className="my-4 ml-2 space-y-2">{children}</ul>
                            ),
                            ol: ({children}) => (
                              <ol className="my-4 ml-2 space-y-2 list-decimal list-inside">{children}</ol>
                            ),
                            li: ({children}) => (
                              <li className="text-base text-slate-700 pl-2 flex items-start gap-2">
                                <span className="text-indigo-500 mt-1">•</span>
                                <span>{children}</span>
                              </li>
                            ),
                            blockquote: ({children}) => (
                              <blockquote className="border-l-4 border-indigo-400 bg-indigo-50 pl-4 py-3 my-4 italic text-slate-600 rounded-r-lg">{children}</blockquote>
                            ),
                            strong: ({children}) => (
                              <strong className="font-bold text-slate-900">{children}</strong>
                            ),
                            em: ({children}) => (
                              <em className="italic text-slate-600">{children}</em>
                            ),
                            table: ({children}) => (
                              <div className="overflow-x-auto my-4">
                                <table className="min-w-full border-collapse border-2 border-slate-300 rounded-lg overflow-hidden">{children}</table>
                              </div>
                            ),
                            thead: ({children}) => (
                              <thead className="bg-slate-100">{children}</thead>
                            ),
                            th: ({children}) => (
                              <th className="border border-slate-300 bg-slate-100 px-4 py-3 text-left text-sm font-bold text-slate-700">{children}</th>
                            ),
                            td: ({children}) => (
                              <td className="border border-slate-200 px-4 py-3 text-sm text-slate-600">{children}</td>
                            ),
                            code: ({children, className}) => {
                              const isInline = !className;
                              return isInline 
                                ? <code className="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded text-sm font-mono border border-slate-200">{children}</code>
                                : <code className={`block bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto text-sm font-mono my-4 ${className}`}>{children}</code>;
                            },
                            hr: () => (
                              <hr className="my-6 border-t-2 border-slate-200" />
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                );
                  })}
                </>
              )}
              {/* Summary Section */}
              {session.summary && (
                  <div className="mt-8 bg-indigo-50 border-2 border-indigo-100 rounded-3xl p-8 relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
                       <h3 className="text-xl font-bold text-indigo-900 mb-6 flex items-center gap-2">
                           📑 議論の要約
                       </h3>
                       <div className="prose prose-indigo prose-lg max-w-none bg-white/80 p-8 rounded-xl shadow-inner">
                           <ReactMarkdown 
                             remarkPlugins={[remarkGfm]}
                             components={{
                               h1: ({children}) => (
                                 <h1 className="text-2xl font-bold text-indigo-900 mt-6 mb-4 pb-2 border-b-2 border-indigo-200">{children}</h1>
                               ),
                               h2: ({children}) => (
                                 <h2 className="text-xl font-bold text-indigo-800 mt-5 mb-3">{children}</h2>
                               ),
                               h3: ({children}) => (
                                 <h3 className="text-lg font-semibold text-indigo-700 mt-4 mb-2">{children}</h3>
                               ),
                               p: ({children}) => (
                                 <p className="text-base leading-relaxed mb-4 text-slate-700">{children}</p>
                               ),
                               ul: ({children}) => (
                                 <ul className="my-4 ml-2 space-y-2">{children}</ul>
                               ),
                               ol: ({children}) => (
                                 <ol className="my-4 ml-2 space-y-2 list-decimal list-inside">{children}</ol>
                               ),
                               li: ({children}) => (
                                 <li className="text-base text-slate-700 pl-2 flex items-start gap-2">
                                   <span className="text-indigo-500 mt-1">•</span>
                                   <span>{children}</span>
                                 </li>
                               ),
                               blockquote: ({children}) => (
                                 <blockquote className="border-l-4 border-indigo-400 bg-indigo-100/50 pl-4 py-3 my-4 italic text-slate-600 rounded-r-lg">{children}</blockquote>
                               ),
                               strong: ({children}) => (
                                 <strong className="font-bold text-indigo-900">{children}</strong>
                               ),
                               table: ({children}) => (
                                 <div className="overflow-x-auto my-4">
                                   <table className="min-w-full border-collapse border-2 border-indigo-200 rounded-lg">{children}</table>
                                 </div>
                               ),
                               th: ({children}) => (
                                 <th className="border border-indigo-200 bg-indigo-100 px-4 py-3 text-left text-sm font-bold text-indigo-800">{children}</th>
                               ),
                               td: ({children}) => (
                                 <td className="border border-indigo-100 px-4 py-3 text-sm text-slate-600">{children}</td>
                               ),
                               code: ({children, className}) => {
                                 const isInline = !className;
                                 return isInline 
                                   ? <code className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                                   : <code className={`block bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto text-sm font-mono my-4 ${className}`}>{children}</code>;
                               },
                               hr: () => (
                                 <hr className="my-6 border-t-2 border-indigo-200" />
                               ),
                             }}
                           >
                             {session.summary}
                           </ReactMarkdown>
                       </div>
                       <div className="mt-6 text-center">
                           <button onClick={exportSummary} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition">
                               📥 MDファイルで保存
                           </button>
                       </div>
                  </div>
              )}

              {/* Continue / Resume Section */}
              {!loading && session && (
                  <div className="mt-8 text-center border-t border-slate-200 pt-8">
                     <p className="text-slate-500 text-sm mb-4">議論をさらに深めますか？</p>
                     <div className="flex flex-col items-center gap-3">
                        <div className="flex gap-2 items-center">
                             <span className="text-sm font-bold text-slate-600">追加ターン数:</span>
                            <div className="flex gap-2">
                                <select 
                                value={turnCount}
                                onChange={(e) => setTurnCount(Number(e.target.value))}
                                className="px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                                >
                                    <option value={3}>3ターン</option>
                                    <option value={6}>6ターン</option>
                                    <option value={12}>12ターン</option>
                                    <option value={18}>18ターン</option>
                                    <option value={0}>カスタム</option>
                                </select>
                                {turnCount === 0 || ![3, 6, 12, 18].includes(turnCount) ? (
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={turnCount === 0 ? '' : turnCount}
                                        onChange={(e) => setTurnCount(Number(e.target.value))}
                                        placeholder="回数"
                                        className="w-20 px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                                    />
                                ) : null}
                            </div>
                        </div>
                        <button 
                            onClick={handleResumeSession} 
                            disabled={loading}
                            className="bg-white border-2 border-indigo-600 text-indigo-600 px-8 py-3 rounded-full font-bold hover:bg-indigo-50 transition-colors shadow-sm disabled:opacity-50"
                        >
                            🔄 議論を再開・継続する
                        </button>
                     </div>
                  </div>
              )}

              {loading && (
                <div className="flex justify-center py-8">
                  <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-full shadow-sm border border-slate-200 animate-pulse">
                    <span className="text-lg">🤔</span>
                    <span className="text-sm font-medium text-slate-600">{progress || '読み込み中...'}</span>
                  </div>
                </div>
              )}
              
              <div ref={bottomRef} />
          </div>
        )}
      </div>
      </div>
      </main>
    </div>
  ); 
}
