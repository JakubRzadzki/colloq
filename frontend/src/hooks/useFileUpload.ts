import { useState } from 'react';
import { resolveUrl } from '../utils/api';

interface PresignedUploadResponse {
  upload_url: string;
  method: string;
  key: string;
  expires_in_seconds: number;
}

interface FileUploadResult {
  key: string;
  file_type: string;
  file_size_bytes: number;
}

/**
 * Custom hook for handling file uploads using the 3-phase presigned URL approach
 */
export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Upload a file using the 3-phase approach:
   * 1. Get presigned URL
   * 2. Upload file to presigned URL
   * 3. Confirm upload with backend
   */
  const uploadFile = async (file: File): Promise<FileUploadResult> => {
    if (!file) {
      throw new Error('No file provided');
    }

    setIsUploading(true);

    try {
      // Phase 1: Get presigned URL
      const presignedResponse = await fetch(resolveUrl('/uploads/presigned'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          filename: file.name,
          file_type: file.type || 'application/octet-stream'
        })
      });

      if (!presignedResponse.ok) {
        throw new Error('Failed to get presigned URL');
      }

      const presignedData: PresignedUploadResponse = await presignedResponse.json();

      // Phase 2: Upload file to local endpoint
      const formData = new FormData();
      formData.append('file', file);
      formData.append('key', presignedData.key);

      const uploadResponse = await fetch(presignedData.upload_url, {
        method: presignedData.method,
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadResult = await uploadResponse.json();

      // Phase 3: Confirm upload with backend
      const confirmResponse = await fetch(resolveUrl(`/uploads/notes/attachments/confirm`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          key: presignedData.key,
          file_type: file.type || 'application/octet-stream',
          file_size_bytes: file.size
        })
      });

      if (!confirmResponse.ok) {
        throw new Error('Failed to confirm upload');
      }

      const result = await confirmResponse.json();

      return {
        key: result.key || presignedData.key,
        file_type: file.type || 'application/octet-stream',
        file_size_bytes: file.size
      };

    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadFile,
    isUploading
  };
};