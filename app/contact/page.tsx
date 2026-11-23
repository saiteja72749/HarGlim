"use client";

import { describeApiError } from "@/lib/api-error";

import { useRef, useState } from "react";
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
import { useSiteContent, type SiteContent } from "@/context/site-content-context";
import toast from "react-hot-toast";

import api from "@/lib/api";

// Contact details come exclusively from GET /content.
const getContactCards = (content: SiteContent) => [
  {
    icon: Mail,
    title: "Email Us",
    lines: Array.from(
      new Set([
        content.contactSupportEmail,
        content.contactEmail,
      ])
    ).filter(Boolean),
  },
  {
    icon: Phone,
    title: "Call Us",
    lines: [content.contactPhone].filter(Boolean),
  },
  {
    icon: MapPin,
    title: "Publishing Headquarters",
    lines: [content.contactAddressLine1, content.contactAddressLine2].filter(Boolean),
  },
  {
    icon: Clock,
    title: "Working Hours",
    lines: [content.contactHours].filter(Boolean),
  },
].filter((card) => card.lines.length > 0);

const inquiryCategories = [
  "General Inquiry",
  "Publishing Question & Manuscript Submission",
  "Order & Shipping Support",
  "Author Royalty Inquiry",
  "Partnership & Media",
  "Other",
];

export default function ContactPage() {
  const { content } = useSiteContent();
  const officeAddress = [content.contactAddressLine1, content.contactAddressLine2].filter(Boolean).join(", ");
  const pending = useRef(false);
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
    if (pending.current) return;
    if (!formState.name.trim() || !formState.email.trim() || !formState.message.trim() || !inquiryCategories.includes(formState.inquiryType)) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const phone = formState.phone.trim();
    if (phone && !/^\+?\d{7,15}$/.test(phone.replace(/[\s()-]/g, ""))) {
      toast.error("Enter a valid phone number with its country code if applicable.");
      return;
    }
    pending.current = true;
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/contact", {
        name: formState.name.trim(),
        email: formState.email.trim(),
        phone,
        subject: formState.inquiryType,
        message: formState.message.trim(),
        page: "/contact",
      });
      if (data?.success === false || data?.status === "error" || data?.status === "failed") {
        throw new Error("The server did not accept the message.");
      }
      setIsSubmitted(true);
      toast.success("Thank you! Your message has been sent.");
    } catch (caughtError) {
      const err = describeApiError(caughtError);
      toast.error(
        err?.response?.data?.message ||
          "Failed to submit message. Please try again or use the email address listed on this page."
      );
    } finally {
      pending.current = false;
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
              {getContactCards(content).map((card, idx) => (
                <Card key={idx} className="bg-white border border-[#E2E6DF] rounded-2xl p-5 shadow-xs hover:border-[#D4AF37] transition-all">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-[#0F3D3E] text-[#D4AF37] flex items-center justify-center shadow-xs">
                      <card.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-sm text-[#0F3D3E] mb-1">{card.title}</h3>
                      {card.lines.map((line, lIdx) => (
                        <p key={lIdx} className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
                          {card.icon === Mail || card.icon === Phone ? (
                            <a className="inline-flex min-h-11 items-center underline" href={card.icon === Mail ? `mailto:${line}` : `tel:${line.replace(/[^+\d]/g, "")}`}>{line}</a>
                          ) : line}
                        </p>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7">
            <Card className="bg-white border border-[#E2E6DF] rounded-3xl p-6 sm:p-10 shadow-sm">
              <div className="mb-6 space-y-1">
                <h2 className="text-2xl font-serif font-bold text-[#0F3D3E]">
                  Send Us a Message
                </h2>
              </div>

              {isSubmitted ? (
                <div role="status" className="text-center py-12 space-y-4">
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
                        autoComplete="name"
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
                        autoComplete="email"
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
                        autoComplete="tel"
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
                        required
                        value={formState.inquiryType}
                        onValueChange={(val) => setFormState({ ...formState, inquiryType: val })}
                      >
                        <SelectTrigger id="inquiryType" className="bg-[#F8F9F7] border-[#E2E6DF] min-h-11 w-full rounded-xl text-sm">
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
        {officeAddress && (
          <section className="mt-10 space-y-3" aria-labelledby="office-map">
            <h2 id="office-map" className="font-serif text-2xl font-semibold">Find our office</h2>
            <a className="inline-flex min-h-11 items-center underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(officeAddress)}`}>{officeAddress}</a>
            <iframe
              title="Harglim Publishers office map"
              src={`https://www.google.com/maps?q=${encodeURIComponent(officeAddress)}&output=embed`}
              className="h-72 w-full rounded-2xl border"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </section>
        )}
      </div>
    </div>
  );
}
