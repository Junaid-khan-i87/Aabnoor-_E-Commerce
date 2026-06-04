import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { useSite } from '../SiteContext';

const DISMISS_KEY = 'aabnoor_promo_popup_dismissed';

export function PromoPopup() {
  const { settings } = useSite();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!settings.promoPopupEnabled) return undefined;
    if (localStorage.getItem(DISMISS_KEY) === settings.promoPopupTitle) return undefined;
    const timer = window.setTimeout(() => setIsVisible(true), 1600);
    return () => window.clearTimeout(timer);
  }, [settings.promoPopupEnabled, settings.promoPopupTitle]);

  if (!settings.promoPopupEnabled || settings.maintenanceMode || !isVisible) return null;

  const close = () => {
    localStorage.setItem(DISMISS_KEY, settings.promoPopupTitle);
    setIsVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2d2426]/45 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <section className="relative w-full max-w-md rounded-[8px] border border-[#2d2426]/10 bg-[#fffaf7] p-7 shadow-2xl">
        <button
          type="button"
          onClick={close}
          className="absolute right-4 top-4 rounded-full p-1 text-[#8a7070] transition-colors hover:bg-[#2d2426]/5 hover:text-[#2d2426]"
          aria-label="Close promotion"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#c97a82]/10 text-[#c97a82]">
          <Sparkles className="h-5 w-5" />
        </div>
        <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-[#c97a82]">
          Limited Offer
        </p>
        <h2 className="font-serif text-4xl leading-none text-[#2d2426]">{settings.promoPopupTitle}</h2>
        <p className="mt-4 font-sans text-sm leading-6 text-[#8a7070]">{settings.promoPopupBody}</p>
        {settings.promoPopupCode && (
          <div className="mt-5 rounded-[8px] border border-dashed border-[#c97a82] bg-[#c97a82]/8 px-4 py-3">
            <p className="font-sans text-[9px] font-bold uppercase tracking-[0.18em] text-[#8a7070]">Coupon Code</p>
            <p className="mt-1 font-sans text-lg font-bold tracking-[0.22em] text-[#2d2426]">{settings.promoPopupCode}</p>
          </div>
        )}
        <Link
          to={settings.promoPopupCtaUrl || '/shop'}
          onClick={close}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#2d2426] px-6 py-3.5 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#c97a82]"
        >
          {settings.promoPopupCtaLabel || 'Shop Now'}
        </Link>
      </section>
    </div>
  );
}
