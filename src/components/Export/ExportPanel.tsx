import { downloadICal } from '../../services/calendarExport';
import { generatePlanOOOMessage } from '../../services/oooMessage';
import { getAllPlans } from '../../services/planStorage';
import type { HolidayPlan } from '../../utils/types';
import { useState } from 'react';
import './ExportPanel.css';

interface ExportPanelProps {
  plan: HolidayPlan;
  currentSelectedDates?: string[];
}

export const ExportPanel = ({ plan, currentSelectedDates }: ExportPanelProps) => {
  const [oooMessage, setOooMessage] = useState('');
  const [oooTone, setOooTone] = useState<'professional' | 'casual' | 'brief'>('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
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
  
  return (
    <div className="export-panel">
      <h3>Export & Tools</h3>
      
      <div className="export-section">
        <h4>📅 Download Calendar</h4>
        <p>Export your vacation plan as an iCal file to import into your calendar application.</p>
        <button onClick={handleDownloadCalendar} className="export-button">
          Download Calendar File (.ics)
        </button>
      </div>
      
      <div className="export-section">
        <h4>📧 Out-of-Office Message</h4>
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
            ⚠️ {generationError}
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

