"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { motion } from 'motion/react';

const navItems = [
  { label: 'About Us', href: '/#about' },
  { label: 'What We Do', href: '/#what-we-do' },
  { label: 'Company Strategy', href: '/#strategy' },
  { label: 'Our Brands', href: '/#brands' },
  { label: 'Corporate Responsibility', href: '/#responsibility' },
];

export default function ProductHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#000000]/95 backdrop-blur-md border-b border-neutral-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link
          href="/"
          className="tko-logo-plate flex h-12 items-center select-none focus:outline-none focus:ring-2 focus:ring-white/30"
          aria-label="Back to CWS home"
        >
          <Image
            src="/cws_logo.png"
            alt="CWS"
            width={630}
            height={394}
            loading="eager"
            className="h-full w-auto object-contain"
            priority
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-wider text-gray-300">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="p-2 text-gray-450 hover:text-white focus:outline-none"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden bg-[#111] border-b border-neutral-900 px-4 py-6 space-y-4 text-xs uppercase tracking-wider text-gray-300"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </motion.div>
      )}
    </header>
  );
}
