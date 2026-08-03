import { useState, useEffect } from 'react';
import type { VacationBudget } from '../../utils/types';
import { createBudgetId, saveBudget, getAllBudgets, deleteBudget } from '../../services/budgetStorage';
import { calculateCost, formatCurrency, getSuggestedMultiplier, compareBudgets } from '../../utils/vacationCost';
import './BudgetCalculator.css';

interface BudgetCalculatorProps {
  planId?: string;
  startDate: string;
  endDate: string;
  periodLabel: string;
}

export const BudgetCalculator = ({ planId, startDate, endDate, periodLabel }: BudgetCalculatorProps) => {
  const [budgets, setBudgets] = useState<VacationBudget[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<VacationBudget, 'id' | 'createdAt' | 'updatedAt'>>({
    planId,
    periodLabel,
    startDate,
    endDate,
    estimatedTravel: 0,
    estimatedLodging: 0,
    estimatedFood: 0,
    estimatedOther: 0,
    currency: 'USD',
    peakSeasonMultiplier: getSuggestedMultiplier(startDate, endDate),
  });

  useEffect(() => {
    loadBudgets();
  }, [planId]);

  const loadBudgets = () => {
    const allBudgets = getAllBudgets();
    const filtered = planId 
      ? allBudgets.filter(b => b.planId === planId)
      : allBudgets;
    setBudgets(filtered);
  };

  const handleSave = () => {
    const budget: VacationBudget = {
      id: editingId || createBudgetId(),
      ...formData,
      createdAt: editingId ? budgets.find(b => b.id === editingId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveBudget(budget);
    loadBudgets();
    resetForm();
  };

  const handleEdit = (budget: VacationBudget) => {
    setFormData({
      planId: budget.planId,
      periodLabel: budget.periodLabel,
      startDate: budget.startDate,
      endDate: budget.endDate,
      estimatedTravel: budget.estimatedTravel,
      estimatedLodging: budget.estimatedLodging,
      estimatedFood: budget.estimatedFood,
      estimatedOther: budget.estimatedOther,
      currency: budget.currency,
      peakSeasonMultiplier: budget.peakSeasonMultiplier,
    });
    setEditingId(budget.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this budget?')) {
      deleteBudget(id);
      loadBudgets();
    }
  };

  const resetForm = () => {
    setFormData({
      planId,
      periodLabel,
      startDate,
      endDate,
      estimatedTravel: 0,
      estimatedLodging: 0,
      estimatedFood: 0,
      estimatedOther: 0,
      currency: 'USD',
      peakSeasonMultiplier: getSuggestedMultiplier(startDate, endDate),
    });
    setEditingId(null);
    setShowForm(false);
  };

  const comparison = budgets.length > 1 ? compareBudgets(budgets) : [];

  return (
    <div className="budget-calculator">
      <div className="budget-header">
        <h3>Vacation Budget</h3>
        <p className="budget-subtitle">Estimate costs for your trip</p>
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="budget-add-button"
        >
          + Add Budget
        </button>
      ) : (
        <div className="budget-form">
          <div className="budget-form-header">
            <h4>{editingId ? 'Edit Budget' : 'New Budget'}</h4>
            <button onClick={resetForm} className="budget-close-button" aria-label="Close">×</button>
          </div>

          <div className="budget-form-grid">
            <label>
              <span>Period Label</span>
              <input
                type="text"
                value={formData.periodLabel}
                onChange={(e) => setFormData({ ...formData, periodLabel: e.target.value })}
                placeholder="Summer vacation"
              />
            </label>

            <label>
              <span>Start Date</span>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </label>

            <label>
              <span>End Date</span>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </label>

            <label>
              <span>Currency</span>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
              </select>
            </label>

            <label>
              <span>Travel</span>
              <input
                type="number"
                min="0"
                step="10"
                value={formData.estimatedTravel}
                onChange={(e) => setFormData({ ...formData, estimatedTravel: Number(e.target.value) })}
              />
            </label>

            <label>
              <span>Lodging</span>
              <input
                type="number"
                min="0"
                step="10"
                value={formData.estimatedLodging}
                onChange={(e) => setFormData({ ...formData, estimatedLodging: Number(e.target.value) })}
              />
            </label>

            <label>
              <span>Food</span>
              <input
                type="number"
                min="0"
                step="10"
                value={formData.estimatedFood}
                onChange={(e) => setFormData({ ...formData, estimatedFood: Number(e.target.value) })}
              />
            </label>

            <label>
              <span>Other</span>
              <input
                type="number"
                min="0"
                step="10"
                value={formData.estimatedOther}
                onChange={(e) => setFormData({ ...formData, estimatedOther: Number(e.target.value) })}
              />
            </label>

            <label className="budget-multiplier-label">
              <span>Peak Season Multiplier</span>
              <div className="multiplier-input-group">
                <input
                  type="number"
                  min="1"
                  max="2"
                  step="0.1"
                  value={formData.peakSeasonMultiplier || 1}
                  onChange={(e) => setFormData({ ...formData, peakSeasonMultiplier: Number(e.target.value) })}
                />
                <small className="multiplier-hint">
                  {(formData.peakSeasonMultiplier || 1) > 1.1 ? 'Peak season pricing' : 'Off-peak pricing'}
                </small>
              </div>
            </label>
          </div>

          <div className="budget-form-actions">
            <button onClick={handleSave} className="budget-save-button">
              {editingId ? 'Update' : 'Save'} Budget
            </button>
            <button onClick={resetForm} className="budget-cancel-button">
              Cancel
            </button>
          </div>
        </div>
      )}

      {budgets.length > 0 && (
        <div className="budget-list">
          {budgets.map(budget => {
            const cost = calculateCost(budget);
            return (
              <div key={budget.id} className="budget-card">
                <div className="budget-card-header">
                  <h4>{budget.periodLabel}</h4>
                  <div className="budget-card-actions">
                    <button onClick={() => handleEdit(budget)} className="budget-edit-button" aria-label="Edit">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(budget.id)} className="budget-delete-button" aria-label="Delete">
                      Delete
                    </button>
                  </div>
                </div>

                <div className="budget-card-dates">
                  {budget.startDate} to {budget.endDate} ({cost.durationDays} days)
                </div>

                <div className="budget-breakdown">
                  <div className="budget-line">
                    <span>Travel</span>
                    <span>{formatCurrency(cost.travel, budget.currency)}</span>
                  </div>
                  <div className="budget-line">
                    <span>Lodging</span>
                    <span>{formatCurrency(cost.lodging, budget.currency)}</span>
                  </div>
                  <div className="budget-line">
                    <span>Food</span>
                    <span>{formatCurrency(cost.food, budget.currency)}</span>
                  </div>
                  <div className="budget-line">
                    <span>Other</span>
                    <span>{formatCurrency(cost.other, budget.currency)}</span>
                  </div>
                  <div className="budget-line budget-total">
                    <span>Total</span>
                    <span>{formatCurrency(cost.total, budget.currency)}</span>
                  </div>
                  <div className="budget-line budget-per-day">
                    <span>Per day</span>
                    <span>{formatCurrency(cost.perDay, budget.currency)}</span>
                  </div>
                </div>

                {budget.peakSeasonMultiplier && budget.peakSeasonMultiplier > 1 && (
                  <div className="budget-peak-badge">
                    Peak season ({budget.peakSeasonMultiplier}x)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {comparison.length > 1 && (
        <div className="budget-comparison">
          <h4>Budget Comparison</h4>
          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Duration</th>
                  <th>Total</th>
                  <th>Per Day</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map(({ budget, cost }) => (
                  <tr key={budget.id}>
                    <td>{budget.periodLabel}</td>
                    <td>{cost.durationDays} days</td>
                    <td>{formatCurrency(cost.total, budget.currency)}</td>
                    <td>{formatCurrency(cost.perDay, budget.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
