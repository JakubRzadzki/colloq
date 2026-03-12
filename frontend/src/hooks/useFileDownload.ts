import { useState } from 'react';
import { resolveUrl } from '../utils/api';

/**
 * Custom hook for secure file downloads with authentication and error handling.
 * 
 * Features:
 * - Fetches files as Blob using authenticated requests
 * - Handles Give-to-Get restrictions (403 Forbidden)
 * - Preserves original filenames
 * - Memory-efficient with URL revocation
 * - User feedback via alert messages
 */
export const useFileDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  /**
   * Download a file with secure authentication
   * @param fileUrl - The file URL (relative or absolute)
   * @param filename - The desired filename for download
   */
  const downloadFile = async (fileUrl: string, filename: string) => {
    if (!fileUrl || !filename) {
      alert('Invalid download parameters');
      return;
    }

    setIsDownloading(true);
    
    try {
      // Resolve URL to handle relative paths
      const fullUrl = resolveUrl(fileUrl);
      
      // Fetch the file with authentication
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          alert('You must contribute to download this file. Upload a note to unlock access.');
        } else if (response.status === 404) {
          alert('File not found.');
        } else {
          alert(`Download failed: ${response.statusText}`);
        }
        return;
      }

      // Get blob and create download
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      // Create and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up to prevent memory leaks
      URL.revokeObjectURL(downloadUrl);
      
      alert('Download started!');
      
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    downloadFile,
    isDownloading
  };
};
