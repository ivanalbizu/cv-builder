import '@testing-library/jest-dom/vitest';

// jsdom no trae ResizeObserver y `usePageMetrics` lo usa para re-medir la hoja.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
