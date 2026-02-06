import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getUniversities, API_URL } from '../utils/api';
import { ArrowLeft, MapPin } from 'lucide-react';

interface University {
  id: number;
  name: string;
  region: string;
  image_url?: string;
  city: string;
}

// Zmiana na 'export function' i dodanie prop 't'
export function RegionPage({ t }: { t: any }) {
  const { regionName } = useParams<{ regionName: string }>();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const data = await getUniversities();
        setUniversities(data);
      } catch (error) {
        console.error('Failed to fetch universities:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUniversities();
  }, []);

  // FIX: Case-insensitive filtering (Malopolskie === malopolskie)
  // FIXED: Case-insensitive filtering (Malopolskie === malopolskie)
  const filteredUniversities = universities.filter(
    (uni) => uni.region?.toLowerCase() === regionName?.toLowerCase()
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner text-[#5e5ce6] loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-32 pb-12 animate-in fade-in">
      <Link to="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors">
        <ArrowLeft size={18}/> {t.home || "Home"}
      </Link>

      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-white capitalize mb-4">
          Region: <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5e5ce6] to-[#32ade6]">{regionName}</span>
        </h1>
        <p className="text-white/60 text-lg">
          Znaleziono {filteredUniversities.length} uczelni w tej lokalizacji.
        </p>
      </div>
      
      {filteredUniversities.length === 0 ? (
        <div className="bg-[#1e1e23]/40 border border-white/10 rounded-2xl p-12 text-center">
          <p className="text-white/40 text-xl">
            Brak uczelni w tym regionie w naszej bazie danych.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUniversities.map((uni) => (
            <Link 
              to={`/university/${uni.id}`}
              key={uni.id} 
              className="group bg-[#1e1e23]/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-[#5e5ce6]/50 hover:shadow-lg hover:shadow-[#5e5ce6]/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer block"
            >
              <div className="h-48 overflow-hidden relative">
                 {/* Fallback image logic */}
                 <img 
                  src={uni.image_url ? `${API_URL}${uni.image_url}` : "https://via.placeholder.com/400x200?text=No+Image"} 
                  alt={uni.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                   <h3 className="text-xl font-bold text-white leading-tight">{uni.name}</h3>
                </div>
              </div>
              
              <div className="p-5">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                   <MapPin size={16} className="text-[#32ade6]"/> {uni.city}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}