/**
 * File preview: PDF in iframe, images as img, other files as download link.
 * Uses resolveUrl for correct API base path.
 */
import { Download } from 'lucide-react';
import { resolveUrl } from '../utils/api';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']);
const PDF_EXT = '.pdf';

function getExtension(url: string): string {
  const path = url.split('?')[0];
  const i = path.lastIndexOf('.');
  if (i === -1) return '';
  return path.slice(i).toLowerCase();
}

export function FilePreview({
  fileUrl,
  title,
  className = '',
}: {
  fileUrl: string;
  title?: string;
  className?: string;
}) {
  if (!fileUrl?.trim()) return null;
  const fullUrl = resolveUrl(fileUrl);
  const ext = getExtension(fileUrl);

  // PDF: embed in iframe (may be blocked by CORS on some setups)
  if (ext === PDF_EXT) {
    return (
      <div className={`rounded-xl overflow-hidden border border-white/10 bg-white/5 ${className}`}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/20">
          <span className="text-sm font-medium opacity-80">PDF – {title || 'Preview'}</span>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#5e5ce6] hover:underline flex items-center gap-1"
          >
            <Download size={14} /> Pobierz
          </a>
        </div>
        <iframe
          src={fullUrl}
          title={title || 'PDF preview'}
          className="w-full h-[min(70vh,600px)] bg-white"
        />
      </div>
    );
  }

  // Images: direct img
  if (IMAGE_EXT.has(ext)) {
    return (
      <div className={`rounded-xl overflow-hidden border border-white/10 ${className}`}>
        <img
          src={fullUrl}
          alt={title || 'Attachment'}
          className="w-full max-h-[70vh] object-contain bg-black/5"
        />
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center py-2 text-sm text-[#5e5ce6] hover:underline"
        >
          Otwórz w nowej karcie
        </a>
      </div>
    );
  }

  // Other: download link only
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 p-4 ${className}`}>
      <p className="text-sm opacity-70 mb-3">Podgląd niedostępny dla tego typu pliku.</p>
      <a
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary px-4 py-2 rounded-xl inline-flex items-center gap-2 no-underline text-sm"
      >
        <Download size={16} /> Pobierz plik
      </a>
    </div>
  );
}
