import React from 'react';
import { PackageCheck, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useSite } from '../SiteContext';
import { useProducts } from '../ProductContext';
import { isFlashSaleActive } from '../lib/pricing';

export function TrustBadges() {
  const { settings } = useSite();
  const { productsList } = useProducts();
  const activeFlashDeals = productsList.filter((product) => isFlashSaleActive(product)).length;
  const flashPlural = activeFlashDeals === 1 ? '' : 's';

  const badges = [
    { icon: ShieldCheck, title: settings.trustBadgeSecureTitle, text: settings.trustBadgeSecureText },
    {
      icon: Truck,
      title: settings.trustBadgeDeliveryTitle,
      text: settings.trustBadgeDeliveryText.replace('{threshold}', Number(settings.freeShippingThreshold).toFixed(0)),
    },
    { icon: PackageCheck, title: settings.trustBadgeTrackingTitle, text: settings.trustBadgeTrackingText },
    {
      icon: Sparkles,
      title: settings.trustBadgeOffersTitle,
      text: settings.trustBadgeOffersText.replace('{count}', String(activeFlashDeals)).replace('{plural}', flashPlural),
    },
  ];

  return (
    <section className="bg-[#F9F7F2] border-y border-[#2c2826]/10">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 py-8 md:grid-cols-4">
        {badges.map((item) => (
          <div key={item.title} className="flex items-start gap-3 rounded-[8px] border border-[#2c2826]/10 bg-white/85 p-4 shadow-sm">
            <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#8a4f48]" aria-hidden="true" />
            <div>
              <h3 className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#2c2826]">
                {item.title}
              </h3>
              <p className="mt-1 font-sans text-xs leading-relaxed text-[#5f5650]">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
