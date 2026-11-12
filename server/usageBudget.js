/**
 * The guide's monthly AI budget, counted from the token usage of every Claude reply.
 *
 * Tokens are priced (see PRICES) into an estimated spend, because most of the guide's tokens are
 * cached reads of the catalogue that cost a small fraction of fresh ones. When the month's
 * spend crosses an alert level (90% by default, then 100%), `onAlert` is called once for that
 * level and month, and the server emails the people who look after the budget.
 *
 * The count is kept in a small JSON file so a restart doesn't forget it; it starts again at
 * zero each calendar month (UTC). It is an estimate: the Anthropic Console has the exact bill.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/** US dollars per million tokens. Defaults are Claude Opus 5.5 (5-minute cache writes). */
export const DEFAULT_PRICES = { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 };

const monthOf = (date = new Date()) => date.toISOString().slice(0, 7); // "2026-11"
const fresh = (month) => ({ month, cost: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, replies: 0, alerted: [] });

export function createUsageBudget({ file, limit, prices = DEFAULT_PRICES, levels = [0.9, 1], onAlert }) {
  let state = fresh(monthOf());
  try {
    if (existsSync(file)) state = { ...state, ...JSON.parse(readFileSync(file, 'utf8')) };
  } catch (err) {
    console.error('[budget] could not read usage file:', err.message);
  }

  let saveTimer = null;
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        writeFileSync(file, JSON.stringify(state, null, 2));
      } catch (err) {
        console.error('[budget] could not save usage file:', err.message);
      }
    }, 500);
    saveTimer.unref?.();
  };

  function rollMonth() {
    const month = monthOf();
    if (state.month !== month) state = fresh(month);
  }

  /** Adds one Claude response's usage, and raises any alert level it crosses. */
  function record(usage = {}) {
    rollMonth();
    const t = {
      input: usage.input_tokens || 0,
      output: usage.output_tokens || 0,
      cacheRead: usage.cache_read_input_tokens || 0,
      cacheWrite: usage.cache_creation_input_tokens || 0,
    };
    for (const k of Object.keys(t)) state[k] += t[k];
    state.cost += Object.keys(t).reduce((sum, k) => sum + (t[k] * (prices[k] || 0)) / 1e6, 0);
    state.replies += 1;
    if (limit > 0) {
      // Levels crossed by this reply; if it jumps over several at once, one email for the highest.
      const crossed = levels.filter((level) => state.cost >= limit * level && !state.alerted.includes(level));
      if (crossed.length) {
        state.alerted.push(...crossed);
        const level = Math.max(...crossed);
        Promise.resolve(onAlert?.({ level, ...status() })).catch((err) => console.error('[budget] alert failed:', err.message));
      }
    }
    save();
  }

  function status() {
    rollMonth();
    const { month, cost, input, output, cacheRead, cacheWrite, replies } = state;
    return {
      month,
      cost,
      limit,
      used: limit > 0 ? cost / limit : 0,
      tokens: input + output + cacheRead + cacheWrite,
      input,
      output,
      cacheRead,
      cacheWrite,
      replies,
    };
  }

  return { record, status };
}
