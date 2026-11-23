"use client";

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { canOptimizeImage } from '@/config/image-hosts.mjs';

/** Keep trusted optimization; other backend URLs are fetched by the browser, never an unrestricted server proxy. */
export default function BackendImage({ src, alt, unoptimized, onError, ...props }: ImageProps) {
  const [directSource, setDirectSource] = useState<string | null>(null);
  const external = typeof src === 'string' && /^https:\/\//.test(src);
  const direct = Boolean(unoptimized || !canOptimizeImage(src) || directSource === src);
  return <Image {...props} src={src} alt={alt} unoptimized={direct} onError={(event) => {
    // Retry the genuine source once if the optimizer times out. Only report a
    // failed image to its caller after direct delivery has also failed.
    if (external && !direct) { setDirectSource(src); return; }
    onError?.(event);
  }} />;
}
