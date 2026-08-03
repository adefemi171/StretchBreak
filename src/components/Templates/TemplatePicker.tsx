import { useState, useEffect, useRef } from 'react';
import type { VacationTemplate, VacationStrategy } from '../../utils/types';
import { getAllTemplates, saveTemplate, deleteTemplate } from '../../services/templateStorage';
import {
  copyToClipboard,
  exportTemplateJson,
  generateTemplateShareUrl,
  parseTemplateJson,
} from '../../services/shareService';
import './TemplatePicker.css';

interface TemplatePickerProps {
  onApplyTemplate: (template: VacationTemplate) => void;
  currentStrategy?: VacationStrategy;
  currentPreferredMonths?: number[];
}

export const TemplatePicker = ({
  onApplyTemplate,
  currentStrategy,
  currentPreferredMonths,
}: TemplatePickerProps) => {
  const [templates, setTemplates] = useState<VacationTemplate[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTemplates(getAllTemplates());
  }, []);

  const refresh = () => setTemplates(getAllTemplates());

  const handleApply = (template: VacationTemplate) => {
    onApplyTemplate(template);
  };

  const handleDelete = (id: string) => {
    deleteTemplate(id);
    refresh();
  };

  const handleSaveCurrent = () => {
    if (newTemplateName.trim()) {
      saveTemplate({
        name: newTemplateName.trim(),
        description: newTemplateDescription.trim() || undefined,
        strategy: currentStrategy,
        preferredMonths: currentPreferredMonths,
      });
      refresh();
      setNewTemplateName('');
      setNewTemplateDescription('');
      setShowSaveForm(false);
    }
  };

  const flash = (message: string) => {
    setShareFeedback(message);
    setTimeout(() => setShareFeedback(null), 2200);
  };

  const handleCopyLink = async (template: VacationTemplate) => {
    const url = generateTemplateShareUrl(template);
    const ok = await copyToClipboard(url);
    flash(ok ? 'Template link copied (local import)' : 'Could not copy link');
  };

  const handleCopyJson = async (template: VacationTemplate) => {
    const ok = await copyToClipboard(exportTemplateJson(template));
    flash(ok ? 'Template JSON copied' : 'Could not copy JSON');
  };

  const handleImportJson = () => {
    const parsed = parseTemplateJson(importText.trim());
    if (!parsed) {
      setImportError('Invalid template JSON. Expect a StretchBreak template object.');
      return;
    }
    saveTemplate(parsed);
    refresh();
    setImportText('');
    setImportError('');
    setShowImport(false);
    flash(`Imported “${parsed.name}” locally`);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseTemplateJson(text);
      if (!parsed) {
        setImportError('File is not a valid StretchBreak template.');
        return;
      }
      saveTemplate(parsed);
      refresh();
      setImportError('');
      setShowImport(false);
      flash(`Imported “${parsed.name}” locally`);
    } catch {
      setImportError('Could not read that file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const builtInTemplates = templates.filter((t) => t.isBuiltIn);
  const userTemplates = templates.filter((t) => !t.isBuiltIn);

  const renderActions = (template: VacationTemplate, allowDelete = false) => (
    <div className="template-actions">
      <button type="button" className="apply-btn" onClick={() => handleApply(template)}>
        Apply
      </button>
      <button
        type="button"
        className="share-btn"
        onClick={() => handleCopyLink(template)}
        title="Copy local share link"
        aria-label={`Copy share link for ${template.name}`}
      >
        Link
      </button>
      <button
        type="button"
        className="share-btn"
        onClick={() => handleCopyJson(template)}
        title="Copy template JSON"
        aria-label={`Copy JSON for ${template.name}`}
      >
        JSON
      </button>
      {allowDelete && (
        <button type="button" className="delete-btn" onClick={() => handleDelete(template.id)}>
          Delete
        </button>
      )}
    </div>
  );

  return (
    <div className="template-picker">
      <div className="template-header">
        <h4>Vacation Templates</h4>
        <div className="template-header-actions">
          <button
            type="button"
            className="save-template-btn secondary"
            onClick={() => {
              setShowImport(!showImport);
              setShowSaveForm(false);
              setImportError('');
            }}
          >
            {showImport ? 'Cancel' : 'Import'}
          </button>
          <button
            type="button"
            className="save-template-btn"
            onClick={() => {
              setShowSaveForm(!showSaveForm);
              setShowImport(false);
            }}
          >
            {showSaveForm ? 'Cancel' : '+ Save current'}
          </button>
        </div>
      </div>

      <p className="template-share-note">
        Sharing is local only — links and JSON import on another browser/device. Not a cloud marketplace.
      </p>

      {shareFeedback && (
        <p className="template-share-feedback" role="status">
          {shareFeedback}
        </p>
      )}

      {showImport && (
        <div className="save-template-form import-template-form">
          <p className="import-hint">Paste template JSON, or choose a .json file exported from StretchBreak.</p>
          <textarea
            placeholder='{"kind":"stretchbreak-template","name":"…"}'
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportError('');
            }}
            rows={4}
            aria-label="Paste template JSON"
          />
          {importError && (
            <p className="import-error" role="alert">
              {importError}
            </p>
          )}
          <div className="import-actions">
            <button
              type="button"
              className="save-btn"
              onClick={handleImportJson}
              disabled={!importText.trim()}
            >
              Import JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={handleImportFile}
              aria-hidden="true"
              tabIndex={-1}
            />
            <button
              type="button"
              className="save-btn secondary-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose file
            </button>
          </div>
        </div>
      )}

      {showSaveForm && (
        <div className="save-template-form">
          <input
            type="text"
            placeholder="Template name"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            aria-label="Template name"
          />
          <textarea
            placeholder="Description (optional)"
            value={newTemplateDescription}
            onChange={(e) => setNewTemplateDescription(e.target.value)}
            rows={2}
            aria-label="Template description"
          />
          <button
            type="button"
            className="save-btn"
            onClick={handleSaveCurrent}
            disabled={!newTemplateName.trim()}
          >
            Save Template
          </button>
        </div>
      )}

      <div className="template-section">
        <h5>Built-in Presets</h5>
        <div className="template-list">
          {builtInTemplates.map((template) => (
            <div key={template.id} className="template-card">
              <div className="template-info">
                <strong>{template.name}</strong>
                {template.description && <p className="template-description">{template.description}</p>}
                <div className="template-meta">
                  {template.strategy && <span className="template-badge">{template.strategy}</span>}
                  {template.preferredMonths && template.preferredMonths.length > 0 && (
                    <span className="template-badge">
                      {template.preferredMonths.length} month
                      {template.preferredMonths.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {template.typicalDurationDays && (
                    <span className="template-badge">{template.typicalDurationDays} days</span>
                  )}
                </div>
              </div>
              {renderActions(template)}
            </div>
          ))}
        </div>
      </div>

      {userTemplates.length > 0 && (
        <div className="template-section">
          <h5>Your Templates</h5>
          <div className="template-list">
            {userTemplates.map((template) => (
              <div key={template.id} className="template-card">
                <div className="template-info">
                  <strong>{template.name}</strong>
                  {template.description && <p className="template-description">{template.description}</p>}
                  <div className="template-meta">
                    {template.strategy && <span className="template-badge">{template.strategy}</span>}
                    {template.preferredMonths && template.preferredMonths.length > 0 && (
                      <span className="template-badge">
                        {template.preferredMonths.length} month
                        {template.preferredMonths.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                {renderActions(template, true)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
