import React, { useState } from 'react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  fallbackSrc?: string;
  className?: string;
  [key: string]: any;
}

export function SafeImage({ 
  src, 
  fallbackSrc = "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80", 
  alt, 
  loading = 'lazy',
  decoding = 'async',
  ...props 
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState<string | undefined>(src);

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <img 
      {...props} 
      src={imgSrc || fallbackSrc} 
      alt={alt || "Product image"} 
      onError={handleError}
      referrerPolicy="no-referrer"
      loading={loading}
      decoding={decoding}
    />
  );
}
