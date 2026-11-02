import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POLL_INTERVALS, PRESENCE_TIMEOUT_MS, startPoll } from '../polling';

const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('startPoll', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');
  });
  afterEach(() => {
    vi.useRealTimers();
    setVisibility('visible');
  });

  it('runs immediately, then once per interval', async () => {
    const task = vi.fn().mockResolvedValue(undefined);
    const stop = startPoll(task, 10_000);
    await vi.advanceTimersByTimeAsync(0);
    expect(task).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(task).toHaveBeenCalledTimes(7);
    stop();
  });

  it('never overlaps slow requests', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const task = vi.fn(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 25_000));
      inFlight--;
    });
    const stop = startPoll(task, 5_000);
    await vi.advanceTimersByTimeAsync(100_000);
    expect(maxInFlight).toBe(1);
    stop();
  });

  it('pauses while hidden and refreshes once when visible again', async () => {
    const task = vi.fn().mockResolvedValue(undefined);
    const stop = startPoll(task, 10_000);
    await vi.advanceTimersByTimeAsync(0);
    setVisibility('hidden');
    await vi.advanceTimersByTimeAsync(120_000);
    expect(task).toHaveBeenCalledTimes(1);
    setVisibility('visible');
    await vi.advanceTimersByTimeAsync(0);
    expect(task).toHaveBeenCalledTimes(2);
    stop();
  });

  it('keeps running while hidden when runWhenHidden is set (heartbeats)', async () => {
    const task = vi.fn().mockResolvedValue(undefined);
    setVisibility('hidden');
    const stop = startPoll(task, 30_000, { runWhenHidden: true });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(task).toHaveBeenCalledTimes(3);
    stop();
  });

  it('keeps polling after a failed run and stops cleanly', async () => {
    const task = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stop = startPoll(task, 10_000);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(task).toHaveBeenCalledTimes(2);
    stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(task).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});

describe('poll budget', () => {
  it('keeps one open community tab under 10 private API calls per minute', () => {
    const perMinute = (ms: number) => 60_000 / ms;
    const communityTab =
      perMinute(POLL_INTERVALS.communitySync) +
      perMinute(POLL_INTERVALS.presenceList) +
      perMinute(POLL_INTERVALS.presenceHeartbeat);
    expect(communityTab).toBeLessThanOrEqual(10);
  });

  it('heartbeat is frequent enough that an online officer never times out', () => {
    expect(POLL_INTERVALS.presenceHeartbeat * 2).toBeLessThanOrEqual(PRESENCE_TIMEOUT_MS);
  });
});
