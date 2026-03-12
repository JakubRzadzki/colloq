import { useState } from 'react';
import { Download, Lock, Eye, EyeOff, FileText } from 'lucide-react';
import { resolveUrl } from '../utils/api';
import { Attachment } from '../utils/types';
import { useFileDownload } from '../hooks/useFileDownload';
import { t } from '../utils/i18n';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']);
const PDF_EXT = '.pdf';
const DOC_EXT = new Set(['.doc', '.docx']);

function getExtension(urlOrFilename: string): string {
  const path = urlOrFilename.split('?')[0].replace(/\\/g, '/');
  const i = path.lastIndexOf('.');
  if (i === -1) return '';
  return path.slice(i).toLowerCase();
}

function getFileType(url: string, fileTypeHint?: string): 'image' | 'pdf' | 'doc' | 'other' {
  const ext = getExtension(url);
  if (fileTypeHint) {
    const hint = fileTypeHint.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(hint)) return 'image';
    if (hint === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(hint)) return 'doc';
  }
  if (IMAGE_EXT.has(ext)) return 'image';
  if (ext === PDF_EXT) return 'pdf';
  if (DOC_EXT.has(ext)) return 'doc';
  return 'other';
}

/**
 * Get display URL for files. Always returns an absolute URL so previews work
 * when frontend is on a different origin (e.g. localhost:5173 vs localhost:8000).
 */
function getDisplayUrl(fileUrl?: string): string {
  if (!fileUrl) return '';

  if (fileUrl.startsWith('notes/')) {
    return resolveUrl(`/uploads/${fileUrl}`);
  }

  if (fileUrl.includes('mock-s3.local')) {
    const keyMatch = fileUrl.match(/key=([^&]+)/);
    if (keyMatch) return resolveUrl(`/uploads/${keyMatch[1]}`);
    return '';
  }

  return resolveUrl(fileUrl);
}

/** Check if URL is localhost (Google Docs Viewer cannot fetch localhost) */
function isLocalhostUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

interface FilePreviewProps {
  attachment: Attachment;
  title?: string;
  className?: string;
}

export function FilePreview({ attachment, title, className = '' }: FilePreviewProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  if (!attachment?.file_url) {
    return (
      <div className={`rounded-xl border border-white/10 bg-white/5 p-6 ${className}`}>
        <p className="text-sm opacity-60">No file URL available.</p>
      </div>
    );
  }

  const pathPart = attachment.file_url.replace(/\\/g, '/');
  const filename = attachment.filename || pathPart.split('/').pop() || 'file';
  const fileType = getFileType(attachment.file_url, attachment.file_type);
  const ext = getExtension(attachment.file_url);
  const displayUrl = getDisplayUrl(attachment.file_url);

  if (attachment.is_blurred) {
    return (
      <div className={`rounded-xl overflow-hidden border border-white/10 bg-white/5 ${className}`}>
        <div className="relative">
          <div className="aspect-video bg-gradient-to-br from-[#5e5ce6]/20 to-[#bf5af2]/20 blur-sm flex items-center justify-center">
            <div className="text-center p-8">
              <Lock size={48} className="mx-auto mb-4 text-[#5e5ce6] opacity-50" />
              <h3 className="text-lg font-semibold mb-2">{t('upload_barrier_title')}</h3>
              <p className="text-sm opacity-70 mb-4">{t('upload_barrier_desc')}</p>
            </div>
          </div>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center p-6 bg-white/10 rounded-xl border border-white/20">
              <Lock size={32} className="mx-auto mb-3 text-white" />
              <h3 className="text-white font-bold mb-2">{t('upload_barrier_title')}</h3>
              <p className="text-white/80 text-sm mb-4">
                {t('upload_barrier_desc')}
              </p>
              <button className="bg-gradient-to-r from-[#5e5ce6] to-[#bf5af2] text-white px-6 py-2 rounded-lg font-medium hover:scale-105 transition-transform">
                {t('upload')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Images (jpg, png, etc.) — standard <img>
  if (fileType === 'image') {
    return (
      <div className={`rounded-xl overflow-hidden border border-white/10 ${className}`}>
        <div className="relative">
          {!isImageLoaded && (
            <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
          )}
          <img
            src={displayUrl}
            alt={title || filename}
            onLoad={() => setIsImageLoaded(true)}
            className={`w-full max-h-[70vh] object-contain bg-black/5 transition-opacity duration-300 ${
              isImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              onClick={() => setShowFullImage(!showFullImage)}
              className="bg-black/50 text-white p-2 rounded-lg hover:bg-black/70 transition-colors"
              title={showFullImage ? 'Blur image' : 'Show full image'}
            >
              {showFullImage ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <DownloadButton fileUrl={attachment.file_url} filename={filename} />
          </div>
        </div>
        <div className="p-3 bg-black/5">
          <p className="text-sm opacity-70 truncate">{title || filename}</p>
        </div>
      </div>
    );
  }

  // PDF — object tag with iframe fallback
  if (fileType === 'pdf') {
    return (
      <div className={`rounded-xl overflow-hidden border border-white/10 bg-white/5 ${className}`}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/20">
          <span className="text-sm font-medium opacity-80 truncate">{title || filename}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => window.open(displayUrl, '_blank')}
              className="text-sm text-[#5e5ce6] hover:underline flex items-center gap-1"
            >
              <Eye size={14} /> Open
            </button>
            <DownloadButton fileUrl={attachment.file_url} filename={filename} />
          </div>
        </div>
        <div className="w-full h-[min(70vh,600px)] bg-white">
          {/* Primary: object tag for PDF rendering */}
          <object
            data={displayUrl}
            type="application/pdf"
            className="w-full h-full"
            aria-label="PDF Preview"
          >
            {/* Fallback: iframe if object tag doesn't work */}
            <iframe
              src={displayUrl}
              title="PDF Preview"
              className="w-full h-full"
            >
              <p>Your browser does not support PDF preview. <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="text-[#5e5ce6]">Click here to download the PDF</a>.</p>
            </iframe>
          </object>
        </div>
      </div>
    );
  }

  // DOC/DOCX — Google Docs Viewer (requires publicly accessible URL)
  if (fileType === 'doc') {
    const canUseGoogleViewer = !isLocalhostUrl(displayUrl);
    const googleViewerUrl = canUseGoogleViewer
      ? `https://docs.google.com/gview?url=${encodeURIComponent(displayUrl)}&embedded=true`
      : null;

    return (
      <div className={`rounded-xl overflow-hidden border border-white/10 bg-white/5 ${className}`}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/20">
          <span className="text-sm font-medium opacity-80 truncate">{title || filename}</span>
          <DownloadButton fileUrl={attachment.file_url} filename={filename} />
        </div>
        {googleViewerUrl ? (
          <iframe
            src={googleViewerUrl}
            title="Document Preview"
            className="w-full h-[min(70vh,600px)] bg-white border-0"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-[min(40vh,400px)] p-6 bg-black/5">
            <FileText size={48} className="opacity-40 mb-3" />
            <p className="text-sm opacity-70 text-center mb-4">
              DOC/DOCX preview requires a publicly accessible URL. Download to view locally.
            </p>
            <DownloadButton fileUrl={attachment.file_url} filename={filename} />
          </div>
        )}
      </div>
    );
  }

  // Other — generic file icon + download
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 p-6 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center">
          <FileText size={28} className="opacity-70" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{title || filename}</h3>
          <p className="text-sm opacity-60">{ext || 'File'} • Preview not available</p>
        </div>
        <DownloadButton fileUrl={attachment.file_url} filename={filename} />
      </div>
    </div>
  );
}

function DownloadButton({ fileUrl, filename }: { fileUrl: string; filename: string }) {
  const { downloadFile, isDownloading } = useFileDownload();

  return (
    <button
      onClick={() => downloadFile(fileUrl, filename)}
      disabled={isDownloading}
      className="text-sm text-[#5e5ce6] hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Download file"
    >
      <Download size={14} />
      {isDownloading ? 'Downloading...' : 'Download'}
    </button>
  );
}
