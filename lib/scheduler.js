/**
 * Frequency to milliseconds mapping
 */
const FREQUENCY_MAP = {
  daily: 24 * 60 * 60 * 1000, // 24 hours
  '12h': 12 * 60 * 60 * 1000, // 12 hours
  '6h': 6 * 60 * 60 * 1000, // 6 hours
  '1h': 1 * 60 * 60 * 1000, // 1 hour
};

/**
 * Check if a target is due for execution
 */
export function isTargetDue(target, lastRunTime) {
  const frequency = target.frequency || 'daily';
  const intervalMs = FREQUENCY_MAP[frequency] || FREQUENCY_MAP.daily;

  if (!lastRunTime) {
    // Never run before, so it's due
    return true;
  }

  const lastRunMs = new Date(lastRunTime).getTime();
  const now = Date.now();

  return now - lastRunMs >= intervalMs;
}

/**
 * Filter targets that are due for execution
 */
export function getTargetsDue(targets, runHistory) {
  return targets.filter((target) => {
    if (!target.isActive) {
      return false;
    }

    // Find last successful run for this target
    const lastRun = runHistory.find(
      (item) => item.targetId === target.id && item.status === 'success'
    );

    return isTargetDue(target, lastRun?.createdAt);
  });
}

/**
 * Get frequency display name
 */
export function getFrequencyDisplay(frequency) {
  const displays = {
    daily: 'Daily',
    '12h': 'Every 12 hours',
    '6h': 'Every 6 hours',
    '1h': 'Every hour',
  };

  return displays[frequency] || displays.daily;
}

/**
 * Get all available frequencies
 */
export function getAvailableFrequencies() {
  return [
    { value: 'daily', label: 'Daily' },
    { value: '12h', label: 'Every 12 hours' },
    { value: '6h', label: 'Every 6 hours' },
    { value: '1h', label: 'Every hour' },
  ];
}
