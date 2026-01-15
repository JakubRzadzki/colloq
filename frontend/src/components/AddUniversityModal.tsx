import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Building2, MapPin, CheckCircle, Upload } from 'lucide-react';
import { createUniversity } from '../utils/api';

// List of regions (Polish administrative divisions)
const REGIONS = [
  "Dolnośląskie", "Kujawsko-Pomorskie", "Lubelskie", "Lubuskie", "Łódzkie",
  "Małopolskie", "Mazowieckie", "Opolskie", "Podkarpackie", "Podlaskie",
  "Pomorskie", "Śląskie", "Świętokrzyskie", "Warmińsko-Mazurskie",
  "Wielkopolskie", "Zachodniopomorskie"
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AddUniversityModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: createUniversity,
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['universities'] });
      setTimeout(() => {
        setSuccess(false);
        onClose();
        resetForm();
      }, 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "An error occurred while adding the university.");
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    mutation.mutate({
      name: formData.get('name') as string,
      city: formData.get('city') as string,
      region: formData.get('region') as string,
      image: imageFile || undefined
    });
  };

  const resetForm = () => {
    setImagePreview(null);
    setImageFile(null);
    const form = document.getElementById('university-form') as HTMLFormElement;
    if (form) form.reset();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-base-100 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-primary/20">
        {/* Header */}
        <div className="bg-base-200 p-4 flex justify-between items-center border-b border-base-300">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Building2 className="text-primary"/> Zgłoś nową uczelnię
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X size={20}/>
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle size={48} className="text-success mx-auto" />
              <h3 className="text-xl font-bold">Dziękujemy!</h3>
              <p className="opacity-70">Uczelnia została zgłoszona do weryfikacji przez administratora.</p>
            </div>
          ) : (
            <form id="university-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && <div className="alert alert-error text-sm py-2">{error}</div>}

              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Nazwa Uczelni</span></label>
                <input
                  name="name"
                  placeholder="np. Wyższa Szkoła Informatyki"
                  className="input input-bordered w-full"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Miasto</span></label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"/>
                  <input
                    name="city"
                    placeholder="np. Warszawa"
                    className="input input-bordered w-full pl-10"
                    required
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Województwo</span></label>
                <select name="region" className="select select-bordered w-full" defaultValue="" required>
                  <option value="" disabled>-- Wybierz --</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Zdjęcie uczelni (opcjonalne)</span>
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer border-base-300 hover:border-primary transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 opacity-50" />
                        <p className="mb-2 text-sm text-base-content/70">
                          <span className="font-semibold">Kliknij aby przesłać</span> lub przeciągnij i upuść
                        </p>
                        <p className="text-xs text-base-content/50">PNG, JPG lub WEBP (MAX. 5MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Podgląd"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setImageFile(null);
                        }}
                        className="absolute top-2 right-2 btn btn-xs btn-circle btn-error"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <button type="button" className="btn" onClick={() => {
                  onClose();
                  resetForm();
                }}>
                  Anuluj
                </button>
                <button
                  type="submit"
                  className={`btn btn-primary ${mutation.isPending ? 'loading' : ''}`}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Wysyłanie...' : 'Wyślij zgłoszenie'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}