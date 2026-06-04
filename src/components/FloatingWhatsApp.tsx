import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useSite } from '../SiteContext';

const toWhatsAppNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  return digits;
};

export function FloatingWhatsApp() {
  const { settings } = useSite();
  if (settings.enableWhatsApp === false) return null;
  const number = toWhatsAppNumber(settings.supportPhone || settings.storePhone);
  if (!number) return null;

  return (
    <a
      href={`https://wa.me/${number}?text=${encodeURIComponent(settings.whatsappMessage || 'Hi Aabnoor Beauty, I need help with my order.')}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-20 right-4 z-[85] inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1f7a45] text-white shadow-xl transition-transform hover:-translate-y-0.5 hover:bg-[#176137] md:bottom-6 md:right-6"
      aria-label="Chat with Aabnoor Beauty on WhatsApp"
    >
      <MessageCircle className="h-5 w-5" />
    </a>
  );
}
