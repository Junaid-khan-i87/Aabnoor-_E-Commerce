import React, { useEffect } from 'react';

interface TextPageProps {
  title: string;
  content: React.ReactNode;
}

export function TextPage({ title, content }: TextPageProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="pt-32 pb-24 max-w-3xl mx-auto px-6 font-sans">
      <h1 className="font-serif italic font-light text-5xl mb-12 text-[#1A1A1A]">{title}</h1>
      <div className="prose prose-sm md:prose-base prose-neutral max-w-none text-[#1A1A1A]/80 leading-relaxed space-y-6">
        {content}
      </div>
    </div>
  );
}
