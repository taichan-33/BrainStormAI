import { useEffect, useState } from 'react';

interface SessionListItem {
  session_id: string;
  topic?: string;
  created_at: string;
  status: string;
}

interface Props {
  currentSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onOpenAgentSettings: () => void;
}

export default function HistorySidebar({ currentSessionId, onSelectSession, onNewSession, onOpenAgentSettings }: Props) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [currentSessionId]); // Re-fetch when session changes (e.g. new session created)

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 flex-shrink-0">
      <div className="p-4 border-b border-slate-800 space-y-2">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-500/20"
        >
          <span>＋</span> 新しい会議
        </button>
        <button
          onClick={onOpenAgentSettings}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-lg transition-all border border-slate-700"
        >
          <span>⚙️</span> エージェント設定
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
          以前の会議
        </h3>
        
        {loading ? (
           <div className="text-center py-4 text-xs text-slate-600">読み込み中...</div>
        ) : sessions.length === 0 ? (
           <div className="text-center py-4 text-xs text-slate-600">履歴はありません</div>
        ) : (
          sessions.map((s) => (
            <button
              key={s.session_id}
              onClick={() => onSelectSession(s.session_id)}
              className={`w-full text-left p-3 rounded-lg text-sm transition-all hover:bg-slate-800 ${
                currentSessionId === s.session_id 
                  ? 'bg-slate-800 text-white shadow-sm border-l-4 border-indigo-500' 
                  : 'text-slate-400'
              }`}
            >
              <div className="font-medium truncate mb-1">
                {s.topic || '無題のトピック'}
              </div>
              <div className="text-xs text-slate-600">
                {new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </button>
          ))
        )}
      </div>
      
      <div className="p-4 border-t border-slate-800 text-xs text-center text-slate-600">
        BrainStorm AI v1.0
      </div>
    </aside>
  );
}
