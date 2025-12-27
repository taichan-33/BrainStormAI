import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBrainstorming } from '../../app/hooks/useBrainstorming'
import { sessionService } from '../../app/services/sessions'
import { SessionStatus } from '../../app/types'

// Mock sessionService
vi.mock('../../app/services/sessions', () => ({
  sessionService: {
    create: vi.fn(),
    nextTurn: vi.fn(),
    generateSummary: vi.fn(),
    get: vi.fn(),
  }
}))

const mockSession: SessionStatus = {
  session_id: 'test-session',
  status: 'created',
  messages: [],
  next_turn_agent_id: '01',
  is_finished: false,
}

describe('useBrainstorming Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useBrainstorming())
    expect(result.current.session).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('')
  })

  it('starts a session successfully', async () => {
    const { result } = renderHook(() => useBrainstorming())
    
    vi.mocked(sessionService.create).mockResolvedValue(mockSession)
    // Run loop 0 times to test just creation logic first, or mock nextTurn logic
    // Implementation detail: startSession probably loops. Let's assume it takes turns count.
    
    await act(async () => {
      await result.current.startSession({
        topic: 'Test Topic',
        context_details: '',
        enabled_agent_ids: ['01'],
      }, 0) // 0 turns means just create logic? Or maybe 1?
    })

    expect(sessionService.create).toHaveBeenCalledWith(expect.objectContaining({ topic: 'Test Topic' }))
    expect(result.current.session).toEqual(mockSession)
    expect(result.current.loading).toBe(false)
  })

  it('handles API errors during session creation', async () => {
    const { result } = renderHook(() => useBrainstorming())
    vi.mocked(sessionService.create).mockRejectedValue(new Error('API Error'))

    await act(async () => {
      await result.current.startSession({
        topic: 'Test',
        context_details: '',
        enabled_agent_ids: [],
      }, 1)
    })

    expect(result.current.error).toBe('API Error')
    expect(result.current.loading).toBe(false)
  })
})
