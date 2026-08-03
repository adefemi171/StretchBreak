import type { ThemeMode } from '../../hooks/useTheme';
import type { ContrastMode, FontScale } from '../../hooks/useAccessibility';
import { downloadBackup, readBackupFile, importBackup, generateSyncCode, importFromSyncCode, listAllowedKeysInBackup } from '../../services/backupService';
import {
  getPreferredWeatherCity,
  searchCities,
  setPreferredWeatherCity,
  type GeocodeCityResult,
  type PreferredWeatherCity,
} from '../../services/openMeteo';
import { RemindersPanel } from '../Reminders/RemindersPanel';
import { useEffect, useState, useRef } from 'react';
import './SettingsTab.css';

interface SettingsTabProps {
  onResetAll: () => void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  contrast: ContrastMode;
  onContrastChange: (mode: ContrastMode) => void;
  fontScale: FontScale;
  onFontScaleChange: (scale: FontScale) => void;
  countryCode: string;
}

export const SettingsTab = ({ 
  onResetAll, 
  themeMode, 
  onThemeChange,
  contrast,
  onContrastChange,
  fontScale,
  onFontScaleChange,
  countryCode,
}: SettingsTabProps) => {
  const [syncCode, setSyncCode] = useState('');
  const [showSyncCode, setShowSyncCode] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [showImportCode, setShowImportCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [weatherCity, setWeatherCity] = useState<PreferredWeatherCity | null>(() => getPreferredWeatherCity());
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<GeocodeCityResult[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [cityError, setCityError] = useState('');
  const citySearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setWeatherCity(getPreferredWeatherCity());
  }, [countryCode]);

  useEffect(() => {
    if (citySearchTimer.current) clearTimeout(citySearchTimer.current);
    const q = cityQuery.trim();
    if (q.length < 2) {
      setCityResults([]);
      setCitySearching(false);
      return;
    }
    setCitySearching(true);
    citySearchTimer.current = setTimeout(async () => {
      const results = await searchCities(q, { countryCode, count: 6 });
      setCityResults(results);
      setCitySearching(false);
      setCityError(results.length === 0 ? 'No cities found. Try another spelling.' : '');
    }, 350);
    return () => {
      if (citySearchTimer.current) clearTimeout(citySearchTimer.current);
    };
  }, [cityQuery, countryCode]);

  const handleSelectCity = (result: GeocodeCityResult) => {
    const preferred: PreferredWeatherCity = {
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      countryCode: result.countryCode || countryCode,
      admin1: result.admin1,
    };
    setPreferredWeatherCity(preferred);
    setWeatherCity(preferred);
    setCityQuery('');
    setCityResults([]);
    setCityError('');
  };

  const handleClearCity = () => {
    setPreferredWeatherCity(null);
    setWeatherCity(null);
    setCityQuery('');
    setCityResults([]);
    setCityError('');
  };
  
  const handleResetClick = () => {
    onResetAll();
  };
  
  const handleDownloadBackup = () => {
    downloadBackup();
  };
  
  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const backup = await readBackupFile(file);
      const keys = listAllowedKeysInBackup(backup);
      if (keys.length === 0) {
        alert('No recognized StretchBreak data found in this backup.');
        return;
      }

      const preview = keys.slice(0, 8).join(', ') + (keys.length > 8 ? ` (+${keys.length - 8} more)` : '');
      const replace = confirm(
        `Restore ${keys.length} key(s): ${preview}\n\n` +
          'OK = Replace current StretchBreak data\nCancel = Merge with current data\n\n' +
          'Unknown keys and webhook URLs are ignored. Sync codes are not encrypted.'
      );

      if (replace) {
        importBackup(backup, 'replace');
        alert('Backup restored! Please refresh the page to see changes.');
      } else {
        // Second confirm: Cancel on first dialog means merge, but also allow abort
        const merge = confirm('Merge backup into current data? (Cancel aborts)');
        if (!merge) return;
        importBackup(backup, 'merge');
        alert('Backup merged! Please refresh the page to see changes.');
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      alert('Failed to restore backup: ' + (error as Error).message);
    }
  };
  
  const handleGenerateSyncCode = () => {
    const code = generateSyncCode();
    if (code) {
      setSyncCode(code);
      setShowSyncCode(true);
    } else {
      alert('Your data is too large for sync code. Please use file download instead.');
    }
  };
  
  const handleCopySyncCode = async () => {
    await navigator.clipboard.writeText(syncCode);
    alert('Sync code copied to clipboard!');
  };
  
  const handleImportSyncCode = () => {
    if (!importCode.trim()) {
      alert('Please paste a sync code first');
      return;
    }
    
    try {
      const replace = confirm(
        'Import this sync code?\n\nOK = Replace current StretchBreak data\nCancel = choose merge/abort\n\nSync codes are base64 only — not encrypted.'
      );
      if (replace) {
        importFromSyncCode(importCode, 'replace');
        alert('Sync code imported! Please refresh the page to see changes.');
      } else {
        const merge = confirm('Merge sync code into current data? (Cancel aborts)');
        if (!merge) return;
        importFromSyncCode(importCode, 'merge');
        alert('Sync code merged! Please refresh the page to see changes.');
      }
      setImportCode('');
      setShowImportCode(false);
    } catch {
      alert('Failed to import sync code: Invalid format');
    }
  };

  return (
    <div className="settings-tab">
      <div className="settings-tab-header">
        <h2>Settings</h2>
        <p className="settings-subtitle">Manage your preferences and data</p>
      </div>
      
      <div className="settings-content">
        <div className="settings-section">
          <h3>Appearance</h3>
          <div className="settings-option-card">
            <div className="settings-option-content">
              <div className="settings-option-header">
                <div>
                  <div className="settings-option-title">Theme</div>
                  <div className="settings-option-description">
                    Choose light, dark, or follow your system preference
                  </div>
                </div>
              </div>
              <div className="theme-toggle-group">
                <button
                  onClick={() => onThemeChange('light')}
                  className={`theme-option ${themeMode === 'light' ? 'active' : ''}`}
                  aria-pressed={themeMode === 'light'}
                >
                  Light
                </button>
                <button
                  onClick={() => onThemeChange('dark')}
                  className={`theme-option ${themeMode === 'dark' ? 'active' : ''}`}
                  aria-pressed={themeMode === 'dark'}
                >
                  Dark
                </button>
                <button
                  onClick={() => onThemeChange('system')}
                  className={`theme-option ${themeMode === 'system' ? 'active' : ''}`}
                  aria-pressed={themeMode === 'system'}
                >
                  System
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Accessibility</h3>
          <div className="settings-option-card">
            <div className="settings-option-content">
              <div className="settings-option-header">
                <div>
                  <div className="settings-option-title">High Contrast</div>
                  <div className="settings-option-description">
                    Increase contrast for better visibility
                  </div>
                </div>
              </div>
              <div className="theme-toggle-group">
                <button
                  onClick={() => onContrastChange('normal')}
                  className={`theme-option ${contrast === 'normal' ? 'active' : ''}`}
                  aria-pressed={contrast === 'normal'}
                >
                  Normal
                </button>
                <button
                  onClick={() => onContrastChange('high')}
                  className={`theme-option ${contrast === 'high' ? 'active' : ''}`}
                  aria-pressed={contrast === 'high'}
                >
                  High
                </button>
              </div>
            </div>
          </div>
          
          <div className="settings-option-card">
            <div className="settings-option-content">
              <div className="settings-option-header">
                <div>
                  <div className="settings-option-title">Font Size</div>
                  <div className="settings-option-description">
                    Adjust text size for easier reading
                  </div>
                </div>
              </div>
              <div className="theme-toggle-group">
                <button
                  onClick={() => onFontScaleChange('normal')}
                  className={`theme-option ${fontScale === 'normal' ? 'active' : ''}`}
                  aria-pressed={fontScale === 'normal'}
                >
                  Normal
                </button>
                <button
                  onClick={() => onFontScaleChange('large')}
                  className={`theme-option ${fontScale === 'large' ? 'active' : ''}`}
                  aria-pressed={fontScale === 'large'}
                >
                  Large
                </button>
                <button
                  onClick={() => onFontScaleChange('x-large')}
                  className={`theme-option ${fontScale === 'x-large' ? 'active' : ''}`}
                  aria-pressed={fontScale === 'x-large'}
                >
                  X-Large
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Weather location</h3>
          <div className="settings-option-card">
            <div className="settings-option-content weather-city-content">
              <div className="settings-option-header">
                <div>
                  <div className="settings-option-title">City for climate & forecast</div>
                  <div className="settings-option-description">
                    Optional. When set for the selected country ({countryCode}), Smart Recommendations
                    use this city instead of the capital. Uses Open-Meteo geocoding (no API key).
                  </div>
                </div>
              </div>
              {weatherCity && weatherCity.countryCode === countryCode.toUpperCase() ? (
                <div className="weather-city-active">
                  <span>
                    Using <strong>{weatherCity.name}</strong>
                    {weatherCity.admin1 ? `, ${weatherCity.admin1}` : ''}
                  </span>
                  <button type="button" className="settings-action-button" onClick={handleClearCity}>
                    Use capital
                  </button>
                </div>
              ) : (
                <p className="weather-city-fallback">Using country capital (default).</p>
              )}
              <div className="weather-city-search">
                <label className="sr-only" htmlFor="weather-city-input">
                  Search city
                </label>
                <input
                  id="weather-city-input"
                  type="search"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  placeholder={`Search city in ${countryCode}…`}
                  autoComplete="off"
                />
                {citySearching && <span className="weather-city-status">Searching…</span>}
                {cityError && !citySearching && cityQuery.trim().length >= 2 && (
                  <span className="weather-city-status weather-city-error" role="status">
                    {cityError}
                  </span>
                )}
                {cityResults.length > 0 && (
                  <ul className="weather-city-results" role="listbox" aria-label="City search results">
                    {cityResults.map((r) => (
                      <li key={`${r.name}-${r.latitude}-${r.longitude}`}>
                        <button
                          type="button"
                          role="option"
                          onClick={() => handleSelectCity(r)}
                        >
                          {r.name}
                          {r.admin1 ? `, ${r.admin1}` : ''}
                          {r.country ? ` · ${r.country}` : ''}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Backup & Device Sync</h3>
          <div className="settings-option-card">
            <div className="settings-option-content">
              <div className="settings-option-header">
                <div>
                  <div className="settings-option-title">Download Backup</div>
                  <div className="settings-option-description">
                    Local file backup only — not cloud sync. Exports recognized StretchBreak keys (webhook URLs are never included).
                  </div>
                </div>
              </div>
              <button
                onClick={handleDownloadBackup}
                className="settings-action-button"
              >
                Download Backup
              </button>
            </div>
          </div>
          
          <div className="settings-option-card">
            <div className="settings-option-content">
              <div className="settings-option-header">
                <div>
                  <div className="settings-option-title">Restore from File</div>
                  <div className="settings-option-description">
                    Import a previously saved backup file
                  </div>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="settings-action-button"
              >
                Restore Backup
              </button>
            </div>
          </div>
          
          <div className="settings-option-card">
            <div className="settings-option-content">
              <div className="settings-option-header">
                <div>
                  <div className="settings-option-title">Sync Code</div>
                  <div className="settings-option-description">
                    Generate a code to copy-paste between devices (for small datasets)
                  </div>
                </div>
              </div>
              <div className="sync-code-actions">
                <button
                  onClick={handleGenerateSyncCode}
                  className="settings-action-button"
                >
                  Generate Code
                </button>
                <button
                  onClick={() => setShowImportCode(!showImportCode)}
                  className="settings-action-button"
                >
                  Import Code
                </button>
              </div>
              {showSyncCode && (
                <div className="sync-code-container">
                  <textarea
                    value={syncCode}
                    readOnly
                    className="sync-code-textarea"
                    rows={4}
                  />
                  <button onClick={handleCopySyncCode} className="settings-action-button">
                    Copy Code
                  </button>
                </div>
              )}
              {showImportCode && (
                <div className="sync-code-container">
                  <textarea
                    value={importCode}
                    onChange={(e) => setImportCode(e.target.value)}
                    placeholder="Paste sync code here..."
                    className="sync-code-textarea"
                    rows={4}
                  />
                  <button onClick={handleImportSyncCode} className="settings-action-button">
                    Import
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Notifications</h3>
          <RemindersPanel />
        </div>

        <div className="settings-section">
          <h3>Data</h3>
          <div className="settings-option-card">
            <div className="settings-option-content">
              <div className="settings-option-header">
                <div>
                  <div className="settings-option-title">Reset all data</div>
                  <div className="settings-option-description">
                    Clear saved plans and PTO tracking. This cannot be undone.
                  </div>
                </div>
              </div>
              <button
                onClick={handleResetClick}
                className="settings-action-button reset-button"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

