/**
 * Paper Upload API Client - Production Ready
 * Frontend implementation for uploading PDF papers to test series
 */

import apiClient from './axios-config'; // Your axios instance

/**
 * Upload paper to test series
 * 
 * @param {string} testSeriesId - ID of the test series
 * @param {File} file - PDF file object
 * @param {Object} metadata - Paper metadata
 * @param {string} metadata.group - Group (Group 1, Group 2, Both)
 * @param {string} metadata.subject - Subject (FR, AFM, Audit, DT, IDT)
 * @param {string} metadata.paperType - Type (question, suggested, evaluated)
 * @param {number} metadata.paperNumber - Paper number
 * @param {string} metadata.syllabusPercentage - Coverage (100%, 50%, 30%)
 * @param {Function} onProgress - Callback for upload progress (0-100)
 * @returns {Promise<Object>} Upload response
 */
export const uploadTestSeriesPaper = async (
  testSeriesId,
  file,
  metadata,
  onProgress
) => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file selected');
    }

    // Validate file is PDF
    if (file.type !== 'application/pdf') {
      throw new Error(`Invalid file type. Expected PDF, got ${file.type}`);
    }

    // Validate file size (20MB max)
    const maxSizeBytes = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      throw new Error(`File too large (${sizeMB}MB). Maximum is 20MB`);
    }

    // Validate metadata
    const requiredFields = ['group', 'subject', 'paperType'];
    const missingFields = requiredFields.filter(field => !metadata[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Create FormData
    const formData = new FormData();
    formData.append('paper', file); // File must be named 'paper'
    formData.append('group', metadata.group);
    formData.append('subject', metadata.subject);
    formData.append('paperType', metadata.paperType);
    formData.append('paperNumber', metadata.paperNumber || 1);
    formData.append('syllabusPercentage', metadata.syllabusPercentage || '100%');

    console.log(`[PaperUpload] Starting upload:`, {
      file: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      series: testSeriesId,
      subject: metadata.subject
    });

    // Make request with progress tracking
    const response = await apiClient.post(
      `/api/testseries/${testSeriesId}/papers`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Track upload progress
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
            console.log(`[PaperUpload] Progress: ${percentCompleted}%`);
          }
        },
      }
    );

    if (response.data.success) {
      console.log(`[PaperUpload] Success:`, response.data.data);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } else {
      throw new Error(response.data.message || 'Upload failed');
    }

  } catch (error) {
    console.error(`[PaperUpload] Error:`, error.message);

    // Return structured error response
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'An error occurred during upload',
      error: error
    };
  }
};

/**
 * Get all papers for a test series
 */
export const getPapersByTestSeries = async (testSeriesId, filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.group) params.append('group', filters.group);
    if (filters.subject) params.append('subject', filters.subject);

    const response = await apiClient.get(
      `/api/testseries/${testSeriesId}/papers${params.toString() ? '?' + params.toString() : ''}`
    );

    return {
      success: true,
      data: response.data.data || [],
      count: response.data.count
    };
  } catch (error) {
    console.error('[GetPapers] Error:', error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      data: []
    };
  }
};

/**
 * Get papers grouped by subject
 */
export const getPapersGroupedBySubject = async (testSeriesId, filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.group) params.append('group', filters.group);
    if (filters.series) params.append('series', filters.series);

    const response = await apiClient.get(
      `/api/testseries/${testSeriesId}/papers/grouped${params.toString() ? '?' + params.toString() : ''}`
    );

    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    console.error('[GroupedPapers] Error:', error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      data: []
    };
  }
};

/**
 * Get paper summary with counts
 */
export const getPapersSummary = async (testSeriesId) => {
  try {
    const response = await apiClient.get(`/api/testseries/${testSeriesId}/papers-summary`);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('[Summary] Error:', error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      data: {}
    };
  }
};

/**
 * Get my papers (subadmin only)
 */
export const getMyPapers = async () => {
  try {
    const response = await apiClient.get('/api/testseries/subadmin/my-papers');
    return {
      success: true,
      data: response.data.data || [],
      count: response.data.count
    };
  } catch (error) {
    console.error('[MyPapers] Error:', error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      data: []
    };
  }
};

/**
 * Update paper details
 */
export const updatePaper = async (paperId, updateData) => {
  try {
    const response = await apiClient.put(
      `/api/testseries/papers/${paperId}`,
      updateData
    );

    return {
      success: true,
      data: response.data.data,
      message: response.data.message
    };
  } catch (error) {
    console.error('[UpdatePaper] Error:', error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

/**
 * Delete paper
 */
export const deletePaper = async (paperId) => {
  try {
    const response = await apiClient.delete(`/api/testseries/papers/${paperId}`);
    return {
      success: true,
      message: response.data.message
    };
  } catch (error) {
    console.error('[DeletePaper] Error:', error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};
