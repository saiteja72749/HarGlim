"use client";

import { motion } from "framer-motion";
import { ArrowRight, Briefcase, Users, Heart, Zap, Coffee, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteContent } from "@/context/site-content-context";
import { readSection } from "@/lib/page-content";

const BENEFIT_ICONS = [Heart, Globe, Zap, Coffee];

export default function CareersPage() {
  const { content } = useSiteContent();
  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  // Only what the admin lists under Site Content → Page Sections → Careers; empty hides the section.
  const benefits = readSection<{ title: string; description: string }>(content, "careersBenefitsJson")
    .map((item, idx) => ({ ...item, icon: BENEFIT_ICONS[idx % BENEFIT_ICONS.length] }));
  const careersEmail = content.careersEmail || content.contactEmail;

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-primary-foreground overflow-hidden py-24 md:py-32">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl mx-auto"
          >
            <motion.div variants={fadeInUp} className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-sm font-semibold shadow-lg">
              <Briefcase className="h-4 w-4" />
              Join the Team
            </motion.div>
            
            <motion.h1
              variants={fadeInUp}
              className="text-5xl md:text-7xl font-serif font-bold mb-6 leading-tight"
            >
              Help Us Shape the <span className="text-secondary">Future of Reading</span>
            </motion.h1>
            
            <motion.p
              variants={fadeInUp}
              className="text-lg md:text-xl text-primary-foreground/90 leading-relaxed mb-10"
            >
              Join a passionate team dedicated to empowering authors and bringing incredible stories to readers worldwide.
            </motion.p>

            <motion.div variants={fadeInUp}>
              <Button size="lg" className="bg-white text-primary hover:bg-primary-foreground font-bold h-14 px-8 shadow-xl transition-all" asChild>
                <a href="#open-roles">View Open Roles <ArrowRight className="ml-2 h-5 w-5" /></a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Culture & Benefits */}
      {benefits.length > 0 && (
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
                Why Join Harglim?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We&apos;re building a culture where creativity thrives, bold ideas are celebrated, and every team member can do their best work.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="bg-card p-8 rounded-2xl border border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300 group"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 text-primary">
                    <benefit.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{benefit.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Image Banner */}
      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             transition={{ duration: 0.6 }}
             className="relative h-[400px] rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 bg-black/40 z-10" />
            <div 
              className="absolute inset-0 bg-gradient-to-r from-[#0B2E2F] via-[#0F3D3E] to-[#082223]"
            />
            <div className="absolute inset-0 z-20 flex items-center justify-center text-center p-8">
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-white max-w-3xl leading-tight">
                &ldquo;We believe that great books have the power to change the world, and it takes a great team to make that happen.&rdquo;
              </h2>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Open Roles */}
      <section id="open-roles" className="py-24 bg-background scroll-mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-4xl font-serif font-bold text-foreground mb-4">
              Open Positions
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              We currently don&apos;t have any open positions. Please check back later or send your resume to <a href={`mailto:${careersEmail}`} className="text-primary hover:underline">{careersEmail}</a>.
            </p>
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted/50 mb-6">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">
              No openings right now
            </h3>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
