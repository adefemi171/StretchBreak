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
        <p className="settings-subtitle">Manage your local data and start fresh when you need to</p>
      </div>
      
      <div className="settings-content">
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

