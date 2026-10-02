export function formatTime(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('vi-VN');
}

export function genderLabel(value: string | null): string {
  if (value === 'M') {
    return 'Nam';
  }
  if (value === 'F') {
    return 'Nữ';
  }
  return value || '—';
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
