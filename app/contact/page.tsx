"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { siteConfig } from "@/config/site";
import toast from "react-hot-toast";

import api from "@/lib/api";

const contactCards = [
  {
    icon: Mail,
    title: "Email Us",
    lines: [siteConfig.contact.supportEmail, siteConfig.contact.authorsEmail].filter(Boolean),
  },
  {
    icon: Phone,
    title: "Call Us",
    lines: [siteConfig.contact.phonePrimary, siteConfig.contact.phoneSecondary].filter(Boolean),
  },
  {
    icon: MapPin,
    title: "Publishing Headquarters",
    lines: [siteConfig.contact.addressLine1, siteConfig.contact.addressLine2].filter(Boolean),
  },
  {
    icon: Clock,
    title: "Working Hours",
    lines: [siteConfig.contact.workingHours.weekdays, siteConfig.contact.workingHours.weekends].filter(Boolean),
  },
];

const inquiryCategories = [
  "General Inquiry",
  "Publishing Question & Manuscript Submission",
  "Order & Shipping Support",
  "Author Royalty Inquiry",
  "Partnership & Media",
  "Other",
];

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    inquiryType: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim() || !formState.email.trim() || !formState.message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/contact", {
        name: formState.name.trim(),
        email: formState.email.trim(),
        phone: formState.phone.trim(),
        subject: formState.inquiryType || "Website contact enquiry",
        message: formState.message.trim(),
        page: "/contact",
      }).catch(() =>
        api.post("/contact-requests", {
          name: formState.name.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim(),
          subject: formState.inquiryType || "Website contact enquiry",
          message: formState.message.trim(),
          page: "/contact",
        })
      );
      setIsSubmitted(true);
      toast.success("Thank you! Your message has been sent.");
    } catch (err) {
      console.error("Failed to submit contact form:", err);
      toast.error("Failed to submit message. Please try again or use the email address listed on this page.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F8F9F7] min-h-screen text-[#0F3D3E] font-sans">
      
      {/* 1. HERO SECTION */}
      <section className="relative bg-gradient-to-b from-[#0B2E2F] via-[#0F3D3E] to-[#082223] text-white py-20 md:py-24 text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-serif font-bold">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>We&apos;re Here to Help</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-white tracking-tight">
            Get In Touch
          </h1>

          <p className="text-base sm:text-lg text-white/80 max-w-xl mx-auto font-light leading-relaxed">
            Have questions about publishing your manuscript, order tracking, or partnership opportunities? Send us a message today.
          </p>
        </div>
      </section>

      {/* 2. CONTACT CONTENT GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Contact Cards */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-serif font-bold text-[#0F3D3E]">
                Direct Contact Information
              </h2>
              <p className="text-xs text-[#5C6E6E]">
                Reach our team directly via email, phone, or visit our office.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {contactCards.map((card, idx) => (
                <Card key={idx} className="bg-white border border-[#E2E6DF] rounded-2xl p-5 shadow-xs hover:border-[#D4AF37] transition-all">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-[#0F3D3E] text-[#D4AF37] flex items-center justify-center shadow-xs">
                      <card.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-sm text-[#0F3D3E] mb-1">{card.title}</h3>
                      {card.lines.map((line, lIdx) => (
                        <p key={lIdx} className="text-xs text-[#5C6E6E] font-medium leading-relaxed">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Embedded Google Map */}
            <div className="rounded-2xl overflow-hidden border border-[#E2E6DF] aspect-video shadow-xs">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3769.9895377316645!2d72.85225371490257!3d19.11695918706089!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c9c676018b43%3A0x75f29a4205098f99!2sAndheri%20East%2C%20Mumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1642588765410!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7">
            <Card className="bg-white border border-[#E2E6DF] rounded-3xl p-6 sm:p-10 shadow-sm">
              <div className="mb-6 space-y-1">
                <h2 className="text-2xl font-serif font-bold text-[#0F3D3E]">
                  Send Us a Message
                </h2>
                <p className="text-xs text-[#5C6E6E]">
                  We typically respond within 24 business hours.
                </p>
              </div>

              {isSubmitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-[#0F3D3E]">
                    Message Sent Successfully!
                  </h3>
                  <p className="text-xs text-[#5C6E6E] max-w-sm mx-auto">
                    Thank you for reaching out to Harglim Publishers. An editorial representative will contact you shortly.
                  </p>
                  <Button
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormState({ name: "", email: "", phone: "", inquiryType: "", message: "" });
                    }}
                    className="bg-[#0F3D3E] text-white hover:bg-[#174C4D] font-serif font-bold text-xs px-6 rounded-xl"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-bold text-[#0F3D3E]">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="Your full name"
                        required
                        value={formState.name}
                        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                        className="bg-[#F8F9F7] border-[#E2E6DF] h-11 rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-bold text-[#0F3D3E]">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                        value={formState.email}
                        onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                        className="bg-[#F8F9F7] border-[#E2E6DF] h-11 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-bold text-[#0F3D3E]">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formState.phone}
                        onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                        className="bg-[#F8F9F7] border-[#E2E6DF] h-11 rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="inquiryType" className="text-xs font-bold text-[#0F3D3E]">Inquiry Category *</Label>
                      <Select
                        value={formState.inquiryType}
                        onValueChange={(val) => setFormState({ ...formState, inquiryType: val })}
                      >
                        <SelectTrigger className="bg-[#F8F9F7] border-[#E2E6DF] h-11 rounded-xl text-xs">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-[#E2E6DF]">
                          {inquiryCategories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="text-xs">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="message" className="text-xs font-bold text-[#0F3D3E]">Your Message *</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      placeholder="How can we assist you with your book or inquiry?"
                      required
                      value={formState.message}
                      onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                      className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/50 font-serif font-bold text-sm h-12 rounded-xl shadow-xs gap-2"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
