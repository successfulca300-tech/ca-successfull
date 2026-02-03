/**
 * Appwrite File Service
 * Handles file uploads to Appwrite Storage for test series papers
 */

import { initializeAppwrite } from '../config/appwrite.js';
import { InputFile, Permission, Role } from 'node-appwrite';

const PAPERS_BUCKET_ID = process.env.APPWRITE_BUCKET_ID || process.env.APPWRITE_PAPERS_BUCKET_ID || '693adb15001787a85335';

/**
 * Upload file to Appwrite Storage
 * 
 * @param {Buffer} fileBuffer - The file content as Buffer
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @returns {Promise<Object>} { fileId, bucketId, publicFileUrl }
 */
export const uploadFileToAppwrite = async (fileBuffer, fileName, mimeType) => {
  try {
    if (!fileBuffer) {
      throw new Error('File buffer is empty');
    }

    if (!fileName) {
      throw new Error('File name is required');
    }

    console.log(`[Appwrite] Starting upload: ${fileName} (${fileBuffer.length} bytes, ${mimeType})`);
    
    const storage = initializeAppwrite();
    
    // Create a unique file ID (Appwrite-compatible format)
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[Appwrite] Generated file ID: ${fileId}`);
    
    // Upload file to Appwrite Storage
    console.log(`[Appwrite] Creating file in bucket: ${PAPERS_BUCKET_ID}`);
    const response = await storage.createFile(
      PAPERS_BUCKET_ID,
      fileId,
      InputFile.fromBuffer(fileBuffer, fileName),
      [Permission.read(Role.any())] // Make file publicly readable
    );

    console.log(`[Appwrite] File created successfully: ${fileId}`);

    // Generate public file URL using proper format
    // Ensure endpoint has /v1 suffix
    let endpoint = process.env.APPWRITE_ENDPOINT || '';
    endpoint = endpoint.replace(/\/+$/, ''); // Remove trailing slashes
    if (!endpoint.endsWith('/v1')) {
      endpoint = endpoint + '/v1';
    }
    
    const publicFileUrl = `${endpoint}/storage/buckets/${PAPERS_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`;

    console.log(`[Appwrite] Public URL generated: ${publicFileUrl}`);

    return {
      fileId,
      bucketId: PAPERS_BUCKET_ID,
      publicFileUrl,
      fileName,
      mimeType,
      size: fileBuffer.length,
    };
  } catch (error) {
    console.error('[Appwrite] Upload error:', error.message);
    console.error('[Appwrite] Full error:', error);
    throw new Error(`Failed to upload file to Appwrite: ${error.message}`);
  }
};

/**
 * Delete file from Appwrite Storage
 * 
 * @param {string} fileId - Appwrite file ID
 * @returns {Promise<void>}
 */
export const deleteFileFromAppwrite = async (fileId) => {
  try {
    const storage = initializeAppwrite();
    await storage.deleteFile(PAPERS_BUCKET_ID, fileId);
    console.log(`File deleted from Appwrite: ${fileId}`);
  } catch (error) {
    console.error('Appwrite delete error:', error);
    throw new Error(`Failed to delete file from Appwrite: ${error.message}`);
  }
};

/**
 * Get file from Appwrite Storage
 * 
 * @param {string} fileId - Appwrite file ID
 * @returns {Promise<Buffer>} File content as Buffer
 */
export const getFileFromAppwrite = async (fileId) => {
  try {
    const storage = initializeAppwrite();
    const file = await storage.getFile(PAPERS_BUCKET_ID, fileId);
    return file;
  } catch (error) {
    console.error('Appwrite download error:', error);
    throw new Error(`Failed to download file from Appwrite: ${error.message}`);
  }
};

/**
 * Generate public preview URL for file
 * 
 * @param {string} fileId - Appwrite file ID
 * @returns {string} Public file URL
 */
export const generatePublicFileUrl = (fileId) => {
  // Ensure endpoint has /v1 suffix
  let endpoint = process.env.APPWRITE_ENDPOINT || '';
  endpoint = endpoint.replace(/\/+$/, ''); // Remove trailing slashes
  if (!endpoint.endsWith('/v1')) {
    endpoint = endpoint + '/v1';
  }
  return `${endpoint}/storage/buckets/${PAPERS_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
};

/**
 * Generate file download URL
 * 
 * @param {string} fileId - Appwrite file ID
 * @returns {string} Download URL
 */
export const generateDownloadFileUrl = (fileId) => {
  // Ensure endpoint has /v1 suffix
  let endpoint = process.env.APPWRITE_ENDPOINT || '';
  endpoint = endpoint.replace(/\/+$/, ''); // Remove trailing slashes
  if (!endpoint.endsWith('/v1')) {
    endpoint = endpoint + '/v1';
  }
  return `${endpoint}/storage/buckets/${PAPERS_BUCKET_ID}/files/${fileId}/download?project=${process.env.APPWRITE_PROJECT_ID}`;
};
