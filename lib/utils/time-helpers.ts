/**
 * 時間関連のヘルパー関数
 */

/**
 * 秒を「Xh Ym」形式の文字列にフォーマットします。
 * 時間または分が0の場合は、表示を最適化します。
 * @param totalSeconds - 合計秒数
 * @returns フォーマットされた時間文字列 (例: "3h 48m", "5h", "30m")
 */
export function formatSecondsToHM(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds) || totalSeconds < 0) {
    return '0m';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (parts.length === 0) {
    return '0m';
  }

  return parts.join(' ');
}

/**
 * 秒を「HH:MM:SS」形式の文字列にフォーマットします。
 * @param totalSeconds - 合計秒数
 * @returns フォーマットされた時間文字列 (例: "03:48:50")
 */
export function formatSecondsToHMS(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map(val => String(val).padStart(2, '0'))
    .join(':');
}

/**
 * 分を「Xh Ym」形式の文字列にフォーマットします。
 * @param totalMinutes - 合計分数
 * @returns フォーマットされた時間文字列 (例: "3h 48m", "5h", "30m")
 */
export function formatMinutesToHM(totalMinutes: number | null | undefined): string {
  if (totalMinutes === null || totalMinutes === undefined || isNaN(totalMinutes) || totalMinutes < 0) {
    return '0m';
  }

  return formatSecondsToHM(totalMinutes * 60);
}