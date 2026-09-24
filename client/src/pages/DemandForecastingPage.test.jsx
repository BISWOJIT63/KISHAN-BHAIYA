import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MarketPriceForecastPage } from './DemandForecastingPage.jsx';
import { api } from '../api/client.js';
vi.mock('../api/client.js',()=>({api:{get:vi.fn()},getData:p=>p,apiError:e=>e?.message||'Unknown error'}));
const mount=()=>render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><MarketPriceForecastPage/></MemoryRouter></QueryClientProvider>);
beforeEach(()=>{cleanup();vi.clearAllMocks();});
describe('Forecast loading and recovery',()=>{
  it('keeps a loader visible while the forecast request is pending',()=>{
    api.get.mockReturnValue(new Promise(()=>{}));mount();
    expect(screen.getByRole('status').textContent).toContain('Loading marketplace price projections');
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('handles an empty successful response without crashing and retries with a loader',async()=>{
    api.get.mockResolvedValueOnce({crops:[]}).mockReturnValueOnce(new Promise(()=>{}));mount();
    fireEvent.click(await screen.findByRole('button',{name:'Retry forecast'}));
    expect(await screen.findByRole('status')).toBeTruthy();expect(api.get).toHaveBeenCalledTimes(2);
  });
});
