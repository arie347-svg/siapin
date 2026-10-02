/**
 * Utility functions for Jakarta Time (WIB - UTC+7) and Cut-Off Logic
 */

export function getWIBDate(): Date {
  // Convert current time to Asia/Jakarta timezone
  const now = new Date();
  const jakartaString = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  return new Date(jakartaString);
}

export function formatWIBDateTime(date: Date = getWIBDate()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day} ${month} ${year}, ${hours}:${minutes} WIB`;
}

export function formatWIBTime(date: Date = getWIBDate()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds} WIB`;
}

/**
 * Returns true if current time in WIB is >= 17:00:00 (5:00 PM)
 */
export function isPastWIB17Cutoff(): boolean {
  const wib = getWIBDate();
  const hours = wib.getHours();
  // Cut-off at 17:00 (5:00 PM)
  return hours >= 17;
}

export function isConfirmedToday(timeStr?: string): boolean {
  if (!timeStr || timeStr.includes('Belum')) return false;
  const now = getWIBDate();
  const day = String(now.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const month = months[now.getMonth()];
  const year = String(now.getFullYear());
  return timeStr.includes(`${day} ${month}`) && timeStr.includes(year);
}
