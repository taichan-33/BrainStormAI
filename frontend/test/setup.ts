import '@testing-library/jest-dom'
import { vi } from 'vitest'

const MockSpeechRecognition = class {
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  onresult = null;
  onend = null;
  onerror = null;
  lang = '';
  continuous = false;
  interimResults = false;
};

vi.stubGlobal('SpeechRecognition', MockSpeechRecognition);
vi.stubGlobal('webkitSpeechRecognition', MockSpeechRecognition);
