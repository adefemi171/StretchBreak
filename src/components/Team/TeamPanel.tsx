import { useState, useEffect } from 'react';
import { getAllTeamMembers, saveTeamMember, deleteTeamMember, createTeamMemberId, getConflictingTeamMembers } from '../../services/teamStorage';
import { formatDateDisplay } from '../../utils/dateUtils';
import type { TeamMember, HolidayPlan } from '../../utils/types';
import './TeamPanel.css';

interface TeamPanelProps {
  selectedDates?: string[];
  selectedPlan?: HolidayPlan | null;
  holidays?: any[];
}

export const TeamPanel = ({ selectedDates = [], selectedPlan, holidays = [] }: TeamPanelProps) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newTimeOff, setNewTimeOff] = useState('');
  const [newColor, setNewColor] = useState('#0c7c74');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = () => {
    setMembers(getAllTeamMembers());
  };

  const handleAdd = () => {
    if (!newName.trim()) return;

    const timeOffDates = newTimeOff
      .split('\n')
      .map(line => line.trim())
      .filter(line => /^\d{4}-\d{2}-\d{2}$/.test(line));

    const member: TeamMember = {
      id: createTeamMemberId(),
      name: newName.trim(),
      color: newColor,
      timeOff: timeOffDates,
    };

    saveTeamMember(member);
    loadMembers();
    setNewName('');
    setNewTimeOff('');
    setNewColor('#0c7c74');
    setShowAddForm(false);
  };

  const handleEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setNewName(member.name);
    setNewTimeOff(member.timeOff.join('\n'));
    setNewColor(member.color || '#0c7c74');
  };

  const handleSaveEdit = (id: string) => {
    if (!newName.trim()) return;

    const timeOffDates = newTimeOff
      .split('\n')
      .map(line => line.trim())
      .filter(line => /^\d{4}-\d{2}-\d{2}$/.test(line));

    const member: TeamMember = {
      id,
      name: newName.trim(),
      color: newColor,
      timeOff: timeOffDates,
    };

    saveTeamMember(member);
    loadMembers();
    setEditingId(null);
    setNewName('');
    setNewTimeOff('');
    setNewColor('#0c7c74');
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this team member?')) {
      deleteTeamMember(id);
      loadMembers();
    }
  };

  const handleSharePlan = () => {
    if (!selectedPlan) {
      alert('No plan selected to share');
      return;
    }

    const planText = `
📅 ${selectedPlan.name}
${selectedPlan.description ? `\n${selectedPlan.description}\n` : ''}
🗓️ Year: ${selectedPlan.year}
🌍 Country: ${selectedPlan.countryCode}
📍 Vacation Days: ${selectedPlan.vacationDays.length}

Days Off:
${selectedPlan.vacationDays.map(d => `  - ${formatDateDisplay(d)}`).join('\n')}

---
Share JSON (import to StretchBreak):
${JSON.stringify({ plan: selectedPlan }, null, 2)}
    `.trim();

    navigator.clipboard.writeText(planText);
    alert('Plan copied to clipboard! Share with your team.');
  };

  const datesToCheck = selectedPlan ? selectedPlan.vacationDays : selectedDates;
  const conflicts = datesToCheck.length > 0 ? getConflictingTeamMembers(datesToCheck) : [];

  return (
    <div className="team-panel">
      <h2>Team Coordination</h2>
      <p className="team-subtitle">
        Local-only list stored in this browser — not shared with coworkers or synced across devices.
        Track when colleagues are off to spot scheduling overlaps.
      </p>

      {conflicts.length > 0 && (
        <div className="team-conflict-warning">
          <div className="team-conflict-header">
            <span className="team-conflict-text">
              {conflicts.length} team member{conflicts.length !== 1 ? 's' : ''} overlap with your selected dates
            </span>
          </div>
          <div className="team-conflict-list">
            {conflicts.map(({ member, conflictingDates }) => (
              <div key={member.id} className="team-conflict-item">
                <div className="team-conflict-member">
                  <span 
                    className="team-member-color-dot" 
                    style={{ backgroundColor: member.color || '#0c7c74' }}
                  />
                  <span className="team-conflict-member-name">{member.name}</span>
                </div>
                <div className="team-conflict-dates">
                  {conflictingDates.slice(0, 3).map(date => (
                    <span key={date} className="team-conflict-date">
                      {formatDateDisplay(date)}
                    </span>
                  ))}
                  {conflictingDates.length > 3 && (
                    <span className="team-conflict-more">+{conflictingDates.length - 3} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="team-members-section">
        <div className="team-members-header">
          <h3>Team Members ({members.length})</h3>
          <button
            type="button"
            className="team-add-button"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : '+ Add Member'}
          </button>
        </div>

        {showAddForm && (
          <div className="team-member-form">
            <label>
              Name
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Team member name"
                autoFocus
              />
            </label>
            <label>
              Color (optional)
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
              />
            </label>
            <label>
              Time Off Dates
              <textarea
                value={newTimeOff}
                onChange={(e) => setNewTimeOff(e.target.value)}
                placeholder="One date per line (YYYY-MM-DD)&#10;2026-08-15&#10;2026-08-16&#10;2026-08-17"
                rows={5}
              />
              <span className="team-form-hint">One date per line, format: YYYY-MM-DD</span>
            </label>
            <div className="team-form-actions">
              <button type="button" className="team-save-button" onClick={handleAdd}>
                Add Member
              </button>
              <button type="button" className="team-cancel-button" onClick={() => {
                setShowAddForm(false);
                setNewName('');
                setNewTimeOff('');
                setNewColor('#0c7c74');
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="team-members-list">
          {members.length === 0 && !showAddForm && (
            <div className="team-empty-state">
              <p>No team members added yet. Add colleagues to track their time off.</p>
            </div>
          )}

          {members.map(member => (
            <div key={member.id} className="team-member-card">
              {editingId === member.id ? (
                <div className="team-member-form">
                  <label>
                    Name
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </label>
                  <label>
                    Color
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                    />
                  </label>
                  <label>
                    Time Off Dates
                    <textarea
                      value={newTimeOff}
                      onChange={(e) => setNewTimeOff(e.target.value)}
                      rows={5}
                    />
                  </label>
                  <div className="team-form-actions">
                    <button
                      type="button"
                      className="team-save-button"
                      onClick={() => handleSaveEdit(member.id)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="team-cancel-button"
                      onClick={() => {
                        setEditingId(null);
                        setNewName('');
                        setNewTimeOff('');
                        setNewColor('#0c7c74');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="team-member-header">
                    <div className="team-member-title">
                      <span 
                        className="team-member-color-dot" 
                        style={{ backgroundColor: member.color || '#0c7c74' }}
                      />
                      <h4>{member.name}</h4>
                    </div>
                    <div className="team-member-actions">
                      <button
                        type="button"
                        className="team-edit-button"
                        onClick={() => handleEdit(member)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="team-delete-button"
                        onClick={() => handleDelete(member.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="team-member-timeoff">
                    {member.timeOff.length === 0 ? (
                      <p className="team-member-no-dates">No time off scheduled</p>
                    ) : (
                      <div className="team-timeoff-dates">
                        {member.timeOff.slice(0, 5).map(date => (
                          <span key={date} className="team-timeoff-date">
                            {formatDateDisplay(date)}
                          </span>
                        ))}
                        {member.timeOff.length > 5 && (
                          <span className="team-timeoff-more">+{member.timeOff.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedPlan && (
        <div className="team-share-section">
          <h3>Share Plan with Team</h3>
          <p className="team-share-hint">
            Copy your plan details to share via email, Slack, or any messaging app.
          </p>
          <button
            type="button"
            className="team-share-button"
            onClick={handleSharePlan}
          >
            Copy Plan to Clipboard
          </button>
        </div>
      )}
    </div>
  );
};
