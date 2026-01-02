import { OpenAI } from 'openai';

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OpenAI API key not configured' }),
    };
  }

  try {
    const { holidays, year, preferences } = JSON.parse(event.body);

    const openai = new OpenAI({
      apiKey,
    });

    const holidaysList = holidays
      .map(h => `${h.date}: ${h.localName} (${new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' })})`)
      .join('\n');

    const preferencesText = preferences
      ? `User preferences:
- Preferred months: ${preferences.preferredMonths.join(', ')}
- Typical duration: ${preferences.typicalDuration} days
- Efficiency goal: ${preferences.efficiencyGoal.toFixed(2)}`
      : 'No user preferences available';

    const prompt = `You are an expert holiday planner. Analyze the public holidays and suggest optimal vacation periods.

Year: ${year}
Public holidays:
${holidaysList}

${preferencesText}

Suggest 3-5 optimal vacation periods that maximize days off while minimizing vacation days used. Consider:
- Bridge opportunities (e.g., take Mon-Wed before Thu-Fri holidays)
- User preferences if available
- Efficiency (total days off / vacation days used)

For each suggestion, provide:
- Start date (YYYY-MM-DD)
- End date (YYYY-MM-DD)
- Vacation days used (count)
- Total days off (including weekends and holidays)
- Efficiency ratio
- Brief reason

Return ONLY valid JSON array:
[
  {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "vacationDaysUsed": number,
    "totalDaysOff": number,
    "efficiency": number,
    "reason": "string",
    "publicHolidaysIncluded": [{"date": "YYYY-MM-DD", "localName": "string"}]
  }
]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful holiday planning assistant. Always return valid JSON arrays only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response');
    }

    const suggestions = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify(suggestions),
    };
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};

