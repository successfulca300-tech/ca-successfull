import { Link } from "react-router-dom";
import { Youtube, Send, Phone, Linkedin, Instagram, Mail, MapPin } from "lucide-react";
import logo from "@/assets/logo.svg";
import { useEffect, useState } from 'react';
import { settingsAPI } from '@/lib/api';

const Footer = () => {
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

  return (
    <footer className="bg-navy text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <img src={logo} alt={siteName} className="h-16 mb-4 bg-white p-2 rounded-lg" />
            <p className="text-white/80 mb-4 text-sm leading-relaxed">
              Focused support for CA exam preparation with structured learning and practice.
            </p>
            <div className="flex gap-3">
              <a href="https://youtube.com/@casuccessful?si=N6WIjOIt9qb5morZ" target="_blank" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-white transition-all duration-300">
                <Youtube size={18} />
              </a>
              <a href="https://t.me/CASuccessful"  target="_blank" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-white transition-all duration-300">
                <Send size={18} />
              </a>
              {/* <a href="#" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-white transition-all duration-300">
                <Phone size={18} />
              </a> */}
              <a href="#" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-white transition-all duration-300">
                <Linkedin size={18} />
              </a>
              <a href="https://www.instagram.com/ca_successful" target="_blank" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-white transition-all duration-300">
                <Instagram size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-5 text-white relative">
              Quick Links
              <span className="absolute bottom-0 left-0 w-10 h-0.5 bg-accent -mb-2"></span>
            </h3>
            <ul className="space-y-3 mt-4">
              <li>
                <Link to="/classes" className="text-white/80 hover:text-accent hover:pl-2 transition-all duration-300 text-sm">
                  Mentorship
                </Link>
              </li>
              <li>
                <Link to="/test-series" className="text-white/80 hover:text-accent hover:pl-2 transition-all duration-300 text-sm">
                  Test Series
                </Link>
              </li>
              {/* <li>
                <Link to="/books" className="text-white/80 hover:text-accent hover:pl-2 transition-all duration-300 text-sm">
                  Books
                </Link>
              </li> */}
              <li>
                <Link to="/free-resources" className="text-white/80 hover:text-accent hover:pl-2 transition-all duration-300 text-sm">
                  Free Resources
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-5 text-white relative">
              Support
              <span className="absolute bottom-0 left-0 w-10 h-0.5 bg-accent -mb-2"></span>
            </h3>
            <ul className="space-y-3 mt-4">
              <li>
                <Link to="/about" className="text-white/80 hover:text-accent hover:pl-2 transition-all duration-300 text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/80 hover:text-accent hover:pl-2 transition-all duration-300 text-sm">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-white/80 hover:text-accent hover:pl-2 transition-all duration-300 text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-white/80 hover:text-accent hover:pl-2 transition-all duration-300 text-sm">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-5 text-white relative">
              Contact Us
              <span className="absolute bottom-0 left-0 w-10 h-0.5 bg-accent -mb-2"></span>
            </h3>
            <ul className="space-y-4 mt-4">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin size={14} />
                </div>
                  <span className="text-white/80 text-sm leading-relaxed">{contactAddress}</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Phone size={14} />
                </div>
                <span className="text-white/80 text-sm">{contactPhone}</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Mail size={14} />
                </div>
                <span className="text-white/80 text-sm">{contactEmail}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 mt-10 pt-8 text-center">
          <p className="text-white/60 text-sm">&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
          {/* <p className="text-white/60 text-sm">&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p> */}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
