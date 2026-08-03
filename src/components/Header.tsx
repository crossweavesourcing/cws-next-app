"use client"
import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, useRef } from "react";
import { X, Menu, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from 'motion/react';

type ThemeMode = 'light' | 'dark';

interface Props {
          theme?: ThemeMode;
  onToggleTheme?: () => void;
}


export default function Header({ theme = 'light', onToggleTheme }: Props) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const isDarkTheme = theme === 'dark';
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && mobileMenuOpen) {
          setMobileMenuOpen(false);
          buttonRef.current?.focus();
        }
      };

      if (mobileMenuOpen) {
        document.addEventListener('keydown', handleEscape);
        // Prevent scrolling on body when menu is open
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }, [mobileMenuOpen]);
    return (
              <header className=" sticky top-0 z-50 bg-[#000000]/95 backdrop-blur-md border-b border-neutral-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
                  <Link href="/"
                    className="flex h-12 items-center select-none focus:outline-none focus:ring-2 focus:ring-white/30"
                    aria-label="Return to portal"
                  >
                    <Image
                      src="/cws_logo.png"
                      alt="CWS"
                      width={630}
                      height={394}
                      loading="eager"
                      className="h-full w-auto object-contain"
                    />
                  </Link>
        
                  {/* Nav links */}
                  <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-wider text-gray-300">
                    <Link href="#about" className="hover:text-white transition-colors">About Us</Link>
                    <Link href="#what-we-do" className="hover:text-white transition-colors">What We Do</Link>
                    <Link href="#strategy" className="hover:text-white transition-colors">Company Strategy</Link>
                    <Link href="#products" className="hover:text-white transition-colors">Products</Link>
                    <Link href="#responsibility" className="hover:text-white transition-colors">Corporate Responsibility</Link>
                    {/* {onToggleTheme && (
                      <button
                        onClick={onToggleTheme}
                        className="theme-toggle-btn h-9 w-9 rounded-full border border-white/15 bg-white/10 text-white hover:border-[#E02424]/60 hover:text-[#E02424] transition-all focus:outline-none focus:ring-2 focus:ring-[#E02424]/30 flex items-center justify-center"
                        aria-label={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
                        aria-pressed={isDarkTheme}
                        title={isDarkTheme ? 'Light mode' : 'Dark mode'}
                      >
                        {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      </button>
                    )} */}
                  </nav>
        
                  {/* Hamburger Mobile Toggle */}
                  <div className="md:hidden flex items-center gap-2">
                    {onToggleTheme && (
                      <button
                        onClick={onToggleTheme}
                        className="theme-toggle-btn h-9 w-9 rounded-full border border-white/15 bg-white/10 text-white hover:text-[#E02424] transition-all focus:outline-none focus:ring-2 focus:ring-[#E02424]/30 flex items-center justify-center"
                        aria-label={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
                        aria-pressed={isDarkTheme}
                      >
                        {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      </button>
                    )}
                    <button
                      ref={buttonRef}
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                      className="p-2 text-gray-450 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#E02424]/30 rounded-sm"
                      aria-expanded={mobileMenuOpen}
                      aria-controls="mobile-menu"
                      aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                    >
                      {mobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
        
                {/* Mobile Navigation Dropdown */}
                <AnimatePresence>
                  {mobileMenuOpen && (
                    <motion.div 
                      id="mobile-menu"
                      ref={menuRef}
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }} 
                      className="md:hidden bg-[#111] border-b border-neutral-900 px-4 py-6 space-y-4 text-xs uppercase tracking-wider text-gray-300 shadow-xl"
                    >
                      <Link href="#about" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white focus:outline-none focus:text-[#E02424]">About Us</Link>
                      <Link href="#what-we-do" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white focus:outline-none focus:text-[#E02424]">What We Do</Link>
                      <Link href="#strategy" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white focus:outline-none focus:text-[#E02424]">Company Strategy</Link>
                      <Link href="#products" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white focus:outline-none focus:text-[#E02424]">Products</Link>
                      <Link href="#responsibility" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white focus:outline-none focus:text-[#E02424]">Corporate Responsibility</Link>        
                    </motion.div>
                  )}
                </AnimatePresence>
              </header>
    )
}