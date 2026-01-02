import { formatDateDisplay, parseDateString } from '../utils/dateUtils';
import { getOpenAI } from './aiService';
export const generateOOOMessageAI = async (plan, startDate, endDate, options = {}) => {
    const { includeDates = true, includeBackDate = true, tone = 'professional' } = options;
    const openai = await getOpenAI();
    if (!openai) {
        return generateOOOMessageTemplate(plan, startDate, endDate, options);
    }
    const backDate = new Date(parseDateString(endDate));
    backDate.setDate(backDate.getDate() + 1);
    const dateRange = includeDates
        ? `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
        : 'this period';
    const backDateStr = includeBackDate ? formatDateDisplay(backDate.toISOString().split('T')[0]) : '';
    const toneDescription = {
        professional: 'professional and formal',
        casual: 'friendly and casual',
        brief: 'concise and brief',
    }[tone];
    const requirements = [];
    if (tone === 'brief') {
        requirements.push('- Keep it very short and concise (1-2 sentences max)');
    }
    else if (tone === 'professional') {
        requirements.push('- Use formal business language');
        requirements.push('- Mention limited email access');
        requirements.push('- Include professional closing');
    }
    else if (tone === 'casual') {
        requirements.push('- Use friendly, conversational language');
        requirements.push('- Keep it warm and approachable');
    }
    requirements.push('- Include a placeholder for alternative contact (use [alternative contact])');
    if (includeBackDate) {
        requirements.push('- Mention when you will be back');
    }
    requirements.push('- Do NOT include email signatures or subject lines');
    requirements.push('- Return ONLY the message body text');
    const promptParts = [
        'Generate an out-of-office email message with the following requirements:',
        '',
        `- Tone: ${toneDescription}`,
        `- Date range: ${dateRange}`,
    ];
    if (includeBackDate) {
        promptParts.push(`- Return date: ${backDateStr}`);
    }
    promptParts.push(`- Plan name: ${plan.name}`);
    if (plan.description) {
        promptParts.push(`- Description: ${plan.description}`);
    }
    promptParts.push('');
    promptParts.push('Requirements:');
    promptParts.push(...requirements);
    promptParts.push('');
    promptParts.push('Generate the message:');
    const prompt = promptParts.join('\n');
    try {
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
        const message = completion.choices[0]?.message?.content?.trim();
        if (message) {
            return message;
        }
        return generateOOOMessageTemplate(plan, startDate, endDate, options);
    }
    catch (error) {
        console.error('Error generating OOO message with AI:', error);
        return generateOOOMessageTemplate(plan, startDate, endDate, options);
    }
};
const generateOOOMessageTemplate = (_plan, startDate, endDate, options = {}) => {
    const { includeDates = true, includeBackDate = true, tone = 'professional' } = options;
    const backDate = new Date(parseDateString(endDate));
    backDate.setDate(backDate.getDate() + 1);
    const dateRange = includeDates
        ? `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
        : 'this period';
    const backDateStr = includeBackDate ? formatDateDisplay(backDate.toISOString().split('T')[0]) : '';
    let message = '';
    switch (tone) {
        case 'professional':
            message = `I will be out of the office ${dateRange} and will have limited access to email.`;
            if (includeBackDate) {
                message += ` I will respond to your message when I return on ${backDateStr}.`;
            }
            message += `\n\nFor urgent matters, please contact [alternative contact].`;
            break;
        case 'casual':
            message = `I'm taking some time off ${dateRange} and will be away from my email.`;
            if (includeBackDate) {
                message += ` I'll be back on ${backDateStr} and will catch up on messages then.`;
            }
            message += `\n\nIf it's urgent, feel free to reach out to [alternative contact].`;
            break;
        case 'brief':
            message = `Out of office ${dateRange}.`;
            if (includeBackDate) {
                message += ` Back ${backDateStr}.`;
            }
            message += ` For urgent matters, contact [alternative contact].`;
            break;
    }
    return message;
};
export const generatePlanOOOMessage = async (plan, options) => {
    if (plan.vacationDays.length === 0) {
        return 'No vacation days selected.';
    }
    const sortedDates = [...plan.vacationDays].sort();
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];
    return generateOOOMessageAI(plan, startDate, endDate, options);
};
