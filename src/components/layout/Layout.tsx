import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import WhatsAppFab from '../WhatsAppFab';
import ApexcareAIFab from '../ApexcareAIFab';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24">
        <Outlet />
      </main>
      <Footer />
      <ApexcareAIFab />
      <WhatsAppFab />
    </div>
  );
}
