'use client';

// Small display helpers shared by the admin tabs.

/** `tag_inventory.hardware_id` is base64 (how the iOS app's JSON encodes Data); show it as hex like the debug menu does. */
export function hardwareIdHex(base64: string): string {
  try {
    return Array.from(atob(base64), (char) => char.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join(
      ' ',
    );
  } catch {
    return base64;
  }
}

export function csvDownload(filename: string, rows: string[][]): void {
  const escape = (cell: string) => (/[",\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell);
  const blob = new Blob([rows.map((row) => row.map(escape).join(',')).join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Order totals are stored in minor units (cents) with their own currency. */
export function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
}
