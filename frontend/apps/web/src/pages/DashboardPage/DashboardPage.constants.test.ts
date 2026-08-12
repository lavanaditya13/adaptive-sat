import { describe, expect, it } from 'vitest';
import {
  GREETING_AFTERNOON,
  GREETING_EVENING,
  GREETING_MORNING,
  getTimeOfDayGreeting,
} from './DashboardPage.constants';

function atHour(hour: number, minute = 0): Date {
  return new Date(2026, 0, 1, hour, minute, 0);
}

describe('getTimeOfDayGreeting', () => {
  it.each([
    [0, 30, GREETING_MORNING],
    [6, 0, GREETING_MORNING],
    [8, 0, GREETING_MORNING],
    [11, 59, GREETING_MORNING],
    [12, 0, GREETING_AFTERNOON],
    [15, 0, GREETING_AFTERNOON],
    [17, 59, GREETING_AFTERNOON],
    [18, 0, GREETING_EVENING],
    [21, 0, GREETING_EVENING],
    [23, 59, GREETING_EVENING],
  ])('returns the right greeting at %i:%i', (hour, minute, expected) => {
    expect(getTimeOfDayGreeting(atHour(hour, minute))).toBe(expected);
  });

  it('defaults to the current time when no date is passed', () => {
    const now = new Date();
    expect(getTimeOfDayGreeting()).toBe(getTimeOfDayGreeting(now));
  });
});
