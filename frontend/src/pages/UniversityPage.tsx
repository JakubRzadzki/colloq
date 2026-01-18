import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Building2, Edit, Search, ThumbsUp, Heart, MapPin, Star } from 'lucide-react';
import {
  API_URL,
  getUniversity, getFaculties, getNotes, getUniversityReviews,
  requestUniversityImageChange, voteNote, toggleFavorite, addReview,
  type University, type Faculty
} from '../utils/api';
import { AddNoteModal } from '../components/addNoteModal';
import { AddFacultyModal } from '../components/AddFacultyModal';
import { NoteModal } from '../components/NoteModal';

type TabType = 'materials' | 'reviews' | 'about';

// --- SUB-COMPONENT: Review Form ---
const ReviewForm: React.FC<{ universityId: number; onSuccess: () => void }> = ({ universityId, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const addReviewMutation = useMutation({
    mutationFn: addReview,
    onSuccess: () => { setContent(''); onSuccess(); }
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); addReviewMutation.mutate({ university_id: universityId, rating, content }); }} className="card bg-base-100 p-6 shadow-sm mb-6 border border-base-200">
      <h3 className="font-bold mb-2">Write a Review</h3>
      <div className="flex gap-2 mb-4">
        {[1,2,3,4,5].map(s => (
          <button key={s} type="button" onClick={() => setRating(s)} className={`text-2xl transition-colors ${s <= rating ? 'text-warning' : 'text-base-300'}`}>★</button>
        ))}
      </div>
      <textarea value={content} onChange={e => setContent(e.target.value)} className="textarea textarea-bordered w-full" placeholder="Share your experience..." required></textarea>
      <div className="flex justify-end mt-4">
        <button className="btn btn-primary" disabled={addReviewMutation.isPending}>
          {addReviewMutation.isPending ? "Submitting..." : "Submit Review"}
        </button>
      </div>
    </form>
  );
};

// --- MAIN PAGE COMPONENT ---
export function UniversityPage() {
  const { id } = useParams<{ id: string }>();
  const uniId = parseInt(id || '0');
  const token = localStorage.getItem('token');
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('materials');
  const [search, setSearch] = useState("");
  const [isNoteModalOpen, setNoteModalOpen] = useState(false);
  const [isFacModalOpen, setFacModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: university } = useQuery<University>({ queryKey: ['university', uniId], queryFn: () => getUniversity(uniId) });
  const { data: faculties } = useQuery<Faculty[]>({ queryKey: ['faculties', uniId], queryFn: () => getFaculties(uniId) });
  const { data: notes } = useQuery({ queryKey: ['notes', uniId, search], queryFn: () => getNotes(uniId, search) });
  const { data: reviews } = useQuery({ queryKey: ['reviews', uniId], queryFn: () => getUniversityReviews(uniId) });

  const imageReqMutation = useMutation({
    mutationFn: (file: File) => requestUniversityImageChange(uniId, file),
    onSuccess: () => alert("Image update requested! Admin will review it.")
  });

  const voteMutation = useMutation({ mutationFn: voteNote, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }) });
  const favMutation = useMutation({ mutationFn: toggleFavorite, onSuccess: () => alert("Updated favorites") });

  if (!university) return <div className="min-h-screen flex items-center justify-center"><span className="loading loading-spinner loading-lg"></span></div>;

  return (
    <div className="space-y-8 pb-20">
      {/* BANNER SECTION */}
      <div className="relative h-80 w-full bg-neutral">
        {university.banner_url ? (
            <img src={`${API_URL}${university.banner_url}`} className="w-full h-full object-cover opacity-80" alt="Banner" />
        ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/30 to-secondary/30"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/30 to-transparent"></div>

        <div className="absolute bottom-0 left-0 p-8 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-end gap-6">
            <div className="avatar">
                <div className="w-32 h-32 rounded-2xl ring ring-base-100 ring-offset-4 ring-offset-base-100 bg-base-100 shadow-2xl relative group">
                    <img src={university.image_url ? `${API_URL}${university.image_url}` : "https://via.placeholder.com/150"} alt="Logo" className="object-cover" />
                    {token && (
                        <>
                            <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center rounded-2xl cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <Edit className="text-white"/>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && imageReqMutation.mutate(e.target.files[0])}/>
                        </>
                    )}
                </div>
            </div>
            <div className="mb-2">
                <h1 className="text-4xl md:text-5xl font-black text-base-content drop-shadow-sm">{university.name}</h1>
                <p className="text-lg opacity-80 flex gap-2 items-center mt-2 font-medium">
                  <MapPin size={18}/> {university.city}, {university.region}
                </p>
            </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="tabs tabs-boxed bg-base-200/50 p-1 w-fit">
            <a className={`tab tab-lg ${activeTab === 'materials' ? 'tab-active' : ''}`} onClick={() => setActiveTab('materials')}>Materials</a>
            <a className={`tab tab-lg ${activeTab === 'reviews' ? 'tab-active' : ''}`} onClick={() => setActiveTab('reviews')}>Reviews</a>
            <a className={`tab tab-lg ${activeTab === 'about' ? 'tab-active' : ''}`} onClick={() => setActiveTab('about')}>About</a>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 min-h-[400px]">
        {activeTab === 'materials' && (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="join w-full md:w-auto">
                        <div className="join-item bg-base-100 flex items-center px-3 border border-base-300"><Search className="opacity-50"/></div>
                        <input className="input input-bordered join-item w-full md:w-80" placeholder="Search by title or content..." value={search} onChange={e => setSearch(e.target.value)}/>
                    </div>
                    {token && (
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={() => setFacModalOpen(true)} className="btn btn-outline flex-1 md:flex-none">Add Faculty</button>
                            <button onClick={() => setNoteModalOpen(true)} className="btn btn-primary flex-1 md:flex-none text-primary-content">Upload Note</button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {notes?.map((n: any) => (
                        <div key={n.id} className="card bg-base-100 shadow-md border border-base-200 hover:shadow-xl hover:border-primary transition-all cursor-pointer group h-full" onClick={() => setSelectedNote(n)}>
                            <div className="card-body p-5">
                                <div className="flex justify-between items-start">
                                    <h3 className="card-title text-lg leading-tight group-hover:text-primary transition-colors">{n.title}</h3>
                                    <div className="badge badge-secondary badge-outline font-bold shrink-0">{n.score} pts</div>
                                </div>
                                <p className="text-sm opacity-70 line-clamp-3 my-2">{n.content}</p>
                                <div className="card-actions justify-end mt-auto pt-2 border-t border-base-100">
                                    <button onClick={(e) => {e.stopPropagation(); voteMutation.mutate(n.id)}} className="btn btn-sm btn-ghost gap-1"><ThumbsUp size={14}/> Like</button>
                                    <button onClick={(e) => {e.stopPropagation(); favMutation.mutate(n.id)}} className="btn btn-sm btn-ghost gap-1"><Heart size={14}/> Save</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {notes?.length === 0 && (
                      <div className="col-span-full text-center py-20 opacity-50 bg-base-200 rounded-xl border-2 border-dashed border-base-300">
                        <Search size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>No materials found. Be the first to upload!</p>
                      </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'reviews' && (
            <div className="max-w-3xl animate-in fade-in">
                {token ? (
                    <ReviewForm universityId={uniId} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['reviews'] })} />
                ) : (
                    <div className="alert mb-6">Login to add a review!</div>
                )}

                <div className="space-y-4">
                    {reviews?.map((r: any) => (
                        <div key={r.id} className="card bg-base-100 p-6 border border-base-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex gap-3 items-center">
                                    <div className="avatar placeholder">
                                        <div className="bg-neutral text-neutral-content rounded-full w-10">
                                            <span>{r.user?.nickname?.[0] || 'U'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-bold">{r.user?.nickname || 'Anonymous'}</div>
                                        <div className="text-xs opacity-50">{new Date(r.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="flex text-warning">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={16} fill={i < r.rating ? "currentColor" : "none"} className={i < r.rating ? "" : "opacity-30"}/>
                                  ))}
                                </div>
                            </div>
                            <p className="text-base-content/80 pl-14">{r.content}</p>
                        </div>
                    ))}
                    {reviews?.length === 0 && <p className="opacity-50 text-center py-10">No reviews yet.</p>}
                </div>
            </div>
        )}

        {activeTab === 'about' && (
            <div className="card bg-base-100 border border-base-200 shadow-sm animate-in fade-in">
                <div className="card-body">
                    <h2 className="card-title text-2xl mb-4">About {university.name}</h2>
                    <div className="prose max-w-none">
                        <p>{university.description || "No description available for this university."}</p>
                    </div>
                    <div className="divider"></div>
                    <div className="stats shadow bg-base-200/50">
                        <div className="stat">
                            <div className="stat-title">Faculties</div>
                            {/* FIX: Use 'faculties' variable instead of 'university.faculties' */}
                            <div className="stat-value">{faculties?.length || 0}</div>
                        </div>
                        <div className="stat">
                            <div className="stat-title">Notes</div>
                            <div className="stat-value">{notes?.length || 0}</div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* MODALS - Clean Props (No i18n) */}
      {token && <AddNoteModal universityId={uniId} isOpen={isNoteModalOpen} onClose={() => setNoteModalOpen(false)} />}
      {token && <AddFacultyModal isOpen={isFacModalOpen} onClose={() => setFacModalOpen(false)} universityId={uniId} universityName={university.name} />}
      {selectedNote && <NoteModal note={selectedNote} onClose={() => setSelectedNote(null)} />}
    </div>
  );
}