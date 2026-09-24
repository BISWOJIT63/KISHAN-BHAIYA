import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { useAppStore } from '../store/useAppStore.js';
import RealtimeBridge from './RealtimeBridge.jsx';
vi.mock('socket.io-client', () => ({ io: vi.fn() }));
const socket = { on: vi.fn(), disconnect: vi.fn() };
beforeEach(() => {cleanup(); vi.clearAllMocks(); io.mockReturnValue(socket); useAppStore.setState({accessToken:null,user:null});});
const mount = () => render(<QueryClientProvider client={new QueryClient()}><RealtimeBridge /></QueryClientProvider>);
describe('Realtime restart recovery', () => {
  it('does not open a socket for signed-out visitors', () => {mount();expect(io).not.toHaveBeenCalled();});
  it('backs off retries for signed-in users and disconnects on cleanup', () => {
    useAppStore.setState({accessToken:'test-token'});
    const view = mount();
    expect(io).toHaveBeenCalledWith(window.location.origin, expect.objectContaining({auth:{token:'test-token'},reconnection:true,reconnectionDelay:2000,reconnectionDelayMax:15000}));
    expect(socket.on).toHaveBeenCalledWith('connect',expect.any(Function));
    view.unmount();expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
});
