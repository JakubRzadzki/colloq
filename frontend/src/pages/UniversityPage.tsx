import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, ArrowLeft, CheckCircle, User as UserIcon, Video, Link as LinkIcon,
  BookOpen, Calendar, Award, Image as ImageIcon, Building2, Layers, Edit, 
  Search, ThumbsUp, Heart
} from 'lucide-react';
import { 
  API_URL, 
  getUniversity, getFaculties, getNotes, getCurrentUser, getUniversityReviews,
  requestUniversityImageChange, voteNote, toggleFavorite, addReview, deleteReview, updateUniversity,
  type University, type Faculty, type User, type Review
} from '../utils/api';
import { AddNoteModal } from '../components/addNoteModal';
import { AddFacultyModal } from '../components/AddFacultyModal';
import { NoteModal } from '../components/NoteModal'; // Ensure this exists

type TabType = 'materials' | 'reviews' | 'about';

// --- SUB-COMPONENTS ---

const ReviewForm: React.FC<{ universityId: number; onSuccess: () => void }> = ({ universityId, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const addReviewMutation = useMutation({
    mutationFn: addReview,
    onSuccess: () => { setContent(''); onSuccess(); }
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); addReviewMutation.mutate({ university_id: universityId, rating, content }); }} className="card bg-base-100 p-6 shadow-sm mb-6">
      <h3 className="font-bold mb-2">Write a Review</h3>
      <div className="flex gap-2 mb-2">
        {[1,2,3,4,5].map(s => <button key={s} type="button" onClick={() => setRating(s)} className={`text-xl ${s <= rating ? 'text-warning' : 'text-base-300'}`}>★</button>)}
      </div>
      <textarea value={content} onChange={e => setContent(e.target.value)} className="textarea textarea-bordered w-full" placeholder="Share your experience..."></textarea>
      <button className="btn btn-primary mt-4">Submit</button>
    </form>
  );
};

// --- MAIN COMPONENT ---

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
    onSuccess: () => alert("Image request submitted!")
  });

  const voteMutation = useMutation({ mutationFn: voteNote, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }) });
  const favMutation = useMutation({ mutationFn: toggleFavorite, onSuccess: () => alert("Updated favorites") });

  if (!university) return <div className="p-20 text-center"><span className="loading loading-spinner"></span></div>;

  return (
    <div className="space-y-8 pb-20">
      {/* BANNER */}
      <div className="relative h-64 md:h-80 bg-base-200">
        <img src={university.banner_url ? `${API_URL}${university.banner_url}` : "https://via.placeholder.com/1500x500"} className="w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-t from-base-100 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-8 flex items-end gap-6 w-full">
            <div className="avatar">
                <div className="w-32 rounded-xl ring ring-base-100 ring-offset-2 bg-base-100 shadow-2xl">
                    <img src={university.image_url ? `${API_URL}${university.image_url}` : "https://via.placeholder.com/150"} />
                </div>
                {token && (
                    <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 btn btn-xs btn-circle btn-primary"><Edit size={12}/></button>
                )}
                <input type="file" ref={fileInputRef} className="hidden" onChange={e => e.target.files?.[0] && imageReqMutation.mutate(e.target.files[0])}/>
            </div>
            <div>
                <h1 className="text-4xl font-bold text-base-content">{university.name}</h1>
                <p className="opacity-70 flex gap-2 items-center"><Building2 size={16}/> {university.city}, {university.region}</p>
            </div>
        </div>
      </div>

      {/* TABS */}
      <div className="px-8">
        <div className="tabs tabs-boxed bg-base-100 w-fit">
            <a className={`tab ${activeTab === 'materials' ? 'tab-active' : ''}`} onClick={() => setActiveTab('materials')}>Materials</a>
            <a className={`tab ${activeTab === 'reviews' ? 'tab-active' : ''}`} onClick={() => setActiveTab('reviews')}>Reviews</a>
            <a className={`tab ${activeTab === 'about' ? 'tab-active' : ''}`} onClick={() => setActiveTab('about')}>About</a>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-8 max-w-7xl mx-auto">
        {activeTab === 'materials' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="join">
                        <input className="input input-bordered join-item" placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)}/>
                        <button className="btn join-item"><Search/></button>
                    </div>
                    {token && (
                        <div className="flex gap-2">
                            <button onClick={() => setFacModalOpen(true)} className="btn btn-outline">Add Faculty</button>
                            <button onClick={() => setNoteModalOpen(true)} className="btn btn-primary">Upload Note</button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {notes?.map((n: any) => (
                        <div key={n.id} className="card bg-base-100 shadow-md border border-base-200 p-4 cursor-pointer hover:border-primary transition-all" onClick={() => setSelectedNote(n)}>
                            <div className="flex justify-between">
                                <h3 className="font-bold">{n.title}</h3>
                                <div className="badge badge-neutral"><Award size={12} className="mr-1"/> {n.score}</div>
                            </div>
                            <p className="text-sm opacity-70 line-clamp-2 my-2">{n.content}</p>
                            <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                <button onClick={() => voteMutation.mutate(n.id)} className="btn btn-xs btn-ghost"><ThumbsUp size={14}/></button>
                                <button onClick={() => favMutation.mutate(n.id)} className="btn btn-xs btn-ghost"><Heart size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'reviews' && (
            <div>
                {token && <ReviewForm universityId={uniId} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['reviews'] })} />}
                <div className="space-y-4">
                    {reviews?.map((r: any) => (
                        <div key={r.id} className="card bg-base-100 p-4 border border-base-200">
                            <div className="flex gap-2 mb-2">
                                <div className="font-bold">{r.user?.nickname || 'User'}</div>
                                <div className="text-warning">{'★'.repeat(r.rating)}</div>
                            </div>
                            <p>{r.content}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'about' && (
            <div className="prose max-w-none">
                <h3>About {university.name}</h3>
                <p>{university.description || "No description available."}</p>
            </div>
        )}
      </div>

      {/* MODALS */}
      {token && <AddNoteModal universityId={uniId} isOpen={isNoteModalOpen} onClose={() => setNoteModalOpen(false)} t={{}} lang="en" />}
      {token && <AddFacultyModal isOpen={isFacModalOpen} onClose={() => setFacModalOpen(false)} universityId={uniId} universityName={university.name} />}
      {selectedNote && <NoteModal note={selectedNote} onClose={() => setSelectedNote(null)} />}
    </div>
  );
}
import { useRef } from 'react'; // Missing import fix