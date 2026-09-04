import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { OfflineBanner } from '../components/UI.jsx';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import MobileBottomNav from '../components/MobileBottomNav.jsx';
import GuidedTour from '../components/GuidedTour.jsx';
import { useAppStore } from '../store/useAppStore.js';

export default function PublicLayout() {
  const online = useOnlineStatus();
  const lowBandwidth = useAppStore((s) => s.lowBandwidth);
  return (
    // pb-20 clears the taller mobile tab bar so footer content is never hidden.
    <div className={`min-h-screen pb-20 md:pb-0 ${lowBandwidth ? 'low-bandwidth' : ''}`}>
      {!online && <OfflineBanner />}
      <Navbar />
      <main id="main-content" tabIndex="-1"><Outlet /></main>
      <Footer />
      <MobileBottomNav />
      <GuidedTour />
    </div>
  );
}
