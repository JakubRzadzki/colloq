import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { API_URL, getAuthHeader } from '../utils/api';

interface Message {
  role: 'user' | 'bot';
  text: string;
  id: string;
  timestamp: Date;
}

export function ChatBot({ currentNoteContent }: { currentNoteContent?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: 'Cześć! Jestem Twoim asystentem AI. W czym mogę pomóc?',
      id: '1',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Load chat history from localStorage
  useEffect(() => {
    const savedChat = localStorage.getItem('chat_history');
    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat);
        const messagesWithDates = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  const mutation = useMutation({
    mutationFn: async (msg: string) => {
      const response = await axios.post(
        `${API_URL}/chat`,
        {
          message: msg,
          note_content: currentNoteContent || '',
          conversation_history: messages.slice(-5).map(m => ({
            role: m.role,
            content: m.text
          }))
        },
        {
          headers: getAuthHeader(),
          timeout: 30000 // 30 seconds timeout
        }
      );
      return response.data;
    },
    onSuccess: (response) => {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: response.response || response.message || response.data,
        id: Date.now().toString(),
        timestamp: new Date()
      }]);
    },
    onError: (err: any) => {
      let errorMessage = 'Błąd połączenia z AI. Spróbuj ponownie.';

      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          errorMessage = 'Nie jesteś zalogowany. Zaloguj się aby używać AI.';
        } else if (err.response?.status === 403) {
          errorMessage = 'Brak dostępu. Sprawdź swoje uprawnienia.';
        } else if (err.response?.status === 429) {
          errorMessage = 'Zbyt wiele żądań. Poczekaj chwilę.';
        } else if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.code === 'ECONNABORTED') {
          errorMessage = 'Przekroczono czas oczekiwania. Spróbuj ponownie.';
        }
      }

      setMessages(prev => [...prev, {
        role: 'bot',
        text: `❌ ${errorMessage}`,
        id: Date.now().toString(),
        timestamp: new Date()
      }]);
    }
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || mutation.isPending) return;

    const userMessage: Message = {
      role: 'user',
      text: input,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    mutation.mutate(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'bot',
        text: 'Cześć! Jestem Twoim asystentem AI. W czym mogę pomóc?',
        id: '1',
        timestamp: new Date()
      }
    ]);
    localStorage.removeItem('chat_history');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {isOpen && (
        <div className="card w-96 h-[600px] bg-base-100 shadow-2xl border border-primary/20 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-secondary p-4 flex justify-between items-center text-primary-content">
            <div className="flex items-center gap-3">
              <div className="avatar placeholder">
                <div className="bg-primary-content text-primary rounded-full w-10 h-10 flex items-center justify-center">
                  <Bot size={20} />
                </div>
              </div>
              <div>
                <div className="font-bold">Colloq AI</div>
                <div className="text-xs opacity-90">Asystent studenta</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="btn btn-xs btn-ghost text-primary-content hover:text-white transition-colors"
                title="Wyczyść czat"
                disabled={messages.length <= 1}
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-xs btn-circle btn-ghost text-primary-content hover:bg-primary-content/20 transition-colors"
                aria-label="Zamknij czat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 bg-base-200">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}
                >
                  <div className="chat-image avatar">
                    <div className={`w-8 rounded-full ${msg.role === 'user' ? 'bg-primary' : 'bg-secondary'}`}>
                      <div className="w-full h-full flex items-center justify-center text-white">
                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'} whitespace-pre-wrap max-w-xs break-words`}>
                      {msg.text}
                    </div>
                    <div className="chat-footer text-xs opacity-50 mt-1">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              {mutation.isPending && (
                <div className="chat chat-start">
                  <div className="chat-image avatar">
                    <div className="w-8 rounded-full bg-secondary">
                      <div className="w-full h-full flex items-center justify-center text-white">
                        <Bot size={16} />
                      </div>
                    </div>
                  </div>
                  <div className="chat-bubble chat-bubble-secondary">
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">Pisanie odpowiedzi...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-base-100 border-t border-base-300">
            <div className="join w-full">
              <textarea
                ref={inputRef as any}
                className="textarea textarea-bordered join-item flex-1 textarea-sm resize-none min-h-[40px] max-h-24"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Zadaj pytanie..."
                disabled={mutation.isPending}
                rows={1}
              />
              <button
                type="submit"
                className="btn btn-primary join-item btn-sm"
                disabled={!input.trim() || mutation.isPending}
                aria-label="Wyślij wiadomość"
              >
                {mutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                Enter = wyślij • Shift+Enter = nowa linia
              </span>
              <span className={`text-xs ${input.length > 400 ? 'text-warning' : 'text-gray-500'}`}>
                {input.length}/500
              </span>
            </div>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-circle btn-primary btn-lg shadow-2xl hover:scale-110 transition-transform duration-200 relative group"
        aria-label={isOpen ? "Zamknij czat" : "Otwórz czat"}
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}

        {/* Notification badge */}
        {!isOpen && messages.length > 1 && (
          <span className="absolute -top-1 -right-1 badge badge-secondary badge-sm animate-pulse">
            {messages.length - 1}
          </span>
        )}

        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block animate-in fade-in duration-200">
          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
            {isOpen ? 'Zamknij czat' : 'Otwórz czat AI'}
          </div>
        </div>
      </button>
    </div>
  );
}