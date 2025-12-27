'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  agent_id: string;
  content: string;
}

interface Agent {
  role: string;
  icon: string;
}

interface Props {
  messages: Message[];
  agents: Record<string, Agent>;
}

// エージェントごとの声設定
const AGENT_VOICES: Record<string, { pitch: number; rate: number; voicePreference: string }> = {
  '01': { pitch: 1.0, rate: 0.9, voicePreference: 'male' },     // Facilitator - 落ち着いた男性
  '02': { pitch: 1.3, rate: 1.1, voicePreference: 'female' },   // Innovator - 明るい女性
  '03': { pitch: 0.8, rate: 0.85, voicePreference: 'male' },    // Critic - 低めの男性
  '04': { pitch: 1.0, rate: 0.95, voicePreference: 'male' },    // Strategist - 冷静な男性
  '05': { pitch: 1.2, rate: 1.05, voicePreference: 'female' },  // Marketer - 元気な女性
  '06': { pitch: 0.9, rate: 1.0, voicePreference: 'male' },     // Tech Lead - 淡々とした男性
};

export default function TTSPlayer({ messages, agents }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSupported, setIsSupported] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    // 日本語の声を取得
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      const japaneseVoices = voices.filter(v => v.lang.startsWith('ja'));
      setAvailableVoices(japaneseVoices.length > 0 ? japaneseVoices : voices);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.cancel();
    };
  }, []);

  const getVoiceForAgent = (agentId: string): SpeechSynthesisVoice | null => {
    if (availableVoices.length === 0) return null;
    
    const config = AGENT_VOICES[agentId] || { pitch: 1.0, rate: 1.0, voicePreference: 'male' };
    
    // 日本語の声を優先
    const japaneseVoices = availableVoices.filter(v => v.lang.startsWith('ja'));
    
    if (japaneseVoices.length > 0) {
      // 性別に応じた声を選択（名前に基づく推測）
      const preferredVoice = japaneseVoices.find(v => 
        config.voicePreference === 'female' 
          ? v.name.toLowerCase().includes('female') || v.name.includes('女')
          : v.name.toLowerCase().includes('male') || v.name.includes('男')
      );
      return preferredVoice || japaneseVoices[0];
    }
    
    return availableVoices[0];
  };

  const speakMessage = (message: Message, index: number) => {
    const agent = agents[message.agent_id] || { role: '不明', icon: '👤' };
    const config = AGENT_VOICES[message.agent_id] || { pitch: 1.0, rate: 1.0, voicePreference: 'male' };
    
    // コンテンツを短くする（長すぎると途切れることがある）
    const content = message.content.slice(0, 500);
    const text = `${agent.role}。${content}`;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.pitch = config.pitch;
    utterance.rate = config.rate;
    
    const voice = getVoiceForAgent(message.agent_id);
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.onend = () => {
      if (index < messages.length - 1 && isPlaying) {
        setCurrentIndex(index + 1);
        speakMessage(messages[index + 1], index + 1);
      } else {
        setIsPlaying(false);
        setCurrentIndex(0);
      }
    };
    
    utterance.onerror = (e) => {
      console.error('TTS error:', e);
      setIsPlaying(false);
    };
    
    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  };

  const playAll = () => {
    if (messages.length === 0) return;
    
    speechSynthesis.cancel();
    setIsPlaying(true);
    setCurrentIndex(0);
    speakMessage(messages[0], 0);
  };

  const stop = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const playSingle = (index: number) => {
    speechSynthesis.cancel();
    setIsPlaying(true);
    setCurrentIndex(index);
    speakMessage(messages[index], index);
  };

  if (!isSupported) {
    return (
      <div className="text-sm text-slate-400 flex items-center gap-2">
        <span>🚫</span> 音声読み上げは非対応のブラウザです
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {!isPlaying ? (
          <button
            onClick={playAll}
            disabled={messages.length === 0}
            className="px-4 py-2 rounded-full font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            🔊 全て読み上げ
          </button>
        ) : (
          <button
            onClick={stop}
            className="px-4 py-2 rounded-full font-bold bg-red-500 text-white hover:bg-red-600 transition-all flex items-center gap-2"
          >
            ⏹️ 停止
          </button>
        )}
        
        {isPlaying && (
          <span className="text-sm text-slate-500">
            再生中: {currentIndex + 1} / {messages.length}
          </span>
        )}
      </div>

      {/* 個別再生ボタン */}
      <div className="flex flex-wrap gap-1">
        {messages.slice(0, 10).map((msg, idx) => {
          const agent = agents[msg.agent_id] || { role: '不明', icon: '👤' };
          return (
            <button
              key={msg.id}
              onClick={() => playSingle(idx)}
              disabled={isPlaying && currentIndex !== idx}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                isPlaying && currentIndex === idx
                  ? 'bg-emerald-500 text-white animate-pulse'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50'
              }`}
            >
              {agent.icon} #{idx + 1}
            </button>
          );
        })}
        {messages.length > 10 && (
          <span className="text-xs text-slate-400 px-2 py-1">+{messages.length - 10} more</span>
        )}
      </div>
    </div>
  );
}
