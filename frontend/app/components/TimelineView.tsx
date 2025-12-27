'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  agent_id: string;
  content: string;
  timestamp: string;
  step: number;
}

interface Agent {
  role: string;
  color: string;
  bg: string;
  icon: string;
}

interface Props {
  messages: Message[];
  agents: Record<string, Agent>;
}

export default function TimelineView({ messages, agents }: Props) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative">
      {/* 中央の縦ライン */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-gradient-to-b from-indigo-300 via-purple-300 to-pink-300 h-full rounded-full" />

      <div className="space-y-8">
        {messages.map((msg, idx) => {
          const agent = agents[msg.agent_id] || { 
            role: '不明', 
            color: 'text-gray-600', 
            bg: 'bg-gray-50', 
            icon: '👤' 
          };
          const isLeft = idx % 2 === 0;

          return (
            <div
              key={msg.id}
              className={`relative flex items-start gap-4 ${
                isLeft ? 'flex-row' : 'flex-row-reverse'
              }`}
            >
              {/* 左側または右側のコンテンツ */}
              <div className={`w-5/12 ${isLeft ? 'text-right' : 'text-left'}`}>
                <div
                  className={`inline-block p-4 rounded-xl shadow-md border-2 ${agent.bg} ${
                    isLeft ? 'rounded-tr-none' : 'rounded-tl-none'
                  }`}
                >
                  {/* ヘッダー */}
                  <div className={`flex items-center gap-2 mb-2 ${isLeft ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-2xl">{agent.icon}</span>
                    <span className={`text-sm font-bold ${agent.color}`}>
                      {agent.role}
                    </span>
                  </div>

                  {/* 時刻とステップ */}
                  <div className={`text-xs text-slate-400 mb-2 ${isLeft ? 'text-right' : 'text-left'}`}>
                    Step {msg.step} • {formatTime(msg.timestamp)}
                  </div>

                  {/* コンテンツ */}
                  <div className="prose prose-sm max-w-none text-slate-700 text-left">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content.length > 300 
                        ? msg.content.slice(0, 300) + '...' 
                        : msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* 中央のノード */}
              <div className="w-2/12 flex justify-center">
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg border-4 border-white ${agent.bg}`}>
                    {agent.icon}
                  </div>
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-slate-500">
                    #{msg.step}
                  </div>
                </div>
              </div>

              {/* 反対側のスペース */}
              <div className="w-5/12" />
            </div>
          );
        })}
      </div>

      {/* 終了マーカー */}
      <div className="relative flex justify-center mt-12">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl shadow-xl border-4 border-white">
          🏁
        </div>
      </div>
    </div>
  );
}
