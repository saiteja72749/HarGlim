"use client";

import { motion } from "framer-motion";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Package,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSiteContent } from "@/context/site-content-context";
import { readSection } from "@/lib/page-content";

const RETURN_ICONS = [Package, CheckCircle, DollarSign, Clock];

export default function ReturnsPolicyPage() {
  const { content } = useSiteContent();
  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const returnProcess = readSection<{ title: string; description: string }>(content, "returnsStepsJson").map(
    (item, idx) => ({ ...item, step: idx + 1, icon: RETURN_ICONS[idx % RETURN_ICONS.length] })
  );

  const eligibleReasons = readSection<string>(content, "returnsEligibleJson");

  const nonEligibleReasons = readSection<string>(content, "returnsNotEligibleJson");

  const faqItems = readSection<{ question: string; answer: string }>(content, "returnsFaqsJson");

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden py-20">
        <div className="absolute inset-0 opacity-10 bg-gradient-to-t from-primary/50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="max-w-3xl"
          >
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">
              Returns Policy
            </h1>
            <p className="text-xl text-primary-foreground/90">
              We want you to be completely satisfied with your purchase.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Quick Overview */}
      <section className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16"
          >
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <Clock className="h-12 w-12 text-primary mx-auto mb-3" />
              <div className="text-3xl font-bold text-foreground mb-1">30</div>
              <p className="text-muted-foreground">Days to Return</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <DollarSign className="h-12 w-12 text-secondary mx-auto mb-3" />
              <div className="text-3xl font-bold text-foreground mb-1">
                100%
              </div>
              <p className="text-muted-foreground">Full Refund</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <Package className="h-12 w-12 text-primary mx-auto mb-3" />
              <div className="text-3xl font-bold text-foreground mb-1">
                Free
              </div>
              <p className="text-muted-foreground">Return Shipping</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <Phone className="h-12 w-12 text-secondary mx-auto mb-3" />
              <div className="text-3xl font-bold text-foreground mb-1">
                24/7
              </div>
              <p className="text-muted-foreground">Support Team</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Return Process */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-serif font-bold text-foreground mb-4">
              How Returns Work
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple, hassle-free return process
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {returnProcess.map((item, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="relative"
              >
                <div className="bg-card rounded-xl border border-border p-8 h-full">
                  <div className="absolute -top-6 -left-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3 mt-4">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
                {index < returnProcess.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-border transform -translate-y-1/2" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Eligible & Non-Eligible */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Eligible */}
            <div className="bg-card rounded-2xl border border-border p-8">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="h-8 w-8 text-secondary" />
                <h3 className="text-2xl font-bold text-foreground">
                  Eligible Returns
                </h3>
              </div>
              <ul className="space-y-3">
                {eligibleReasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Non-Eligible */}
            <div className="bg-card rounded-2xl border border-border p-8">
              <div className="flex items-center gap-3 mb-6">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
                <h3 className="text-2xl font-bold text-foreground">
                  Non-Eligible Returns
                </h3>
              </div>
              <ul className="space-y-3">
                {nonEligibleReasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-serif font-bold text-foreground mb-4">
              Return FAQs
            </h2>
          </motion.div>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="bg-card rounded-xl border border-border p-6"
              >
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {item.question}
                </h3>
                <p className="text-muted-foreground">{item.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-serif font-bold mb-4">
            Need Return Assistance?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Our support team is here to help with any return questions
          </p>
          <Link href="/contact">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-primary-foreground"
            >
              Contact Support
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
