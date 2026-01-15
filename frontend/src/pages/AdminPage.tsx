import { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  FileText,
  GraduationCap,
  Layers,
  BookOpen,
  Check,
  Image as ImageIcon,
  User,
  Calendar,
  MapPin,
  Building
} from 'lucide-react';
import { API_URL, getAuthHeader } from '../utils/api';

export function AdminPage({ t, lang }: { t: any; lang: string }) {
  const queryClient = useQueryClient();
  // Dodano 'faculties' do typu stanu
  const [activeTab, setActiveTab] = useState<'notes' | 'universities' | 'faculties' | 'fields' | 'subjects'>('notes');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Pobieranie wszystkich oczekujących elementów
  const { data: pending, isLoading } = useQuery({
    queryKey: ['pending'],
    queryFn: async () =>
      axios.get(`${API_URL}/admin/pending_items`, { headers: getAuthHeader() }).then(r => r.data)
  });

  // Uniwersalna mutacja do zatwierdzania
  const approveMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) =>
      axios.post(`${API_URL}/admin/approve/${type}/${id}`, {}, { headers: getAuthHeader() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending'] });
      // Można dodać toast notification zamiast alertu w przyszłości
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Wystąpił błąd podczas zatwierdzania.');
    }
  });

  const approve = (type: string, id: number) => {
    if (confirm(lang === 'pl' ? 'Czy na pewno zatwierdzić ten element?' : 'Are you sure you want to approve this item?')) {
      approveMutation.mutate({ type, id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const tabs = [
    { id: 'notes', label: t.pendingNotes || 'Notatki', icon: FileText, count: pending?.notes?.length || 0 },
    { id: 'universities', label: t.pendingUniversities || 'Uczelnie', icon: GraduationCap, count: pending?.universities?.length || 0 },
    { id: 'faculties', label: t.pendingFaculties || 'Wydziały', icon: Building, count: pending?.faculties?.length || 0 },
    { id: 'fields', label: t.pendingFields || 'Kierunki', icon: Layers, count: pending?.fields?.length || 0 },
    { id: 'subjects', label: t.pendingSubjects || 'Przedmioty', icon: BookOpen, count: pending?.subjects?.length || 0 }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border border-base-300 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-3xl flex items-center gap-3">
            <ShieldCheck className="text-primary" size={32} />
            {t.adminPanel || 'Panel Administratora'}
          </h2>
          <p className="opacity-70">
            {lang === 'pl'
              ? 'Zarządzaj zgłoszeniami od użytkowników i dbaj o jakość bazy danych.'
              : 'Manage user submissions and ensure database quality.'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-100 p-2 shadow-lg overflow-x-auto flex-nowrap justify-start md:justify-center">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab tab-lg gap-2 whitespace-nowrap ${activeTab === tab.id ? 'tab-active font-bold' : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            <tab.icon size={18} />
            {tab.label}
            {tab.count > 0 && (
              <span className="badge badge-primary badge-sm ml-1">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4 min-h-[400px]">

        {/* --- NOTES --- */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {pending?.notes?.length === 0 ? (
              <EmptyState icon={FileText} text={t.noPending || 'Brak notatek do zatwierdzenia'} />
            ) : (
              pending?.notes?.map((note: any) => (
                <div key={note.id} className="card bg-base-100 shadow-md hover:shadow-lg border border-base-200 transition-all">
                  <div className="card-body">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="flex-1 space-y-3 w-full">
                        <div className="flex justify-between items-start">
                             <h3 className="card-title text-lg">{note.title || (lang === 'pl' ? 'Bez tytułu' : 'Untitled')}</h3>
                             <div className="badge badge-sm">{note.id}</div>
                        </div>

                        {note.content && (
                          <div className="bg-base-200/50 p-3 rounded-lg text-sm opacity-80 max-h-32 overflow-y-auto">
                            {note.content}
                          </div>
                        )}

                        {note.image_url && (
                          <div className="relative w-full max-w-md h-48 rounded-lg overflow-hidden bg-base-300 border border-base-300 group">
                            <img
                              src={`${API_URL}${note.image_url}`}
                              alt="Note preview"
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                              onClick={() => setSelectedImage(`${API_URL}${note.image_url}`)}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setSelectedImage(`${API_URL}${note.image_url}`)}
                                className="btn btn-sm btn-circle btn-neutral"
                              >
                                <ImageIcon size={16} />
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 text-xs pt-2">
                          <div className="badge badge-ghost gap-1">
                            <User size={12} />
                            {note.author?.nickname || note.author?.email || 'Anonim'}
                          </div>
                          <div className="badge badge-ghost gap-1">
                            <Calendar size={12} />
                            {new Date(note.created_at).toLocaleDateString()}
                          </div>
                          {note.subject && (
                            <div className="badge badge-outline gap-1 border-primary/20 text-primary">
                              <BookOpen size={12} />
                              {note.subject.name}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
                        <button
                          onClick={() => approve('note', note.id)}
                          className="btn btn-success btn-sm md:btn-md gap-2 flex-1 text-white shadow-sm"
                          disabled={approveMutation.isPending}
                        >
                          <Check size={18} />
                          {t.approve || 'Zatwierdź'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- UNIVERSITIES --- */}
        {activeTab === 'universities' && (
          <div className="space-y-4">
            {pending?.universities?.length === 0 ? (
              <EmptyState icon={GraduationCap} text={t.noPending || 'Brak uczelni do zatwierdzenia'} />
            ) : (
              pending?.universities?.map((uni: any) => (
                <div key={uni.id} className="card bg-base-100 shadow-md border border-base-200">
                  <div className="card-body p-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                      {uni.image_url ? (
                        <div className="avatar">
                          <div
                            className="w-24 h-24 rounded-xl cursor-pointer hover:ring-2 ring-primary transition-all shadow-sm"
                            onClick={() => setSelectedImage(`${API_URL}${uni.image_url}`)}
                          >
                            <img src={`${API_URL}${uni.image_url}`} alt={uni.name} className="object-cover" />
                          </div>
                        </div>
                      ) : (
                         <div className="w-24 h-24 rounded-xl bg-base-200 flex items-center justify-center text-base-content/20">
                            <GraduationCap size={40} />
                         </div>
                      )}

                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <h3 className="font-bold text-xl">{uni.name}</h3>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-sm">
                          <div className="badge badge-lg gap-2">
                            <MapPin size={14} />
                            {uni.city}
                          </div>
                          <div className="badge badge-lg badge-secondary badge-outline">
                            {uni.region}
                          </div>
                        </div>
                        {uni.submitted_by_id && (
                          <p className="text-xs opacity-60">
                            ID Zgłaszającego: {uni.submitted_by_id}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 self-center sm:self-start">
                        <button
                          onClick={() => approve('university', uni.id)}
                          className="btn btn-success text-white shadow-sm"
                          disabled={approveMutation.isPending}
                        >
                          <Check size={18} />
                          {lang === 'pl' ? 'Zatwierdź' : 'Approve'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- FACULTIES --- */}
        {activeTab === 'faculties' && (
            <div className="space-y-4">
                {pending?.faculties?.length === 0 ? (
                    <EmptyState icon={Building} text={lang === 'pl' ? 'Brak wydziałów do zatwierdzenia' : 'No faculties pending'} />
                ) : (
                    pending?.faculties?.map((fac: any) => (
                        <div key={fac.id} className="card bg-base-100 shadow-md border border-base-200">
                            <div className="card-body p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-4 w-full">
                                        {fac.image_url ? (
                                            <div
                                                className="w-16 h-16 rounded-lg overflow-hidden bg-base-200 cursor-pointer border border-base-300"
                                                onClick={() => setSelectedImage(`${API_URL}${fac.image_url}`)}
                                            >
                                                <img src={`${API_URL}${fac.image_url}`} alt={fac.name} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 rounded-lg bg-base-200 flex items-center justify-center text-base-content/30">
                                                <Building size={24} />
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-bold text-lg">{fac.name}</h3>
                                            <div className="text-sm opacity-60 flex items-center gap-1">
                                                <GraduationCap size={14}/> ID Uczelni: {fac.university_id}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => approve('faculty', fac.id)}
                                        className="btn btn-success text-white whitespace-nowrap"
                                        disabled={approveMutation.isPending}
                                    >
                                        <Check size={18} />
                                        {lang === 'pl' ? 'Zatwierdź' : 'Approve'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* --- FIELDS --- */}
        {activeTab === 'fields' && (
          <div className="space-y-4">
            {pending?.fields?.length === 0 ? (
              <EmptyState icon={Layers} text={t.noPending || 'Brak kierunków do zatwierdzenia'} />
            ) : (
              pending?.fields?.map((field: any) => (
                <div key={field.id} className="card bg-base-100 shadow-md border border-base-200">
                  <div className="card-body p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="space-y-1 text-center sm:text-left">
                        <h3 className="font-bold text-lg">{field.name}</h3>
                        <div className="flex gap-2 justify-center sm:justify-start">
                          <div className="badge badge-outline">{field.degree_level}</div>
                          <div className="badge badge-ghost text-xs">Faculty ID: {field.faculty_id}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => approve('field', field.id)}
                        className="btn btn-success text-white"
                        disabled={approveMutation.isPending}
                      >
                         <Check size={18} /> {lang === 'pl' ? 'Zatwierdź' : 'Approve'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- SUBJECTS --- */}
        {activeTab === 'subjects' && (
          <div className="space-y-4">
            {pending?.subjects?.length === 0 ? (
              <EmptyState icon={BookOpen} text={t.noPending || 'Brak przedmiotów do zatwierdzenia'} />
            ) : (
              pending?.subjects?.map((subject: any) => (
                <div key={subject.id} className="card bg-base-100 shadow-md border border-base-200">
                  <div className="card-body p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="space-y-1 text-center sm:text-left">
                        <h3 className="font-bold text-lg">{subject.name}</h3>
                        <div className="flex gap-2 justify-center sm:justify-start">
                          <div className="badge badge-primary badge-outline">Semestr {subject.semester}</div>
                          <div className="badge badge-ghost text-xs">Field ID: {subject.field_of_study_id}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => approve('subject', subject.id)}
                        className="btn btn-success text-white"
                        disabled={approveMutation.isPending}
                      >
                         <Check size={18} /> {lang === 'pl' ? 'Zatwierdź' : 'Approve'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 btn btn-circle btn-ghost text-white hover:bg-white/20"
            >
              <Check size={24} className="rotate-45" /> {/* Using X icon concept */}
            </button>
            <img
                src={selectedImage}
                alt="Full Preview"
                className="w-full h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for empty states
function EmptyState({ icon: Icon, text }: { icon: any, text: string }) {
    return (
        <div className="card bg-base-100 border border-base-300 border-dashed">
            <div className="card-body text-center py-16 opacity-50">
                <Icon size={64} className="mx-auto mb-4 text-base-content/30" />
                <p className="text-lg font-medium">{text}</p>
            </div>
        </div>
    );
}