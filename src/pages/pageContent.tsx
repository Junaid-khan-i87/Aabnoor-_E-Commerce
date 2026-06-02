import React from 'react';
import { SUPPORT_EMAIL } from '../SiteContext';

export const PrivacyContent = (
  <>
    <p>Last updated: June 2026</p>
    <p>Aabnoor ("we," "us," or "our") respects your privacy. This Privacy Policy explains how we collect and use information when you browse products, create an account, contact support, or place an order.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">Information We Collect</h3>
    <p>We collect information that you provide directly to us, such as when you create an account, subscribe to our newsletter, or make a purchase. This may include your name, email address, shipping address, and payment information.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">How We Use Your Information</h3>
    <p>We use the information we collect to fulfill your orders, communicate with you, and improve our services. We may also use your information to send you marketing communications, strictly in accordance with your preferences.</p>
  </>
);

export const TermsContent = (
  <>
    <p>Last updated: June 2026</p>
    <p>Please read these Terms of Service before using aabnoor.shop. By browsing the site or placing an order, you agree to the terms that apply to product availability, pricing, delivery, returns, and account use.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">Intellectual Property</h3>
    <p>The Aabnoor name, storefront content, product photography, and site experience may not be copied or reused without permission. Brand names shown on product pages remain the property of their respective owners.</p>
  </>
);

export const ShippingContent = (
  <>
    <h3 className="text-xl font-bold mt-8 mb-4">Domestic Shipping</h3>
    <p>We offer complimentary standard shipping on domestic orders over Rs. 9999. Standard shipping typically takes 3-5 business days after order confirmation. Express delivery options may be available at checkout for an additional fee.</p>
    <p>Shipping fees are shown before an order is completed so customers can review the final amount before confirming checkout. After purchase, the order confirmation email includes the order number and tracking number used on the Track Order page.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">International Shipping</h3>
    <p>We currently focus on Pakistan delivery. If your city or delivery area is not available at checkout, contact support before placing the order so we can confirm the best next step.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">Returns</h3>
    <p>Beauty and personal care items can be returned only when unopened, unused, and reported within 7 days of delivery. Items with broken seals, missing packaging, or signs of use cannot be accepted for hygiene reasons.</p>
    <p>For faster return support, include your order number, tracking number, product name and a short description of the concern. Our support team will confirm the next step by email.</p>
  </>
);

export const ContactContent = (
  <>
    <p className="text-lg leading-relaxed mb-6">Need help choosing a product, confirming delivery, or tracking an order? Our support team can help.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">Customer Support</h3>
    <p>Email: <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
    <p>Phone: +92 (21) 111 287 233</p>
    <p>Use this support email for product questions, shipping concerns, delivery status, account help and order follow-up. If your message is about an order, include the order number and tracking number from your confirmation email.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">Order Help</h3>
    <p>For order status, use the Track Order page with the tracking number sent in your confirmation email.</p>
    <p>Tracking information is updated as the order moves from pending to processing, shipped and delivered. If a tracking page result looks incorrect, contact support so our team can review the order.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">Response Time</h3>
    <p>We usually respond within 1 business day. Please include your order number or tracking number when contacting support.</p>
  </>
);

export const FAQContent = (
  <>
    <h3 className="text-xl font-bold mt-8 mb-4">How long does delivery take?</h3>
    <p>Standard delivery usually takes 3-5 business days. Express delivery usually takes 1-2 business days.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">Where can I track my order?</h3>
    <p>Visit the Track Order page and enter the tracking number from your confirmation email.</p>
    <p>Tracking numbers are stored with the order and can be used at any time to confirm whether the order is pending, processing, shipped, delivered or cancelled.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">Can I pay cash on delivery?</h3>
    <p>Yes. Cash on Delivery is available at checkout. Please keep the exact order amount ready when the rider arrives.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">How do shipping costs work?</h3>
    <p>The checkout page displays delivery costs before the order is placed. Orders above the free shipping threshold qualify for complimentary standard delivery.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">How do reviews work?</h3>
    <p>Customers can rate products and leave notes on product pages. Reviews help other shoppers compare real experiences.</p>
    <p>Signed-in customers can leave reviews on product pages. Reviews help other shoppers compare real experiences before ordering.</p>
  </>
);

export const StoryContent = (
  <>
    <p className="text-lg leading-relaxed mb-6">Aabnoor curates beauty essentials for shoppers in Pakistan who want clear product information, simple pricing, and reliable order support.</p>
    <p>Our catalog focuses on skincare, hair care, fragrance, and daily beauty items from brands customers already search for. Product pages are kept practical with images, descriptions, availability, pricing, and support details.</p>
    <p>We are building the store around trust: visible delivery information, Cash on Delivery support, order tracking, and a support channel customers can reach before or after purchase.</p>
  </>
);

export const SustainabilityContent = (
  <>
    <p>We aim to operate responsibly as a beauty retailer by packing orders carefully, reducing unnecessary packaging where possible, and working with suppliers that provide genuine products.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">Packaging</h3>
    <p>Orders are packed to protect products during local delivery. When possible, we reuse protective materials and avoid adding extra packaging that does not help the order arrive safely.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">Sourcing</h3>
    <p>We prefer clear supplier relationships and product listings that show customers what they are buying before checkout.</p>
  </>
);

export const IngredientsContent = (
  <>
    <p>Ingredient transparency helps shoppers choose products that match their skin, hair, and fragrance preferences.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">What We Exclude</h3>
    <p>Each product is different. Check the product page, packaging, and brand label for the exact ingredient list, usage guidance, and warnings before use.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">Key Actives</h3>
    <ul>
      <li className="mb-2"><strong>Niacinamide:</strong> A versatile vitamin B3 derivative that strengthens the skin barrier and refines texture.</li>
      <li className="mb-2"><strong>Hyaluronic Acid:</strong> A multi-molecular weight complex for deep, sustained hydration.</li>
      <li className="mb-2"><strong>Peptides:</strong> Targeted amino acid chains to signal collagen production and improve elasticity.</li>
    </ul>
  </>
);

export const JournalContent = (
  <>
    <p>Welcome to our Journal, a practical guide area for product education, routine planning, and store updates.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">Coming Beauty Guides</h3>
    <p>Upcoming articles will cover ingredient routines, seasonal skincare planning, hair care maintenance and fragrance layering. These guides are intended to help customers compare products and build simple routines before checkout.</p>
    <h3 className="text-xl font-bold mt-8 mb-4">What To Read Now</h3>
    <p>Until the editorial archive is expanded, use the Ingredients guide for active ingredient education, the FAQ page for delivery and account answers, and product pages for usage notes, reviews, availability and pricing.</p>
    <p className="mt-8 italic text-[#1A1A1A]/50">Check back soon for our first editorial features.</p>
  </>
);
