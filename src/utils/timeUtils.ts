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

/**
 * Returns YYYY-MM-DD in Asia/Jakarta timezone
 */
export function getWIBDateString(date: Date = getWIBDate()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns yesterday's YYYY-MM-DD in Asia/Jakarta timezone
 */
export function getYesterdayWIBDateString(): string {
  const date = getWIBDate();
  date.setDate(date.getDate() - 1);
  return getWIBDateString(date);
}

/**
 * Format YYYY-MM-DD to Indonesian day and date, e.g. "Jumat, 02 Oktober 2026"
 */
export function formatWIBDateIndo(dateStr?: string): string {
  let date: Date;
  if (dateStr && dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      date = getWIBDate();
    }
  } else {
    date = getWIBDate();
  }

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const dayName = days[date.getDay()];
  const d = String(date.getDate()).padStart(2, '0');
  const m = months[date.getMonth()];
  const y = date.getFullYear();

  return `${dayName}, ${d} ${m} ${y}`;
}

export function isDateToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  return dateStr === getWIBDateString();
}
