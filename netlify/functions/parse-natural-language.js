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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Get API key from environment variable
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OpenAI API key not configured' }),
    };
  }

  try {
    const { text, holidays, year, preferences } = JSON.parse(event.body);

    const openai = new OpenAI({
      apiKey,
    });

    const holidaysList = holidays
      .map(h => `${h.date}: ${h.localName}`)
      .join('\n');

    const prompt = `You are a holiday planning assistant. Parse the following user request and extract relevant information.

User request: "${text}"
Year: ${year}
Available public holidays:
${holidaysList}

Extract:
- Start date (if mentioned, format as YYYY-MM-DD)
- End date (if mentioned, format as YYYY-MM-DD)
- Duration in days (if mentioned)
- Month number (1-12, if mentioned like "summer", "winter", "Christmas", etc.)
- Season (summer, winter, spring, fall, or specific like "around Christmas")
- Any constraints

Return ONLY valid JSON in this format:
{
  "startDate": "YYYY-MM-DD" or null,
  "endDate": "YYYY-MM-DD" or null,
  "duration": number or null,
  "month": number (1-12) or null,
  "season": string or null,
  "constraints": string[] or []
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that parses natural language requests into structured JSON. Always return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify(parsed),
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

