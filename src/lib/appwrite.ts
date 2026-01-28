/**
 * Appwrite Media Upload Utility
 * 
 * Handles uploading media files (videos, images) to Appwrite via backend API
 * Backend processes the upload and returns the accessible URL
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface UploadResponse {
  success: boolean;
  url: string;
  fileId: string;
  message?: string;
}

export interface UploadError {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Upload a file to Appwrite via backend API
 * @param file - File object to upload
 * @param mediaType - Type of media ('video' | 'image')
 * @returns Promise with upload response containing accessible URL
 */
export async function uploadMediaFile(
  file: File,
  mediaType: 'video' | 'image' = 'video'
): Promise<UploadResponse | UploadError> {
  try {
    // Validate file
    if (!file) {
      return {
        success: false,
        message: 'No file provided',
      };
    }

    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      return {
        success: false,
        message: 'Not authenticated. Please login first.',
      };
    }

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaType', mediaType);

    // Upload to backend endpoint
    const response = await fetch(`${API_URL}/api/upload/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Upload failed',
        error: data.error,
      };
    }

    return {
      success: true,
      url: data.url,
      fileId: data.fileId,
      message: 'File uploaded successfully',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Upload failed',
      error: error.toString(),
    };
  }
}

/**
 * Generate preview URL for thumbnail
 * @param fileId - Appwrite file ID
 * @returns Preview image URL
 */
export function getThumbnailUrl(fileId: string): string {
  return `${API_URL}/api/upload/thumbnail/${fileId}`;
}

/**
 * Validate file before upload
 * @param file - File to validate
 * @param mediaType - Expected media type
 * @returns Validation result with error message if invalid
 */
export function validateFile(
  file: File,
  mediaType: 'video' | 'image' = 'video'
): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  // Size limits (in bytes)
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB

  // Validate size
  if (mediaType === 'video' && file.size > MAX_VIDEO_SIZE) {
    return {
      valid: false,
      error: `Video file too large. Maximum ${MAX_VIDEO_SIZE / 1024 / 1024}MB allowed.`,
    };
  }

  if (mediaType === 'image' && file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Image file too large. Maximum ${MAX_IMAGE_SIZE / 1024 / 1024}MB allowed.`,
    };
  }

  // Validate type
  if (mediaType === 'video') {
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validVideoTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid video format. Supported: MP4, WebM, MOV. Got: ${file.type}`,
      };
    }
  }

  if (mediaType === 'image') {
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid image format. Supported: JPEG, PNG, WebP. Got: ${file.type}`,
      };
    }
  }

  return { valid: true };
}
