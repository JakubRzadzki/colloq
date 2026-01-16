import { useState, useRef } from 'react';
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
  MapPin,
  Building,
  Upload,
  Edit
} from 'lucide-react';
import { API_URL, getAuthHeader, updateUniversityImage } from '../utils/api';

export function AdminPage({ t, lang }: { t: any; lang: string }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'notes' | 'universities' | 'faculties' | 'fields' | 'subjects'>('notes');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Refs and state for image updating
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingUniId, setEditingUniId] = useState<number | null>(null);

  // --- DATA FETCHING ---
  const { data: pending, isLoading } = useQuery({
    queryKey: ['pending'],
    queryFn: async () =>
      axios.get(`${API_URL}/admin/pending_items`, { headers: getAuthHeader() }).then(r => r.data)
  });

  // --- APPROVAL MUTATION ---
  const approveMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) =>
      axios.post(`${API_URL}/admin/approve/${type}/${id}`, {}, { headers: getAuthHeader() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Error occurred while approving.');
    }
  });

  const approve = (type: string, id: number) => {
    if (confirm(lang === 'pl' ? 'Czy na pewno zatwierdzić?' : 'Are you sure?')) {
      approveMutation.mutate({ type, id });
    }
  };

  // --- IMAGE UPDATE MUTATION ---
  const imageMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => updateUniversityImage(id, file),
    onSuccess: () => {
      alert(lang === 'pl' ? 'Zdjęcie zaktualizowane!' : 'Image updated!');
      queryClient.invalidateQueries({ queryKey: ['pending'] });
      setEditingUniId(null);
    },
    onError: (err: any) => alert(err.response?.data?.detail || "Error updating image")
  });

  const handleImageClick = (uniId: number) => {
    setEditingUniId(uniId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingUniId) {
      imageMutation.mutate({ id: editingUniId, file });
    }
    e.target.value = ''; // Reset input
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const tabs = [
    { id: 'notes', label: t.pendingNotes || 'Notes', icon: FileText, count: pending?.notes?.length || 0 },
    { id: 'universities', label: t.pendingUniversities || 'Universities', icon: GraduationCap, count: pending?.universities?.length || 0 },
    { id: 'faculties', label: t.pendingFaculties || 'Faculties', icon: Building, count: pending?.faculties?.length || 0 },
    { id: 'fields', label: t.pendingFields || 'Fields', icon: Layers, count: pending?.fields?.length || 0 },
    { id: 'subjects', label: t.pendingSubjects || 'Subjects', icon: BookOpen, count: pending?.subjects?.length || 0 }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border border-base-300 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-3xl flex items-center gap-3">
            <ShieldCheck className="text-primary" size={32} />
            {t.adminPanel || 'Admin Panel'}
          </h2>
          <p className="opacity-70">
            {lang === 'pl'
              ? 'Zarządzaj zgłoszeniami od użytkowników.'
              : 'Manage user submissions.'}
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
            {tab.count > 0 && <span className="badge badge-primary badge-sm ml-1">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4 min-h-[400px]">

        {/* --- NOTES --- */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {pending?.notes?.length === 0 ? (
              <EmptyState icon={FileText} text={t.noPending || 'No notes pending'} />
            ) : (
              pending?.notes?.map((note: any) => (
                <div key={note.id} className="card bg-base-100 shadow-md border border-base-200">
                  <div className="card-body">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <h3 className="card-title">{note.title || 'Untitled'}</h3>
                        {note.content && <p className="text-sm opacity-80 line-clamp-3">{note.content}</p>}
                        {note.image_url && (
                          <button
                            onClick={() => setSelectedImage(`${API_URL}${note.image_url}`)}
                            className="btn btn-sm btn-outline gap-2"
                          >
                            <ImageIcon size={16} /> {t.viewImage || 'View Image'}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => approve('note', note.id)}
                        className="btn btn-success btn-sm text-white"
                        disabled={approveMutation.isPending}
                      >
                        <Check size={18} /> {t.approve || 'Approve'}
                      </button>
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
              <EmptyState icon={GraduationCap} text={t.noPending || 'No universities pending'} />
            ) : (
              pending?.universities?.map((uni: any) => (
                <div key={uni.id} className="card bg-base-100 shadow-md border border-base-200">
                  <div className="card-body p-6 flex flex-col md:flex-row gap-6 items-start">

                    {/* Image Section with Edit Overlay */}
                    <div className="relative group shrink-0">
                        {uni.image_url ? (
                            <img
                                src={`${API_URL}${uni.image_url}`}
                                alt={uni.name}
                                className="w-32 h-32 object-cover rounded-xl shadow-sm cursor-pointer"
                                onClick={() => setSelectedImage(`${API_URL}${uni.image_url}`)}
                            />
                        ) : (
                            <div className="w-32 h-32 bg-base-200 rounded-xl flex items-center justify-center">
                                <GraduationCap size={40} className="opacity-20"/>
                            </div>
                        )}

                        {/* Edit Button Overlay */}
                        <button
                            onClick={() => handleImageClick(uni.id)}
                            className="absolute bottom-2 right-2 btn btn-xs btn-circle btn-primary opacity-0 group-hover:opacity-100 transition-opacity"
                            title={lang === 'pl' ? "Zmień zdjęcie" : "Change image"}
                        >
                            <Edit size={12} />
                        </button>
                    </div>

                    <div className="flex-1 space-y-2">
                      <h3 className="font-bold text-xl">{uni.name}</h3>
                      <div className="flex gap-2">
                        <span className="badge badge-lg gap-1"><MapPin size={12}/> {uni.city}</span>
                        <span className="badge badge-lg badge-outline">{uni.region}</span>
                      </div>
                      <p className="text-xs opacity-60">Submitted by ID: {uni.submitted_by_id}</p>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[140px]">
                        <button
                          onClick={() => approve('university', uni.id)}
                          className="btn btn-success text-white w-full gap-2"
                          disabled={approveMutation.isPending}
                        >
                          <Check size={18} /> {t.approve || 'Approve'}
                        </button>

                        {/* Mobile/Alternative Edit Button */}
                        <button
                            onClick={() => handleImageClick(uni.id)}
                            className="btn btn-sm btn-ghost w-full gap-2 md:hidden"
                        >
                            <Upload size={14}/> {lang === 'pl' ? "Zmień zdjęcie" : "Change Image"}
                        </button>
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
                            <div className="card-body p-4 flex flex-row justify-between items-center">
                                <div className="flex items-center gap-4">
                                    {fac.image_url ? (
                                        <img
                                            src={`${API_URL}${fac.image_url}`}
                                            className="w-12 h-12 rounded-lg object-cover cursor-pointer"
                                            onClick={() => setSelectedImage(`${API_URL}${fac.image_url}`)}
                                        />
                                    ) : <Building size={24} className="opacity-30 mx-3"/>}
                                    <div>
                                        <h3 className="font-bold">{fac.name}</h3>
                                        <p className="text-xs opacity-60">University ID: {fac.university_id}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => approve('faculty', fac.id)}
                                    className="btn btn-success btn-sm text-white"
                                >
                                    <Check size={16}/> {t.approve || 'Approve'}
                                </button>
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
                    <EmptyState icon={Layers} text={t.noPending || 'No fields pending'} />
                ) : (
                    pending?.fields?.map((field: any) => (
                        <div key={field.id} className="card bg-base-100 shadow-md border border-base-200">
                            <div className="card-body p-4 flex flex-row justify-between items-center">
                                <div>
                                    <h3 className="font-bold">{field.name}</h3>
                                    <div className="badge badge-sm">{field.degree_level}</div>
                                </div>
                                <button
                                    onClick={() => approve('field', field.id)}
                                    className="btn btn-success btn-sm text-white"
                                >
                                    <Check size={16}/> {t.approve || 'Approve'}
                                </button>
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
                    <EmptyState icon={BookOpen} text={t.noPending || 'No subjects pending'} />
                ) : (
                    pending?.subjects?.map((sub: any) => (
                        <div key={sub.id} className="card bg-base-100 shadow-md border border-base-200">
                            <div className="card-body p-4 flex flex-row justify-between items-center">
                                <div>
                                    <h3 className="font-bold">{sub.name}</h3>
                                    <div className="badge badge-sm badge-outline">Semester {sub.semester}</div>
                                </div>
                                <button
                                    onClick={() => approve('subject', sub.id)}
                                    className="btn btn-success btn-sm text-white"
                                >
                                    <Check size={16}/> {t.approve || 'Approve'}
                                </button>
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={selectedImage} className="max-w-full max-h-full rounded-lg shadow-2xl" />
            <button className="absolute -top-10 right-0 btn btn-circle btn-ghost text-white">✕</button>
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