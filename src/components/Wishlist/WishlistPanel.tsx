import { useState, useEffect } from 'react';
import { getAllWishlistItems, saveWishlistItem, deleteWishlistItem, reorderWishlist, createWishlistItemId } from '../../services/wishlistStorage';
import type { WishlistItem, PlanSuggestion, PublicHoliday } from '../../utils/types';
import './WishlistPanel.css';

interface WishlistPanelProps {
  suggestions?: PlanSuggestion[];
  onApplySuggestion?: (suggestion: PlanSuggestion) => void;
}

export const WishlistPanel = ({ suggestions = [], onApplySuggestion }: WishlistPanelProps) => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    priority: 1,
    startDate: '',
    endDate: '',
    preferredMonths: [] as number[],
    notes: '',
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = () => {
    const loaded = getAllWishlistItems();
    setItems(loaded.sort((a, b) => a.priority - b.priority));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      priority: 1,
      startDate: '',
      endDate: '',
      preferredMonths: [],
      notes: '',
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!formData.name.trim()) return;

    const item: WishlistItem = {
      id: createWishlistItemId(),
      name: formData.name.trim(),
      priority: formData.priority,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      preferredMonths: formData.preferredMonths.length > 0 ? formData.preferredMonths : undefined,
      notes: formData.notes.trim() || undefined,
    };

    saveWishlistItem(item);
    loadItems();
    resetForm();
  };

  const handleEdit = (item: WishlistItem) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      priority: item.priority,
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      preferredMonths: item.preferredMonths || [],
      notes: item.notes || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingId || !formData.name.trim()) return;

    const item: WishlistItem = {
      id: editingId,
      name: formData.name.trim(),
      priority: formData.priority,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      preferredMonths: formData.preferredMonths.length > 0 ? formData.preferredMonths : undefined,
      notes: formData.notes.trim() || undefined,
    };

    saveWishlistItem(item);
    loadItems();
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this wishlist item?')) {
      deleteWishlistItem(id);
      loadItems();
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    // Reassign priorities
    newItems.forEach((item, i) => {
      item.priority = i + 1;
      saveWishlistItem(item);
    });
    reorderWishlist(newItems);
    loadItems();
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    // Reassign priorities
    newItems.forEach((item, i) => {
      item.priority = i + 1;
      saveWishlistItem(item);
    });
    reorderWishlist(newItems);
    loadItems();
  };

  const toggleMonth = (month: number) => {
    setFormData(prev => ({
      ...prev,
      preferredMonths: prev.preferredMonths.includes(month)
        ? prev.preferredMonths.filter(m => m !== month)
        : [...prev.preferredMonths, month].sort((a, b) => a - b),
    }));
  };

  const getMatchingSuggestions = (item: WishlistItem): PlanSuggestion[] => {
    if (suggestions.length === 0) return [];

    return suggestions.filter(suggestion => {
      // Check date range if specified
      if (item.startDate && item.endDate) {
        if (suggestion.startDate < item.startDate || suggestion.endDate > item.endDate) {
          return false;
        }
      }

      // Check preferred months
      if (item.preferredMonths && item.preferredMonths.length > 0) {
        const suggestionMonth = new Date(suggestion.startDate).getMonth() + 1;
        if (!item.preferredMonths.includes(suggestionMonth)) {
          return false;
        }
      }

      return true;
    });
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="wishlist-panel">
      <div className="wishlist-header">
        <div>
          <h3>Vacation Wishlist</h3>
          <p className="wishlist-subtitle">
            Keep track of dream destinations and preferred vacation times.
          </p>
        </div>
        <button
          type="button"
          className="wishlist-add-button"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Wishlist Item'}
        </button>
      </div>

      {(showAddForm || editingId) && (
        <div className="wishlist-form">
          <label>
            Vacation Name
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Paris trip, Beach vacation"
              autoFocus
            />
          </label>

          <div className="wishlist-form-row">
            <label>
              Start Date (optional)
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </label>
            <label>
              End Date (optional)
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </label>
          </div>

          <label>
            Preferred Months (optional)
            <div className="wishlist-months-grid">
              {monthNames.map((name, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`wishlist-month-button ${formData.preferredMonths.includes(idx + 1) ? 'active' : ''}`}
                  onClick={() => toggleMonth(idx + 1)}
                >
                  {name}
                </button>
              ))}
            </div>
          </label>

          <label>
            Notes (optional)
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any preferences or requirements..."
              rows={3}
            />
          </label>

          <div className="wishlist-form-actions">
            <button
              type="button"
              className="wishlist-save-button"
              onClick={editingId ? handleSaveEdit : handleAdd}
            >
              {editingId ? 'Save Changes' : 'Add to Wishlist'}
            </button>
            <button type="button" className="wishlist-cancel-button" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="wishlist-items">
        {items.length === 0 && !showAddForm && (
          <div className="wishlist-empty-state">
            <p>No wishlist items yet. Add your dream vacations to get started!</p>
          </div>
        )}

        {items.map((item, index) => {
          const matchingSuggestions = getMatchingSuggestions(item);

          return (
            <div key={item.id} className="wishlist-item">
              <div className="wishlist-item-header">
                <div className="wishlist-item-title">
                  <span className="wishlist-item-priority">#{item.priority}</span>
                  <h4>{item.name}</h4>
                </div>
                <div className="wishlist-item-actions">
                  <button
                    type="button"
                    className="wishlist-move-button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="wishlist-move-button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === items.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="wishlist-edit-button"
                    onClick={() => handleEdit(item)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="wishlist-delete-button"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="wishlist-item-details">
                {item.startDate && item.endDate && (
                  <div className="wishlist-item-dates">
                    <span className="wishlist-detail-label">Date Range:</span>
                    <span className="wishlist-detail-value">
                      {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {item.preferredMonths && item.preferredMonths.length > 0 && (
                  <div className="wishlist-item-months">
                    <span className="wishlist-detail-label">Preferred Months:</span>
                    <div className="wishlist-months-list">
                      {item.preferredMonths.map(m => (
                        <span key={m} className="wishlist-month-tag">
                          {monthNames[m - 1]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.notes && (
                  <div className="wishlist-item-notes">
                    <span className="wishlist-detail-label">Notes:</span>
                    <p>{item.notes}</p>
                  </div>
                )}

                {matchingSuggestions.length > 0 && onApplySuggestion && (
                  <div className="wishlist-suggestions">
                    <span className="wishlist-suggestions-label">
                      {matchingSuggestions.length} matching suggestion{matchingSuggestions.length !== 1 ? 's' : ''}:
                    </span>
                    <div className="wishlist-suggestions-list">
                      {matchingSuggestions.slice(0, 3).map((suggestion, idx) => (
                        <div key={idx} className="wishlist-suggestion-card">
                          <div className="wishlist-suggestion-info">
                            <span className="wishlist-suggestion-date">
                              {new Date(suggestion.startDate).toLocaleDateString()} - {new Date(suggestion.endDate).toLocaleDateString()}
                            </span>
                            <span className="wishlist-suggestion-days">
                              {suggestion.totalDaysOff} days off ({suggestion.vacationDaysUsed} PTO)
                            </span>
                          </div>
                          <button
                            type="button"
                            className="wishlist-apply-button"
                            onClick={() => onApplySuggestion(suggestion)}
                          >
                            Use
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
