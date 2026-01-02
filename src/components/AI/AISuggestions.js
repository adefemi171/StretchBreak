import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { generateAISuggestions } from '../../services/aiService';
import './AISuggestions.css';
export const AISuggestions = ({ holidays, year, preferences, onSuggestionSelect, }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        const loadSuggestions = async () => {
            if (holidays.length === 0)
                return;
            setLoading(true);
            setError(null);
            try {
                const aiSuggestions = await generateAISuggestions(holidays, year, preferences);
                setSuggestions(aiSuggestions);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load AI suggestions');
                console.error('AI suggestions error:', err);
            }
            finally {
                setLoading(false);
            }
        };
        loadSuggestions();
    }, [holidays, year, preferences]);
    if (loading) {
        return _jsx("div", { className: "ai-suggestions-loading", children: "\uD83E\uDD16 AI is generating suggestions..." });
    }
    if (error) {
        return _jsxs("div", { className: "ai-suggestions-error", children: ["\u26A0\uFE0F ", error] });
    }
    if (suggestions.length === 0) {
        return null;
    }
    return (_jsxs("div", { className: "ai-suggestions", children: [_jsx("h3", { children: "\uD83E\uDD16 AI Suggestions" }), _jsx("div", { className: "suggestions-list", children: suggestions.map((suggestion, idx) => (_jsxs("div", { className: "suggestion-card", onClick: () => onSuggestionSelect?.(suggestion), children: [_jsx("div", { className: "suggestion-header", children: _jsxs("span", { className: "suggestion-dates", children: [new Date(suggestion.startDate).toLocaleDateString(), " -", ' ', new Date(suggestion.endDate).toLocaleDateString()] }) }), _jsxs("div", { className: "suggestion-details", children: [_jsxs("span", { children: [suggestion.vacationDaysUsed, " vacation days"] }), _jsxs("span", { children: [suggestion.totalDaysOff, " total days off"] })] }), _jsx("p", { className: "suggestion-reason", children: suggestion.reason })] }, idx))) })] }));
};
