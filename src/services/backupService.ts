// Backup and restore service for localStorage data

import { assertBackupSize, sanitizeBackupValue } from '../utils/importValidation';

/** Exact keys owned by StretchBreak */
const ALLOWED_STORAGE_KEYS = [
  'holiday-plans',
  'total-pto-days',
  'initial-pto-days',
  'available-pto-input',
  'pto-carryover-days',
  'pto-carryover-expiry-month',
  'user-preferences',
  'lastCountryCode',
  'theme-preference',
  'accessibility-contrast',
  'accessibility-font-scale',
  'stretchbreak-team',
  'stretchbreak-wishlist',
  'stretchbreak-plan-versions',
  'stretchbreak_vacation_templates',
  'vacation-budgets',
  'reminder-settings',
  'reminder-last-check',
  'stretchbreak-public-calendar',
  'webhook-url',
  'weather-preferred-city',
] as const;

/** Secrets that must not leave the device via backup/sync */
const SENSITIVE_STORAGE_KEYS = new Set<string>(['webhook-url']);

/** Prefix patterns for dynamic / cached keys */
const ALLOWED_STORAGE_PREFIXES = [
  'open-meteo-climate-',
  'open-meteo-forecast-',
] as const;

export const KNOWN_STORAGE_KEYS = ALLOWED_STORAGE_KEYS;

export interface BackupData {
  version: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export const isAllowedStorageKey = (key: string): boolean => {
  if ((ALLOWED_STORAGE_KEYS as readonly string[]).includes(key)) return true;
  if (/^(total-pto-days|pto-carryover)-\d{4}$/.test(key)) return true;
  return ALLOWED_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
};

const isCacheStorageKey = (key: string): boolean => key.startsWith('open-meteo-climate-') || key.startsWith('open-meteo-forecast-');

export const isSensitiveStorageKey = (key: string): boolean => SENSITIVE_STORAGE_KEYS.has(key);

export const listAllowedKeysInBackup = (backup: BackupData): string[] => {
  return Object.keys(backup.data || {}).filter(
    (key) => isAllowedStorageKey(key) && !isSensitiveStorageKey(key) && !isCacheStorageKey(key)
  );
};

const serializeValue = (value: unknown): string => {
  return typeof value === 'string' ? value : JSON.stringify(value);
};

// Export only allowlisted localStorage data as JSON (excludes webhook credentials)
export const exportBackup = (): BackupData => {
  const data: Record<string, unknown> = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !isAllowedStorageKey(key) || isSensitiveStorageKey(key) || isCacheStorageKey(key)) continue;

    try {
      const value = localStorage.getItem(key);
      if (value === null) continue;
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = value;
      }
    } catch (e) {
      console.warn(`Failed to export key ${key}:`, e);
    }
  }

  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    data,
  };
};

/** Clear only StretchBreak-owned keys (never wipe unrelated localStorage). */
export const clearAppStorage = (): void => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isAllowedStorageKey(key)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

const COLLECTION_KEYS = new Set(['holiday-plans', 'stretchbreak-team', 'stretchbreak-wishlist', 'stretchbreak-plan-versions', 'stretchbreak_vacation_templates', 'vacation-budgets']);

/** Validate all recognized values before making any storage changes. */
export const prepareBackup = (backup: BackupData): Map<string, unknown> => {
  if (!backup || backup.version !== '1.0' || !backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) {
    throw new Error('Invalid or unsupported backup data');
  }
  assertBackupSize(JSON.stringify(backup));
  const prepared = new Map<string, unknown>();
  for (const [key, value] of Object.entries(backup.data)) {
    if (!isAllowedStorageKey(key) || isSensitiveStorageKey(key) || isCacheStorageKey(key)) continue;
    const sanitized = sanitizeBackupValue(key, value);
    if (sanitized === null || sanitized === undefined) throw new Error(`Invalid backup value: ${key}. Nothing was restored.`);
    prepared.set(key, sanitized);
  }
  if (!prepared.size) throw new Error('No recognized StretchBreak data found in this backup.');
  return prepared;
};

// LocalStorage has no transaction primitive: validate first and roll back every touched key on failure.
export const importBackup = (backup: BackupData, mode: 'merge' | 'replace' = 'merge'): string[] => {
  const prepared = prepareBackup(backup);
  const before = new Map<string, string>();
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key && isAllowedStorageKey(key) && !isSensitiveStorageKey(key)) {
      const value = localStorage.getItem(key);
      if (value !== null) before.set(key, value);
    }
  }
  const writes = new Map<string, string>();
  for (const [key, importedValue] of prepared) {
    let value = importedValue;
    if (mode === 'merge' && COLLECTION_KEYS.has(key) && before.has(key)) {
      let existing: unknown;
      try { existing = sanitizeBackupValue(key, JSON.parse(before.get(key)!)); }
      catch { throw new Error(`Existing ${key} data is invalid; merge was cancelled.`); }
      if (!Array.isArray(existing) || !Array.isArray(value)) throw new Error(`Cannot merge ${key}. Nothing was restored.`);
      const byId = new Map(existing.map(item => [item.id, item]));
      value.forEach(item => byId.set(item.id, item));
      value = sanitizeBackupValue(key, [...byId.values()]);
      if (value === null) throw new Error(`Merged ${key} exceeds supported limits. Nothing was restored.`);
    }
    writes.set(key, serializeValue(value));
  }
  try {
    for (const [key, value] of writes) localStorage.setItem(key, value);
    if (mode === 'replace') for (const key of before.keys()) if (!writes.has(key)) localStorage.removeItem(key);
  } catch (error) {
    try {
      // Free newly allocated keys first, so quota errors can be rolled back.
      for (const key of writes.keys()) if (!before.has(key)) localStorage.removeItem(key);
      for (const [key, value] of before) localStorage.setItem(key, value);
    } catch {
      throw new Error('Restore failed and browser storage prevented rollback. Keep your backup file and do not refresh until storage is available.');
    }
    throw new Error(`Restore failed; previous data was restored. ${error instanceof Error ? error.message : ''}`);
  }
  return [...writes.keys()];
};

// Download backup as JSON file
export const downloadBackup = (): void => {
  const backup = exportBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const timestamp = new Date().toISOString().split('T')[0];
  link.download = `stretchbreak-backup-${timestamp}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Read backup from file
export const readBackupFile = (file: File): Promise<BackupData> => {
  return new Promise((resolve, reject) => {
    if (file.size > 500_000) {
      reject(new Error('Backup file is too large'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        assertBackupSize(content);
        const backup = JSON.parse(content) as BackupData;

        if (!backup.version || !backup.data || typeof backup.data !== 'object') {
          throw new Error('Invalid backup file format');
        }

        prepareBackup(backup);
        resolve(backup);
      } catch (error) {
        reject(new Error('Failed to parse backup file: ' + (error as Error).message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read backup file'));
    };

    reader.readAsText(file);
  });
};

// Generate a versioned UTF-8/base64 snapshot for copy-paste between devices (not encrypted).
export const generateSyncCode = (): string | null => {
  const backup = exportBackup();
  const json = JSON.stringify(backup);

  if (json.length > 100000) {
    return null;
  }

  try {
    const bytes = new TextEncoder().encode(json);
    const encoded = `sb1.${btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))}`;
    return encoded.length <= 150_000 ? encoded : null;
  } catch (e) {
    console.error('Failed to generate sync code:', e);
    return null;
  }
};

export const parseSyncCode = (code: string): BackupData => {
  const trimmed = code.trim();
  if (trimmed.length > 150_000) throw new Error('Sync code is too large');
  try {
    const binary = atob(trimmed.startsWith('sb1.') ? trimmed.slice(4) : trimmed);
    const json = trimmed.startsWith('sb1.')
      ? new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, character => character.charCodeAt(0)))
      : binary; // Compatibility with old Latin-1/ASCII codes.
    assertBackupSize(json);
    const backup = JSON.parse(json) as BackupData;
    prepareBackup(backup);
    return backup;
  } catch (error) {
    throw new Error(`Invalid sync code: ${error instanceof Error ? error.message : 'Invalid format'}`);
  }
};

export const importFromSyncCode = (code: string, mode: 'merge' | 'replace' = 'merge'): string[] =>
  importBackup(parseSyncCode(code), mode);
