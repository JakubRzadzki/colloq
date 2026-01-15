import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Building2, BookOpen, CheckCircle, Upload } from 'lucide-react';
import { createFaculty } from '../utils/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  universityId: number;
  universityName: string;
}

export function AddFacultyModal({ isOpen, onClose, universityId, universityName }: Props) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null); // Używamy ref do formularza

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: createFaculty,
    onSuccess: () => {
      setSuccess(true);
      // Odświeżamy listę wydziałów dla danej uczelni
      queryClient.invalidateQueries({ queryKey: ['faculties', universityId] });

      setTimeout(() => {
        handleClose();
      }, 2500);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Wystąpił błąd podczas dodawania wydziału.");
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Sprawdzenie rozmiaru (np. max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Plik jest za duży (max 5MB).");
        return;
      }

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
      // Usunięto description, ponieważ backend go nie obsługuje
      university_id: universityId,
      image: imageFile || undefined
    });
  };

  const handleClose = () => {
    setSuccess(false);
    setError('');
    setImagePreview(null);
    setImageFile(null);
    if (formRef.current) formRef.current.reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-base-100 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-primary/20">

        {/* Header */}
        <div className="bg-base-200 p-4 flex justify-between items-center border-b border-base-300">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <BookOpen className="text-primary"/> Zgłoś nowy wydział
            </h3>
            <p className="text-xs opacity-70 mt-1">Uczelnia: {universityName}</p>
          </div>
          <button onClick={handleClose} className="btn btn-ghost btn-circle btn-sm">
            <X size={20}/>
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8 space-y-4 animate-in zoom-in duration-300">
              <CheckCircle size={64} className="text-success mx-auto" />
              <div>
                <h3 className="text-xl font-bold text-success">Sukces!</h3>
                <p className="opacity-70 mt-2">
                  Wydział został zgłoszony.<br/>
                  Oczekuje na weryfikację administratora.
                </p>
              </div>
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && <div className="alert alert-error text-sm py-2 shadow-sm">{error}</div>}

              {/* Nazwa Wydziału */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Nazwa Wydziału</span>
                </label>
                <input
                  name="name"
                  placeholder="np. Wydział Elektroniki i Informatyki"
                  className="input input-bordered w-full focus:input-primary"
                  required
                />
              </div>

              {/* Zdjęcie (Opcjonalne) */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Zdjęcie wydziału (opcjonalne)</span>
                </label>

                <div className="space-y-3">
                  {!imagePreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer border-base-300 bg-base-200/50 hover:bg-base-200 hover:border-primary transition-all duration-200">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        <Upload className="w-8 h-8 mb-2 opacity-50" />
                        <p className="mb-1 text-sm text-base-content/70">
                          <span className="font-bold text-primary">Kliknij</span> lub upuść zdjęcie
                        </p>
                        <p className="text-xs text-base-content/40">PNG, JPG (max. 5MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  ) : (
                    <div className="relative group">
                      <img
                        src={imagePreview}
                        alt="Podgląd"
                        className="w-full h-40 object-cover rounded-xl border border-base-300 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setImageFile(null);
                        }}
                        className="absolute top-2 right-2 btn btn-xs btn-circle btn-error shadow-md opacity-90 hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Przyciski Akcji */}
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleClose}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className={`btn btn-primary px-6 ${mutation.isPending ? 'loading' : ''}`}
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