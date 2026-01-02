import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { parseNaturalLanguage } from '../../services/aiService';
import './NaturalLanguageInput.css';
export const NaturalLanguageInput = ({ holidays, year, preferences, onParseSuccess, onError, }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim())
            return;
        setLoading(true);
        try {
            const parsed = await parseNaturalLanguage({
                text: input,
                holidays,
                year,
                preferences,
            });
            onParseSuccess(parsed);
            setInput('');
        }
        catch (error) {
            onError(error instanceof Error ? error.message : 'Failed to parse request');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "natural-language-input", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsx("label", { htmlFor: "nl-input", children: "Describe your vacation plans in natural language:" }), _jsxs("div", { className: "input-group", children: [_jsx("input", { id: "nl-input", type: "text", value: input, onChange: (e) => setInput(e.target.value), placeholder: "e.g., 'I want a week off in summer' or 'Plan around Christmas'", disabled: loading, className: "nl-input" }), _jsx("button", { type: "submit", disabled: loading || !input.trim(), className: "nl-submit", children: loading ? 'Processing...' : 'Parse' })] })] }) }));
};
