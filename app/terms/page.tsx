"use client";

import { motion } from "framer-motion";
import { FileText, User, ShoppingBag, BookOpen, AlertCircle, Scale } from "lucide-react";
import Link from "next/link";
import { useSiteContent } from "@/context/site-content-context";
import { readSection } from "@/lib/page-content";

const SECTION_ICONS = [FileText, User, ShoppingBag, BookOpen, Scale, AlertCircle];

export default function TermsOfServicePage() {
  const { content } = useSiteContent();
  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const sections = readSection<{ title: string; content: string }>(content, "termsSectionsJson")
    .map((item, idx) => ({ ...item, icon: SECTION_ICONS[idx % SECTION_ICONS.length] }));

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden py-20">
        <div className="absolute inset-0 opacity-10 bg-[url('/grid.svg')] bg-center" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="max-w-3xl"
          >
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">
              Terms of Service
            </h1>
            <p className="text-xl text-primary-foreground/90">
              Effective Date: June 1, 2026 | Last Updated: June 2, 2026
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {sections.map((section, index) => (
            <motion.div
              key={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="bg-card rounded-2xl border border-border p-8 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4 mb-4">
                <section.icon className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <h2 className="text-3xl font-bold text-foreground">
                  {section.title}
                </h2>
              </div>
              <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {section.content}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl font-serif font-bold text-foreground mb-4">
              Questions About Our Terms?
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              If you have any questions or concerns regarding our Terms of Service, please contact us.
            </p>
            <div className="bg-card border border-border rounded-xl p-6 inline-block">
              <p className="text-muted-foreground mb-2">Email us at:</p>
              <Link
                href="mailto:legal@harglim.com"
                className="text-primary hover:underline font-bold text-lg"
              >
                legal@harglim.com
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
