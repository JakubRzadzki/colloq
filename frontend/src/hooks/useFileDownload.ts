import { useState } from 'react';
import { fetchAttachment, resolveUrl } from '../utils/api';

/**
 * Download a file and save it under its original name.
 *
 * Private note attachments (download_url, e.g. /notes/1/download/2) are fetched
 * through the API client, which adds the user's token. Other URLs are legacy
 * public files and are fetched directly.
 */
export const useFileDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadFile = async (fileUrl: string, filename: string) => {
    if (!fileUrl || !filename) {
      alert('Invalid download parameters');
      return;
    }

    setIsDownloading(true);
    try {
      const blob = /^\/notes\/\d+\/download\/\d+/.test(fileUrl)
        ? await fetchAttachment(fileUrl)
        : await fetch(resolveUrl(fileUrl)).then((r) => {
            if (!r.ok) throw Object.assign(new Error(r.statusText), { response: { status: r.status } });
            return r.blob();
          });

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 401) {
        alert('Log in to download this file.');
      } else if (status === 403) {
        alert('You must contribute to download this file. Upload a note to unlock access.');
      } else if (status === 404) {
        alert('File not found.');
      } else {
        console.error('Download error:', error);
        alert('Download failed. Please try again.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    downloadFile,
    isDownloading
  };
};
