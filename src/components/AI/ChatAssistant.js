import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { chatWithAssistant } from '../../services/aiService';
import './ChatAssistant.css';
export const ChatAssistant = ({ holidays, year, currentPlan, preferences, }) => {
    const [messages, setMessages] = useState([
        {
            id: '1',
            role: 'assistant',
            content: 'Hello! I can help you plan your holidays. Ask me anything about vacation planning, optimal dates, or efficiency strategies.',
            timestamp: new Date().toISOString(),
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading)
            return;
        const userMessage = {
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
                currentPlan,
                preferences,
                conversationHistory: messages,
            });
            const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
        }
        catch (error) {
            const errorMessage = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "chat-assistant", children: [_jsxs("div", { className: "chat-messages", children: [messages.map((msg, idx) => (_jsx("div", { className: `chat-message ${msg.role}`, children: _jsx("div", { className: "message-content", children: msg.content }) }, idx))), loading && (_jsx("div", { className: "chat-message assistant", children: _jsx("div", { className: "message-content", children: "Thinking..." }) })), _jsx("div", { ref: messagesEndRef })] }), _jsxs("form", { onSubmit: handleSubmit, className: "chat-input-form", children: [_jsx("input", { type: "text", value: input, onChange: (e) => setInput(e.target.value), placeholder: "Ask me about vacation planning...", disabled: loading, className: "chat-input" }), _jsx("button", { type: "submit", disabled: loading || !input.trim(), className: "chat-send", children: "Send" })] })] }));
};
