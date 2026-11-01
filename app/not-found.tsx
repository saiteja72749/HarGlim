import Link from "next/link";
import { BookX, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  // Absolute: when a book, author or category page calls notFound() the root title template
  // is not applied, so the site name is spelled out to keep every 404 title the same.
  title: { absolute: "Page Not Found | Harglim Publishers" },
};

export default function NotFound() {
  return (
    <div className="bg-[#F8F9F7] min-h-[70vh] flex items-center justify-center px-4 py-20 text-[#0F3D3E] font-sans">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="mx-auto h-20 w-20 rounded-2xl bg-[#0F3D3E] text-[#D4AF37] flex items-center justify-center shadow-md">
          <BookX className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E]">Error 404</p>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
            This page hasn&apos;t been published
          </h1>
          <p className="text-sm text-[#5C6E6E] max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved. Let&apos;s get you back to the catalog.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/40 font-serif font-bold h-11 px-6 rounded-xl gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-[#0F3D3E]/20 text-[#0F3D3E] font-serif font-bold h-11 px-6 rounded-xl gap-2">
            <Link href="/books">
              <span>Browse Books</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
