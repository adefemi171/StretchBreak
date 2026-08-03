import { 
  downloadICal, 
  generateGoogleCalendarUrl, 
  generateOutlookUrl, 
  generateSlackMessage,
  postToWebhook,
  isAllowedWebhookUrl,
} from '../../services/calendarExport';
import { generatePlanOOOMessage } from '../../services/oooMessage';
import { getAllPlans } from '../../services/planStorage';
import type { HolidayPlan } from '../../utils/types';
import { useState } from 'react';
import './ExportPanel.css';

interface ExportPanelProps {
  plan: HolidayPlan;
  currentSelectedDates?: string[];
}

const WEBHOOK_STORAGE_KEY = 'webhook-url';

export const ExportPanel = ({ plan, currentSelectedDates }: ExportPanelProps) => {
  const [oooMessage, setOooMessage] = useState('');
  const [oooTone, setOooTone] = useState<'professional' | 'casual' | 'brief'>('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState(() => {
    try {
      return localStorage.getItem(WEBHOOK_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [showWebhookInput, setShowWebhookInput] = useState(false);
  const [webhookSending, setWebhookSending] = useState(false);
  
  const handleGenerateOOO = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setOooMessage('');
    
    try {
      // Get all saved plans (excluding the current plan if it's already saved)
      const allSavedPlans = getAllPlans().filter(savedPlan => savedPlan.id !== plan.id);
      
      const message = await generatePlanOOOMessage(plan, {
        tone: oooTone,
        includeDates: true,
        includeBackDate: true,
        allSavedPlans,
        currentSelectedDates,
      });
      setOooMessage(message);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate message');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleCopyOOO = async () => {
    if (oooMessage) {
      await navigator.clipboard.writeText(oooMessage);
      alert('Out-of-office message copied to clipboard!');
    }
  };
  
  const handleDownloadCalendar = () => {
    downloadICal(plan);
  };
  
  const handleCopySlackMessage = async () => {
    const message = generateSlackMessage(plan);
    await navigator.clipboard.writeText(message);
    alert('Slack message copied to clipboard!');
  };
  
  const handleSaveWebhook = () => {
    try {
      const trimmed = webhookUrl.trim();
      if (trimmed) {
        const allowed = isAllowedWebhookUrl(trimmed);
        if (!allowed.ok) {
          alert(allowed.reason || 'Webhook URL not allowed');
          return;
        }
        localStorage.setItem(WEBHOOK_STORAGE_KEY, trimmed);
      } else {
        localStorage.removeItem(WEBHOOK_STORAGE_KEY);
      }
      setShowWebhookInput(false);
      alert('Webhook URL saved!');
    } catch {
      alert('Failed to save webhook URL');
    }
  };
  
  const handleNotifyWebhook = async () => {
    if (!webhookUrl.trim()) {
      alert('Please configure a webhook URL first');
      return;
    }

    const allowed = isAllowedWebhookUrl(webhookUrl.trim());
    if (!allowed.ok) {
      alert(allowed.reason || 'Webhook URL not allowed');
      return;
    }
    
    setWebhookSending(true);
    try {
      await postToWebhook(webhookUrl, plan);
      alert('Webhook notification sent successfully!');
    } catch (error) {
      alert('Failed to send webhook: ' + (error as Error).message);
    } finally {
      setWebhookSending(false);
    }
  };
  
  const googleCalUrl = generateGoogleCalendarUrl(plan);
  const outlookUrl = generateOutlookUrl(plan);
  
  return (
    <div className="export-panel">
      <h3>Export & Integrations</h3>
      
      <div className="export-section">
        <h4>Calendar Export</h4>
        <p>Download an .ics file or open a pre-filled Google/Outlook event (deep link, not two-way sync).</p>
        <div className="export-buttons-group">
          <button onClick={handleDownloadCalendar} className="export-button">
            Download .ics File
          </button>
          {googleCalUrl && (
            <a 
              href={googleCalUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="export-button export-link"
            >
              Add to Google Calendar
            </a>
          )}
          {outlookUrl && (
            <a 
              href={outlookUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="export-button export-link"
            >
              Add to Outlook
            </a>
          )}
        </div>
      </div>
      
      <div className="export-section">
        <h4>Team Notifications</h4>
        <p>Copy a message, or post to your own Slack/Teams webhook.</p>
        <div className="export-buttons-group">
          <button onClick={handleCopySlackMessage} className="export-button secondary-button">
            Copy Slack/Teams Message
          </button>
          {webhookUrl && (
            <button 
              onClick={handleNotifyWebhook} 
              className="export-button secondary-button"
              disabled={webhookSending}
            >
              {webhookSending ? 'Sending...' : 'Notify Webhook'}
            </button>
          )}
          <button 
            onClick={() => setShowWebhookInput(!showWebhookInput)} 
            className="export-button ghost-button"
            aria-label="Configure webhook URL"
          >
            Webhook
          </button>
        </div>
        {showWebhookInput && (
          <div className="webhook-config">
            <label>
              <span className="webhook-label">Webhook URL (optional):</span>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="webhook-input"
              />
            </label>
            <div className="webhook-actions">
              <button onClick={handleSaveWebhook} className="export-button secondary-button">
                Save
              </button>
              <button onClick={() => setShowWebhookInput(false)} className="ghost-button">
                Cancel
              </button>
            </div>
            <p className="webhook-hint">
              HTTPS Slack or Microsoft Teams incoming webhook only. Posts your vacation notice text to that URL — do not paste untrusted links.
              Stored only on this device; never included in backups or sync codes.
            </p>
          </div>
        )}
      </div>
      
      <div className="export-section">
        <h4>Out-of-Office Message</h4>
        <p>Generate an out-of-office message for your vacation period.</p>
        
        <div className="ooo-controls">
          <label>
            Tone:
            <select
              value={oooTone}
              onChange={(e) => setOooTone(e.target.value as any)}
              className="tone-select"
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="brief">Brief</option>
            </select>
          </label>
          <button 
            onClick={handleGenerateOOO} 
            className="generate-button"
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Message'}
          </button>
        </div>
        
        {generationError && (
          <div className="ooo-error">
            {generationError}
            <br />
            <small>Falling back to template-based message.</small>
          </div>
        )}
        
        {oooMessage && (
          <div className="ooo-message-container">
            <textarea
              value={oooMessage}
              readOnly
              className="ooo-message"
              rows={6}
            />
            <button onClick={handleCopyOOO} className="copy-button">
              Copy to Clipboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

