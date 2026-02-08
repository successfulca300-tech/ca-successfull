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
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/59a937cf-11a5-4e55-a51b-64b97bdf1f24',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePublishedResources.ts:44',message:'Resources fetched',data:{resourceCategory:params.resourceCategory,resourcesCount:data.resources?.length||0,total:data.total,category:params.category},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
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
