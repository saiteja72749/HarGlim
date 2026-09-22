"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AuthorBookDetailRedirectPage() {
  const router = useRouter();
  const routeParams = useParams();
  const bookId = (routeParams?.id as string) || "";

  useEffect(() => {
    router.replace(bookId ? `/books/${bookId}` : "/author/books");
  }, [bookId, router]);

  return null;
}
