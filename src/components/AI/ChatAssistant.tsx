import { useState, useRef, useEffect } from 'react';
import { chatWithAssistant } from '../../services/aiService';
import type { AIPlanningContext } from '../../services/aiService';
import type { PublicHoliday, UserPreferences, ChatMessage } from '../../utils/types';
import './ChatAssistant.css';

interface ChatAssistantProps extends Partial<AIPlanningContext> {
  holidays: PublicHoliday[];
  year: number;
  countryCode?: string;
  currentPlan?: { vacationDays: string[] };
  preferences?: UserPreferences;
}

export const ChatAssistant = ({
  holidays,
  year,
  countryCode,
  currentPlan,
  preferences,
  selectedRegions,
  availablePTODays,
  workDays,
  companyHolidays,
  excludedHolidayDates,
  startDate,
  endDate,
}: ChatAssistantProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you plan upcoming holidays. Ask about remaining PTO, bridge days later this year, or efficiency strategies — I’ll only suggest dates from today onward.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const contextKey = JSON.stringify({ year, countryCode, selectedRegions, availablePTODays, workDays, companyHolidays, excludedHolidayDates, startDate, endDate });
  useEffect(() => {
    return () => { activeRequest.current?.abort(); };
  }, [contextKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || (loading && !activeRequest.current?.signal.aborted)) return;
    const controller = new AbortController();
    activeRequest.current?.abort();
    activeRequest.current = controller;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithAssistant(input, {
        holidays,
        year,
        countryCode,
        currentPlan,
        preferences,
        selectedRegions,
        availablePTODays,
        workDays,
        companyHolidays,
        excludedHolidayDates,
        startDate,
        endDate,
        conversationHistory: messages,
      }, controller.signal);
      if (controller.signal.aborted || activeRequest.current !== controller) return;

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      if (controller.signal.aborted || activeRequest.current !== controller) return;
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      if (activeRequest.current === controller) setLoading(false);
    }
  };

  return (
    <div className="chat-assistant">
      <div className="chat-messages" role="log" aria-live="polite" aria-label="AI planning conversation">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-message assistant">
            <div className="message-content">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          aria-label="Message the AI planning assistant"
          maxLength={2000}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me about vacation planning..."
          disabled={loading}
          className="chat-input"
        />
        <button type="submit" disabled={loading || !input.trim()} className="chat-send">
          Send
        </button>
      </form>
    </div>
  );
};
