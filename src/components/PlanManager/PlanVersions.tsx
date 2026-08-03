import { useState, useEffect } from 'react';
import { getVersionsByPlanId, saveVersion, deleteVersion, restoreVersion } from '../../services/planVersionStorage';
import { savePlan } from '../../services/planStorage';
import type { PlanVersion, HolidayPlan } from '../../utils/types';
import './PlanVersions.css';

interface PlanVersionsProps {
  plan: HolidayPlan;
  onPlanUpdated?: () => void;
}

export const PlanVersions = ({ plan, onPlanUpdated }: PlanVersionsProps) => {
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);

  useEffect(() => {
    loadVersions();
  }, [plan.id]);

  const loadVersions = () => {
    setVersions(getVersionsByPlanId(plan.id));
  };

  const handleSaveVersion = () => {
    if (!versionLabel.trim()) return;

    saveVersion(plan.id, versionLabel.trim(), plan);
    loadVersions();
    setVersionLabel('');
    setShowSaveForm(false);
  };

  const handleRestore = (versionId: string) => {
    if (!confirm('Restore this version? Current plan will be updated.')) return;

    const snapshot = restoreVersion(versionId);
    if (snapshot) {
      savePlan({ ...snapshot, id: plan.id, updatedAt: new Date().toISOString() });
      onPlanUpdated?.();
      alert('Version restored successfully!');
    }
  };

  const handleDelete = (versionId: string) => {
    if (!confirm('Delete this version?')) return;

    deleteVersion(versionId);
    loadVersions();
  };

  const toggleCompare = (versionId: string) => {
    if (selectedVersions.includes(versionId)) {
      setSelectedVersions(selectedVersions.filter(id => id !== versionId));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, versionId]);
    }
  };

  const compareVersions = () => {
    if (selectedVersions.length !== 2) return null;

    const version1 = versions.find(v => v.id === selectedVersions[0]);
    const version2 = versions.find(v => v.id === selectedVersions[1]);

    if (!version1 || !version2) return null;

    const dates1 = new Set(version1.snapshot.vacationDays);
    const dates2 = new Set(version2.snapshot.vacationDays);

    const added = version2.snapshot.vacationDays.filter(d => !dates1.has(d));
    const removed = version1.snapshot.vacationDays.filter(d => !dates2.has(d));
    const unchanged = version1.snapshot.vacationDays.filter(d => dates2.has(d));

    return { version1, version2, added, removed, unchanged };
  };

  const comparison = compareMode ? compareVersions() : null;

  return (
    <div className="plan-versions">
      <div className="plan-versions-header">
        <h3>Plan Versions</h3>
        <div className="plan-versions-actions">
          {versions.length >= 2 && (
            <button
              type="button"
              className="plan-versions-compare-button"
              onClick={() => {
                setCompareMode(!compareMode);
                setSelectedVersions([]);
              }}
            >
              {compareMode ? 'Exit Compare' : 'Compare Versions'}
            </button>
          )}
          <button
            type="button"
            className="plan-versions-save-button"
            onClick={() => setShowSaveForm(!showSaveForm)}
          >
            {showSaveForm ? 'Cancel' : 'Save Version'}
          </button>
        </div>
      </div>

      {showSaveForm && (
        <div className="plan-versions-form">
          <label>
            Version Label
            <input
              type="text"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="e.g., Before changes, Final version"
              autoFocus
            />
          </label>
          <div className="plan-versions-form-actions">
            <button type="button" className="plan-versions-submit-button" onClick={handleSaveVersion}>
              Save Version
            </button>
            <button
              type="button"
              className="plan-versions-cancel-button"
              onClick={() => {
                setShowSaveForm(false);
                setVersionLabel('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {compareMode && comparison && (
        <div className="plan-versions-comparison">
          <h4>Comparing Versions</h4>
          <div className="plan-versions-comparison-header">
            <div className="plan-versions-comparison-item">
              <strong>{comparison.version1.label}</strong>
              <span className="plan-versions-comparison-date">
                {new Date(comparison.version1.createdAt).toLocaleDateString()}
              </span>
            </div>
            <span className="plan-versions-comparison-vs">vs</span>
            <div className="plan-versions-comparison-item">
              <strong>{comparison.version2.label}</strong>
              <span className="plan-versions-comparison-date">
                {new Date(comparison.version2.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="plan-versions-diff">
            {comparison.added.length > 0 && (
              <div className="plan-versions-diff-section added">
                <strong>Added ({comparison.added.length}):</strong>
                <div className="plan-versions-diff-dates">
                  {comparison.added.map(date => (
                    <span key={date} className="plan-versions-diff-date">
                      {new Date(date).toLocaleDateString()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {comparison.removed.length > 0 && (
              <div className="plan-versions-diff-section removed">
                <strong>Removed ({comparison.removed.length}):</strong>
                <div className="plan-versions-diff-dates">
                  {comparison.removed.map(date => (
                    <span key={date} className="plan-versions-diff-date">
                      {new Date(date).toLocaleDateString()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {comparison.unchanged.length > 0 && (
              <div className="plan-versions-diff-section unchanged">
                <strong>Unchanged ({comparison.unchanged.length}):</strong>
                <span className="plan-versions-diff-count">{comparison.unchanged.length} dates</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="plan-versions-list">
        {versions.length === 0 ? (
          <div className="plan-versions-empty">
            <p>No saved versions yet. Save a version to track changes over time.</p>
          </div>
        ) : (
          versions.map(version => (
            <div
              key={version.id}
              className={`plan-version-item ${
                compareMode && selectedVersions.includes(version.id) ? 'selected' : ''
              }`}
            >
              <div className="plan-version-header">
                <div className="plan-version-info">
                  {compareMode && (
                    <input
                      type="checkbox"
                      checked={selectedVersions.includes(version.id)}
                      onChange={() => toggleCompare(version.id)}
                      disabled={selectedVersions.length >= 2 && !selectedVersions.includes(version.id)}
                      className="plan-version-checkbox"
                    />
                  )}
                  <div>
                    <strong className="plan-version-label">{version.label}</strong>
                    <span className="plan-version-date">
                      {new Date(version.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                {!compareMode && (
                  <div className="plan-version-actions">
                    <button
                      type="button"
                      className="plan-version-restore-button"
                      onClick={() => handleRestore(version.id)}
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      className="plan-version-delete-button"
                      onClick={() => handleDelete(version.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <div className="plan-version-details">
                <span className="plan-version-detail">
                  {version.snapshot.vacationDays.length} vacation days
                </span>
                <span className="plan-version-detail">
                  Year: {version.snapshot.year}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
