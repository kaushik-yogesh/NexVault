import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Chrome Extension API
global.chrome = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: vi.fn((msg, cb) => {
      if (cb) cb({});
    }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn((path) => `chrome-extension://test-id/${path}`),
  },
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
    }
  },
  alarms: {
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    }
  },
  tabs: {
    onUpdated: {
      addListener: vi.fn(),
    },
    update: vi.fn(),
  }
};
