"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const defaultFaqCategories = [
  {
    category: "General Questions",
    items: [
      {
        question: "What is Harglim Publishers?",
        answer:
          "Harglim Publishers is a modern, author-friendly publishing platform that empowers writers to publish and distribute their books globally while maintaining creative control and earning competitive royalties.",
      },
      {
        question: "Do I need an agent to publish with Harglim?",
        answer:
          "No, we work directly with authors. You don't need a literary agent to publish with us. Simply create an account and submit your manuscript through our platform.",
      },
      {
        question: "What genres do you accept?",
        answer:
          "We accept all genres including fiction, non-fiction, romance, mystery, science fiction, fantasy, self-help, biography, and more. Our focus is on quality content in any category.",
      },
      {
        question: "Is there a publishing fee?",
        answer:
          "We offer flexible publishing options. We provide free self-publishing services, and also offer premium publishing packages with professional editing, cover design, and marketing support.",
      },
    ],
  },
  {
    category: "Submission & Publishing",
    items: [
      {
        question: "How do I submit my manuscript?",
        answer:
          'Create an author account, go to your dashboard, and use the "Submit Manuscript" button. Upload your manuscript in Word or PDF format and fill out the submission form.',
      },
      {
        question: "How long does the review process take?",
        answer:
          "Our initial review takes 7-14 days. If selected for publication, the complete process from submission to launch typically takes 2-4 weeks depending on required revisions.",
      },
      {
        question: "What if my manuscript is rejected?",
        answer:
          "We provide constructive feedback on rejected manuscripts. Many authors revise and resubmit. We welcome second submissions after addressing our feedback.",
      },
      {
        question: "Do you accept translated works?",
        answer:
          "Yes, we accept quality translations. Please ensure the translation rights are secured and include documentation of rights with your submission.",
      },
    ],
  },
  {
    category: "Books & Distribution",
    items: [
      {
        question: "Where will my book be available?",
        answer:
          "Your book will be available on Harglim Publishers platform, major online retailers (Amazon, Goodreads), and can be ordered through independent bookstores worldwide.",
      },
      {
        question: "Can I print physical copies of my book?",
        answer:
          "Yes! We provide print-on-demand services. Physical copies can be printed in small batches or as orders come in, reducing printing costs.",
      },
      {
        question: "Can I publish in multiple formats?",
        answer:
          "Yes, we support e-book (EPUB, PDF), paperback, hardcover, and audiobook formats. You can publish in one format initially and add others later.",
      },
      {
        question: "Can I change my book after publishing?",
        answer:
          "Yes, you can update your manuscript, cover design, or book details. Changes typically go live within 24-48 hours.",
      },
    ],
  },
  {
    category: "Rights & Copyright",
    items: [
      {
        question: "Do I retain copyright of my book?",
        answer:
          "Yes, you retain full copyright. You grant us permission to publish and distribute, but you remain the sole copyright holder and owner of your work.",
      },
      {
        question: "Can I sell my book elsewhere?",
        answer:
          "You can publish simultaneously with other platforms. We don't require exclusivity unless you choose our exclusive distribution program for enhanced royalties.",
      },
      {
        question: "What if I want to remove my book?",
        answer:
          "You can unpublish your book anytime from your author dashboard. Published copies remain active, but new orders won't be processed after unpublishing.",
      },
    ],
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [faqCategories, setFaqCategories] = useState<any[]>(defaultFaqCategories);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const { data } = await api.get('/content');
        const dynamicFaqs = data?.data?.faq || data?.faq;
        if (Array.isArray(dynamicFaqs) && dynamicFaqs.length > 0) {
          const hasCategories = dynamicFaqs.some((item: any) => Array.isArray(item?.items));
          setFaqCategories(
            hasCategories
              ? dynamicFaqs
              : [{ category: "Frequently Asked Questions", items: dynamicFaqs }]
          );
        }
      } catch {
        // Fall back to the default FAQ categories defined above.
      }
    };
    fetchFaqs();
  }, []);

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
