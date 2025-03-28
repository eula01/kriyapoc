"use client";

import Image from "next/image";
import { useState } from "react";

interface LogoImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function LogoImage({ src, alt, className }: LogoImageProps) {
  const [error, setError] = useState(false);
  
  return (
    <div className="h-8 w-8 relative">
      <Image 
        src={error ? "/logos/default.svg" : src}
        alt={alt}
        fill
        className={className || "object-contain"}
        onError={() => setError(true)}
      />
    </div>
  );
} 