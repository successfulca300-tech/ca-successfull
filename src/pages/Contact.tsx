import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from 'react';
import { settingsAPI } from '@/lib/api';

const Contact = () => {
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await settingsAPI.get();
        if (mounted) setSettings((res as any).settings || {});
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const contactPhone = settings.contactPhone || '+91 91096 47073';
  const contactEmail = settings.contactEmail || 'SuccessfulCa300@gmail.com';
  const contactAddress = settings.address || '123 Education Street, Knowledge City, India - 110001';
  const siteName = settings.siteName || 'CA Successful';
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent successfully! We'll get back to you soon.");
  };

  return (
    <Layout>
      <div className="bg-primary py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground text-center">
            Contact Us
          </h1>
          <p className="text-primary-foreground/80 text-center mt-2">
            We'd love to hear from you
          </p>
        </div>
      </div>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
              <p className="text-muted-foreground mb-8">
                Have questions about our courses or need assistance? Reach out to us through any of the following channels.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="text-primary" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Address</h4>
                    <p className="text-muted-foreground">C4/61 Sector 5 Rohini New Delhi 110085</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="text-primary" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Phone</h4>
                    <p className="text-muted-foreground">+91 91096 47073</p>
                    <p className="text-muted-foreground">+91 98765 43211 (For technical support only)</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="text-primary" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Email</h4>
                    <p className="text-muted-foreground">SuccessfulCa300@gmail.com</p>
                    {/* <p className="text-muted-foreground">support@casuccessful.com</p> */}
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="text-primary" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Working Hours</h4>
                    <p className="text-muted-foreground">Mon - Sat: 11:00 AM - 8:00 PM</p>
                    <p className="text-muted-foreground">Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-card p-8 rounded-xl shadow-md border border-border">
              <h2 className="text-2xl font-semibold mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name *</label>
                    <Input placeholder="Your name" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <Input type="email" placeholder="your@email.com" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <Input placeholder="+91 91096 47073" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subject *</label>
                  <Input placeholder="How can we help?" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message *</label>
                  <Textarea placeholder="Your message..." rows={5} required />
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                  
                  <a
                    href="https://wa.me/919109647073?text=HELLO"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-3 px-5 py-3 rounded-lg border border-[#25D366]/60 bg-[#25D366]/10 text-foreground hover:bg-[#25D366]/20 hover:border-[#25D366] transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    <span className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center">
                      <svg viewBox="0 0 32 32" className="w-4 h-4 fill-white" aria-hidden="true">
                        <path d="M16 2.667c-7.36 0-13.333 5.973-13.333 13.333 0 2.347.613 4.613 1.787 6.627l-1.88 6.853 7.04-1.845c1.947 1.067 4.147 1.632 6.387 1.632 7.36 0 13.333-5.973 13.333-13.333S23.36 2.667 16 2.667zm7.787 19.2c-.32.907-1.88 1.707-2.613 1.84-.667.12-1.52.173-2.453.027-.56-.093-1.28-.307-2.213-.707-3.893-1.667-6.427-5.76-6.627-6.027-.2-.267-1.58-2.107-1.58-4.027 0-1.92 1.013-2.867 1.373-3.253.36-.387.787-.48 1.053-.48.267 0 .533.003.76.013.243.013.56-.093.88.667.32.76 1.093 2.627 1.187 2.813.093.187.16.4.027.64-.133.24-.2.387-.387.6-.187.213-.393.473-.56.64-.187.187-.387.387-.167.747.22.36.98 1.613 2.1 2.613 1.44 1.283 2.653 1.68 3.013 1.867.36.187.573.16.787-.093.213-.253.907-1.053 1.147-1.413.24-.36.48-.3.8-.187.32.107 2.027.96 2.373 1.133.347.173.58.253.667.387.087.133.087.787-.233 1.693z"/>
                      </svg>
                    </span>
                    <span className="font-semibold">Talk Us</span>
                  </a>
                  <Button type="submit" className="w-full btn-primary py-6">
                    Send Message
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
