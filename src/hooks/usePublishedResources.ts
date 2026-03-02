import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

interface FetchResourcesParams {
  resourceCategory: 'video' | 'book' | 'test' | 'notes';
  category?: string;
  page?: number;
  limit?: number;
  fetchAll?: boolean;
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
        const buildUrl = (pageValue?: number) => {
          let url = `/typed-resources/published/${params.resourceCategory}`;
          const queryParams = new URLSearchParams();

          if (params.category) queryParams.append('category', params.category);
          if (pageValue) queryParams.append('page', String(pageValue));
          if (params.limit) queryParams.append('limit', String(params.limit));

          if (queryParams.toString()) {
            url += `?${queryParams.toString()}`;
          }

          return url;
        };

        if (params.fetchAll) {
          const perPage = params.limit || 100;
          let currentPage = 1;
          let totalPages = 1;
          let total = 0;
          const allResources: any[] = [];

          do {
            const queryParams = new URLSearchParams();
            if (params.category) queryParams.append('category', params.category);
            queryParams.append('page', String(currentPage));
            queryParams.append('limit', String(perPage));

            const url = `/typed-resources/published/${params.resourceCategory}?${queryParams.toString()}`;
            const data = await apiRequest<any>(url);

            const batch = data.resources || [];
            allResources.push(...batch);
            totalPages = data.pages || 1;
            total = data.total || allResources.length;
            currentPage += 1;
          } while (currentPage <= totalPages);

          setResources(allResources);
          setPagination({
            page: 1,
            pages: totalPages,
            total,
          });
        } else {
          const data = await apiRequest<any>(buildUrl(params.page));
          setResources(data.resources || []);
          setPagination({
            page: data.page || 1,
            pages: data.pages || 0,
            total: data.total || 0,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch resources');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [params.resourceCategory, params.category, params.page, params.limit, params.fetchAll]);

  return {
    resources,
    loading,
    error,
    pagination,
  };
};
