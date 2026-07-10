import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { doctor } from '../data/content';

export default function WhatsAppFab() {
  return (
    <motion.a
      href={`https://wa.me/${doctor.whatsapp}?text=Hello%20Dr%20Alice%2C%20I%20would%20like%20to%20book%20a%20consultation.`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle size={26} fill="white" />
    </motion.a>
  );
}
