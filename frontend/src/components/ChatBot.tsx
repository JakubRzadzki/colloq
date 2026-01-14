import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { API_URL, getAuthHeader } from '../utils/api'; // <--- Import from utils

interface ChatMsg {
  role: 'user' | 'bot';
  text: string;
}

interface ChatBotProps {
  currentNoteContent?: string;
}

export function ChatBot({ currentNoteContent }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'bot', text: 'Cześć! Jestem Twoim asystentem AI. Masz pytania do tej notatki?' }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const mutation = useMutation({
    mutationFn: async (msg: string) => {
      const res = await axios.post(
        `${API_URL}/chat`,
        { message: msg, note_content: currentNoteContent },
        { headers: getAuthHeader() }
      );
      return res.data.response;
    },
    onSuccess: (response) => {
      setMessages(prev => [...prev, { role: 'bot', text: response }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { role: 'bot', text: 'Błąd połączenia z AI.' }]);
    }
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    mutation.mutate(userMsg);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="card w-80 h-96 bg-base-100 shadow-2xl border border-base-300 mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="bg-primary p-3 flex justify-between items-center text-primary-content">
            <div className="flex items-center gap-2 font-bold"><Bot size={20} /> Asystent Colloq</div>
            <button onClick={() => setIsOpen(false)} className="btn btn-xs btn-circle btn-ghost text-white"><X size={16} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-200" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'}`}>
                <div className="chat-image avatar">
                  <div className="w-8 rounded-full bg-base-300 flex justify-center items-center">
                    {m.role === 'user' ? <User size={16} className="m-auto mt-2"/> : <Bot size={16} className="m-auto mt-2"/>}
                  </div>
                </div>
                <div className={`chat-bubble text-sm ${m.role === 'user' ? 'chat-bubble-primary' : 'bg-white text-gray-800'}`}>{m.text}</div>
              </div>
            ))}
            {mutation.isPending && <div className="chat chat-start"><div className="chat-bubble bg-white text-gray-500 text-xs">Piszę...</div></div>}
          </div>

          <form onSubmit={handleSend} className="p-2 bg-base-100 border-t border-base-300 flex gap-2">
            <input className="input input-sm input-bordered flex-1" placeholder="Zapytaj..." value={input} onChange={e => setInput(e.target.value)} disabled={mutation.isPending}/>
            <button type="submit" className="btn btn-sm btn-primary btn-square" disabled={mutation.isPending}><Send size={16} /></button>
          </form>
        </div>
      )}

      {/* TOGGLE BUTTON */}
      <button onClick={() => setIsOpen(!isOpen)} className="btn btn-circle btn-primary btn-lg shadow-xl hover:scale-110 transition-transform">
        {isOpen ? <X size={32} /> : <MessageCircle size={32} />}
      </button>
    </div>
  );
}