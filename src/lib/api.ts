// Normalize API base URL: ensure it ends with /api (no trailing slash beyond that)
const rawApiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000';
let API_URL = rawApiUrl.replace(/\/+$/g, '');
if (!API_URL.endsWith('/api')) API_URL = API_URL + '/api';

// import axios from "axios";

// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_URL,
//   withCredentials: true,
// });

// export default api;


// Helper function to handle API requests
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Check if response is ok before parsing JSON
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(text || 'An error occurred');
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || `Error: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error: any) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please check if the backend server is running.');
    }
    // Re-throw other errors
    throw error;
  }
}

// Auth API
export const authAPI = {
  register: async (name: string, email: string, password: string, role?: string) => {
    const data = await apiRequest<{
      _id: string;
      name: string;
      email: string;
      role: string;
      token: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    
    // Store token
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
      }));
    }
    
    return data;
  },

  login: async (email: string, password: string) => {
    const data = await apiRequest<{
      _id: string;
      name: string;
      email: string;
      role: string;
      token: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Store token
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
      }));
    }
    
    return data;
  },

  getMe: async () => {
    return apiRequest<{
      _id: string;
      name: string;
      email: string;
      role: string;
      isActive: boolean;
      createdAt: string;
    }>('/auth/me');
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// Resources API
export const resourcesAPI = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    type?: string;
    search?: string;
    isPublic?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest<{ resources: any[] }>(`/resources${query ? `?${query}` : ''}`);
  },

  getAllAdmin: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    type?: string;
    search?: string;
    status?: string;
    isPublic?: boolean;
    isActive?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest<{ resources: any[] }>(`/resources/admin/all${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiRequest<any>(`/resources/${id}`);
  },

  create: async (resource: {
    title: string;
    description: string;
    category: string;
    type?: string;
    url?: string;
    tags?: string[];
    isPublic?: boolean;
  }) => {
    return apiRequest('/resources', {
      method: 'POST',
      body: JSON.stringify(resource),
    });
  },

  createWithFiles: async (resource: {
    title: string;
    description: string;
    category: string;
    type?: string;
    url?: string;
    tags?: string[];
    isPublic?: boolean;
    price?: number;
    duration?: number;
    file?: File;
    thumbnail?: File;
  }) => {
    const formData = new FormData();
    formData.append('title', resource.title);
    formData.append('description', resource.description);
    formData.append('category', resource.category);
    // Map frontend UI types to backend-allowed resource types
    const typeMap: Record<string, string> = {
      pdf: 'document',
      'PDF': 'document',
      book: 'document',
      'Book': 'document',
      notes: 'document',
      'Notes': 'document',
      video: 'video',
      'Video': 'video',
      test: 'other',
      'Test': 'other',
    };
    if (resource.type) {
      const mappedType = typeMap[resource.type] || resource.type;
      formData.append('type', mappedType);
    }
    if (resource.url) formData.append('url', resource.url);
    if (resource.tags) formData.append('tags', JSON.stringify(resource.tags));
    if (resource.isPublic !== undefined) formData.append('isPublic', String(resource.isPublic));
    if (resource.price !== undefined) formData.append('price', String(resource.price));
    if (resource.duration !== undefined) formData.append('duration', String(resource.duration));
    if (resource.file) formData.append('file', resource.file);
    if (resource.thumbnail) formData.append('thumbnail', resource.thumbnail);

    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      console.log('Sending resource upload request:', {
        title: resource.title,
        description: resource.description,
        category: resource.category,
        type: resource.type,
        hasFile: !!resource.file,
        hasThumbnail: !!resource.thumbnail,
      });

      const response = await fetch(`${API_URL}/resources`, {
        method: 'POST',
        headers,
        body: formData,
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text || 'Upload failed' };
      }

      console.log('Upload response received:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.message || data.error || `Upload failed: ${response.status}`);
      }

      return data;
    } catch (error: any) {
      console.error('Upload request error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend server is running.');
      }
      throw error;
    }
  },

  update: async (id: string, resource: Partial<{
    title: string;
    description: string;
    category: string;
    type: string;
    url: string;
    tags: string[];
    isPublic: boolean;
    isActive: boolean;
  }>) => {
    return apiRequest(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(resource),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/resources/${id}`, {
      method: 'DELETE',
    });
  },

  getByCategory: async (category: string, params?: {
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest(`/resources/category/${category}${query ? `?${query}` : ''}`);
  },

  getByUser: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest<{ resources: any[] }>(`/resources/user${query ? `?${query}` : ''}`);
  },

  getByCourseId: async (courseId: string, params?: {
    page?: number;
    limit?: number;
    type?: string;
    resourceCategory?: string;
  }) => {
    const queryParams = new URLSearchParams();
    queryParams.append('courseId', courseId);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest<{ resources: any[] }>(`/resources${query ? `?${query}` : ''}`);
  },
};

// Categories API
export const categoriesAPI = {
  getAll: async () => {
    return apiRequest<{ categories: any[] }>('/categories');
  },

  getById: async (id: string) => {
    return apiRequest(`/categories/${id}`);
  },

  create: async (category: { name: string; description?: string; icon?: string }) => {
    return apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  },

  update: async (id: string, category: Partial<{ name: string; description: string; icon: string; isActive: boolean }>) => {
    return apiRequest(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/categories/${id}`, {
      method: 'DELETE',
    });
  },
};

// Courses API
export const coursesAPI = {
  getAll: async (params?: { page?: number; limit?: number; category?: string; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest<{ courses: any[] }>(`/courses${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiRequest(`/courses/${id}`);
  },

  create: async (course: {
    title: string;
    description: string;
    category: string;
    instructor?: string;
    thumbnail?: string;
    price: number;
    duration?: string;
    level?: string;
    content?: string;
    videoUrl?: string;
    resources?: any[];
  }) => {
    return apiRequest('/courses', {
      method: 'POST',
      body: JSON.stringify(course),
    });
  },

  update: async (id: string, course: any) => {
    return apiRequest(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(course),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/courses/${id}`, {
      method: 'DELETE',
    });
  },

  publish: async (id: string, action: 'approve' | 'reject', notes?: string) => {
    return apiRequest(`/courses/${id}/publish`, {
      method: 'PUT',
      body: JSON.stringify({ action, notes }),
    });
  },

  addReview: async (id: string, rating: number, comment: string) => {
    return apiRequest(`/courses/${id}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
  },

  getByCategory: async (categoryId: string, params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest(`/courses/category/${categoryId}${query ? `?${query}` : ''}`);
  },

  addChapter: async (courseId: string, chapter: { title: string; description?: string; order?: number }) => {
    return apiRequest(`/courses/${courseId}/chapters`, {
      method: 'POST',
      body: JSON.stringify(chapter),
    });
  },

  addChapterItem: async (courseId: string, chapterId: string, item: { title: string; type?: string; url?: string; description?: string; duration?: string; order?: number }) => {
    return apiRequest(`/courses/${courseId}/chapters/${chapterId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  updateChapter: async (courseId: string, chapterId: string, chapter: { title?: string; description?: string; order?: number }) => {
    return apiRequest(`/courses/${courseId}/chapters/${chapterId}`, {
      method: 'PUT',
      body: JSON.stringify(chapter),
    });
  },

  deleteChapter: async (courseId: string, chapterId: string) => {
    return apiRequest(`/courses/${courseId}/chapters/${chapterId}`, {
      method: 'DELETE',
    });
  },

  updateChapterItem: async (courseId: string, chapterId: string, itemId: string, item: { title?: string; type?: string; url?: string; description?: string; duration?: string; order?: number }) => {
    return apiRequest(`/courses/${courseId}/chapters/${chapterId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  },

  deleteChapterItem: async (courseId: string, chapterId: string, itemId: string) => {
    return apiRequest(`/courses/${courseId}/chapters/${chapterId}/items/${itemId}`, {
      method: 'DELETE',
    });
  },
};

// Offers API
export const offersAPI = {
  getAll: async () => {
    return apiRequest<{ offers: any[] }>('/offers');
  },

  getAllAdmin: async () => {
    return apiRequest<{ offers: any[] }>('/offers/admin/all');
  },

  getById: async (id: string) => {
    return apiRequest(`/offers/${id}`);
  },

  create: async (offer: {
    title: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    applicableCourses?: string[];
    startDate: string;
    endDate: string;
    maxUsageCount?: number;
    code?: string;
  }) => {
    return apiRequest('/offers', {
      method: 'POST',
      body: JSON.stringify(offer),
    });
  },

  update: async (id: string, offer: any) => {
    return apiRequest(`/offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(offer),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/offers/${id}`, {
      method: 'DELETE',
    });
  },

  toggleStatus: async (id: string, isActive: boolean) => {
    return apiRequest(`/offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
  },

  validateCoupon: async (couponCode: string) => {
    return apiRequest<{ valid: boolean; offer?: { code: string; discountType: string; discountValue: number; title?: string } }>('/offers/validate-coupon', {
      method: 'POST',
      body: JSON.stringify({ code: couponCode }),
    });
  },

};

// Books API
export const booksAPI = {
  getAll: async (params?: { page?: number; limit?: number; category?: string; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest(`/books${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiRequest(`/books/${id}`);
  },

  getByCategory: async (categoryId: string, params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest(`/books/category/${categoryId}${query ? `?${query}` : ''}`);
  },
};

// TestSeries API
export const testSeriesAPI = {
  getAll: async (params?: { page?: number; limit?: number; category?: string; search?: string; seriesType?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest(`/testseries${query ? `?${query}` : ''}`);
  },

  calculatePrice: async (testSeriesId: string, selectedSeries: string[], selectedSubjects: string[], couponCode?: string) => {
    return apiRequest<{ success: boolean; pricing?: { basePrice: number; totalPapers: number; finalPrice: number } }>('/testseries/calculate-price', {
      method: 'POST',
      body: JSON.stringify({
        testSeriesId,
        selectedSeries,
        selectedSubjects,
        couponCode,
      }),
    });
  },


  getMyTestSeries: async () => {
    return apiRequest('/testseries/subadmin/my-series');
  },

  getById: async (id: string) => {
    return apiRequest(`/testseries/${id}`);
  },

  // Get server-managed version for fixed series (S1..S4), if present
  getFixedManaged: async (fixedId: string) => {
    return apiRequest(`/testseries/fixed/${fixedId}`);
  },

  // Upsert managed data for fixed series (subadmin only)
  upsertFixed: async (fixedId: string, payload: any) => {
    return apiRequest(`/testseries/fixed/${fixedId}/manage`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getByCategory: async (categoryId: string, params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest(`/testseries/category/${categoryId}${query ? `?${query}` : ''}`);
  },

  create: async (testSeries: any) => {
    return apiRequest('/testseries', {
      method: 'POST',
      body: JSON.stringify(testSeries),
    });
  },

  update: async (id: string, testSeries: any) => {
    return apiRequest(`/testseries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(testSeries),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/testseries/${id}`, {
      method: 'DELETE',
    });
  },

  publish: async (id: string, action: 'approve' | 'reject' | 'draft', notes?: string) => {
    return apiRequest(`/testseries/${id}/publish`, {
      method: 'PUT',
      body: JSON.stringify({ action, notes }),
    });
  },

  // Paper management
  uploadPaperWithFile: async (testSeriesId: string, formData: FormData) => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/testseries/${testSeriesId}/papers`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload paper: ${response.statusText}`);
    }

    return response.json();
  },

  uploadPaper: async (testSeriesId: string, paper: any) => {
    return apiRequest(`/testseries/papers/${testSeriesId}/papers`, {
      method: 'POST',
      body: JSON.stringify(paper),
    });
  },

  getPapers: async (testSeriesId: string, params?: { group?: string; subject?: string; series?: string; paperType?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest(`/testseries/${testSeriesId}/papers${query ? `?${query}` : ''}`);
  },

  getPapersGroupedBySubject: async (testSeriesId: string, params?: { group?: string; series?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest<{ success: boolean; papers?: { [subject: string]: any[] } }>(`/testseries/${testSeriesId}/papers/grouped${query ? `?${query}` : ''}`);
  },

  getPapersSummary: async (testSeriesId: string) => {
    return apiRequest(`/testseries/${testSeriesId}/papers-summary`);
  },

  getMyPapers: async () => {
    return apiRequest('/testseries/subadmin/my-papers');
  },

  updatePaper: async (paperId: string, paper: any) => {
    return apiRequest(`/testseries/papers/${paperId}`, {
      method: 'PUT',
      body: JSON.stringify(paper),
    });
  },

  deletePaper: async (paperId: string) => {
    return apiRequest(`/testseries/papers/${paperId}`, {
      method: 'DELETE',
    });
  },

  uploadMedia: async (file: File, mediaType: 'video' | 'image' = 'video', testSeriesId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaType', mediaType);
    if (testSeriesId) {
      formData.append('testSeriesId', testSeriesId);
    }

    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/test-series/media/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  },

  deleteMedia: async (fileId: string) => {
    return apiRequest(`/test-series/media/${fileId}`, {
      method: 'DELETE',
    });
  },

  getMedia: async (testSeriesId?: string, mediaType?: 'thumbnail' | 'video') => {
    const params = new URLSearchParams();
    if (testSeriesId) {
      params.append('testSeriesId', testSeriesId);
    }
    if (mediaType) {
      params.append('mediaType', mediaType);
    }
    const query = params.toString();
    return apiRequest<{ success: boolean; media: Array<{ fileUrl: string; fileId?: string; mediaType?: string; mimeType?: string; fileName?: string }> }>(`/test-series/media${query ? `?${query}` : ''}`);
  },
};

// TestSeriesAnswer API
export const testSeriesAnswerAPI = {
  uploadAnswerSheet: async (paperId: string, testSeriesId: string, file: File) => {
    const formData = new FormData();
    formData.append('answerSheet', file);
    formData.append('paperId', paperId);
    formData.append('testSeriesId', testSeriesId);

    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/testseries/answers/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to upload answer sheet');
    }

    return response.json();
  },

  getMyAnswers: async (testSeriesId: string, params?: { group?: string; subject?: string; series?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest(`/testseries/answers/${testSeriesId}/my${query ? `?${query}` : ''}`);
  },

  getMyAnswerForPaper: async (paperId: string) => {
    return apiRequest(`/testseries/answers/papers/${paperId}/my`);
  },

  getAllAnswerSheets: async (params?: { paperId?: string; testSeriesId?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest(`/testseries/answers/subadmin/all${query ? `?${query}` : ''}`);
  },

  uploadEvaluatedSheet: async (answerId: string, file: File, marksObtained: number, maxMarks: number, evaluatorComments?: string) => {
    const formData = new FormData();
    formData.append('evaluatedSheet', file);
    formData.append('marksObtained', String(marksObtained));
    formData.append('maxMarks', String(maxMarks));
    if (evaluatorComments) {
      formData.append('evaluatorComments', evaluatorComments);
    }

    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/testseries/answers/${answerId}/evaluated`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to upload evaluated sheet');
    }

    return response.json();
  },

  getPaperStatistics: async (paperId: string) => {
    return apiRequest(`/testseries/answers/papers/${paperId}/statistics`);
  },
};

// Enrollments API
export const enrollmentsAPI = {
  getAll: async (params?: { page?: number; limit?: number; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest(`/enrollments${query ? `?${query}` : ''}`);
  },

  // Get requests for current user
  getForUser: async (params?: { page?: number; limit?: number; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest(`/publish-requests/user${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiRequest(`/enrollments/${id}`);
  },

  create: async (courseId: string | any, amount?: number) => {
    // If courseId is an object, it contains full enrollment data
    if (typeof courseId === 'object') {
      return apiRequest('/enrollments', {
        method: 'POST',
        body: JSON.stringify(courseId),
      });
    }
    // Otherwise use the simple signature
    return apiRequest('/enrollments', {
      method: 'POST',
      body: JSON.stringify({ courseId, amount }),
    });
  },

  update: async (id: string, enrollment: any) => {
    return apiRequest(`/enrollments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(enrollment),
    });
  },

  checkEnrollment: async (params: { courseId?: string; testSeriesId?: string; bookId?: string }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) qs.append(k, v as string);
    });
    const query = qs.toString();
    return apiRequest(`/enrollments/check${query ? `?${query}` : ''}`);
  },
};

// Testimonials API
export const testimonialsAPI = {
  getAll: async (params?: { page?: number; limit?: number; courseId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest<{ testimonials: any[] }>(`/testimonials${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiRequest(`/testimonials/${id}`);
  },

  create: async (testimonial: { rating: number; comment: string; courseId?: string; courseTitle?: string; userName?: string }) => {
    return apiRequest('/testimonials', {
      method: 'POST',
      body: JSON.stringify(testimonial),
    });
  },

  update: async (id: string, testimonial: { rating?: number; comment?: string; courseTitle?: string; userName?: string; featured?: boolean; isFeatured?: boolean }) => {
    return apiRequest(`/testimonials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(testimonial),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/testimonials/${id}`, {
      method: 'DELETE',
    });
  },

  moderate: async (id: string, action: 'approved' | 'rejected', rejectionReason?: string) => {
    return apiRequest(`/testimonials/${id}/moderate`, {
      method: 'PUT',
      body: JSON.stringify({ action, rejectionReason }),
    });
  },
};

// Dashboard API (Admin only)
export const dashboardAPI = {
  getStats: async () => {
    return apiRequest<{ stats: any }>('/dashboard/stats');
  },

  getRecentEnrollments: async (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest<{ enrollments: any[] }>(`/dashboard/enrollments${query}`);
  },

  getPendingPublishRequests: async () => {
    return apiRequest<{ requests: any[] }>('/dashboard/pending-requests');
  },

  getPendingTestimonials: async () => {
    return apiRequest<{ testimonials: any[] }>('/dashboard/pending-testimonials');
  },

  getContentOverview: async () => {
    return apiRequest('/dashboard/content-overview');
  },

  getAllUsers: async (params?: { page?: number; limit?: number; role?: string; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest(`/dashboard/users${query ? `?${query}` : ''}`);
  },

  updateUser: async (id: string, user: { role?: string; isActive?: boolean }) => {
    return apiRequest(`/dashboard/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  },
};

// Publish Requests API
export const publishRequestAPI = {
  getAll: async (params?: { page?: number; limit?: number; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest<{ requests: any[] }>(`/publish-requests${query ? `?${query}` : ''}`);
  },

  getForUser: async (params?: { page?: number; limit?: number; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest(`/publish-requests/user${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiRequest(`/publish-requests/${id}`);
  },

  create: async (payload: { contentType: string; contentId: string; notes?: string }) => {
    // send as requestNotes for backend compatibility
    const body = {
      contentType: payload.contentType,
      contentId: payload.contentId,
      requestNotes: payload.notes,
    };
    return apiRequest('/publish-requests', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  moderate: async (id: string, body: { action?: 'approved' | 'rejected'; status?: 'approved' | 'rejected'; rejectionReason?: string }) => {
    // Support both 'action' and 'status' for flexibility
    const payload = body.action ? { action: body.action, rejectionReason: body.rejectionReason } : { action: body.status, rejectionReason: body.rejectionReason };
    return apiRequest(`/publish-requests/${id}/moderate`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/publish-requests/${id}`, {
      method: 'DELETE',
    });
  },
};

// Upload API
export const uploadAPI = {
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Upload failed');
    }

    return response.json();
  },
};

// Files API - secure proxy for viewing files
export const filesAPI = {
  // Request a short-lived proxied view URL. Provide resource id to verify enrollment.
  getViewUrl: async (
    fileOrUrl: string,
    opts?: { courseId?: string; testSeriesId?: string; bookId?: string }
  ) => {
    const isUrl = String(fileOrUrl).startsWith('http');
    const body: any = {};
    if (isUrl) body.fileUrl = fileOrUrl; else body.fileId = fileOrUrl;
    if (opts?.courseId) body.courseId = opts.courseId;
    if (opts?.testSeriesId) body.testSeriesId = opts.testSeriesId;
    if (opts?.bookId) body.bookId = opts.bookId;
    return apiRequest('/files/token', { method: 'POST', body: JSON.stringify(body) });
  },
};

// Users API (Admin only)
export const usersAPI = {
  getAll: async (params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiRequest<{ users: any[] }>(`/users${query ? `?${query}` : ''}`);
  },

  create: async (user: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) => {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  getById: async (id: string) => {
    return apiRequest(`/users/${id}`);
  },

  update: async (id: string, user: Partial<{
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    phone: string;
  }>) => {
    return apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  updateProfile: async (data: {
    name?: string;
    phone?: string;
    dateOfBirth?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
  }) => {
    return apiRequest('/users/profile/update', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  sendPhoneOTP: async (phone: string) => {
    return apiRequest('/users/phone/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  verifyPhoneOTP: async (phone: string, otp: string) => {
    return apiRequest('/users/phone/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  },

  uploadProfilePicture: async (file: File) => {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/users/profile/upload-picture`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Upload failed');
    }

    return response.json();
  },

  removeProfilePicture: async () => {
    return apiRequest('/users/profile/remove-picture', {
      method: 'DELETE',
    });
  },
};

// Cart API (user)
export const cartAPI = {
  get: async () => apiRequest('/cart'),
  add: async (itemId: string, itemType: 'course' | 'book' | 'testseries', qty = 1) => {
    const body: any = { qty };
    if (itemType === 'course') body.courseId = itemId;
    else if (itemType === 'book') body.bookId = itemId;
    else if (itemType === 'testseries') body.testSeriesId = itemId;
    return apiRequest('/cart', { method: 'POST', body: JSON.stringify(body) });
  },
  remove: async (itemId: string) => apiRequest(`/cart/item/${itemId}`, { method: 'DELETE' }),
  clear: async () => apiRequest('/cart', { method: 'DELETE' }),
};

// Orders API removed - order system not required

// Settings API
export const settingsAPI = {
  get: async () => {
    return apiRequest<{ settings: any }>('/settings');
  },
  update: async (data: { siteName?: string; contactEmail?: string; contactPhone?: string; address?: string; image?: File | null }) => {
    const formData = new FormData();
    if (data.siteName !== undefined) formData.append('siteName', data.siteName);
    if (data.contactEmail !== undefined) formData.append('contactEmail', data.contactEmail);
    if (data.contactPhone !== undefined) formData.append('contactPhone', data.contactPhone);
    if (data.address !== undefined) formData.append('address', data.address);
    if (data.image) formData.append('image', data.image);

    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const response = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers,
      body: formData,
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const dataRes = await response.json();
      if (!response.ok) throw new Error(dataRes.message || 'Failed to update settings');
      return dataRes;
    }
    const text = await response.text();
    throw new Error(text || 'Failed to update settings');
  }
};

