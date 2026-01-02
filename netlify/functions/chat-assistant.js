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
    const { message, holidays, year, currentPlan, preferences, conversationHistory } = JSON.parse(event.body);

    const openai = new OpenAI({
      apiKey,
    });

    const holidaysList = holidays
      .slice(0, 10)
      .map(h => `${h.date}: ${h.localName}`)
      .join('\n');

    const systemPrompt = `You are a helpful holiday planning assistant. Help users plan their vacations around public holidays.

Current year: ${year}
Public holidays (sample): ${holidaysList}
${currentPlan ? `Current plan: ${currentPlan.vacationDays.length} vacation days selected` : ''}
${preferences ? `User preferences: prefers ${preferences.preferredMonths.length > 0 ? 'months ' + preferences.preferredMonths.join(', ') : 'various months'}` : ''}

Provide helpful, concise responses. Suggest optimal vacation periods, explain efficiency, and help users maximize their time off.`;

    const messages = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    if (conversationHistory) {
      conversationHistory.slice(-6).forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    messages.push({ role: 'user', content: message });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, I could not generate a response.';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ response }),
    };
  } catch (error) {
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

