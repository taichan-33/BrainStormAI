'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Props {
  onTranscript: (text: string) => void;
}

// Web Speech API の型定義
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export default function VoiceInput({ onTranscript }: Props) {
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    // ブラウザサポートチェック
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        // 自動的に再開
        try {
          recognition.start();
        } catch (e) {
          console.error('Failed to restart recognition:', e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      // 最終的なテキストを親コンポーネントに送信
      if (transcript.trim()) {
        onTranscript(transcript.trim());
      }
    } else {
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  };

  const clearTranscript = () => {
    setTranscript('');
  };

  const confirmTranscript = () => {
    if (transcript.trim()) {
      onTranscript(transcript.trim());
      setTranscript('');
      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      }
    }
  };

  if (!isSupported) {
    return (
      <div className="text-sm text-slate-400 flex items-center gap-2">
        <span>🚫</span> 音声入力は非対応のブラウザです
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleListening}
          className={`px-4 py-2 rounded-full font-bold transition-all flex items-center gap-2 ${
            isListening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
          }`}
        >
          {isListening ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              録音中...
            </>
          ) : (
            <>🎤 音声入力</>
          )}
        </button>

        {transcript && (
          <>
            <button
              onClick={confirmTranscript}
              className="px-3 py-2 rounded-lg bg-green-500 text-white text-sm font-bold hover:bg-green-600"
            >
              ✓ 確定
            </button>
            <button
              onClick={clearTranscript}
              className="px-3 py-2 rounded-lg bg-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-300"
            >
              ✕ クリア
            </button>
          </>
        )}
      </div>

      {transcript && (
        <div className="bg-slate-100 p-3 rounded-lg text-sm text-slate-700 border border-slate-200">
          <span className="text-slate-400 text-xs block mb-1">音声認識結果:</span>
          {transcript}
        </div>
      )}
    </div>
  );
}
