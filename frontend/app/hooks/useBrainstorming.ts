import { useState } from 'react';
import { SessionStatus, CreateSessionParams } from '../types';
import { sessionService } from '../services/sessions';

export function useBrainstorming() {
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const startSession = async (params: CreateSessionParams, turnCount: number) => {
    setLoading(true);
    setError('');
    setProgress('セッションを開始中...');

    try {
      // 1. Create Session
      let currentSession = await sessionService.create(params);
      setSession(currentSession);

      // 2. Auto Loop
      if (turnCount > 0) {
        await runLoop(currentSession.session_id, turnCount);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const runLoop = async (sessionId: string, count: number) => {
    let currentSession: SessionStatus | null = null;
    
    for (let i = 0; i < count; i++) {
        setProgress(`議論進行中... (${i + 1}/${count} ターン目)`);
        
        // Wait a bit for UX
        await new Promise(r => setTimeout(r, 800));

        try {
            currentSession = await sessionService.nextTurn(sessionId);
            setSession(currentSession);
            
            if (currentSession.status === 'completed') break;
        } catch (e: any) {
            throw new Error(`ターン ${i+1} でエラーが発生しました: ${e.message}`);
        }
    }

    // Summarize after loop
    if (currentSession) {
        setProgress('議論を要約中...');
        try {
            const summarySession = await sessionService.generateSummary(sessionId);
            setSession(summarySession);
        } catch (e) {
            console.error('Summary generation failed', e);
            // Summary failure doesn't crash the session entirely
        }
    }
  };

  const resumeSession = async (turnCount: number) => {
    if (!session) return;
    setLoading(true);
    setError('');

    try {
        await runLoop(session.session_id, turnCount);
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
        setProgress('');
    }
  };

  return {
    session,
    setSession,
    loading,
    progress,
    error,
    startSession,
    resumeSession,
    setError
  };
}
