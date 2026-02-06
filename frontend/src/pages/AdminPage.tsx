import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Shield, FileText, Image as ImageIcon, Building2, AlertCircle } from 'lucide-react';
import { getPendingItems, approveItem, rejectItem, approveImageRequest, rejectImageRequest, API_URL } from '../utils/api';

export function AdminPage({ t }: { t: any }) {
  const [activeTab, setActiveTab] = useState<'notes' | 'universities' | 'images'>('notes');
  const queryClient = useQueryClient();

  // Pobieranie danych
  const { data, isLoading } = useQuery({
    queryKey: ['pending'],
    queryFn: getPendingItems
  });

  // Mutacje (Akcje)
  const approveMutation = useMutation({
    mutationFn: ({ type, id }: { type: string, id: number }) => approveItem(type, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending'] })
  });

  const rejectMutation = useMutation({
    mutationFn: ({ type, id }: { type: string, id: number }) => rejectItem(type, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending'] })
  });

  const imageActionMutation = useMutation({
    mutationFn: ({ action, id }: { action: 'approve' | 'reject', id: number }) =>
      action === 'approve' ? approveImageRequest(id) : rejectImageRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending'] })
  });

  if (isLoading) return <div className="flex justify-center pt-40"><span className="loading-spinner"></span></div>;

  const pendingNotes = data?.notes || [];
  const pendingUnis = data?.universities || [];
  const pendingImages = data?.image_requests || [];

  return (
    <div className="container-spatial pt-32 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="p-4 bg-gradient-to-br from-[#5e5ce6] to-[#bf5af2] rounded-2xl shadow-lg shadow-[#5e5ce6]/30">
          <Shield className="text-white" size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white">Admin Dashboard</h1>
          <p className="text-white/60">Zarządzaj treściami oczekującymi na moderację.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        <TabButton
          active={activeTab === 'notes'}
          onClick={() => setActiveTab('notes')}
          icon={<FileText size={18}/>}
          label={`Notatki (${pendingNotes.length})`}
        />
        <TabButton
          active={activeTab === 'universities'}
          onClick={() => setActiveTab('universities')}
          icon={<Building2 size={18}/>}
          label={`Uczelnie (${pendingUnis.length})`}
        />
        <TabButton
          active={activeTab === 'images'}
          onClick={() => setActiveTab('images')}
          icon={<ImageIcon size={18}/>}
          label={`Zmiany Obrazów (${pendingImages.length})`}
        />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6">

        {/* --- NOTES TAB --- */}
        {activeTab === 'notes' && (
          pendingNotes.length === 0 ? <EmptyState msg="Brak oczekujących notatek." /> :
          pendingNotes.map((note: any) => (
            <div key={note.id} className="glass-panel p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between group hover:border-[#5e5ce6]/50 transition-colors">
              <div className="flex gap-4 items-center">
                <div className="p-3 bg-white/5 rounded-xl text-[#32ade6]">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{note.title}</h3>
                  <p className="text-white/60 text-sm">{note.subject?.name} • {note.university?.name}</p>
                  <a href={`${API_URL}/uploads/${note.file_url}`} target="_blank" rel="noreferrer" className="text-xs text-[#5e5ce6] hover:underline mt-1 block">
                    Podgląd pliku
                  </a>
                </div>
              </div>
              <ActionButtons
                onApprove={() => approveMutation.mutate({ type: 'note', id: note.id })}
                onReject={() => rejectMutation.mutate({ type: 'note', id: note.id })}
              />
            </div>
          ))
        )}

        {/* --- UNIVERSITIES TAB --- */}
        {activeTab === 'universities' && (
          pendingUnis.length === 0 ? <EmptyState msg="Brak oczekujących uczelni." /> :
          pendingUnis.map((uni: any) => (
            <div key={uni.id} className="glass-panel p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex gap-4 items-center">
                 <div className="p-3 bg-white/5 rounded-xl text-[#bf5af2]">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{uni.name}</h3>
                  <p className="text-white/60 text-sm">{uni.city}, {uni.region}</p>
                </div>
              </div>
              <ActionButtons
                onApprove={() => approveMutation.mutate({ type: 'university', id: uni.id })}
                onReject={() => rejectMutation.mutate({ type: 'university', id: uni.id })}
              />
            </div>
          ))
        )}

        {/* --- IMAGES TAB --- */}
        {activeTab === 'images' && (
          pendingImages.length === 0 ? <EmptyState msg="Brak próśb o zmianę zdjęcia." /> :
          pendingImages.map((req: any) => (
            <div key={req.id} className="glass-panel p-6">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="w-full md:w-1/3">
                  <p className="text-sm text-white/50 mb-2">Propozycja dla: <span className="text-white font-bold">{req.university?.name}</span></p>
                  <img src={`${API_URL}${req.image_url}`} alt="Proposal" className="rounded-xl w-full h-48 object-cover border border-white/10 shadow-lg" />
                </div>
                <div className="flex-1 flex flex-col items-center md:items-start gap-4">
                  <div className="flex gap-2">
                    <span className="badge badge-primary bg-[#5e5ce6]/20 text-[#5e5ce6] border-none">Nowe zdjęcie</span>
                    <span className="text-white/40 text-sm">od użytkownika ID: {req.user_id}</span>
                  </div>
                  <ActionButtons
                    onApprove={() => imageActionMutation.mutate({ action: 'approve', id: req.id })}
                    onReject={() => imageActionMutation.mutate({ action: 'reject', id: req.id })}
                    labels={['Zatwierdź zmianę', 'Odrzuć']}
                  />
                </div>
              </div>
            </div>
          ))
        )}

      </div>
    </div>
  );
}

// Komponenty pomocnicze
const TabButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap
      ${active 
        ? 'bg-gradient-to-r from-[#5e5ce6] to-[#32ade6] text-white shadow-lg shadow-[#5e5ce6]/20' 
        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
      }`}
  >
    {icon} {label}
  </button>
);

const ActionButtons = ({ onApprove, onReject, labels = ['Zatwierdź', 'Odrzuć'] }: any) => (
  <div className="flex gap-3">
    <button onClick={onReject} className="btn btn-ghost hover:bg-red-500/20 text-red-400 gap-2 rounded-xl">
      <X size={18}/> {labels[1]}
    </button>
    <button onClick={onApprove} className="btn bg-[#5e5ce6] hover:bg-[#4d4ac9] text-white border-none gap-2 rounded-xl shadow-lg shadow-[#5e5ce6]/20">
      <Check size={18}/> {labels[0]}
    </button>
  </div>
);

const EmptyState = ({ msg }: { msg: string }) => (
  <div className="text-center py-20 opacity-50 bg-white/5 rounded-3xl border border-dashed border-white/10">
    <AlertCircle size={48} className="mx-auto mb-4 opacity-50"/>
    <p className="text-xl">{msg}</p>
  </div>
);