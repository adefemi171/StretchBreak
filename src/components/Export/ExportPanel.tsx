import {
  downloadICal,
  generateGoogleCalendarUrls,
  getCalendarLeavePeriods,
  generateOutlookUrls,
  generateSlackMessage,
  postToWebhook,
  isAllowedWebhookUrl,
} from '../../services/calendarExport';
import { generatePlanOOOMessage, getPlanOOOBreaks } from '../../services/oooMessage';
import { AIAccessPanel } from '../AI/AIAccessPanel';
import { formatDateDisplay } from '../../utils/dateUtils';
import type { HolidayPlan } from '../../utils/types';
import { useEffect, useRef, useState } from 'react';
import './ExportPanel.css';

interface ExportPanelProps {
  plan: HolidayPlan;
  currentSelectedDates?: string[];
  aiAvailable?: boolean;
}

const WEBHOOK_STORAGE_KEY = 'webhook-url';

export const ExportPanel = ({ plan, aiAvailable = false }: ExportPanelProps) => (
  <ExportPanelContent key={JSON.stringify([plan.id, plan.vacationDays, plan.publicHolidays, plan.companyHolidays, plan.workDays])} plan={plan} aiAvailable={aiAvailable} />
);

const ExportPanelContent = ({ plan, aiAvailable = false }: ExportPanelProps) => {
  const breaks = getPlanOOOBreaks(plan);
  const [breakStartDate, setBreakStartDate] = useState(breaks[0]?.startDate ?? '');
  const [showAI, setShowAI] = useState(false);
  const [aiReady, setAIReady] = useState(false);
  const requestVersion = useRef(0);
  useEffect(() => () => { requestVersion.current++; }, []);
  const [oooMessage, setOooMessage] = useState('');
  const [oooTone, setOooTone] = useState<'professional' | 'casual' | 'brief'>('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  useEffect(() => {
    // Remove credentials persisted by older releases; new values stay in memory only.
    try { localStorage.removeItem(WEBHOOK_STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
  }, []);
  const [showWebhookInput, setShowWebhookInput] = useState(false);
  const [webhookSending, setWebhookSending] = useState(false);

  const clearDraft = () => {
    requestVersion.current++;
    setIsGenerating(false);
    setGenerationError(null);
    setOooMessage('');
  };

  const handleGenerateOOO = async (mode: 'template' | 'ai') => {
    const version = ++requestVersion.current;
    setIsGenerating(true);
    setGenerationError(null);
    setOooMessage('');
    try {
      const message = await generatePlanOOOMessage(plan, {
        tone: oooTone, includeDates: true, includeBackDate: true, breakStartDate, mode,
      });
      if (version === requestVersion.current) setOooMessage(message);
    } catch (error) {
      if (version === requestVersion.current) setGenerationError(error instanceof Error ? error.message : 'Failed to generate message');
    } finally {
      if (version === requestVersion.current) setIsGenerating(false);
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
        setWebhookUrl(trimmed);
      } else {
        localStorage.removeItem(WEBHOOK_STORAGE_KEY);
      }
      setShowWebhookInput(false);
      alert('Webhook ready for this session.');
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

  const googleCalUrls = generateGoogleCalendarUrls(plan);
  const outlookUrls = generateOutlookUrls(plan);
  const leavePeriods = getCalendarLeavePeriods(plan);

  return (
    <div className="export-panel">
      <h3>Add to your calendar</h3>

      <div className="export-section">
        <p>Export the workdays you’re taking off to your calendar.</p>
        <div className="export-buttons-group">
          <button onClick={handleDownloadCalendar} className="export-button">
            Download calendar (.ics)
          </button>
          {leavePeriods.map((period, index) => (
            <div key={period.startDate} className="calendar-export-period">
              <p>{period.startDate}{period.endDate !== period.startDate ? ` – ${period.endDate}` : ''}</p>
              <a href={googleCalUrls[index]} target="_blank" rel="noopener noreferrer" className="export-button export-link">Add to Google Calendar</a>
              <a href={outlookUrls[index]} target="_blank" rel="noopener noreferrer" className="export-button export-link">Add to Outlook</a>
            </div>
          ))}
        </div>
      </div>

      <details className="export-section export-extra">
        <summary>Notify your team</summary>
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
                Use for this session
              </button>
              <button onClick={() => setShowWebhookInput(false)} className="ghost-button">
                Cancel
              </button>
            </div>
            <p className="webhook-hint">
              HTTPS Slack or Microsoft Teams incoming webhook only. Posts your vacation notice text to that URL — do not paste untrusted links.
              Kept in memory for this session only; cleared when you leave or reload.
            </p>
          </div>
        )}
      </details>

      <details className="export-section export-extra">
        <summary>Create an out-of-office message</summary>
        <p>Create a message for one break in this plan. The template stays in your browser.</p>

        <div className="ooo-controls">
          <label>
            Vacation break:
            <select value={breakStartDate} onChange={(event) => { clearDraft(); setBreakStartDate(event.target.value); }} disabled={isGenerating || !breaks.length}>
              {!breaks.length && <option value="">No vacation days selected</option>}
              {breaks.map(period => <option key={period.startDate} value={period.startDate}>{formatDateDisplay(period.startDate)} – {formatDateDisplay(period.endDate)}</option>)}
            </select>
          </label>
          <label>
            Tone:
            <select
              value={oooTone}
              onChange={(e) => { clearDraft(); setOooTone(e.target.value as 'professional' | 'casual' | 'brief'); }}
              disabled={isGenerating}
              className="tone-select"
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="brief">Brief</option>
            </select>
          </label>
          <button
            onClick={() => void handleGenerateOOO('template')}
            className="generate-button"
            disabled={isGenerating || !breakStartDate}
          >
            Use local template
          </button>
        </div>

        {aiAvailable && <button type="button" className="export-button ghost-button" onClick={() => setShowAI(!showAI)} aria-expanded={showAI}>Optional AI drafting</button>}
        {aiAvailable && showAI && <div>
          <p>AI drafting sends only this break's dates and tone settings. Review the draft before sharing.</p>
          <AIAccessPanel onReady={() => setAIReady(true)} />
          <button type="button" className="generate-button" disabled={isGenerating || !breakStartDate || !aiReady} onClick={() => void handleGenerateOOO('ai')}>{isGenerating ? 'Drafting…' : 'Draft with AI'}</button>
        </div>}
        {generationError && <div className="ooo-error" role="alert">{generationError}</div>}

        {oooMessage && (
          <div className="ooo-message-container">
            <textarea
              value={oooMessage}
              aria-label="Out-of-office draft"
              onChange={event => setOooMessage(event.target.value)}
              className="ooo-message"
              rows={6}
            />
            <button onClick={handleCopyOOO} className="copy-button">
              Copy to Clipboard
            </button>
          </div>
        )}
      </details>
    </div>
  );
};

