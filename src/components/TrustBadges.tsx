import React from 'react';
import { PackageCheck, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useSite } from '../SiteContext';
import { useProducts } from '../ProductContext';
import { isFlashSaleActive } from '../lib/pricing';

export function TrustBadges() {
  const { settings } = useSite();
  const { productsList } = useProducts();
  const activeFlashDeals = productsList.filter((product) => isFlashSaleActive(product)).length;

  const badges = [
    { icon: ShieldCheck, title: 'Secure Checkout', text: 'Protected login and verified order flow.' },
    { icon: Truck, title: 'Fast Delivery', text: `Free shipping over Rs. ${Number(settings.freeShippingThreshold).toFixed(0)}.` },
    { icon: PackageCheck, title: 'Order Tracking', text: 'Tracking number is saved and emailed.' },
    { icon: Sparkles, title: 'Fresh Offers', text: `${activeFlashDeals} active flash deal${activeFlashDeals === 1 ? '' : 's'}.` },
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
