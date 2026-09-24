import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from './ProtectedRoute.jsx';
import { useAppStore } from '../store/useAppStore.js';
import { api } from '../api/client.js';
vi.mock('../api/client.js', () => ({api:{get:vi.fn()},getData:p=>p,apiError:e=>e.message}));
const active = { _id:'test', role:'farmer', accountStatus:'ACTIVE' };
function mount() {return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={['/private']}><Routes><Route path="/private" element={<ProtectedRoute roles={['farmer']}><p>Private workspace</p></ProtectedRoute>} /><Route path="/verification" element={<p>Verification required</p>}/><Route path="/permission-denied" element={<p>Permission denied</p>}/></Routes></MemoryRouter></QueryClientProvider>);}
beforeEach(()=>{cleanup();vi.clearAllMocks();useAppStore.setState({accessToken:'test-token',user:{...active,role:'consumer'}});});
describe('Protected account loading',()=>{
  it('waits for the API before rendering or redirecting based on a stale role',async()=>{
    let resolve;api.get.mockReturnValue(new Promise(r=>{resolve=r;}));mount();
    expect(screen.getByRole('status').textContent).toContain('Checking');
    expect(screen.queryByText('Private workspace')).toBeNull();expect(screen.queryByText('Permission denied')).toBeNull();
    await act(async()=>resolve(active));
    expect(await screen.findByText('Private workspace')).toBeTruthy();
  });
  it('shows a retry on network failure and a loader while retrying',async()=>{
    api.get.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce(active);mount();
    fireEvent.click(await screen.findByRole('button',{name:'Retry account check'}));
    expect(await screen.findByText('Private workspace')).toBeTruthy();expect(api.get).toHaveBeenCalledTimes(2);
  });
  it('keeps inactive accounts protected after a successful account check',async()=>{
    api.get.mockResolvedValue({...active,accountStatus:'PENDING_ADMIN_APPROVAL'});mount();
    await waitFor(()=>expect(screen.getByText('Verification required')).toBeTruthy());
  });
});
