import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { api, apiError, getData } from '../api/client.js';

export default function ProtectedRoute({ roles, allowGuest = false, children }) {
  const token = useAppStore(state => state.accessToken);
  const location = useLocation();
  const { data: user, isPending, isFetching, error, refetch } = useQuery({
    queryKey: ['verified-session', token],
    queryFn: ({ signal }) => getData(api.get('/auth/me', { signal, allowAuthRefresh: true })),
    enabled: Boolean(token), staleTime: 30000, retry: false, refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (user && token && useAppStore.getState().accessToken === token) useAppStore.getState().setSession(user, token);
  }, [user, token]);
  if (!token) return allowGuest ? children : <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (isPending || (error && isFetching)) return <div role="status" aria-live="polite" aria-busy="true" className="container-page flex min-h-64 items-center justify-center gap-3 py-16 text-forest-800"><LoaderCircle className="h-6 w-6 animate-spin" /><p>Checking your account access…</p></div>;
  if (error) return <div role="alert" className="container-page py-12"><div className="card mx-auto max-w-lg p-6"><h1 className="font-display text-xl font-bold">Unable to check account access</h1><p className="mt-3 text-sm text-gray-600">{apiError(error)}</p><button className="btn-primary mt-5" onClick={() => refetch()}><RefreshCw className="h-4 w-4" />Retry account check</button></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  const status = user.accountStatus || (user.verified ? 'ACTIVE' : 'PENDING_ADMIN_APPROVAL');
  if (user.role !== 'admin' && status !== 'ACTIVE' && !['/verification', '/profile'].includes(location.pathname)) return <Navigate to="/verification" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/permission-denied" replace />;
  return children;
}
