export const buildSuggestionPrompt = (holidays, year, preferences) => {
    const holidaysList = holidays
        .map(h => `${h.date}: ${h.localName}`)
        .join('\n');
    const preferencesText = preferences
        ? `User preferences:
- Preferred months: ${preferences.preferredMonths.join(', ')}
- Typical duration: ${preferences.typicalDuration} days
- Efficiency goal: ${preferences.efficiencyGoal.toFixed(2)}`
        : 'No user preferences available';
    return `Analyze public holidays for ${year} and suggest optimal vacation periods.

Public holidays:
${holidaysList}

${preferencesText}

Suggest vacation periods that maximize days off while minimizing vacation days used.`;
};
export const buildNaturalLanguagePrompt = (text, holidays, year) => {
    const holidaysList = holidays
        .map(h => `${h.date}: ${h.localName}`)
        .join('\n');
    return `Parse this holiday planning request: "${text}"

Year: ${year}
Available holidays:
${holidaysList}

Extract dates, duration, and preferences.`;
};
