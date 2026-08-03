// Backup and restore service for localStorage data

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
  'stretchbreak-public-calendar',
  'webhook-url',
  'weather-preferred-city',
] as const;

/** Prefix patterns for dynamic / cached keys */
const ALLOWED_STORAGE_PREFIXES = [
  'total-pto-days-',
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
  return ALLOWED_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
};

export const listAllowedKeysInBackup = (backup: BackupData): string[] => {
  return Object.keys(backup.data || {}).filter(isAllowedStorageKey);
};

const serializeValue = (value: unknown): string => {
  return typeof value === 'string' ? value : JSON.stringify(value);
};

// Export only allowlisted localStorage data as JSON
export const exportBackup = (): BackupData => {
  const data: Record<string, unknown> = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !isAllowedStorageKey(key)) continue;

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

// Import backup data into localStorage (allowlisted keys only)
export const importBackup = (backup: BackupData, mode: 'merge' | 'replace' = 'merge'): string[] => {
  if (!backup?.data || typeof backup.data !== 'object') {
    throw new Error('Invalid backup data');
  }

  if (mode === 'replace') {
    clearAppStorage();
  }

  const imported: string[] = [];
  Object.entries(backup.data).forEach(([key, value]) => {
    if (!isAllowedStorageKey(key)) return;
    try {
      localStorage.setItem(key, serializeValue(value));
      imported.push(key);
    } catch (e) {
      console.warn(`Failed to import key ${key}:`, e);
    }
  });

  return imported;
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
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content) as BackupData;

        if (!backup.version || !backup.data || typeof backup.data !== 'object') {
          throw new Error('Invalid backup file format');
        }

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

// Generate sync code (compressed base64 for copy-paste between devices)
export const generateSyncCode = (): string | null => {
  const backup = exportBackup();
  const json = JSON.stringify(backup);

  if (json.length > 100000) {
    return null;
  }

  try {
    return btoa(json);
  } catch (e) {
    console.error('Failed to generate sync code:', e);
    return null;
  }
};

// Parse sync code and import
export const importFromSyncCode = (code: string, mode: 'merge' | 'replace' = 'merge'): string[] => {
  try {
    const json = atob(code.trim());
    const backup = JSON.parse(json) as BackupData;
    return importBackup(backup, mode);
  } catch {
    throw new Error('Invalid sync code format');
  }
};
