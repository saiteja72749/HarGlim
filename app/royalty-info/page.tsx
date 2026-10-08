"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { editedContent, useSiteContent } from "@/context/site-content-context";

export default function RoyaltyInfoPage() {
  const { content } = useSiteContent();
  const royaltySummary = editedContent(content, "royaltySummary");
  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const royaltyStructure = [
    {
      format: "Paperback",
      percentage: "40%",
      description: "Standard royalty rate for printed editions",
    },
    {
      format: "Hardcover",
      percentage: "45%",
      description: "Premium hardcover edition royalty",
    },
    {
      format: "E-Book",
      percentage: "50%",
      description: "Highest royalty rate for digital editions",
    },
    {
      format: "Audiobook",
      percentage: "35%",
      description: "Royalty for narrated audiobook versions",
    },
  ];

  const paymentSchedule = [
    {
      period: "Monthly",
      description: "Sales data tracked daily and reported monthly",
      icon: Calendar,
    },
    {
      period: "Quarterly Payments",
      description: "Royalties paid every three months",
      icon: DollarSign,
    },
    {
      period: "Minimum $50",
      description: "Payments processed only when royalties exceed $50",
      icon: TrendingUp,
    },
  ];

  const faqItems = [
    {
      question: "When do I receive my royalties?",
      answer:
        "Royalties are calculated monthly and paid quarterly. We process payments only when your accumulated royalties reach the minimum threshold of $50.",
    },
    {
      question: "How are sales tracked?",
      answer:
        "Sales are tracked in real-time through our digital platform. You can view detailed sales reports, breakdowns by region, and revenue trends in your author dashboard.",
    },
    {
      question: "Can royalty rates increase?",
      answer:
        "Yes! Bestselling authors (over 1,000 sales/month) can qualify for enhanced royalty rates. Contact our partnership team for more details.",
    },
    {
      question: "What about international sales?",
      answer:
        "International sales are tracked separately and paid at the same royalty rate. We handle currency conversion and pay in INR or USD based on your preference.",
    },
    {
      question: "Are there any deductions from royalties?",
      answer:
        "Royalties are net after production, distribution, and platform costs. No other deductions are applied.",
    },
    {
      question: "How do I track my sales?",
      answer:
        "Log into your author dashboard anytime to view real-time sales data, earnings, and detailed analytics for each of your books.",
    },
  ];

  const earningExample = [
    {
      scenario: "Paperback Sale",
      retail: "₹399",
      royalty: "₹160 (40%)",
      note: "10 sales/month = ₹1,600",
    },
    {
      scenario: "E-Book Sale",
      retail: "₹199",
      royalty: "₹100 (50%)",
      note: "20 sales/month = ₹2,000",
    },
    {
      scenario: "Hardcover Sale",
      retail: "₹599",
      royalty: "₹270 (45%)",
      note: "5 sales/month = ₹1,350",
    },
  ];

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
              Royalty Information
            </h1>
            <p className="text-xl text-primary-foreground/90 whitespace-pre-line">
              {royaltySummary || "Transparent, fair royalty rates and timely payments for all authors."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Royalty Structure */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-serif font-bold text-foreground mb-4">
              Royalty Rates by Format
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Competitive rates that reward your success
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {royaltyStructure.map((item, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="bg-card rounded-2xl border border-border p-8 text-center hover:shadow-xl transition-all"
              >
                <div className="mb-4">
                  <div className="text-5xl font-bold text-secondary mb-2">
                    {item.percentage}
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  {item.format}
                </h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Schedule */}
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
              Payment Schedule
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Regular, reliable payments you can count on
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {paymentSchedule.map((item, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="bg-card rounded-xl border border-border p-8"
              >
                <item.icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  {item.period}
                </h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Earning Examples */}
      <section className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-serif font-bold text-foreground mb-4">
              Earning Examples
            </h2>
            <p className="text-lg text-muted-foreground">
              See what you could earn with different sales volumes
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary/10 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-foreground">
                      Scenario
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-foreground">
                      Retail Price
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-foreground">
                      Your Royalty
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-foreground">
                      Monthly Example
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {earningExample.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-border hover:bg-muted/50"
                    >
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {row.scenario}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {row.retail}
                      </td>
                      <td className="px-6 py-4 text-secondary font-bold">
                        {row.royalty}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {row.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-serif font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <div className="space-y-6">
            {faqItems.map((item, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="bg-card rounded-xl border border-border p-6"
              >
                <h3 className="text-lg font-bold text-foreground mb-3">
                  {item.question}
                </h3>
                <p className="text-muted-foreground">{item.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-serif font-bold mb-4">
            Start Earning Today
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Publish with Harglim and earn competitive royalties
          </p>
          <Link href="/publish">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-primary-foreground"
            >
              Publish Your Book
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
