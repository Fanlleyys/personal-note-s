import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import { sendMessage } from '../../services/gemini';
import type { AIResponse } from '../../services/gemini';
import { addEvent, addPassword, getPasswordsBySearch } from '../../services/firebase';
import { encrypt, decrypt } from '../../services/encryption';
import './AIAssistant.css';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const AIAssistant = () => {
    const { user, encryptionKey } = useAuth();
    const { showToast } = useToast();
    const { events, passwords } = useData();

    // Load messages from localStorage on mount
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        if (!user) return [];
        const saved = localStorage.getItem(`ai_chat_${user.uid}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Convert timestamp strings back to Date objects
                return parsed.map((m: ChatMessage) => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                }));
            } catch {
                return [];
            }
        }
        return [];
    });
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Save messages to localStorage when they change
    useEffect(() => {
        if (user && messages.length > 0) {
            localStorage.setItem(`ai_chat_${user.uid}`, JSON.stringify(messages));
        }
    }, [messages, user]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Add welcome message only if no saved messages
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: `Halo! 👋 Saya adalah asisten AI personal kamu. Saya bisa membantu:

📅 **Mengelola Kalender** - Cukup bilang "Tanggal 15 ada meeting" dan saya akan simpan

🔐 **Mengelola Password** - Tanya "Password email alfan@gmail.com" atau "Simpan password Instagram"

💬 **Chat Biasa** - Tanya apapun!

Apa yang bisa saya bantu hari ini?`,
                timestamp: new Date()
            }]);
        }
    }, [messages.length]);

    // Process AI response actions
    const processAIResponse = useCallback(async (response: AIResponse) => {
        if (!user) return;

        switch (response.type) {
            case 'calendar_add':
                if (response.data?.title && response.data?.date) {
                    try {
                        await addEvent({
                            title: response.data.title,
                            date: response.data.date,
                            description: response.data.description,
                            reminder: response.data.reminder ?? true,
                            userId: user.uid
                        });
                        showToast('success', 'Event ditambahkan!', `${response.data.title}`);
                    } catch (error) {
                        showToast('error', 'Gagal menambah event', 'Silakan coba lagi');
                    }
                }
                break;

            case 'password_add':
                if (response.data?.title && response.data?.password) {
                    try {
                        const encryptedPassword = await encrypt(response.data.password, encryptionKey);
                        await addPassword({
                            title: response.data.title,
                            username: response.data.username,
                            encryptedPassword,
                            userId: user.uid
                        });
                        showToast('success', 'Password disimpan!', response.data.title);
                    } catch (error) {
                        showToast('error', 'Gagal menyimpan password', 'Silakan coba lagi');
                    }
                }
                break;

            case 'password_query':
                if (response.data?.searchTerm) {
                    try {
                        const results = await getPasswordsBySearch(user.uid, response.data.searchTerm);
                        if (results.length > 0) {
                            const firstResult = results[0];
                            const decryptedPassword = await decrypt(firstResult.encryptedPassword, encryptionKey);

                            // Add follow-up message with password
                            const followUpMessage: ChatMessage = {
                                id: `msg-${Date.now()}`,
                                role: 'assistant',
                                content: `🔐 Password untuk **${firstResult.title}**${firstResult.username ? ` (${firstResult.username})` : ''}:\n\n\`${decryptedPassword}\`\n\n_Tip: Tap untuk copy password_`,
                                timestamp: new Date()
                            };
                            setMessages(prev => [...prev, followUpMessage]);
                        } else {
                            const notFoundMessage: ChatMessage = {
                                id: `msg-${Date.now()}`,
                                role: 'assistant',
                                content: `Maaf, saya tidak menemukan password dengan kata kunci "${response.data.searchTerm}". Pastikan password sudah tersimpan di Password Manager.`,
                                timestamp: new Date()
                            };
                            setMessages(prev => [...prev, notFoundMessage]);
                        }
                    } catch (error) {
                        showToast('error', 'Gagal mencari password', 'Silakan coba lagi');
                    }
                }
                break;
        }
    }, [user, encryptionKey, showToast]);

    // Send message
    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: inputValue.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await sendMessage(inputValue.trim(), {
                events: events.slice(0, 20),
                passwords: passwords.slice(0, 20)
            });

            const assistantMessage: ChatMessage = {
                id: `msg-${Date.now()}-response`,
                role: 'assistant',
                content: response.message,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Process any actions from AI response
            await processAIResponse(response);
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: `msg-${Date.now()}-error`,
                role: 'assistant',
                content: 'Maaf, terjadi kesalahan. Silakan coba lagi.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    // Handle enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Copy text on click (for passwords)
    const handleMessageClick = (content: string) => {
        const codeMatch = content.match(/`([^`]+)`/);
        if (codeMatch) {
            navigator.clipboard.writeText(codeMatch[1]);
            showToast('success', 'Disalin!', 'Text sudah ada di clipboard');
        }
    };

    // Format message content with markdown-like styling
    const formatMessage = (content: string) => {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br />');
    };

    return (
        <div className="ai-container">
            {/* Header */}
            <div className="ai-header glass-card">
                <div className="ai-avatar">
                    <Sparkles size={24} />
                </div>
                <div className="ai-info">
                    <h3>AI Assistant</h3>
                    <span className="ai-status">Powered by Gemini Flash</span>
                </div>
            </div>

            {/* Messages */}
            <div className="ai-messages">
                {messages.map(message => (
                    <div
                        key={message.id}
                        className={`message ${message.role}`}
                        onClick={() => message.role === 'assistant' && handleMessageClick(message.content)}
                    >
                        <div className="message-avatar">
                            {message.role === 'assistant' ? (
                                <Bot size={18} />
                            ) : (
                                <User size={18} />
                            )}
                        </div>
                        <div className="message-content">
                            <div
                                className="message-text"
                                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                            />
                            <span className="message-time">
                                {message.timestamp.toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="message assistant">
                        <div className="message-avatar">
                            <Bot size={18} />
                        </div>
                        <div className="message-content">
                            <div className="typing-indicator">
                                <Loader2 size={16} className="animate-spin" />
                                <span>Sedang berpikir...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="ai-input-container">
                <div className="ai-input-wrapper glass-card">
                    <input
                        ref={inputRef}
                        type="text"
                        className="ai-input"
                        placeholder="Ketik pesan..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                    />
                    <button
                        className="btn btn-primary btn-icon ai-send"
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading}
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIAssistant;
