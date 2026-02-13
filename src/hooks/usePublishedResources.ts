import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

interface FetchResourcesParams {
  resourceCategory: 'video' | 'book' | 'test' | 'notes';
  category?: string;
  page?: number;
  limit?: number;
}

export const usePublishedResources = (params: FetchResourcesParams) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: params.page || 1,
    pages: 0,
    total: 0,
  });

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      setError(null);

      try {
        let url = `/typed-resources/published/${params.resourceCategory}`;
        const queryParams = new URLSearchParams();

        if (params.category) queryParams.append('category', params.category);
        if (params.page) queryParams.append('page', String(params.page));
        if (params.limit) queryParams.append('limit', String(params.limit));

        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }

        const data = await apiRequest<any>(url);
        
        setResources(data.resources || []);
        setPagination({
          page: data.page || 1,
          pages: data.pages || 0,
          total: data.total || 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch resources');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [params.resourceCategory, params.category, params.page, params.limit]);

  return {
    resources,
    loading,
    error,
    pagination,
  };
};
