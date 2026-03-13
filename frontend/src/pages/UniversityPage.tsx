/**
 * University Page Component
 * Displays a single university with:
 * - Banner/logo section with image change request
 * - Tabbed interface (Materials/Reviews/About)
 * - Note search and filtering
 * - Faculty creation modal
 * - Note upload modal
 * - Review system
 *
 * CRITICAL FIX: Handles isLoading, isError, and empty states properly.
 * Shows a "No Data" glass card for empty states. Responsive grid.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Edit, Search, ThumbsUp, Heart, MapPin, Star, AlertCircle,
  FileText, Building2, BookOpen, ChevronDown, ChevronRight, GraduationCap, PlusCircle, X,
} from 'lucide-react';
import {
  resolveUrl,
  getUniversity, getFaculties, getFields, getSubjects, getNotes, getMyFavorites, getUniversityReviews, getTags,
  requestUniversityImageChange, voteNote, toggleFavorite, addReview,
  createFieldOfStudy, createSubject,
  type University, type Faculty, type FieldOfStudy, type Subject,
} from '../utils/api';
import { AddNoteModal } from '../components/addNoteModal';
import { AddFacultyModal } from '../components/AddFacultyModal';
import { NoteModal } from '../components/NoteModal';
import type { TFunction } from '../utils/i18n';
import type { Note, Review } from '../utils/types';

type TabType = 'materials' | 'reviews' | 'about';

// --- SUB-COMPONENT: Review Form ---
const ReviewForm: React.FC<{ universityId: number; onSuccess: () => void }> = ({ universityId, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const addReviewMutation = useMutation({
    mutationFn: addReview,
    onSuccess: () => { setContent(''); onSuccess(); },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        addReviewMutation.mutate({ university_id: universityId, rating, content });
      }}
      className="glass-panel p-6 mb-6"
    >
      <h3 className="font-bold mb-3 text-lg">Write a Review</h3>
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setRating(s)}
            className={`text-2xl transition-colors ${s <= rating ? 'text-[#f59e0b]' : 'opacity-20'}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="glass-input !rounded-xl w-full h-28 resize-none"
        placeholder="Share your experience..."
        required
      />
      <div className="flex justify-end mt-4">
        <button className="btn-squircle px-6 py-3" disabled={addReviewMutation.isPending}>
          {addReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
};

// --- SUB-COMPONENT: Field Accordion (shows subjects + add subject form) ---
const FieldAccordion: React.FC<{ field: FieldOfStudy }> = ({ field }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [subName, setSubName] = useState('');
  const [subSem, setSubSem] = useState(1);
  const token = localStorage.getItem('token');
  const qc = useQueryClient();

  const { data: subjects, isLoading } = useQuery<Subject[]>({
    queryKey: ['subjects', field.id],
    queryFn: () => getSubjects(field.id),
    enabled: isOpen,
  });

  const addMutation = useMutation({
    mutationFn: () => createSubject({ name: subName.trim(), semester: subSem, field_of_study_id: field.id }),
    onSuccess: () => {
      setSubName('');
      setSubSem(1);
      setShowAdd(false);
      qc.invalidateQueries({ queryKey: ['subjects', field.id] });
    },
  });

  return (
    <div className="ml-4">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 flex-1 text-left py-2 px-3 rounded-lg hover:bg-[var(--glass-bg)] transition-colors text-sm"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit' }}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <GraduationCap size={14} className="text-[#32ade6]" />
          <span className="font-medium">{field.name}</span>
          {field.degree_level && (
            <span className="text-xs opacity-40 ml-auto">{field.degree_level}</span>
          )}
        </button>
        {token && isOpen && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="p-1 rounded-lg hover:bg-[var(--glass-bg)] transition-colors opacity-40 hover:opacity-100 flex-shrink-0"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit' }}
            title="Dodaj przedmiot"
          >
            {showAdd ? <X size={14} /> : <PlusCircle size={14} className="text-[#bf5af2]" />}
          </button>
        )}
      </div>
      {isOpen && (
        <div className="ml-6 mt-1 space-y-1">
          {isLoading && <div className="flex justify-center py-2"><div className="loading-spinner w-4 h-4" /></div>}
          {subjects?.map((s) => (
            <div key={s.id} className="flex items-center gap-2 py-1.5 px-3 text-sm opacity-70">
              <BookOpen size={12} className="text-[#bf5af2] flex-shrink-0" />
              <span>{s.name}</span>
              {s.semester != null && (
                <span className="text-xs opacity-40 ml-auto">Sem. {s.semester}</span>
              )}
            </div>
          ))}
          {!isLoading && subjects && subjects.length === 0 && !showAdd && (
            <p className="text-xs opacity-40 ml-7 py-1">Brak przedmiotów</p>
          )}

          {/* Inline add subject form */}
          {showAdd && (
            <form
              onSubmit={(e) => { e.preventDefault(); if (subName.trim()) addMutation.mutate(); }}
              className="flex items-center gap-2 py-2 px-3"
            >
              <input
                type="text"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="Nazwa przedmiotu..."
                className="glass-input !rounded-lg !py-1.5 !px-3 text-sm flex-1"
                autoFocus
                required
              />
              <input
                type="number"
                value={subSem}
                onChange={(e) => setSubSem(Number(e.target.value))}
                min={1}
                max={12}
                className="glass-input !rounded-lg !py-1.5 !px-2 text-sm w-16 text-center"
                title="Semestr"
              />
              <button
                type="submit"
                disabled={addMutation.isPending || !subName.trim()}
                className="btn-primary !px-3 !py-1.5 text-xs !rounded-lg whitespace-nowrap"
              >
                {addMutation.isPending ? '...' : 'Dodaj'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

// --- SUB-COMPONENT: Faculty Accordion (shows fields of study + add field form) ---
const FacultyAccordion: React.FC<{ faculty: Faculty }> = ({ faculty }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [fieldName, setFieldName] = useState('');
  const [degreeLevel, setDegreeLevel] = useState('Inżynierskie (I stopień)');
  const token = localStorage.getItem('token');
  const qc = useQueryClient();

  const { data: fields, isLoading } = useQuery<FieldOfStudy[]>({
    queryKey: ['fields', faculty.id],
    queryFn: () => getFields(faculty.id),
    enabled: isOpen,
  });

  const addMutation = useMutation({
    mutationFn: () => createFieldOfStudy({ name: fieldName.trim(), degree_level: degreeLevel, faculty_id: faculty.id }),
    onSuccess: () => {
      setFieldName('');
      setShowAdd(false);
      qc.invalidateQueries({ queryKey: ['fields', faculty.id] });
    },
  });

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 flex-1 text-left"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit' }}
        >
          {isOpen ? <ChevronDown size={16} className="text-[#5e5ce6]" /> : <ChevronRight size={16} className="text-[#5e5ce6]" />}
          <Building2 size={16} className="text-[#5e5ce6]" />
          <span className="font-bold">{faculty.name}</span>
        </button>
        {token && isOpen && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="p-1.5 rounded-lg hover:bg-[var(--glass-bg)] transition-colors opacity-40 hover:opacity-100 flex-shrink-0"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit' }}
            title="Dodaj kierunek"
          >
            {showAdd ? <X size={16} /> : <PlusCircle size={16} className="text-[#32ade6]" />}
          </button>
        )}
      </div>
      {isOpen && (
        <div className="mt-3 space-y-1 border-t border-[var(--border-color)] pt-3">
          {isLoading && <div className="flex justify-center py-3"><div className="loading-spinner w-5 h-5" /></div>}
          {fields?.map((f) => (
            <FieldAccordion key={f.id} field={f} />
          ))}
          {!isLoading && fields && fields.length === 0 && !showAdd && (
            <p className="text-sm opacity-40 ml-7 py-2">Brak kierunków</p>
          )}

          {/* Inline add field of study form */}
          {showAdd && (
            <form
              onSubmit={(e) => { e.preventDefault(); if (fieldName.trim()) addMutation.mutate(); }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 py-2 px-3 ml-4"
            >
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="Nazwa kierunku..."
                className="glass-input !rounded-lg !py-1.5 !px-3 text-sm flex-1"
                autoFocus
                required
              />
              <select
                value={degreeLevel}
                onChange={(e) => setDegreeLevel(e.target.value)}
                className="glass-input !rounded-lg !py-1.5 !px-3 text-sm"
                style={{ appearance: 'auto' }}
              >
                <option value="Inżynierskie (I stopień)">Inżynierskie (I st.)</option>
                <option value="Licencjackie (I stopień)">Licencjackie (I st.)</option>
                <option value="Magisterskie (II stopień)">Magisterskie (II st.)</option>
                <option value="Jednolite Magisterskie">Jednolite Magisterskie</option>
                <option value="Doktoranckie (III stopień)">Doktoranckie (III st.)</option>
              </select>
              <button
                type="submit"
                disabled={addMutation.isPending || !fieldName.trim()}
                className="btn-primary !px-4 !py-1.5 text-xs !rounded-lg whitespace-nowrap"
              >
                {addMutation.isPending ? '...' : 'Dodaj kierunek'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

// --- SUB-COMPONENT: Academic Structure (faculties list) ---
const AcademicStructure: React.FC<{
  universityId: number;
  faculties: Faculty[];
}> = ({ universityId, faculties }) => {
  const token = localStorage.getItem('token');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <GraduationCap className="text-[#32ade6]" size={24} /> Wydziały & Kierunki
        </h2>
      </div>

      <p className="text-sm opacity-50 mb-4">
        Kliknij na wydział, aby zobaczyć kierunki i przedmioty.
      </p>

      {faculties.length > 0 ? (
        <div className="space-y-3">
          {faculties.map((fac: Faculty) => (
            <FacultyAccordion key={fac.id} faculty={fac} />
          ))}
        </div>
      ) : (
        <div className="empty-state !py-8">
          <Building2 size={36} className="empty-state-icon" />
          <p className="text-base font-semibold opacity-60">Brak wydziałów</p>
          {token && <p className="text-sm opacity-40">Dodaj wydział przyciskiem "Add Faculty" obok wyszukiwania.</p>}
        </div>
      )}
    </div>
  );
};

export function UniversityPage({ t }: { t: TFunction }) {
  const { id } = useParams<{ id: string }>();
  const uniId = parseInt(id || '0');
  const token = localStorage.getItem('token');
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('materials');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isNoteModalOpen, setNoteModalOpen] = useState(false);
  const [isAddFacultyOpen, setAddFacultyOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search to avoid firing API requests on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Queries with proper loading/error states
  const {
    data: university,
    isLoading: uniLoading,
    isError: uniError,
  } = useQuery<University>({
    queryKey: ['university', uniId],
    queryFn: () => getUniversity(uniId),
    enabled: uniId > 0,
    retry: 2,
  });

  const { data: faculties } = useQuery<Faculty[]>({
    queryKey: ['faculties', uniId],
    queryFn: () => getFaculties(uniId),
    enabled: uniId > 0,
  });

  const [notesSort, setNotesSort] = useState<'date' | 'score' | 'views'>('date');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  });
  const { data: notes, isLoading: notesLoading } = useQuery({
    queryKey: ['notes', uniId, debouncedSearch, notesSort, selectedTagIds],
    queryFn: () => getNotes({
      university_id: uniId,
      search: debouncedSearch,
      sort: notesSort,
      ...(selectedTagIds.length > 0 && { tag_ids: selectedTagIds }),
    }),
    enabled: uniId > 0,
  });

  const { data: myFavorites = [] } = useQuery({
    queryKey: ['myFavorites'],
    queryFn: () => getMyFavorites(),
    enabled: !!token,
  });
  const favoriteIds = new Set((myFavorites as Note[]).map((n: Note) => n.id));

  const { data: reviews } = useQuery({
    queryKey: ['reviews', uniId],
    queryFn: () => getUniversityReviews(uniId),
    enabled: uniId > 0,
  });

  const imageReqMutation = useMutation({
    mutationFn: (file: File) => requestUniversityImageChange(uniId, file),
    onSuccess: () => alert('Image update requested! Admin will review it.'),
  });

  const voteMutation = useMutation({
    mutationFn: voteNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const favMutation = useMutation({
    mutationFn: toggleFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myFavorites'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // CRITICAL FIX: Loading state with glass spinner
  if (uniLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full border border-[#5e5ce6]/20 animate-ping" />
          <div className="w-12 h-12 rounded-full border-2 border-transparent border-t-[#5e5ce6] border-r-[#32ade6] animate-spin" />
        </div>
      </div>
    );
  }

  // CRITICAL FIX: Error state with glass card
  if (uniError || !university) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 px-4">
        <div className="glass-panel p-10 text-center max-w-md">
          <AlertCircle size={56} className="mx-auto mb-5 opacity-30" />
          <h2 className="text-2xl font-bold mb-2">University Not Found</h2>
          <p className="opacity-50 mb-6">
            Could not load this university. It may not exist or the server may be unreachable.
          </p>
          <a href="/" className="btn-squircle inline-block px-6 py-3 no-underline">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  // Tab button component for DRY
  const TabButton = ({ tab, label, icon }: { tab: TabType; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
        activeTab === tab
          ? 'bg-gradient-to-r from-[#5e5ce6] to-[#32ade6] text-white shadow-lg shadow-[#5e5ce6]/20'
          : 'glass-panel opacity-70 hover:opacity-100'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="space-y-8 pb-20 fade-in">
      {/* BANNER SECTION */}
      <div className="relative h-72 md:h-80 w-full overflow-hidden">
        {university.banner_url ? (
          <img
            src={resolveUrl(university.banner_url)}
            className="w-full h-full object-cover"
            alt="Banner"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#5e5ce6]/30 via-[#32ade6]/20 to-[#bf5af2]/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-color)] via-[var(--bg-color)]/40 to-transparent" />

        <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-end gap-6">
          {/* University Logo */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 border-[var(--bg-color)] shadow-2xl bg-[var(--bg-secondary)]">
              <img
                src={resolveUrl(university.image_url, 'https://placehold.co/150x150/5e5ce6/ffffff?text=Uni')}
                alt="Logo"
                className="w-full h-full object-cover"
              />
              {token && (
                <>
                  <div
                    className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded-2xl cursor-pointer transition-all"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Edit className="text-white" />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files?.[0] && imageReqMutation.mutate(e.target.files[0])
                    }
                  />
                </>
              )}
            </div>
          </div>

          {/* University Info */}
          <div className="mb-2">
            <h1 className="text-3xl md:text-5xl font-black drop-shadow-sm">{university.name}</h1>
            <p className="text-base opacity-70 flex gap-2 items-center mt-2 font-medium">
              <MapPin size={18} className="text-[#32ade6]" /> {university.city}
              {university.region ? `, ${university.region}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex gap-2 flex-wrap">
          <TabButton tab="materials" label="Materials" icon={<BookOpen size={16} />} />
          <TabButton tab="reviews" label="Reviews" icon={<Star size={16} />} />
          <TabButton tab="about" label="About" icon={<Building2 size={16} />} />
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 min-h-[400px]">

        {/* --- MATERIALS TAB --- */}
        {activeTab === 'materials' && (
          <div className="space-y-6 fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:w-80">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
                <input
                  className="glass-input pl-12 !rounded-xl w-full"
                  placeholder="Search by title or content..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {token && (
                <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => setAddFacultyOpen(true)}
                    className="btn-squircle flex items-center gap-2 flex-1 sm:flex-auto justify-center"
                  >
                    <Building2 size={16} /> Add Faculty
                  </button>
                  <button
                    onClick={() => setNoteModalOpen(true)}
                    className="btn-squircle flex items-center gap-2 flex-1 sm:flex-auto justify-center"
                  >
                    <FileText size={16} /> Upload Note
                  </button>
                </div>
              )}
            </div>

            {/* Notes Loading State */}
            {notesLoading && (
              <div className="flex justify-center py-12">
                <div className="loading-spinner w-8 h-8" />
              </div>
            )}

            {/* Sort & Notes Grid */}
            {!notesLoading && notes?.items && notes.items.length > 0 && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-sm opacity-60">Tags:</span>
                      {tags.map((tag: { id: number; name: string }) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => setSelectedTagIds((prev) => prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id])}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedTagIds.includes(tag.id) ? 'bg-[#5e5ce6] text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                        >
                          {tag.name}
                        </button>
                      ))}
                      {selectedTagIds.length > 0 && (
                        <button type="button" onClick={() => setSelectedTagIds([])} className="text-xs opacity-60 hover:opacity-100">Clear</button>
                      )}
                    </div>
                  )}
                  <select
                    value={notesSort}
                    onChange={(e) => setNotesSort(e.target.value as 'date' | 'score' | 'views')}
                    className="glass-input py-2 px-3 rounded-xl text-sm"
                  >
                    <option value="date">Newest first</option>
                    <option value="score">Top rated</option>
                    <option value="views">Most views</option>
                  </select>
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notes.items.map((n: Note) => (
                  <div
                    key={n.id}
                    className="glass-panel p-5 cursor-pointer group hover:border-[#5e5ce6]/30 transition-all hover:-translate-y-1"
                    onClick={() => setSelectedNote(n)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg leading-tight group-hover:text-[#5e5ce6] transition-colors truncate pr-2">
                        {n.title || 'Untitled'}
                      </h3>
                      <span className="badge-gradient badge text-xs shrink-0">{n.score?.toFixed(1) || '0'}</span>
                    </div>

                    {n.content && (
                      <p className="text-sm opacity-60 line-clamp-3 mb-3">{n.content}</p>
                    )}

                    {n.tags && n.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {n.tags.map((tag: any) => (
                          <span key={tag.id} className="px-2 py-0.5 rounded-md bg-white/10 text-xs text-white/60">{tag.name}</span>
                        ))}
                      </div>
                    )}

                    {/* Author info */}
                    <div className="flex items-center gap-2 text-xs opacity-40 mb-3">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#32ade6] flex items-center justify-center text-white text-[10px] font-bold">
                        {n.author?.nickname?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="truncate">{n.author?.nickname || 'Anonymous'}</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                      <button
                        onClick={(e) => { e.stopPropagation(); voteMutation.mutate(n.id); }}
                        className="flex items-center gap-1 text-xs opacity-50 hover:opacity-100 hover:text-[#5e5ce6] transition-all px-2 py-1 rounded-lg hover:bg-[#5e5ce6]/10"
                      >
                        <ThumbsUp size={13} /> Like
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); token && favMutation.mutate(n.id); }}
                        className={`flex items-center gap-1 text-xs transition-all px-2 py-1 rounded-lg hover:bg-[#bf5af2]/10 ${favoriteIds.has(n.id) ? 'text-[#bf5af2]' : 'opacity-50 hover:opacity-100 hover:text-[#bf5af2]'}`}
                      >
                        <Heart size={13} fill={favoriteIds.has(n.id) ? 'currentColor' : 'none'} /> Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}

            {/* Empty State - Glass card */}
            {!notesLoading && (!notes?.items || notes.items.length === 0) && (
              <div className="empty-state">
                <FileText size={48} className="empty-state-icon" />
                <p className="text-xl font-semibold opacity-60 mb-2">No Materials Found</p>
                <p className="text-sm opacity-40">Be the first to upload study materials for this university!</p>
              </div>
            )}
          </div>
        )}

        {/* --- REVIEWS TAB --- */}
        {activeTab === 'reviews' && (
          <div className="max-w-3xl fade-in">
            {token ? (
              <ReviewForm
                universityId={uniId}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['reviews'] })}
              />
            ) : (
              <div className="glass-panel p-6 mb-6 text-center">
                <p className="opacity-60">Log in to write a review!</p>
              </div>
            )}

            <div className="space-y-4">
              {reviews?.map((r: Review) => (
                <div key={r.id} className="glass-panel p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#32ade6] flex items-center justify-center text-white font-bold text-sm">
                        {r.user?.nickname?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{r.user?.nickname || 'Anonymous'}</div>
                        <div className="text-xs opacity-40">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex text-[#f59e0b] gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          fill={i < r.rating ? 'currentColor' : 'none'}
                          className={i < r.rating ? '' : 'opacity-20'}
                        />
                      ))}
                    </div>
                  </div>
                  {r.content && <p className="opacity-70 pl-[52px] text-sm">{r.content}</p>}
                </div>
              ))}

              {(!reviews || reviews.length === 0) && (
                <div className="empty-state">
                  <Star size={48} className="empty-state-icon" />
                  <p className="text-lg font-semibold opacity-60">No reviews yet</p>
                  <p className="text-sm opacity-40">Be the first to review this university!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- ABOUT TAB --- */}
        {activeTab === 'about' && (
          <div className="space-y-6 max-w-3xl fade-in">
            <div className="glass-panel p-8">
              <h2 className="text-2xl font-bold mb-6">About {university.name}</h2>
              <p className="opacity-70 leading-relaxed mb-8">
                {university.description || 'No description available for this university.'}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-panel p-5 text-center">
                  <p className="text-3xl font-black text-[#5e5ce6]">{faculties?.length || 0}</p>
                  <p className="text-xs uppercase tracking-widest opacity-50 mt-1 font-semibold">Faculties</p>
                </div>
                <div className="glass-panel p-5 text-center">
                  <p className="text-3xl font-black text-[#32ade6]">{notes?.items?.length || 0}</p>
                  <p className="text-xs uppercase tracking-widest opacity-50 mt-1 font-semibold">Notes</p>
                </div>
              </div>

              {university.country && (
                <div className="mt-6 flex items-center gap-2 opacity-50 text-sm">
                  <MapPin size={14} />
                  <span>{university.city}, {university.region} - {university.country}</span>
                </div>
              )}
            </div>

            {/* Academic Structure Browser - Faculties, Fields of Study, Subjects */}
            <AcademicStructure universityId={uniId} faculties={faculties || []} />
          </div>
        )}
      </div>

      {/* MODALS */}
      {token && (
        <>
        <AddFacultyModal
          isOpen={isAddFacultyOpen}
          onClose={() => setAddFacultyOpen(false)}
          universityId={uniId}
          universityName={university.name}
        />
        <AddNoteModal
          universityId={uniId}
          isOpen={isNoteModalOpen}
          onClose={() => setNoteModalOpen(false)}
        />
        </>
      )}
      {selectedNote && (
        <NoteModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          token={token}
          onUnlockWithUpload={() => {
            setSelectedNote(null);
            setNoteModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
