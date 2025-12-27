import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VoiceInput from '../../app/components/VoiceInput'

describe('VoiceInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock instance properties if needed
  })

  it('renders start button initially', () => {
    render(<VoiceInput onTranscript={() => {}} />)
    expect(screen.getByText('🎤 音声入力')).toBeInTheDocument()
  })

  it('toggles recording state', () => {
    render(<VoiceInput onTranscript={() => {}} />)
    const button = screen.getByText('🎤 音声入力')
    
    // Start recording
    fireEvent.click(button)
    expect(screen.getByText('録音中...')).toBeInTheDocument()

    // Stop recording
    // Note: The mock instance is global in setup.ts, but we can't easily access the exact onend callback from here 
    // without exposing the mock instance nicely.
    // For now, testing generic state toggle via button click.
    fireEvent.click(screen.getByText('録音中...'))
    expect(screen.getByText('🎤 音声入力')).toBeInTheDocument()
  })
})
