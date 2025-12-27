import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useAgents } from '../../app/hooks/useAgents'

describe('useAgents Hook', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes with empty custom agents', () => {
    const { result } = renderHook(() => useAgents())
    expect(result.current.customAgents).toEqual([])
  })

  it('adds a custom agent correctly', () => {
    const { result } = renderHook(() => useAgents())
    
    const newAgent = {
      name: 'Test Agent',
      role: 'Tester',
      responsibility: 'Testing',
      personality: 'Precise',
      model: 'gpt-4'
    }

    act(() => {
      result.current.addCustomAgent(newAgent)
    })

    expect(result.current.customAgents).toHaveLength(1)
    expect(result.current.customAgents[0].name).toBe('Test Agent')
    expect(result.current.customAgents[0].id).toBeDefined()
  })

  it('includes custom agents in relationshipAgents', () => {
    const { result } = renderHook(() => useAgents())
    
    const newAgent = {
      name: 'Custom User',
      role: 'User Role',
      responsibility: '',
      personality: '',
      model: ''
    }

    act(() => {
      result.current.addCustomAgent(newAgent)
    })

    // relationshipAgents should contain default agents + custom agent
    const agents = result.current.relationshipAgents
    const customAgentInList = agents.find(a => a.name === 'Custom User')
    
    expect(customAgentInList).toBeDefined()
    expect(customAgentInList?.role).toBe('User Role')
  })
})
