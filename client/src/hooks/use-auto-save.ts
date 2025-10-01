import { useEffect, useRef, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveOptions {
  debounceMs?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useAutoSave(options: AutoSaveOptions = {}) {
  const { debounceMs = 1500, onSuccess, onError } = options;
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const queryClient = useQueryClient();
  const isInitialMount = useRef(true);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/proposals', data);
      return await response.json();
    },
    onSuccess: (data) => {
      setStatus('saved');
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      onSuccess?.(data);
      // Reset to idle after 2 seconds
      setTimeout(() => setStatus('idle'), 2000);
    },
    onError: (error: Error) => {
      setStatus('error');
      setErrorMessage(error.message || 'Failed to save');
      onError?.(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PATCH', `/api/proposals/${id}`, data);
      return await response.json();
    },
    onSuccess: (data) => {
      setStatus('saved');
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      onSuccess?.(data);
      // Reset to idle after 2 seconds
      setTimeout(() => setStatus('idle'), 2000);
    },
    onError: (error: Error) => {
      setStatus('error');
      setErrorMessage(error.message || 'Failed to save');
      onError?.(error);
    },
  });

  const debouncedSave = useCallback((proposalId: number | null, data: any) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Skip auto-save on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setStatus('saving');

    timeoutRef.current = setTimeout(() => {
      if (proposalId) {
        updateMutation.mutate({ id: proposalId, data });
      } else {
        createMutation.mutate(data);
      }
    }, debounceMs);
  }, [debounceMs, updateMutation, createMutation]);

  const saveDraft = useCallback((proposalId: number | null, data: any) => {
    debouncedSave(proposalId, data);
  }, [debouncedSave]);

  const saveNow = useCallback((proposalId: number | null, data: any) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setStatus('saving');
    
    if (proposalId) {
      updateMutation.mutate({ id: proposalId, data });
    } else {
      createMutation.mutate(data);
    }
  }, [updateMutation, createMutation]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    errorMessage,
    saveDraft,
    saveNow,
    isSaving: status === 'saving',
  };
}
