import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { API_URL, getAuthHeader } from '../utils/api';

export function ChatBot({ currentNoteContent }: { currentNoteContent?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([
    { role: 'bot', text: 'Cześć! Jestem Twoim asystentem AI. W czym mogę pomóc?' }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  const mutation = useMutation({
    mutationFn: async (msg: string) => {
      const res = await axios.post(
        `${API_URL}/chat`,
        { message: msg, note_content: currentNoteContent || "" },
        { headers: getAuthHeader() }
      );
      return res.data.response;
    },
    onSuccess: (response) => {
      setMessages(prev => [...prev, { role: 'bot', text: response }]);
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.detail || 'Błąd połączenia z AI. Sprawdź klucz API w .env';
      setMessages(prev => [...prev, { role: 'bot', text: errMsg }]);
    }
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || mutation.isPending) return;
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    mutation.mutate(input);
    setInput('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="card w-80 h-96 bg-base-100 shadow-2xl border border-base-300 mb-4 flex flex-col overflow-hidden">
          <div className="bg-primary p-3 flex justify-between items-center text-primary-content">
            <div className="flex items-center gap-2 font-bold"><Bot size={20} /> Asystent Colloq</div>
            <button onClick={() => setIsOpen(false)} className="btn btn-xs btn-circle btn-ghost"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-200" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'}`}>
                <div className="chat-bubble text-sm">{m.text}</div>
              </div>
            ))}
            {mutation.isPending && <div className="chat chat-start"><div className="chat-bubble opacity-50">Piszę...</div></div>}
          </div>
          <form onSubmit={handleSend} className="p-2 bg-base-100 flex gap-2 border-t border-base-300">
            <input className="input input-sm input-bordered flex-1" value={input} onChange={e => setInput(e.target.value)} placeholder="Zadaj pytanie..." />
            <button className="btn btn-sm btn-primary"><Send size={16} /></button>
          </form>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} className="btn btn-circle btn-primary btn-lg shadow-xl">
        <MessageCircle size={32} />
      </button>
    </div>
  );
}