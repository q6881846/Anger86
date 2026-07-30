import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApiStore, useProjectStore } from '@/lib/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (async () => {
      await Promise.all([
        useApiStore.persist.rehydrate(),
        useProjectStore.persist.rehydrate(),
      ]);

      const ps = useProjectStore.getState();
      if (!ps.currentBookId || Object.keys(ps.books).length === 0) {
        ps.createBook('未命名', true);
      }
    })();

    const onFocus = () => { useApiStore.persist.rehydrate(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
