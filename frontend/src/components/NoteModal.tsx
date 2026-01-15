import { useState } from 'react';
import axios from 'axios';
import { X, MessageCircle, FileText, Zap, Video, Link as LinkIcon, Download } from 'lucide-react';
import { API_URL, getAuthHeader } from '../utils/api';
import { ChatBot } from './ChatBot';

export function NoteModal({ note, onClose }: { note: any, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'content' | 'summary' | 'flashcards'>('content');
  const [summary, setSummary] = useState<string>('');
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const fetchSummary = async () => {
    if (summary) return setActiveTab('summary');
    setLoadingAI(true);
    try {
      const res = await axios.post(`${API_URL}/ai/summary`, { note_content: note.content }, { headers: getAuthHeader() });
      setSummary(res.data.summary);
      setActiveTab('summary');
    } catch (e) { alert("Błąd AI"); }
    finally { setLoadingAI(false); }
  };

  const fetchFlashcards = async () => {
    if (flashcards.length) return setActiveTab('flashcards');
    setLoadingAI(true);
    try {
      const res = await axios.post(`${API_URL}/ai/flashcards`, { note_content: note.content }, { headers: getAuthHeader() });
      setFlashcards(res.data);
      setActiveTab('flashcards');
    } catch (e) { alert("Błąd AI"); }
    finally { setLoadingAI(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-base-100 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden">

        {/* Left Side: Content */}
        <div className="flex-1 flex flex-col border-r border-base-300 relative">
          <div className="p-4 border-b flex justify-between items-center bg-base-200/50">
            <h2 className="font-bold text-xl">{note.title}</h2>
            <div className="flex gap-2">
               {note.video_url && <a href={note.video_url} target="_blank" className="btn btn-xs btn-error btn-outline"><Video size={14}/> Video</a>}
               {note.link_url && <a href={note.link_url} target="_blank" className="btn btn-xs btn-info btn-outline"><LinkIcon size={14}/> Link</a>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 relative">
            {activeTab === 'content' && (
              <div className="prose max-w-none">
                 <p className="whitespace-pre-wrap">{note.content}</p>
                 {note.image_url && <img src={`${API_URL}${note.image_url}`} className="rounded-lg shadow-lg max-h-96 object-contain" />}
              </div>
            )}

            {activeTab === 'summary' && (
              <div className="animate-in fade-in">
                <h3 className="font-bold text-lg mb-4 flex gap-2"><FileText className="text-primary"/> Podsumowanie AI</h3>
                <div className="prose max-w-none">{summary}</div>
              </div>
            )}

            {activeTab === 'flashcards' && (
              <div className="animate-in fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
                 {flashcards.map((f, i) => (
                   <div key={i} className="card bg-base-200 border border-base-300 group perspective">
                     <div className="card-body p-4 text-center min-h-[150px] flex flex-col justify-center cursor-pointer hover:bg-base-300 transition-colors" onClick={(e) => e.currentTarget.classList.toggle('bg-primary/10')}>
                        <p className="font-bold text-lg">{f.question}</p>
                        <div className="divider my-1 opacity-20"></div>
                        <p className="text-sm opacity-0 group-hover:opacity-100 transition-opacity text-primary font-bold">{f.answer}</p>
                     </div>
                   </div>
                 ))}
              </div>
            )}

            {loadingAI && <div className="absolute inset-0 bg-base-100/80 flex items-center justify-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>}
          </div>

          <div className="p-4 border-t bg-base-100 flex justify-between">
            <div className="join">
               <button className={`join-item btn btn-sm ${activeTab === 'content' ? 'btn-neutral' : ''}`} onClick={() => setActiveTab('content')}>Treść</button>
               <button className={`join-item btn btn-sm ${activeTab === 'summary' ? 'btn-neutral' : ''}`} onClick={fetchSummary}><FileText size={16}/> Podsumuj</button>
               <button className={`join-item btn btn-sm ${activeTab === 'flashcards' ? 'btn-neutral' : ''}`} onClick={fetchFlashcards}><Zap size={16}/> Fiszki</button>
            </div>
          </div>

          {/* Embedded Chat */}
          <ChatBot currentNoteContent={note.content} />
        </div>

        {/* Close Button Overlay */}
        <button onClick={onClose} className="absolute top-4 right-4 btn btn-circle btn-sm btn-ghost bg-base-100 shadow-md z-50"><X size={20}/></button>
      </div>
    </div>
  );
}