const encoder = new TextEncoder();
const decoder = new TextDecoder();

const RESTORABLE_KEYS = new Set([
  'fundalyst-global-data',
  'fundalyst-importer',
  'fundalyst-enterprise',
  'fundalyst-filing',
  'fundalyst-wc',
  'fundalyst-ratios',
  'fundalyst-peer',
  'fundalyst-trends',
  'fundalyst-yoy',
  'fundalyst-thesis',
]);

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuffer, iterations: 150000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function collectFundalystLocalState(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of Object.keys(localStorage).filter((k) => k.startsWith('fundalyst-'))) {
    try {
      data[key] = JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      data[key] = localStorage.getItem(key);
    }
  }
  return {
    _format: 'fundalyst-enterprise-backup',
    _version: 1,
    _exportedAt: new Date().toISOString(),
    data,
  };
}

export async function encryptWorkspaceBackup(payload: unknown, passphrase: string): Promise<string> {
  if (!passphrase.trim()) throw new Error('Passphrase is required');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ivBuffer = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;
  const key = await deriveKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    encoder.encode(JSON.stringify(payload)),
  );
  return JSON.stringify({
    format: 'fundalyst-encrypted-workspace',
    version: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: 150000,
    cipher: 'AES-GCM-256',
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    payload: bytesToBase64(new Uint8Array(encrypted)),
  }, null, 2);
}

export async function decryptWorkspaceBackup(text: string, passphrase: string): Promise<Record<string, unknown>> {
  if (!passphrase.trim()) throw new Error('Passphrase is required');
  const parsed = JSON.parse(text);
  if (parsed.format !== 'fundalyst-encrypted-workspace') {
    throw new Error('Unsupported backup format');
  }
  const salt = base64ToBytes(parsed.salt);
  const iv = base64ToBytes(parsed.iv);
  const payload = base64ToBytes(parsed.payload);
  const ivBuffer = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;
  const payloadBuffer = payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength) as ArrayBuffer;
  const key = await deriveKey(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuffer }, key, payloadBuffer);
  return JSON.parse(decoder.decode(decrypted));
}

export function restoreFundalystLocalState(backup: Record<string, unknown>): void {
  const data = backup.data;
  if (!data || typeof data !== 'object') throw new Error('Backup has no Fundalyst data');
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (RESTORABLE_KEYS.has(key)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }
}

export function downloadTextFile(filename: string, content: string, type = 'application/json'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
