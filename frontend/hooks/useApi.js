import { useState, useCallback } from 'react';
import { parseApiError, logError } from '../utils/errorHandler';

// Custom hook for API calls with loading and error states
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiCall, options = {}) => {
    const {
      onSuccess,
      onError,
      showLoading = true,
      logErrors = true,
      context = 'API Call',
    } = options;

    try {
      if (showLoading) setLoading(true);
      setError(null);

      const result = await apiCall();

      if (onSuccess) {
        onSuccess(result);
      }

      return { success: true, data: result };
    } catch (err) {
      const parsedError = parseApiError(err);
      
      if (logErrors) {
        logError(err, context);
      }

      setError(parsedError);

      if (onError) {
        onError(parsedError);
      }

      return { success: false, error: parsedError };
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    execute,
    clearError,
  };
};

// Hook for paginated API calls
export const usePaginatedApi = (initialPage = 1, initialLimit = 20) => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiCall, options = {}) => {
    const {
      page = meta.page,
      limit = meta.limit,
      append = false,
      refresh = false,
    } = options;

    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const result = await apiCall({ page, limit });
      
      if (append && page > 1) {
        setData(prev => [...prev, ...result.data]);
      } else {
        setData(result.data);
      }

      setMeta(result.meta);

      return { success: true, data: result };
    } catch (err) {
      const parsedError = parseApiError(err);
      setError(parsedError);
      logError(err, 'Paginated API Call');
      return { success: false, error: parsedError };
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [meta.page, meta.limit]);

  const loadMore = useCallback(() => {
    if (!loading && meta.page < meta.totalPages) {
      return execute(null, { page: meta.page + 1, append: true });
    }
  }, [loading, meta.page, meta.totalPages, execute]);

  const refresh = useCallback(() => {
    return execute(null, { page: 1, refresh: true });
  }, [execute]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    meta,
    loading,
    refreshing,
    error,
    execute,
    loadMore,
    refresh,
    clearError,
  };
};