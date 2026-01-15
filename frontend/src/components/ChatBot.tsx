import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { API_URL, getAuthHeader } from '../utils/api';

interface Message {
  role: 'user' | 'bot';
  text: string;
  id: string;
}

export function ChatBot({ currentNoteContent }: { currentNoteContent?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: 'Cześć! Jestem Twoim asystentem AI. W czym mogę pomóc?',
      id: '1'
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: async (msg: string) => {
      const res = await axios.post(
        `${API_URL}/chat`,
        {
          message: msg,
          note_content: currentNoteContent || '',
          conversation_history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.text
          }))
        },
        { headers: getAuthHeader() }
      );
      return res.data;
    },
    onSuccess: (response) => {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: response.response || response.message,
        id: Date.now().toString()
      }]);
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.detail ||
                    err.response?.data?.error ||
                    err.message ||
                    'Błąd połączenia z AI. Sprawdź klucz API w ustawieniach.';

      setMessages(prev => [...prev, {
        role: 'bot',
        text: `❌ ${errMsg}`,
        id: Date.now().toString()
      }]);
    }
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || mutation.isPending) return;

    const userMessage: Message = {
      role: 'user',
      text: input,
      id: Date.now().toString()
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
        id: '1'
      }
    ]);
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
                className="btn btn-xs btn-ghost text-primary-content hover:text-white"
                title="Wyczyść czat"
              >
                Wyczyść
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-xs btn-circle btn-ghost text-primary-content hover:bg-primary-content/20"
                aria-label="Zamknij czat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 bg-base-200">
            <div className="space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'}`}
                >
                  <div className="chat-image avatar">
                    <div className={`w-8 rounded-full ${m.role === 'user' ? 'bg-primary' : 'bg-secondary'}`}>
                      <div className="w-full h-full flex items-center justify-center text-white">
                        {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                      </div>
                    </div>
                  </div>
                  <div className={`chat-bubble ${m.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'} whitespace-pre-wrap max-w-xs lg:max-w-sm`}>
                    {m.text}
                  </div>
                  <div className="chat-footer text-xs opacity-50 mt-1">
                    {m.role === 'user' ? 'Ty' : 'Colloq AI'}
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
                      <span>Pisanie...</span>
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
              <input
                ref={inputRef}
                className="input input-bordered join-item flex-1 input-sm"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Zadaj pytanie..."
                disabled={mutation.isPending}
                maxLength={500}
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
            <div className="text-xs text-gray-500 mt-2 flex justify-between">
              <span>Enter = wyślij • Shift+Enter = nowa linia</span>
              <span>{input.length}/500</span>
            </div>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-circle btn-primary btn-lg shadow-2xl hover:scale-110 transition-transform relative group"
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
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
            {isOpen ? 'Zamknij czat' : 'Otwórz czat AI'}
          </div>
        </div>
      </button>
    </div>
  );
}