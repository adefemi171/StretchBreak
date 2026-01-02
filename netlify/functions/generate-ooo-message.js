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
    const { plan, startDate, endDate, options } = JSON.parse(event.body);

    const openai = new OpenAI({
      apiKey,
    });

    const { includeDates = true, includeBackDate = true, tone = 'professional' } = options || {};

    const vacationDays = plan.vacationDays || [];
    const totalDays = vacationDays.length;

    const backDate = new Date(endDate);
    backDate.setDate(backDate.getDate() + 1);
    const backDateStr = backDate.toISOString().split('T')[0];

    const dateRange = includeDates
      ? `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : 'this period';

    const toneDescription = {
      professional: 'professional and formal',
      casual: 'friendly and casual',
      brief: 'concise and brief',
    }[tone] || 'professional';

    const requirements = [];
    if (tone === 'brief') {
      requirements.push('- Keep it very short and concise (1-2 sentences max)');
    } else if (tone === 'professional') {
      requirements.push('- Use formal business language');
      requirements.push('- Mention limited email access');
      requirements.push('- Include professional closing');
    } else if (tone === 'casual') {
      requirements.push('- Use friendly, conversational language');
      requirements.push('- Keep it warm and approachable');
    }
    requirements.push('- Include a placeholder for alternative contact (use [alternative contact])');
    if (includeBackDate) {
      requirements.push('- Mention when you will be back');
    }
    requirements.push('- Do NOT include email signatures or subject lines');
    requirements.push('- Return ONLY the message body text');

    const prompt = `Generate an out-of-office email message with the following requirements:

- Tone: ${toneDescription}
- Date range: ${dateRange}
${includeBackDate ? `- Return date: ${new Date(backDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
- Plan name: ${plan.name || 'Vacation'}
${plan.description ? `- Description: ${plan.description}` : ''}

Requirements:
${requirements.join('\n')}

Generate the message:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates professional out-of-office email messages. Return only the message body text, no subject lines or signatures.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const message = completion.choices[0]?.message?.content?.trim() || '';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ message }),
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

