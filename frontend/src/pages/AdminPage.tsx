import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, FileText, GraduationCap, Building, Layers, BookOpen, Camera, Check, X, Edit } from 'lucide-react';
import {
  getPendingItems, approveImageRequest, rejectImageRequest, rejectItem, approveItem,
  updateUniversityImage, API_URL, type PendingItems
} from '../utils/api';

type TabType = 'universities' | 'faculties' | 'fields' | 'subjects' | 'notes' | 'images';

// Helper function to map UI tabs to API item types
const getApiType = (tab: TabType): string => {
  switch (tab) {
    case 'universities': return 'university';
    case 'faculties': return 'faculty';
    case 'fields': return 'field';
    case 'subjects': return 'subject';
    case 'notes': return 'note';
    case 'images': return 'image';
    default: return 'note';
  }
};

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('notes');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingUniId, setEditingUniId] = useState<number | null>(null);

  const { data: pending, isLoading } = useQuery<PendingItems>({
    queryKey: ['pending'],
    queryFn: getPendingItems
  });

  const approveMutation = useMutation({
    mutationFn: ({type, id}: {type: string, id: number}) => approveItem(type, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending'] })
  });

  const rejectMutation = useMutation({
    mutationFn: ({type, id}: {type: string, id: number}) => rejectItem(type, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending'] })
  });

  const imgMutation = useMutation({
    mutationFn: ({id, action}: {id: number, action: 'approve'|'reject'}) =>
      action === 'approve' ? approveImageRequest(id) : rejectImageRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending'] })
  });

  const uniImgMutation = useMutation({
    mutationFn: ({id, file}: {id: number, file: File}) => updateUniversityImage(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending'] });
      setEditingUniId(null);
    }
  });

  if (isLoading) return <div className="p-20 text-center">Loading...</div>;

  const tabs = [
    { id: 'notes', icon: FileText, label: 'Notes', list: pending?.notes },
    { id: 'universities', icon: GraduationCap, label: 'Universities', list: pending?.universities },
    { id: 'faculties', icon: Building, label: 'Faculties', list: pending?.faculties },
    { id: 'fields', icon: Layers, label: 'Fields', list: pending?.fields },
    { id: 'subjects', icon: BookOpen, label: 'Subjects', list: pending?.subjects },
    { id: 'images', icon: Camera, label: 'Images', list: pending?.image_requests }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in">
      <h1 className="text-3xl font-bold mb-6 flex gap-2 items-center">
        <ShieldCheck className="text-primary"/> Admin Panel
      </h1>

      <div className="tabs tabs-boxed mb-6 overflow-x-auto justify-start">
        {tabs.map(t => (
            <a
              key={t.id}
              className={`tab ${activeTab === t.id ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(t.id as any)}
            >
                <t.icon size={16} className="mr-2"/> {t.label} ({t.list?.length || 0})
            </a>
        ))}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={e => e.target.files?.[0] && editingUniId && uniImgMutation.mutate({id: editingUniId, file: e.target.files[0]})}
      />

      <div className="space-y-2">
        {activeTab === 'images' ? (
            pending?.image_requests.map((req: any) => (
                <div key={req.id} className="card bg-base-100 shadow p-4 flex-col md:flex-row gap-4 items-center border border-base-200">
                    <div className="relative group cursor-pointer" onClick={() => setSelectedImage(`${API_URL}${req.new_image_url}`)}>
                      <img src={`${API_URL}${req.new_image_url}`} className="w-24 h-24 object-cover rounded-lg border-2 border-success"/>
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg text-white font-bold text-xs">VIEW</div>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold">Image Request #{req.id}</h3>
                        <p className="text-sm opacity-50">University ID: {req.university_id}</p>
                        <p className="text-xs opacity-40">By User ID: {req.submitted_by_id}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => imgMutation.mutate({id: req.id, action: 'approve'})} className="btn btn-success btn-sm text-white"><Check size={16}/> Approve</button>
                      <button onClick={() => imgMutation.mutate({id: req.id, action: 'reject'})} className="btn btn-error btn-sm text-white"><X size={16}/> Reject</button>
                    </div>
                </div>
            ))
        ) : (
            (pending as any)?.[activeTab]?.map((item: any) => (
                <div key={item.id} className="card bg-base-100 shadow p-4 flex-col md:flex-row justify-between items-center border border-base-200 gap-4">
                    <div className="flex gap-4 items-center w-full">
                        {activeTab === 'universities' && (
                            <div className="relative group shrink-0">
                                <img src={item.image_url ? `${API_URL}${item.image_url}` : "https://via.placeholder.com/50"} className="w-12 h-12 rounded bg-base-200 object-cover"/>
                                <button onClick={() => { setEditingUniId(item.id); fileInputRef.current?.click(); }} className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white rounded"><Edit size={12}/></button>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold truncate">{item.name || item.title}</h3>
                            <p className="text-xs opacity-50 truncate">
                              {activeTab === 'notes' ? item.content : `${item.city || ''} (ID: ${item.id})`}
                            </p>
                            {item.image_url && activeTab !== 'universities' && (
                              <button onClick={() => setSelectedImage(`${API_URL}${item.image_url}`)} className="btn btn-xs btn-outline mt-1 gap-1"><Camera size={10}/> View Image</button>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => approveMutation.mutate({type: getApiType(activeTab), id: item.id})}
                          className="btn btn-success btn-sm text-white"
                          title="Approve"
                        >
                          <Check size={16}/>
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate({type: getApiType(activeTab), id: item.id})}
                          className="btn btn-error btn-sm text-white"
                          title="Reject (Delete)"
                        >
                          <X size={16}/>
                        </button>
                    </div>
                </div>
            ))
        )}

        {(activeTab === 'images' ? pending?.image_requests : (pending as any)?.[activeTab])?.length === 0 && (
          <div className="text-center py-16 opacity-50 border-2 border-dashed border-base-300 rounded-xl">
            <Check size={48} className="mx-auto mb-2 opacity-20"/>
            <p>All clean! Nothing pending here.</p>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <button className="absolute -top-10 right-0 btn btn-circle btn-ghost text-white">✕</button>
            <img src={selectedImage} className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}