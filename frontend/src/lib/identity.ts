const ID_KEY = 'mp:playerId';
const NAME_KEY = 'mp:name';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* aba anônima sem storage: segue a vida */
  }
}

let memoryId: string | null = null;

/** Id fixo por aparelho, pra reconectar no mesmo lugar da fila. */
export function getPlayerId(): string {
  const saved = safeGet(ID_KEY);
  if (saved) return saved;
  const id =
    memoryId ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  memoryId = id;
  safeSet(ID_KEY, id);
  return id;
}

export const getName = () => safeGet(NAME_KEY) ?? '';
export const saveName = (name: string) => safeSet(NAME_KEY, name.trim());
