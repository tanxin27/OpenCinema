"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

interface SafeImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
}

export default function SafeImage({ src, alt, fill, className = "" }: SafeImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    if (fill) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted p-1 text-center">
          <ImageOff className="h-4 w-4 text-muted-foreground" />
          <span className="mt-0.5 text-[9px] leading-tight text-muted-foreground">
            文件缺失
          </span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center bg-muted p-1 text-center">
        <ImageOff className="h-4 w-4 text-muted-foreground" />
        <span className="mt-0.5 text-[9px] leading-tight text-muted-foreground">
          文件缺失
        </span>
      </div>
    );
  }

  if (fill) {
    return (
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 h-full w-full ${className}`}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}
