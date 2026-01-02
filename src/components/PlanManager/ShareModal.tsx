import { useState } from 'react';
import { generateShareUrl, copyToClipboard } from '../../services/shareService';
import type { HolidayPlan } from '../../utils/types';
import './ShareModal.css';

interface ShareModalProps {
  plan: HolidayPlan;
  onClose: () => void;
}

export const ShareModal = ({ plan, onClose }: ShareModalProps) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = generateShareUrl(plan);
  
  const handleCopy = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>Share Plan: {plan.name}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="share-modal-content">
          <p className="share-description">
            Copy the link below to share this holiday plan with others. Anyone with the link can view and import the plan.
          </p>
          
          <div className="share-url-container">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="share-url-input"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className={`copy-button ${copied ? 'copied' : ''}`}
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
          
          <div className="share-info">
            <p><strong>What gets shared:</strong></p>
            <ul>
              <li>Plan name and description</li>
              <li>Country and year</li>
              <li>Selected vacation days</li>
              <li>Public holidays in the plan</li>
            </ul>
            <p className="share-note">
              Note: The shared plan will be imported as a new plan in the recipient's app.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

