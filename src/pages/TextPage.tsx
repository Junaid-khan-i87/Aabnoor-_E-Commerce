import React, { useEffect } from 'react';
import { SEO } from '../components/SEO';

interface TextPageProps {
  title: string;
  content: React.ReactNode;
  canonicalPath?: string;
}

export function TextPage({ title, content, canonicalPath }: TextPageProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="pt-32 pb-24 max-w-3xl mx-auto px-6 font-sans">
      <SEO
        title={`${title} | Aabnoor Beaute`}
        description={`${title} information for Aabnoor Beaute customers, including premium beauty shopping support, policies and guidance.`}
        canonicalPath={canonicalPath || `/${title.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
        jsonLd={title === 'FAQs' ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'How long does Aabnoor delivery take?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Standard delivery usually takes 3-5 business days. Express delivery usually takes 1-2 business days.',
              },
            },
            {
              '@type': 'Question',
              name: 'Where can I track my Aabnoor order?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Visit the Track Order page and enter the tracking number from your confirmation email.',
              },
            },
          ],
        } : undefined}
      />
      <h1 className="font-serif italic font-light text-5xl mb-12 text-[#1A1A1A]">{title}</h1>
      <div className="prose prose-sm md:prose-base prose-neutral max-w-none text-[#1A1A1A]/80 leading-relaxed space-y-6">
        {content}
      </div>
    </div>
  );
}
