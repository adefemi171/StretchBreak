import { useState } from 'react';
import { generateAISuggestions, isAIAvailable } from '../services/aiService';
export const useAI = () => {
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const generateSuggestions = async (holidays, year, preferences) => {
        if (!isAIAvailable() || holidays.length === 0) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const suggestions = await generateAISuggestions(holidays, year, preferences);
            setAiSuggestions(suggestions);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate AI suggestions');
            console.error('AI suggestions error:', err);
        }
        finally {
            setLoading(false);
        }
    };
    return {
        aiSuggestions,
        loading,
        error,
        generateSuggestions,
        isAIAvailable: isAIAvailable(),
    };
};
