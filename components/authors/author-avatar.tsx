"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import Image from "@/components/ui/backend-image";
import { cn } from "@/lib/utils";
import { authorPhoto } from "@/lib/author-presentation";

export function AuthorAvatar({ author, className, sizes }: {
  author: { name?: string; profilePicture?: string | null; profileImage?: string | null };
  className?: string;
  sizes: string;
}) {
  const [failedSource, setFailedSource] = useState("");
  const source = authorPhoto(author);
  const initials = author.name?.trim().split(/\s+/).slice(0, 2)
    .map((word) => Array.from(word)[0]).join("").toLocaleUpperCase();

  return (
    <span aria-hidden="true" className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#0F3D3E] font-serif font-semibold text-[#D4AF37]", className)}>
      {source && source !== failedSource
        ? <Image src={source} alt="" fill sizes={sizes} className="object-cover" onError={() => setFailedSource(source)} />
        : initials || <UserRound className="size-1/2 opacity-70" />}
    </span>
  );
}
