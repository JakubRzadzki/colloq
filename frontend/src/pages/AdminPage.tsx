import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Shield, FileText, Image as ImageIcon, Building2, AlertCircle, Users, GraduationCap, BookOpen } from 'lucide-react';
import {
  getPendingItems, approveItem, rejectItem, approveImageRequest, rejectImageRequest,
  getAllUsers, getNotes, resolveUrl,
} from '../utils/api';
import { Link } from 'react-router-dom';

type AdminTab = 'users' | 'notes' | 'pending-notes' | 'pending-universities' | 'pending-faculties' | 'pending-fields' | 'pending-subjects' | 'images';

export function AdminPage({ t }: { t: any }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const queryClient = useQueryClient();

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending'],
    queryFn: getPendingItems,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: getAllUsers,
  });

  const { data: notes, isLoading: notesLoading } = useQuery({
    queryKey: ['admin', 'notes'],
    queryFn: () => getNotes(),
  });

  const approveMutation = useMutation({
    mutationFn: ({ type, id }: { type: string; id: number }) => approveItem(type, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ type, id }: { type: string; id: number }) => rejectItem(type, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending'] }),
  });

  const imageActionMutation = useMutation({
    mutationFn: ({ action, id }: { action: 'approve' | 'reject'; id: number }) =>
      action === 'approve' ? approveImageRequest(id) : rejectImageRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending'] }),
  });

  const pendingNotes = pendingData?.notes || [];
  const pendingUnis = pendingData?.universities || [];
  const pendingFaculties = pendingData?.faculties || [];
  const pendingFields = pendingData?.fields || [];
  const pendingSubjects = pendingData?.subjects || [];
  const pendingImages = pendingData?.image_requests || [];

  const isLoading = pendingLoading || (activeTab === 'users' && usersLoading) || (activeTab === 'notes' && notesLoading);

  if (isLoading && activeTab === 'users') {
    return <div className="flex justify-center pt-40"><span className="loading-spinner" /></div>;
  }
  if (isLoading && activeTab === 'notes') {
    return <div className="flex justify-center pt-40"><span className="loading-spinner" /></div>;
  }
  if (pendingLoading && ['pending-notes', 'pending-universities', 'pending-faculties', 'pending-fields', 'pending-subjects', 'images'].includes(activeTab)) {
    return <div className="flex justify-center pt-40"><span className="loading-spinner" /></div>;
  }

  return (
    <div className="container-spatial pt-32 animate-in fade-in">
      <div className="flex items-center gap-4 mb-10">
        <div className="p-4 bg-gradient-to-br from-[#5e5ce6] to-[#bf5af2] rounded-2xl shadow-lg shadow-[#5e5ce6]/30">
          <Shield className="text-white" size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white">Admin Dashboard</h1>
          <p className="text-white/60">Zarządzaj użytkownikami, notatkami i treściami oczekującymi na moderację.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 flex-wrap">
        <TabBtn active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={18} />} label={`Użytkownicy (${users?.length ?? 0})`} />
        <TabBtn active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} icon={<FileText size={18} />} label={`Wszystkie notatki (${notes?.length ?? 0})`} />
        <TabBtn active={activeTab === 'pending-notes'} onClick={() => setActiveTab('pending-notes')} icon={<FileText size={18} />} label={`Oczekujące notatki (${pendingNotes.length})`} />
        <TabBtn active={activeTab === 'pending-universities'} onClick={() => setActiveTab('pending-universities')} icon={<Building2 size={18} />} label={`Oczekujące uczelnie (${pendingUnis.length})`} />
        <TabBtn active={activeTab === 'pending-faculties'} onClick={() => setActiveTab('pending-faculties')} icon={<GraduationCap size={18} />} label={`Oczekujące wydziały (${pendingFaculties.length})`} />
        <TabBtn active={activeTab === 'pending-fields'} onClick={() => setActiveTab('pending-fields')} icon={<BookOpen size={18} />} label={`Oczekujące kierunki (${pendingFields.length})`} />
        <TabBtn active={activeTab === 'pending-subjects'} onClick={() => setActiveTab('pending-subjects')} icon={<BookOpen size={18} />} label={`Oczekujące przedmioty (${pendingSubjects.length})`} />
        <TabBtn active={activeTab === 'images'} onClick={() => setActiveTab('images')} icon={<ImageIcon size={18} />} label={`Zmiany obrazów (${pendingImages.length})`} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'users' && (
          users?.length === 0 ? <EmptyState msg="Brak użytkowników." /> :
          <div className="space-y-3">
            {users?.map((u: any) => (
              <div key={u.id} className="glass-panel p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#32ade6] flex items-center justify-center text-white font-bold text-lg">
                    {u.nickname?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{u.nickname}</h3>
                    <p className="text-white/60 text-sm">{u.email}</p>
                    <p className="text-xs text-white/40">ID: {u.id} • {u.reputation_points} pkt • {u.uploads_count} uploadów</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {u.is_admin && <span className="badge badge-primary bg-[#5e5ce6]/30 text-[#5e5ce6] border-none">Admin</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'notes' && (
          notes?.length === 0 ? <EmptyState msg="Brak notatek." /> :
          <div className="space-y-3">
            {notes?.map((n: any) => (
              <Link key={n.id} to={`/note/${n.id}`} className="block">
                <div className="glass-panel p-5 hover:border-[#5e5ce6]/50 transition-colors">
                  <div className="flex gap-4 items-start">
                    <div className="p-3 bg-white/5 rounded-xl text-[#32ade6] shrink-0">
                      <FileText size={24} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white truncate">{n.title || 'Bez tytułu'}</h3>
                      <p className="text-white/60 text-sm">{n.author?.nickname || 'Anonim'} • {n.university_id} • score: {n.score?.toFixed(1) || '0'}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === 'pending-notes' && (
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
                  {note.file_url && (
                    <a href={resolveUrl(note.file_url)} target="_blank" rel="noreferrer" className="text-xs text-[#5e5ce6] hover:underline mt-1 block">Podgląd pliku</a>
                  )}
                </div>
              </div>
              <ActionButtons onApprove={() => approveMutation.mutate({ type: 'note', id: note.id })} onReject={() => rejectMutation.mutate({ type: 'note', id: note.id })} />
            </div>
          ))
        )}

        {activeTab === 'pending-universities' && (
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
              <ActionButtons onApprove={() => approveMutation.mutate({ type: 'university', id: uni.id })} onReject={() => rejectMutation.mutate({ type: 'university', id: uni.id })} />
            </div>
          ))
        )}

        {activeTab === 'pending-faculties' && (
          pendingFaculties.length === 0 ? <EmptyState msg="Brak oczekujących wydziałów." /> :
          pendingFaculties.map((fac: any) => (
            <div key={fac.id} className="glass-panel p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="p-3 bg-white/5 rounded-xl text-[#32ade6]">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{fac.name}</h3>
                  <p className="text-white/60 text-sm">Uniwersytet ID: {fac.university_id}</p>
                </div>
              </div>
              <ActionButtons onApprove={() => approveMutation.mutate({ type: 'faculty', id: fac.id })} onReject={() => rejectMutation.mutate({ type: 'faculty', id: fac.id })} />
            </div>
          ))
        )}

        {activeTab === 'pending-fields' && (
          pendingFields.length === 0 ? <EmptyState msg="Brak oczekujących kierunków." /> :
          pendingFields.map((f: any) => (
            <div key={f.id} className="glass-panel p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="p-3 bg-white/5 rounded-xl text-[#bf5af2]">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{f.name}</h3>
                  <p className="text-white/60 text-sm">{f.degree_level || ''} • Wydział ID: {f.faculty_id}</p>
                </div>
              </div>
              <ActionButtons onApprove={() => approveMutation.mutate({ type: 'field', id: f.id })} onReject={() => rejectMutation.mutate({ type: 'field', id: f.id })} />
            </div>
          ))
        )}

        {activeTab === 'pending-subjects' && (
          pendingSubjects.length === 0 ? <EmptyState msg="Brak oczekujących przedmiotów." /> :
          pendingSubjects.map((s: any) => (
            <div key={s.id} className="glass-panel p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="p-3 bg-white/5 rounded-xl text-[#5e5ce6]">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{s.name}</h3>
                  <p className="text-white/60 text-sm">Sem. {s.semester ?? '?'} • Kierunek ID: {s.field_of_study_id}</p>
                </div>
              </div>
              <ActionButtons onApprove={() => approveMutation.mutate({ type: 'subject', id: s.id })} onReject={() => rejectMutation.mutate({ type: 'subject', id: s.id })} />
            </div>
          ))
        )}

        {activeTab === 'images' && (
          pendingImages.length === 0 ? <EmptyState msg="Brak próśb o zmianę zdjęcia." /> :
          pendingImages.map((req: any) => (
            <div key={req.id} className="glass-panel p-6">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="w-full md:w-1/3">
                  <p className="text-sm text-white/50 mb-2">Propozycja dla: <span className="text-white font-bold">{req.university_name ?? `ID ${req.university_id}`}</span></p>
                  <img src={resolveUrl(req.new_image_url)} alt="Proposal" className="rounded-xl w-full h-48 object-cover border border-white/10 shadow-lg" />
                </div>
                <div className="flex-1 flex flex-col items-center md:items-start gap-4">
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

const TabBtn = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap
      ${active ? 'bg-gradient-to-r from-[#5e5ce6] to-[#32ade6] text-white shadow-lg shadow-[#5e5ce6]/20' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
  >
    {icon} {label}
  </button>
);

const ActionButtons = ({ onApprove, onReject, labels = ['Zatwierdź', 'Odrzuć'] }: any) => (
  <div className="flex gap-3">
    <button onClick={onReject} className="btn btn-ghost hover:bg-red-500/20 text-red-400 gap-2 rounded-xl">
      <X size={18} /> {labels[1]}
    </button>
    <button onClick={onApprove} className="btn bg-[#5e5ce6] hover:bg-[#4d4ac9] text-white border-none gap-2 rounded-xl shadow-lg shadow-[#5e5ce6]/20">
      <Check size={18} /> {labels[0]}
    </button>
  </div>
);

const EmptyState = ({ msg }: { msg: string }) => (
  <div className="text-center py-20 opacity-50 bg-white/5 rounded-3xl border border-dashed border-white/10">
    <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
    <p className="text-xl">{msg}</p>
  </div>
);
