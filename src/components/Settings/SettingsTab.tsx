import './SettingsTab.css';

interface SettingsTabProps {
  onResetAll: () => void;
}

export const SettingsTab = ({ onResetAll }: SettingsTabProps) => {
  const handleResetClick = () => {
    onResetAll();
  };

  return (
    <div className="settings-tab">
      <div className="settings-tab-header">
        <h2>Settings</h2>
        <p className="settings-subtitle">Manage your application preferences and data</p>
      </div>
      
      <div className="settings-content">
        <div className="settings-section">
          <h3>Data Management</h3>
          <div className="settings-option-card">
            <div className="settings-option-content">
              <div className="settings-option-header">
                <span className="settings-option-icon">🔄</span>
                <div>
                  <div className="settings-option-title">Reset All Data</div>
                  <div className="settings-option-description">
                    Clear all saved plans, PTO tracking, and reset to a fresh start. This action cannot be undone.
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

