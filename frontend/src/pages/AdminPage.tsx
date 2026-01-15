import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, BookOpen, GraduationCap, Building2, CheckCircle, Library } from 'lucide-react';
import { API_URL, getAuthHeader } from '../utils/api';
import { useState } from 'react';

export function AdminPage({ t }: { t: any }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('notes');

  const { data: pending } = useQuery({
    queryKey: ['pending'],
    queryFn: async () =>
      axios.get(`${API_URL}/admin/pending_items`, { headers: getAuthHeader() })
        .then(r => r.data)
  });

  const approveNote = (id: number) => {
    axios.post(`${API_URL}/admin/approve/${id}`, {}, { headers: getAuthHeader() })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['pending'] });
        alert("Notatka zatwierdzona!");
      })
      .catch(err => alert("Błąd: " + err.response?.data?.detail));
  };

  const approveUniversity = (id: number) => {
    axios.post(`${API_URL}/admin/approve/university/${id}`, {}, { headers: getAuthHeader() })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['pending'] });
        alert("Uczelnia zatwierdzona!");
      })
      .catch(err => alert("Błąd: " + err.response?.data?.detail));
  };

  const approveField = (id: number) => {
    axios.post(`${API_URL}/admin/approve/field/${id}`, {}, { headers: getAuthHeader() })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['pending'] });
        alert("Kierunek zatwierdzony!");
      })
      .catch(err => alert("Błąd: " + err.response?.data?.detail));
  };

  const approveSubject = (id: number) => {
    axios.post(`${API_URL}/admin/approve/subject/${id}`, {}, { headers: getAuthHeader() })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['pending'] });
        alert("Przedmiot zatwierdzony!");
      })
      .catch(err => alert("Błąd: " + err.response?.data?.detail));
  };

  const getCount = (type: string) => {
    if (!pending) return 0;
    switch(type) {
      case 'notes': return pending.notes?.length || 0;
      case 'universities': return pending.universities?.length || 0;
      case 'fields': return pending.fields?.length || 0;
      case 'subjects': return pending.subjects?.length || 0;
      default: return 0;
    }
  };

  const totalPending = getCount('notes') + getCount('universities') + getCount('fields') + getCount('subjects');

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow-xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="text-primary"/> {t.adminTitle || 'Panel Administracyjny'}
            </h2>
            <p className="opacity-70 text-sm mt-1">
              {totalPending} {totalPending === 1 ? 'element oczekuje' : 'elementów oczekuje'} na zatwierdzenie
            </p>
          </div>

          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title text-xs">Notatki</div>
              <div className="stat-value">{getCount('notes')}</div>
            </div>
            <div className="stat">
              <div className="stat-title text-xs">Uczelnie</div>
              <div className="stat-value">{getCount('universities')}</div>
            </div>
            <div className="stat">
              <div className="stat-title text-xs">Kierunki</div>
              <div className="stat-value">{getCount('fields')}</div>
            </div>
            <div className="stat">
              <div className="stat-title text-xs">Przedmioty</div>
              <div className="stat-value">{getCount('subjects')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs tabs-boxed">
        <button
          className={`tab ${activeTab === 'notes' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <BookOpen size={16} className="mr-2"/>
          Notatki ({getCount('notes')})
        </button>
        <button
          className={`tab ${activeTab === 'universities' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('universities')}
        >
          <Building2 size={16} className="mr-2"/>
          Uczelnie ({getCount('universities')})
        </button>
        <button
          className={`tab ${activeTab === 'fields' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('fields')}
        >
          <GraduationCap size={16} className="mr-2"/>
          Kierunki ({getCount('fields')})
        </button>
        <button
          className={`tab ${activeTab === 'subjects' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          <Library size={16} className="mr-2"/>
          Przedmioty ({getCount('subjects')})
        </button>
      </div>

      {activeTab === 'notes' && (
        <div className="card bg-base-100 shadow-xl p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="text-warning"/> Notatki do zatwierdzenia
          </h3>

          {getCount('notes') === 0 ? (
            <div className="alert alert-info">
              <CheckCircle size={20}/>
              <span>Brak notatek do zatwierdzenia</span>
            </div>
          ) : (
            <div className="space-y-4">
              {pending?.notes?.map((n: any) => (
                <div key={n.id} className="card bg-base-200 border-l-4 border-warning">
                  <div className="card-body p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{n.title || "Bez tytułu"}</h4>
                        <p className="text-sm opacity-80 mt-1">
                          {n.content?.substring(0, 200)}...
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs">
                          <span className="badge badge-outline">
                            Autor: {n.author?.nickname || n.author?.email}
                          </span>
                          <span className="badge badge-outline">
                            Uczelnia ID: {n.university_id}
                          </span>
                          {n.image_url && (
                            <a
                              href={`${API_URL}${n.image_url}`}
                              target="_blank"
                              className="badge badge-primary badge-outline"
                            >
                              Obraz
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveNote(n.id)}
                          className="btn btn-success btn-sm text-white"
                        >
                          <CheckCircle size={16} className="mr-1"/>
                          Zatwierdź
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'universities' && (
        <div className="card bg-base-100 shadow-xl p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Building2 className="text-info"/> Uczelnie do zatwierdzenia
          </h3>

          {getCount('universities') === 0 ? (
            <div className="alert alert-info">
              <CheckCircle size={20}/>
              <span>Brak uczelni do zatwierdzenia</span>
            </div>
          ) : (
            <div className="space-y-4">
              {pending?.universities?.map((u: any) => (
                <div key={u.id} className="card bg-base-200 border-l-4 border-info">
                  <div className="card-body p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{u.name}</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="badge badge-outline">
                            Miasto: {u.city}
                          </span>
                          <span className="badge badge-outline">
                            Region: {u.region}
                          </span>
                          {u.type && (
                            <span className="badge badge-outline">
                              Typ: {u.type}
                            </span>
                          )}
                        </div>
                        <p className="text-sm opacity-70 mt-2">
                          Dodano: {new Date(u.created_at || '').toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveUniversity(u.id)}
                          className="btn btn-success btn-sm text-white"
                        >
                          <CheckCircle size={16} className="mr-1"/>
                          Zatwierdź
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'fields' && (
        <div className="card bg-base-100 shadow-xl p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <GraduationCap className="text-secondary"/> Kierunki do zatwierdzenia
          </h3>

          {getCount('fields') === 0 ? (
            <div className="alert alert-info">
              <CheckCircle size={20}/>
              <span>Brak kierunków do zatwierdzenia</span>
            </div>
          ) : (
            <div className="space-y-4">
              {pending?.fields?.map((f: any) => (
                <div key={f.id} className="card bg-base-200 border-l-4 border-secondary">
                  <div className="card-body p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{f.name}</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="badge badge-outline">
                            Stopień: {f.degree_level}
                          </span>
                          <span className="badge badge-outline">
                            Uczelnia ID: {f.university_id}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveField(f.id)}
                          className="btn btn-success btn-sm text-white"
                        >
                          <CheckCircle size={16} className="mr-1"/>
                          Zatwierdź
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="card bg-base-100 shadow-xl p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Library className="text-accent"/> Przedmioty do zatwierdzenia
          </h3>

          {getCount('subjects') === 0 ? (
            <div className="alert alert-info">
              <CheckCircle size={20}/>
              <span>Brak przedmiotów do zatwierdzenia</span>
            </div>
          ) : (
            <div className="space-y-4">
              {pending?.subjects?.map((s: any) => (
                <div key={s.id} className="card bg-base-200 border-l-4 border-accent">
                  <div className="card-body p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{s.name}</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="badge badge-outline">
                            Semestr: {s.semester}
                          </span>
                          <span className="badge badge-outline">
                            Kierunek ID: {s.field_of_study_id}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveSubject(s.id)}
                          className="btn btn-success btn-sm text-white"
                        >
                          <CheckCircle size={16} className="mr-1"/>
                          Zatwierdź
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}