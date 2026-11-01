/**
 * Polling helpers for the browser.
 *
 * Every poll of a private API route costs two Supabase Auth checks (middleware + route guard),
 * so polls must be slow, must not overlap, and must stop while the tab is in the background.
 * Instant delivery is handled by Supabase Realtime / BroadcastChannel; polling is only the
 * safety net that catches anything a websocket missed.
 */

/** Poll intervals used across the portal (milliseconds). */
export const POLL_INTERVALS = {
  /** Community DM / post safety-net sync. Realtime broadcast delivers new DMs instantly. */
  communitySync: 20_000,
  /** Server-side presence list refresh. */
  presenceList: 30_000,
  /** Heartbeat telling the server this officer is online. Keep below PRESENCE_TIMEOUT_MS / 2. */
  presenceHeartbeat: 30_000,
  /** Donor <-> HQ ticket refresh on the dashboards. */
  donorTickets: 20_000,
} as const;

/** Presence entries older than this are treated as offline (server side). */
export const PRESENCE_TIMEOUT_MS = 75_000;

export interface PollOptions {
  /** Run once immediately when started (default true). */
  immediate?: boolean;
  /**
   * Keep running while the tab is hidden (default false). Only for heartbeats; browsers
   * throttle hidden-tab timers to about once a minute anyway.
   */
  runWhenHidden?: boolean;
}

const isHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

/**
 * Starts a poll and returns a stop function.
 * - Never overlaps: the next run is scheduled only after the previous one settles.
 * - Pauses while the tab is hidden and refreshes once as soon as it becomes visible again.
 * - Errors thrown by `task` are swallowed (logged) so the poll keeps going.
 */
export function startPoll(task: () => Promise<unknown> | unknown, intervalMs: number, options: PollOptions = {}) {
  const { immediate = true, runWhenHidden = false } = options;
  let stopped = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const schedule = () => {
    clear();
    if (stopped) return;
    if (!runWhenHidden && isHidden()) return; // resumed by the visibilitychange listener
    timer = setTimeout(run, intervalMs);
  };

  const run = async () => {
    timer = null;
    if (stopped || running) return;
    if (!runWhenHidden && isHidden()) return;
    running = true;
    try {
      await task();
    } catch (err) {
      console.warn('Poll task failed:', err);
    } finally {
      running = false;
      schedule();
    }
  };

  const onVisibility = () => {
    if (stopped || runWhenHidden) return;
    if (isHidden()) {
      clear();
    } else if (!running && timer === null) {
      void run();
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility);
  }

  if (immediate) {
    void run();
  } else {
    schedule();
  }

  return () => {
    stopped = true;
    clear();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibility);
    }
  };
}
