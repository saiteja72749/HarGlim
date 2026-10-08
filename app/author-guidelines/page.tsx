"use client";

import { motion } from "framer-motion";
import {
  CheckCircle,
  AlertCircle,
  BookOpen,
  FileText,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { editedContent, useSiteContent } from "@/context/site-content-context";

export default function AuthorGuidelinesPage() {
  const { content } = useSiteContent();
  const guidelinesText = editedContent(content, "authorGuidelinesText");
  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const guidelines = [
    {
      title: "Manuscript Requirements",
      icon: FileText,
      items: [
        "Minimum 30,000 words for novels",
        "Minimum 20,000 words for non-fiction",
        "Microsoft Word (.doc, .docx) or PDF format",
        "Double-spaced, 12pt font (Times New Roman or Arial)",
        "Standard margins (1 inch on all sides)",
        "Single paragraph indentation, not tab indentation",
      ],
    },
    {
      title: "Content Guidelines",
      icon: BookOpen,
      items: [
        "Original, unpublished work only",
        "No plagiarism or copyright infringement",
        "Appropriate for the target audience",
        "Professional quality writing",
        "Clear narrative structure and flow",
        "Proper grammar and spelling throughout",
      ],
    },
    {
      title: "Writing Standards",
      icon: Users,
      items: [
        "Consistent voice and tone",
        "Well-developed characters and plot",
        "Engaging opening and compelling ending",
        "Proper chapter breaks and organization",
        "Minimal plot holes or inconsistencies",
        "Age-appropriate content for target market",
      ],
    },
  ];

  const submissionSteps = [
    {
      step: 1,
      title: "Create Account",
      description:
        "Register on Harglim Publishers and set up your author profile",
    },
    {
      step: 2,
      title: "Submit Manuscript",
      description: "Upload your manuscript through the author dashboard",
    },
    {
      step: 3,
      title: "Initial Review",
      description: "Our team reviews your work (7-14 days)",
    },
    {
      step: 4,
      title: "Editor Feedback",
      description: "Receive detailed feedback and revision suggestions",
    },
    {
      step: 5,
      title: "Revisions",
      description: "Make necessary revisions and resubmit",
    },
    {
      step: 6,
      title: "Publication",
      description: "Final approval and launch on our platform",
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
              Author Guidelines
            </h1>
            <p className="text-xl text-primary-foreground/90 mb-8 whitespace-pre-line">
              {guidelinesText ||
                "Follow our comprehensive guidelines to ensure your manuscript meets our publishing standards."}
            </p>
            <Link href="/publish">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-primary-foreground"
              >
                Start Publishing
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Guidelines Section */}
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
              Submission Guidelines
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ensure your manuscript meets all requirements before submission
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {guidelines.map((guideline, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="bg-card rounded-2xl border border-border p-8 hover:shadow-xl transition-all"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <guideline.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-foreground">
                    {guideline.title}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {guideline.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Submission Process */}
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
              Submission Process
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Follow these steps to get your book published
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {submissionSteps.map((item, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="bg-card rounded-xl border border-border p-6 relative"
              >
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2 mt-4">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notes */}
      <section className="py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-900/50 rounded-xl p-8"
          >
            <div className="flex gap-4">
              <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-100 mb-3">
                  Important Points
                </h3>
                <ul className="space-y-2 text-yellow-800 dark:text-yellow-200">
                  <li>
                    • Manuscripts are reviewed in the order they are received
                  </li>
                  <li>• Review process typically takes 2-4 weeks</li>
                  <li>• Multiple revisions may be requested</li>
                  <li>• We accept both fiction and non-fiction genres</li>
                  <li>• Copyright remains with the author</li>
                  <li>• All submissions are treated confidentially</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Link */}
      <section className="py-16 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-serif font-bold mb-4">
            Still Have Questions?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Check our FAQ section or contact our support team
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/faq">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-primary-foreground"
              >
                View FAQ
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
              >
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
