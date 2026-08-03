import { useState, useRef, useEffect, useMemo } from 'react';
import { isPast, parseISO, startOfDay, isSameDay } from 'date-fns';
import { chatWithAssistant } from '../../services/aiService';
import type { PublicHoliday, UserPreferences, ChatMessage } from '../../utils/types';
import './ChatAssistant.css';

interface ChatAssistantProps {
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
}: ChatAssistantProps) => {
  const upcomingHolidays = useMemo(() => {
    const today = startOfDay(new Date());
    return holidays
      .filter((holiday) => {
        const holidayDate = startOfDay(parseISO(holiday.date));
        return !isPast(holidayDate) || isSameDay(holidayDate, today);
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays]);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

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
        holidays: upcomingHolidays,
        year,
        countryCode,
        currentPlan,
        preferences,
        conversationHistory: messages,
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-assistant">
      <div className="chat-messages">
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

