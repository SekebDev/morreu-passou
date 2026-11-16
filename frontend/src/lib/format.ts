export function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 45 -> "45 min", 60 -> "1 hora", 90 -> "1h30" */
export function minutesLabel(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m) return `${h}h${String(m).padStart(2, '0')}`;
  return h === 1 ? '1 hora' : `${h} horas`;
}

/** tempo jogado curtinho: "40s", "12 min", "1h05" */
export function played(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return minutesLabel(Math.floor(s / 60)).replace(' hora', 'h').replace(' horas', 'h');
}

export function ordinal(n: number) {
  return `${n}º`;
}
