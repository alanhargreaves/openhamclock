import { useState, useEffect, useCallback } from 'react';

/**
 * useDisplaySchedule
 *
 * Checks current time against a sleep/wake schedule and returns whether the
 * display should be in "sleep" mode (black overlay, wake lock released).
 *
 * @param {object} config - app config; reads config.displaySchedule
 * @returns {{ displaySleeping: boolean, nextTransition: string|null }}
 */
export default function useDisplaySchedule(config) {
  const schedule = config.displaySchedule;
  const enabled = schedule?.enabled === true;
  const sleepTime = schedule?.sleepTime || '23:00';
  const wakeTime = schedule?.wakeTime || '07:00';

  const isInSleepWindow = useCallback(() => {
    if (!enabled) return false;
    const now = new Date();
    const [sleepH, sleepM] = sleepTime.split(':').map(Number);
    const [wakeH, wakeM] = wakeTime.split(':').map(Number);

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const sleepMinutes = sleepH * 60 + sleepM;
    const wakeMinutes = wakeH * 60 + wakeM;

    if (sleepMinutes <= wakeMinutes) {
      // Same-day range: e.g. 01:00 sleep, 07:00 wake
      return nowMinutes >= sleepMinutes && nowMinutes < wakeMinutes;
    }
    // Overnight range: e.g. 23:00 sleep, 07:00 wake
    return nowMinutes >= sleepMinutes || nowMinutes < wakeMinutes;
  }, [enabled, sleepTime, wakeTime]);

  const [displaySleeping, setDisplaySleeping] = useState(() => isInSleepWindow());

  useEffect(() => {
    if (!enabled) {
      setDisplaySleeping(false);
      return;
    }

    // Check immediately
    setDisplaySleeping(isInSleepWindow());

    // Re-check every 30 seconds
    const timer = setInterval(() => {
      setDisplaySleeping(isInSleepWindow());
    }, 30000);

    return () => clearInterval(timer);
  }, [enabled, isInSleepWindow]);

  return { displaySleeping };
}
