import { useState, useRef, useEffect } from 'react';
import './SettingsMenu.css';

interface SettingsMenuProps {
  onResetAll: () => void;
}

export const SettingsMenu = ({ onResetAll }: SettingsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleResetClick = () => {
    setIsOpen(false);
    onResetAll();
  };

  return (
    <div className="settings-menu" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="settings-button"
        title="Settings"
        aria-label="Settings"
      >
        ⚙️
      </button>
      
      {isOpen && (
        <div className="settings-dropdown">
          <div className="settings-header">
            <h3>Settings</h3>
          </div>
          <div className="settings-content">
            <button
              onClick={handleResetClick}
              className="settings-option reset-option"
            >
              <span className="option-icon">🔄</span>
              <div className="option-content">
                <div className="option-title">Reset All Data</div>
                <div className="option-description">
                  Clear all saved plans and PTO tracking
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

