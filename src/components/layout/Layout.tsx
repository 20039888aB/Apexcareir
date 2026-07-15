import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import WhatsAppFab from '../WhatsAppFab';
import ApexcareAIFab from '../ApexcareAIFab';

export default function Layout() {
  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col overflow-x-hidden">
      <Navbar />
      <main className="flex-1 pt-20 sm:pt-24">
        <Outlet />
      </main>
      <Footer />
      <ApexcareAIFab />
      <WhatsAppFab />
    </div>
  );
}
