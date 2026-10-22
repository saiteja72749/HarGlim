"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { defaultSiteContent, useSiteContent } from "@/context/site-content-context";


export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  // FAQs come from the shared site content (GET /content → faq / faqsJson, edited in Admin →
  // Site Content). Categorised [{ category, items }] or a flat question list both work.
  const { content } = useSiteContent();
  const faqCategories = useMemo(() => {
    const toCategories = (raw?: string): { category: string; items: { question: string; answer: string }[] }[] => {
      try {
        const parsed = JSON.parse(raw || "");
        if (!Array.isArray(parsed) || parsed.length === 0) return [];
        return parsed.some((item: any) => Array.isArray(item?.items))
          ? parsed
          : [{ category: "Frequently Asked Questions", items: parsed }];
      } catch {
        return [];
      }
    };
    const saved = toCategories(content?.faqsJson);
    return saved.length > 0 ? saved : toCategories(defaultSiteContent.faqsJson);
  }, [content]);

  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto font-light">
              Everything you need to know about publishing, distribution, and reading with Harglim.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {faqCategories.map((cat, catIdx) => (
          <motion.div
            key={catIdx}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="space-y-4"
          >
            <h2 className="text-2xl font-serif font-bold text-foreground border-b border-border pb-3">
              {cat.category}
            </h2>
            <div className="space-y-3">
              {cat.items?.map((item: any, itemIdx: number) => {
                const globalIndex = catIdx * 100 + itemIdx;
                const isOpen = openIndex === globalIndex;

                return (
                  <div
                    key={itemIdx}
                    className="border border-border rounded-xl bg-card overflow-hidden transition-all shadow-sm"
                  >
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                      className="w-full text-left p-5 flex items-center justify-between font-medium text-foreground hover:text-primary transition-colors gap-4"
                    >
                      <span className="text-base font-semibold">{item.question}</span>
                      <ChevronDown
                        className={`h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-primary" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}

        {/* Support Callout */}
        <div className="bg-muted/40 border border-border rounded-2xl p-8 text-center space-y-4 mt-12">
          <h3 className="text-xl font-bold text-foreground">Still have questions?</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
          </p>
          <div className="flex gap-4 justify-center pt-2">
            <Link href="/contact">
              <Button>Contact Support</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
