import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { OfflineBanner } from '../components/UI.jsx';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import MobileBottomNav from '../components/MobileBottomNav.jsx';
import { useAppStore } from '../store/useAppStore.js';
export default function PublicLayout(){const online=useOnlineStatus(),lowBandwidth=useAppStore(s=>s.lowBandwidth);return <div className={`min-h-screen pb-16 md:pb-0 ${lowBandwidth?'low-bandwidth':''}`}>{!online&&<OfflineBanner/>}<Navbar/><main><Outlet/></main><Footer/><MobileBottomNav/></div>}
