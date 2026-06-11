"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Layers,
  ShieldCheck,
  MessageSquare,
  MapPin,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Send,
  Sparkles,
  Check,
  Eye,
  Calendar,
  Menu,
  X,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  Mail,
  Phone,
  Heart,
  Linkedin,
  Award,
  Shield,
  FileCheck,
  CheckCircle2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Users,
  Flame,
  Handshake,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TKOPage from './components/TKOPage';

// Live timezone calculation offsets
const OFFICE_OFFSETS: Record<string, number> = {
  'Dhaka': 6,
  'Istanbul': 3,
  'Tirupur': 5.5,
  'Lahore': 5,
  'Alexandria': 2
};

const COUNTRIES = [
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'BD', dial: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: 'TR', dial: '+90', flag: '🇹🇷', name: 'Turkey' },
  { code: 'ES', dial: '+34', flag: '🇪🇸', name: 'Spain' },
  { code: 'DE', dial: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: 'CN', dial: '+86', flag: '🇨🇳', name: 'China' },
  { code: 'IN', dial: '+91', flag: '🇮🇳', name: 'India' }
];

interface NewsItem {
  id: string;
  title: string;
  category: string;
  author: string;
  date: string;
  excerpt: string;
  readTime: string;
  tags: string[];
  bgStyle: {
    unsplashUrl: string;
    overlayGradient: string;
  };
}

const NEWSFEED_ITEMS: NewsItem[] = [
  {
    id: 'news-1',
    category: 'Sustainability',
    title: 'Elevate Your Colour Performance with natific',
    author: 'Anik',
    date: 'Sun, 10/12/2025 - 07:40',
    excerpt: 'Explore fast, accurate, and sustainable colour management across the supply chain.',
    readTime: '3 min read',
    tags: [
      '#NatificColourCertificationProgram',
      '#DigitalColourTechnology',
      '#SustainableColourDevelopment',
      '#ApparelSourcing',
      '#DigitalColourManagement',
      '#SustainableFashion',
      '#ColourConsistency',
      '#CertifiedLABResult'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-blue-950/90 via-slate-900/80 to-blue-950/95'
    }
  },
  {
    id: 'news-2',
    category: 'Denim',
    title: 'Our Denim Customisation for Global Brands',
    author: 'Ashok',
    date: 'Wed, 09/10/2025 - 10:15',
    excerpt: 'From design to finished product, CWS delivers customise denim solutions for global brands.',
    readTime: '4 min read',
    tags: [
      '#GlobalDenimSourcingPartner',
      '#CustomDenimManufacturing',
      '#SustainableDenimDevelopment',
      '#DenimDesignInnovation',
      '#DenimCustomisationSolutions'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-sky-950/90 via-slate-900/80 to-sky-950/95'
    }
  },
  {
    id: 'news-3',
    category: 'Sustainability',
    title: 'World Water Day 2025',
    author: 'Milon',
    date: 'Fri, 03/21/2025 - 08:00',
    excerpt: 'How Our Initiatives to Water Stewardship Supports Glacier Preservation.',
    readTime: '5 min read',
    tags: [
      '#WorldWaterDay',
      '#WaterConservation',
      '#SustainableWater',
      '#ClimateAction',
      '#SaveWaterSaveLife',
      '#ZDHC',
      '#WaterStewardship',
      '#SustainabilityMatters',
      '#WaterIsLife',
      '#EcoFriendly',
      '#GreenFuture',
      '#ProtectThePlanet',
      '#GlacierPreservation',
      '#WaterManagement',
      '#ZeroWasteWater',
      '#WaterResilience',
      '#GlobalWaterCrisis',
      '#CleanWaterForAll'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-indigo-950/90 via-slate-900/80 to-indigo-950/95'
    }
  },
  {
    id: 'news-4',
    category: 'Innovation',
    title: 'Meet Our Denim Innovation R&D Team',
    author: 'Jubran',
    date: 'Sun, 10/15/2023 - 06:42',
    excerpt: 'Denim, an inseparable category in today\'s fashion world. Though it was once considered simple...',
    readTime: '4 min read',
    tags: [
      '#SustainableDenim',
      '#Indigo',
      '#cwsDenim',
      '#InnovationR&D'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1582450871972-ab5ca641643d?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-blue-900/95 via-sky-950/80 to-neutral-900/95'
    }
  },
  {
    id: 'news-5',
    category: 'People',
    title: '‘A Day in the Life of’ @CWS - Rituparna Neog, Home Living Business Manager',
    author: 'Jubran',
    date: 'Thu, 10/13/2022 - 10:00',
    excerpt: 'In seventh episode of ‘A Day in the Life of’ @CWS, let us introduce Rituparna.',
    readTime: '6 min read',
    tags: [
      '#cwsHomeLiving',
      '#RituparnaNeog'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-amber-950/90 via-stone-900/80 to-stone-950/95'
    }
  },
  {
    id: 'news-6',
    category: 'People',
    title: '‘A Day in the Life of’ @CWS - Nuzhat Tasnim, Talent Acquisition Team Lead',
    author: 'Jubran',
    date: 'Mon, 09/12/2022 - 10:00',
    excerpt: 'Nuzhat Tasnim, one of our global talents, has been leading Talent Acquisition efforts directly.',
    readTime: '5 min read',
    tags: [
      '#cwsTalentAcquisition',
      '#cwsECM',
      '#NuzhatTasnim'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-indigo-950/90 via-slate-900/80 to-indigo-950/95'
    }
  },
  {
    id: 'news-7',
    category: 'Partnership',
    title: 'Sourcing Journal features CWS’s Global Relationship Building Strategy',
    author: 'Jubran',
    date: 'Mon, 08/01/2022 - 09:00',
    excerpt: 'A global resource for the apparel industry, Sourcing Journal has recently published our framework and model.',
    readTime: '4 min read',
    tags: [
      '#SustainabilityEfforts',
      '#Playbook',
      '#Partnership'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-slate-900/90 via-blue-950/80 to-slate-950/95'
    }
  },
  {
    id: 'news-8',
    category: 'People',
    title: '‘A Day in the Life of’ @CWS - Rahman Naveed Anjum, ERP Team Lead',
    author: 'Jubran',
    date: 'Wed, 06/22/2022 - 11:00',
    excerpt: 'For our fourth instalment of the mini-series - ‘A Day in the Life of @CWS, we had an exploration of our tech stack.',
    readTime: '6 min read',
    tags: [
      '#cwsTalent',
      '#RahmanNaveedAnjum',
      '#cwsERP'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-purple-950/90 via-slate-900/85 to-indigo-950/95'
    }
  },
  {
    id: 'news-9',
    category: 'Sustainability',
    title: 'Celebrating World Environment Day #OnlyOneEarth',
    author: 'Milon',
    date: 'Thu, 06/02/2022 - 06:58',
    excerpt: 'As a responsible global apparel industry player, we understand the significance and values of preserving ecosystems.',
    readTime: '4 min read',
    tags: [
      '#OnlyOneEarth',
      '#WorldEnvironmentDay',
      '#cwsTreePlantation',
      '#SmallEffortsMatter'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-emerald-950/90 via-teal-900/80 to-emerald-950/95'
    }
  },
  {
    id: 'news-10',
    category: 'People',
    title: '‘A Day in the Life of’ @CWS - Sabiha Shahrin Rimi, Digital Assistant',
    author: 'Jubran',
    date: 'Tue, 05/31/2022 - 14:00',
    excerpt: 'Welcome back to our mini-series - ‘A Day in the Life of @CWS. In our third episode, let\'s explore with Rimi.',
    readTime: '5 min read',
    tags: [
      '#cwsTalent',
      '#cwsSabihaShahrinRimi',
      '#cwsCreativeDesigner',
      '#cwsPhotography'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-pink-950/90 via-slate-900/80 to-indigo-950/95'
    }
  },
  {
    id: 'news-11',
    category: 'Sourcing',
    title: 'Our Egyptian Adventure',
    author: 'Srinath',
    date: 'Thu, 05/12/2022 - 07:40',
    excerpt: 'Keeping up with the pace of our customer requirements and helping us to offer premium products directly.',
    readTime: '3 min read',
    tags: [
      '#cwsEgypt',
      '#cwsAlexandria',
      '#EgyptianCotton'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1600577916048-804c9191e36c?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-amber-950/90 via-orange-950/80 to-stone-950/95'
    }
  },
  {
    id: 'news-12',
    category: 'People',
    title: '‘A Day in the Life of’ @CWS - Dilara Gedik, 3D Designer',
    author: 'Jubran',
    date: 'Fri, 04/29/2022 - 05:25',
    excerpt: 'Here is the next episode of our mini-series - ‘A Day in the Life of’ @CWS. For our state-of-the-art 3D Lab.',
    readTime: '7 min read',
    tags: [
      '#DilaraGedik',
      '#cws3dDesigner',
      '#3dSample'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-violet-950/90 via-purple-900/80 to-stone-950/95'
    }
  },
  {
    id: 'news-13',
    category: 'Sustainability',
    title: 'Sourcing Journal features CWS’s Solution for Sustainable Cotton Fibre',
    author: 'Mou',
    date: 'Thu, 04/21/2022 - 08:41',
    excerpt: 'To cope-up with the global apparel industry demand for organic cotton and traceable inputs.',
    readTime: '4 min read',
    tags: [
      '#OrganicCotton',
      '#SustainableCottonFibre',
      '#SourcingJournalArticle'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1594489428504-5c0c480a15fd?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-slate-900/90 via-stone-800/80 to-slate-950/95'
    }
  },
  {
    id: 'news-14',
    category: 'Innovation',
    title: 'Nanotech Fabrics: Future of Finishes',
    author: 'Gargi',
    date: 'Thu, 04/21/2022 - 08:38',
    excerpt: 'When we think of futuristic clothing, we think possibly of intelligent fabrics with active protection.',
    readTime: '5 min read',
    tags: [
      '#NanotechFabric',
      '#FutureOfFinishes',
      '#WaterResist',
      '#StainResist',
      '#WrinklesResist',
      '#OdoursResist',
      '#cwsInternational',
      '#Innovation',
      '#GlobalApparelPartner'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-zinc-950/90 via-sky-950/80 to-zinc-950/95'
    }
  },
  {
    id: 'news-15',
    category: 'Innovation',
    title: 'Digital Development Approach Presented on CLO VUS by Helen',
    author: 'Jubran',
    date: 'Thu, 04/21/2022 - 08:33',
    excerpt: 'Our Global Head of Design & Communications, Helen Collyer, joined to present key ideas.',
    readTime: '6 min read',
    tags: [
      '#clo3d',
      '#VirtualFashion',
      '#cloVirtualUserSummit',
      '#HelenCWS',
      '#cwsInternational',
      '#GlobalApparelPartner'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-blue-950/90 via-slate-900/85 to-slate-950/95'
    }
  },
  {
    id: 'news-16',
    category: 'Innovation',
    title: 'Polygenta, a breakthrough innovation for Recycled Polyesters',
    author: 'Srinath',
    date: 'Thu, 04/21/2022 - 08:28',
    excerpt: 'If you are looking for innovative recycled fibres for your responsible products.',
    readTime: '5 min read',
    tags: [
      '#cwsPolygenta',
      '#PolygentaCollection',
      '#RecycledPolyFabrics',
      '#SustainableInnovation'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-teal-950/90 via-emerald-950/80 to-neutral-950/95'
    }
  },
  {
    id: 'news-17',
    category: 'Innovation',
    title: 'CWS Global Showroom, Istanbul - Your New Innovation Space',
    author: 'Helen',
    date: 'Tue, 01/11/2022 - 10:57',
    excerpt: 'What if you could see the complete CWS regional product range in one location? In one city?',
    readTime: '4 min read',
    tags: [
      '#cwsGlobalShowroom',
      '#cwsIstanbul',
      '#cwsTurkey',
      '#InnovationSpace'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-neutral-900/90 via-slate-900/80 to-slate-950/95'
    }
  },
  {
    id: 'news-18',
    category: 'People',
    title: '‘A Day in the Life of’ @CWS - Fernanda Barriga, Design Lead',
    author: 'Jubran',
    date: 'Thu, 01/06/2022 - 10:57',
    excerpt: 'Fernanda Barriga is one of our fantastic designers. Originally from Chile, now living in Barcelona.',
    readTime: '4 min read',
    tags: [
      '#FernandaBarriga',
      '#cwsDesigner',
      '#Fashion'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-rose-950/90 via-stone-900/80 to-stone-950/95'
    }
  },
  {
    id: 'news-19',
    category: 'Sustainability',
    title: 'Future Plastic: Recycled Polyester',
    author: 'Srinath',
    date: 'Thu, 11/11/2021 - 14:13',
    excerpt: 'Polyester is one of the most widely used raw-material fibres in the apparel industry.',
    readTime: '4 min read',
    tags: [
      '#CWS',
      '#FuturePlastic',
      '#Recycled',
      '#Polyester',
      '#rPET',
      '#GRS'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-slate-900/90 via-cyan-950/80 to-slate-950/95'
    }
  },
  {
    id: 'news-20',
    category: 'Sustainability',
    title: 'Do you have your copy of CWS Sustainable Material Toolkit 2022 - Knits edition?',
    author: 'Gargi',
    date: 'Thu, 11/11/2021 - 14:10',
    excerpt: 'We are pleased to launch the CWS Sustainable Material Toolkit 2022 - Knits edition. Our collaborative teams...',
    readTime: '5 min read',
    tags: [
      '#SustainableMaterialToolkit2022',
      '#cwsSustainableMaterialToolkit'
    ],
    bgStyle: {
      unsplashUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=800',
      overlayGradient: 'from-emerald-950/90 via-stone-900/80 to-emerald-950/95'
    }
  }
];

interface SocialPost {
  id: string;
  author: string;
  date: string;
  text: string;
  image: string;
  likes: number;
  commentsCount: number;
  extraVisualType?: 'extreme-weather' | 'eid-mubarak' | 'journey' | 'workers-day' | 'wellbeing' | 'power-planet-people';
}

const SOCIAL_POSTS: SocialPost[] = [
  {
    id: 'sp-1',
    author: 'CWS International',
    date: '2 days ago',
    text: 'The planet is sending us signals - too wet, too dry, too hot to respond the signals - we reaffirm our commitment to a sustainable development model...',
    image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800',
    likes: 28,
    commentsCount: 0,
    extraVisualType: 'extreme-weather'
  },
  {
    id: 'sp-2',
    author: 'CWS International',
    date: 'May 27',
    text: 'Eid Mubarak 🌙 May the true spirit of sacrifice and devotion guide us towards growth, kindness, and shared success. Wishing everyone a blessed Eid!',
    image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=800',
    likes: 14,
    commentsCount: 1,
    extraVisualType: 'eid-mubarak'
  },
  {
    id: 'sp-3',
    author: 'CWS International',
    date: 'May 5',
    text: 'A legacy of excellence - rising brighter with a vision of infinite possibilities. #CWSInternational #AlwaysPurposeDriven',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
    likes: 135,
    commentsCount: 1,
    extraVisualType: 'journey'
  },
  {
    id: 'sp-4',
    author: 'CWS International',
    date: 'May 1',
    text: 'Progress begins with people. On International Workers\' Day, we honour the hands and minds that move the world forward. Thank you to our team!',
    image: 'https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&q=80&w=800',
    likes: 76,
    commentsCount: 2,
    extraVisualType: 'workers-day'
  },
  {
    id: 'sp-5',
    author: 'CWS International',
    date: 'April 28',
    text: 'On this World Day for Safety and Health at Work, let\'s remember a healthy psychosocial working environment is built on clear communication and mutual care.',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
    likes: 88,
    commentsCount: 2,
    extraVisualType: 'wellbeing'
  },
  {
    id: 'sp-6',
    author: 'CWS International',
    date: 'April 22',
    text: 'This Earth Day 2026, we celebrate purpose-driven partnerships that create real impact. From clean renewable energy adoption to carbon footprint reduction and preferred material conversions.',
    image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=800',
    likes: 56,
    commentsCount: 0,
    extraVisualType: 'power-planet-people'
  }
];

interface ProductType {
  name: string;
  description: string;
  material: string;
  leadTime: string;
  capacity: string;
  image: string;
  priceRange: string;
  moq: string;
  colors: string[];
  genders: string[];
}

export function CWSLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <svg className="h-full w-auto" viewBox="0 0 600 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0B2349" />
            <stop offset="100%" stopColor="#0D3B66" />
          </linearGradient>
          <linearGradient id="wGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0D3B66" />
            <stop offset="100%" stopColor="#0072BC" />
          </linearGradient>
          <linearGradient id="sGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0072BC" />
            <stop offset="100%" stopColor="#3FA6F2" />
          </linearGradient>
          <linearGradient id="orangeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D94E1F" />
            <stop offset="40%" stopColor="#F15A24" />
            <stop offset="80%" stopColor="#F8931F" />
            <stop offset="100%" stopColor="#FEB300" />
          </linearGradient>
          <linearGradient id="blueSwoosh" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00539C" />
            <stop offset="100%" stopColor="#0097D7" />
          </linearGradient>
          <linearGradient id="darkBlueSwoosh" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#051937" />
            <stop offset="100%" stopColor="#0B2447" />
          </linearGradient>
        </defs>

        {/* Orbit / Swooshes */}
        <path d="M 60,180 C 40,150 48,110 80,95 C 105,82 140,78 190,80 C 130,72 90,80 70,98 C 50,116 48,145 68,172 C 78,185 92,195 110,202 C 90,198 72,192 60,180 Z" fill="url(#darkBlueSwoosh)" />
        <path d="M 75,190 C 85,210 115,222 170,225 C 260,230 380,210 440,185 C 460,175 470,165 460,162 C 450,160 410,180 340,195 C 260,210 160,215 105,200 C 85,195 78,191 75,190 Z" fill="url(#blueSwoosh)" />
        <path d="M 98,172 C 120,200 170,210 240,208 C 340,205 425,183 460,158 C 450,164 400,188 310,198 C 210,208 140,198 112,180 C 105,176 100,172 98,172 Z" fill="url(#blueSwoosh)" />

        <path d="M 50,160 C 30,120 70,70 170,45 C 280,18 410,22 490,44 C 510,50 515,55 480,58 C 410,40 300,32 190,52 C 110,68 75,100 85,130 C 95,160 145,180 220,188 C 150,182 100,168 75,155 C 60,145 52,130 50,160 Z" fill="url(#orangeGrad)" />
        <path d="M 72,150 C 58,115 105,72 205,48 C 315,22 445,20 518,48 C 480,38 370,30 250,42 C 140,55 80,90 92,130 C 98,148 112,162 135,172 C 110,168 90,160 72,150 Z" fill="url(#orangeGrad)" />

        {/* CWS Typography in Italic futuristic font */}
        <g transform="skewX(-18) translate(15, 0)">
          {/* 'C' */}
          <path d="M 195,78 C 160,78 125,102 125,142 C 125,182 155,204 195,204 C 230,204 250,186 250,186 L 240,162 C 240,162 222,176 195,176 C 170,176 155,160 155,142 C 155,122 170,106 195,106 C 220,106 238,118 238,118 L 246,94 C 246,94 225,78 195,78 Z" fill="url(#cGrad)" />
          {/* 'W' */}
          <path d="M 270,82 L 295,200 L 328,200 L 348,135 L 368,200 L 401,200 L 426,82 L 396,82 L 382,160 L 362,94 L 334,94 L 314,160 L 300,82 L 270,82 Z" fill="url(#wGrad)" />
          {/* 'S' */}
          <path d="M 495,80 C 465,80 442,95 442,118 C 442,136 456,146 480,152 C 505,158 515,164 515,174 C 515,184 502,192 485,192 C 465,192 448,180 448,180 L 438,202 C 438,202 458,214 485,214 C 515,214 544,200 544,174 C 544,152 525,142 505,137 C 480,131 471,126 471,118 C 471,110 482,104 498,104 C 515,104 530,114 530,114 L 540,92 C 540,92 522,80 495,80 Z" fill="url(#sGrad)" />
        </g>

        {/* Sparkles / Stars at the top right */}
        <g transform="translate(520,35)">
          <path d="M 0,-30 C 0,-10 10,0 30,0 C 10,0 0,10 0,30 C 0,10 -10,0 -30,0 C -10,0 0,-10 0,-30 Z" fill="#FEB300" />
          <path d="M 0,-18 C 0,-6 6,0 18,0 C 6,0 0,6 0,18 C 0,6 -6,0 -18,0 C -6,0 0,-6 0,-18 Z" fill="#FFF200" />
        </g>
        <g transform="translate(565,65)">
          <path d="M 0,-15 C 0,-5 5,0 15,0 C 5,0 0,5 0,15 C 0,5 -5,0 -15,0 C -5,0 0,-5 0,-15 Z" fill="#F8931F" />
        </g>
        <g transform="translate(490,68)">
          <path d="M 0,-10 C 0,-3 3,0 10,0 C 3,0 0,3 0,10 C 0,3 -3,0 -10,0 C -3,0 0,-3 0,-10 Z" fill="#FEB300" />
        </g>
      </svg>
    </div>
  );
}

const PRODUCT_CATALOG: Record<string, ProductType[]> = {
  'T-Shirts & Polos': [
    {
      name: 'Classic Organic Crewneck Tee',
      description: 'Ultra-soft combed organic jersey t-shirt. Features double-needle cover-stitched hems, retail-grade neck tape, and sustainable water-based screenprint finishing for zero hand-feel.',
      material: '100% GOTS Certified Organic Cotton, 180 GSM ringspun fleece jersey.',
      leadTime: '45-55 Days',
      capacity: '3.5M units/month',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
      priceRange: '$2.80 - $3.90 FOB',
      moq: '3,000 units',
      colors: ['#FFFFFF', '#1E293B', '#475569', '#E2E8F0'],
      genders: ['Men', 'Women', 'Unisex']
    },
    {
      name: 'Premium Pique Knit Polo',
      description: 'Highly textured breathable pique shirt presenting classic flat-knit cuffs and styling, reinforced 3-button placket, mercerized finish, and mother-of-pearl sustainable buttons.',
      material: '100% Combed Organic Cotton Pique, 220 GSM.',
      leadTime: '50-65 Days',
      capacity: '2.0M units/month',
      image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80',
      priceRange: '$4.50 - $6.20 FOB',
      moq: '2,500 units',
      colors: ['#0F172A', '#2563EB', '#DC2626', '#10B981'],
      genders: ['Men', 'Women']
    },
    {
      name: 'Heavyweight Oversized Tee',
      description: 'Streetwear-engineered drop shoulder tee with structured heavy drape. Boasts solid high collar-band retentions, enzyme washing for premium touch, and pre-shrunk construction.',
      material: '100% GOTS Organic cotton heavy open-end yarn, 240 GSM.',
      leadTime: '50-60 Days',
      capacity: '2.5M units/month',
      image: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=800&q=80',
      priceRange: '$3.40 - $4.80 FOB',
      moq: '3,000 units',
      colors: ['#1E293B', '#78350F', '#064E3B', '#F1F5F9'],
      genders: ['Unisex']
    },
    {
      name: 'Enzyme-Washed Slub Cotton Tee',
      description: 'Authentic slub yarn texture offering casual breeziness and organic, dynamic graining effects. Highly breathable and relaxed design with side vents and chest pocket detail.',
      material: '70% Organic Cotton / 30% Pure Linen slub knit, 150 GSM.',
      leadTime: '45-55 Days',
      capacity: '1.8M units/month',
      image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80',
      priceRange: '$3.10 - $4.20 FOB',
      moq: '4,000 units',
      colors: ['#0F172A', '#D97706', '#047857', '#F8FAFC'],
      genders: ['Men', 'Women', 'Unisex']
    }
  ],
  'Denim & Jeans': [
    {
      name: 'Classic Selvedge Slim-Fit Denim',
      description: 'Heavyweight premium ring-spun raw cotton jeans. Incorporates reinforced coin pockets, clean Japanese-inspired red-line selvedge cuffs, and vintage copper rivets.',
      material: '13.5 oz Raw Cotton-Poly Blend (99% Cotton / 1% Lycra for comfort stretch). GOTS certified.',
      leadTime: '60-70 Days',
      capacity: '1.2M units/month',
      image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80',
      priceRange: '$9.55 - $13.50 FOB',
      moq: '2,000 units',
      colors: ['#1E3A8A', '#1E293B'],
      genders: ['Men', 'Women']
    },
    {
      name: 'Straight-Leg Stonewash Jeans',
      description: 'Mid-rise classic five-pocket relaxed pants crafted with authentic pumice-stone washes, localized gentle micro-abrasions, and heavy chain-stitch structural seams.',
      material: '12.0 oz Rigid Combed Cotton Denim, 100% Cotton.',
      leadTime: '60-75 Days',
      capacity: '1.5M units/month',
      image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80',
      priceRange: '$8.20 - $11.80 FOB',
      moq: '2,000 units',
      colors: ['#60A5FA', '#3B82F6', '#1E40AF'],
      genders: ['Men', 'Women', 'Unisex']
    },
    {
      name: 'Comfort-Stretch Tapered Jeans',
      description: 'Modern relaxed-thigh denim tapering beautifully to the ankle. Highly comfortable, eco-wash technology yielding 80% water savings compared to traditional laundering.',
      material: '11.5 oz Recycled BCI Cotton / Tencel and Elastane blends.',
      leadTime: '55-70 Days',
      capacity: '1.6M units/month',
      image: 'https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?auto=format&fit=crop&w=800&q=80',
      priceRange: '$7.80 - $10.50 FOB',
      moq: '3,000 units',
      colors: ['#111827', '#4B5563'],
      genders: ['Men', 'Women']
    },
    {
      name: 'Rugged Denim Trucker Jacket',
      description: 'Excellent heavy-duty layering jacket with functional button-flap chest pockets, welt hand pockets, side waist adjusters, and durable metal shank hardware.',
      material: '13.0 oz Durable BCI Cotton Denim with double-needle topstitching.',
      leadTime: '65-80 Days',
      capacity: '900k units/month',
      image: 'https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?auto=format&fit=crop&w=800&q=80',
      priceRange: '$11.20 - $15.50 FOB',
      moq: '1,500 units',
      colors: ['#2563EB', '#1E3A8A', '#1F2937'],
      genders: ['Unisex']
    }
  ],
  'Hoodies & Sweats': [
    {
      name: 'French Terry Luxury Hoodie',
      description: 'Sleek premium hoodie styled with double-layered hoods (no center seams), hand-braided organic cotton drawstrings with brass metal aglets, and invisible kangaroo pockets.',
      material: '80% Organic Cotton / 20% Recycled Polyester French Terry, 380 GSM.',
      leadTime: '50-60 Days',
      capacity: '2.2M units/month',
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80',
      priceRange: '$6.50 - $9.20 FOB',
      moq: '2,000 units',
      colors: ['#1F2937', '#94A3B8', '#D1D5DB', '#F3F4F6'],
      genders: ['Men', 'Women', 'Unisex']
    },
    {
      name: 'Heavyweight Fleece Sweatshirt',
      description: 'Cozy, combed interior fleece crewneck offering supreme thermal insulation and anti-pilling. Perfect regular and oversized fits with structural 1x1 elastic ribbing.',
      material: '100% Organic Cotton heavyweight fleece, 420 GSM with custom eco-silicone softening.',
      leadTime: '45-60 Days',
      capacity: '2.5M units/month',
      image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80',
      priceRange: '$5.40 - $7.80 FOB',
      moq: '2,500 units',
      colors: ['#FFFFFF', '#000000', '#B45309', '#065F46'],
      genders: ['Unisex']
    },
    {
      name: 'Premium Slim Fleece Joggers',
      description: 'Tailored-fit athletic warm-up pants featuring wide elastic waistbands, reinforced utility metal zippers, and deep jersey-lined side pockets.',
      material: '80% Combed Cotton / 20% Polyester premium brushed fleece, 300 GSM.',
      leadTime: '50-65 Days',
      capacity: '1.8M units/month',
      image: 'https://images.unsplash.com/photo-1551854838-212c50b4c184?auto=format&fit=crop&w=800&q=80',
      priceRange: '$5.10 - $7.40 FOB',
      moq: '2,500 units',
      colors: ['#111827', '#4B5563', '#9CA3AF'],
      genders: ['Men', 'Women']
    },
    {
      name: 'Eco-Hybrid Raglan Crewneck Sweatshirt',
      description: 'Raglan sleeves engineered for unrestricted movement. Combines recycled polyester robustness with organic cotton, brushed-interior, and tagless clean neck finish.',
      material: '55% Organic Cotton / 45% Recycled Polyester loopback jersey, 320 GSM.',
      leadTime: '45-55 Days',
      capacity: '2.0M units/month',
      image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80',
      priceRange: '$4.90 - $6.50 FOB',
      moq: '2,000 units',
      colors: ['#334155', '#475569', '#CBD5E1'],
      genders: ['Men', 'Women', 'Unisex']
    }
  ],
  'Jackets & Outerwear': [
    {
      name: 'Technical Waterproof Parka',
      description: 'All-weather mid-length tech shell showcasing fully taped waterproof inner seam lines, water-repellent AquaGuard contrast zippers, and an adjustable ergonomic storm hood.',
      material: '3-Layer laminated recycled polyester grid ripstop, 15,000mm hydrostatic rating.',
      leadTime: '70-85 Days',
      capacity: '600k units/month',
      image: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=800&q=80',
      priceRange: '$18.50 - $26.00 FOB',
      moq: '1,000 units',
      colors: ['#090D16', '#1E293B', '#3B82F6'],
      genders: ['Men', 'Women', 'Unisex']
    },
    {
      name: 'Lightweight Down Puffer',
      description: 'Extremely compressible cold-weather outerwear insulated with RDS (Responsible Down Standard) 750-fill power. Packable into its own internal pocket container.',
      material: '100% Recycled Ripstop Nylon (DWR weather-proof finish), responsibly sourced ethically verified down fill.',
      leadTime: '65-80 Days',
      capacity: '800k units/month',
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
      priceRange: '$16.20 - $22.50 FOB',
      moq: '1,200 units',
      colors: ['#EF4444', '#1E40AF', '#111827'],
      genders: ['Men', 'Women']
    },
    {
      name: 'Recycled Canvas Bomber',
      description: 'Smart utilities-inspired streetwear jacket pairing a classic flight design with contemporary ethical elements. Finished with double-rib knit collars/cuffs and durable brass zippers.',
      material: '100% Organic cotton canvas (recycled nylon interior lining), 350 GSM.',
      leadTime: '60-75 Days',
      capacity: '1.0M units/month',
      image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80',
      priceRange: '$12.80 - $17.50 FOB',
      moq: '1,500 units',
      colors: ['#1F2937', '#78350F', '#064E3B'],
      genders: ['Unisex']
    }
  ],
  'Activewear': [
    {
      name: 'Seamless Compression Leggings',
      description: 'Nylon-spandex knit wear engineered for core abdominal support and muscle ventilation. Seamless knitting eliminates friction or chafing, utilizing 4-way stretch yarn systems.',
      material: '75% Recycled Nylon / 25% Creora Elastane stretch formulation, interlock weave panels.',
      leadTime: '55-65 Days',
      capacity: '2.5M units/month',
      image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80',
      priceRange: '$5.50 - $8.20 FOB',
      moq: '2,500 units',
      colors: ['#4B5563', '#111827', '#4F46E5', '#DB2777'],
      genders: ['Women']
    },
    {
      name: 'Performance Training Shorts',
      description: 'Superlight, anti-microbial training shorts with breathable mesh panels, zipped security card pockets, and moisture-absorbing stretch inner boxer linings.',
      material: '92% Recycled Ocean Plastics (Poly) / 8% Elastane weave with anti-odor silver ion coating.',
      leadTime: '45-60 Days',
      capacity: '3.0M units/month',
      image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
      priceRange: '$3.50 - $5.10 FOB',
      moq: '3,000 units',
      colors: ['#1F2937', '#1E40AF', '#10B981'],
      genders: ['Men', 'Unisex']
    },
    {
      name: 'Athletic Quarter-Zip Pullover',
      description: 'Excellent breathable grid-back pullover perfect for layering. Combines thermal regulation micro-pores with moisture-wicking collars and quick-unzip front vents.',
      material: '95% Recycled Polyester / 5% Elastane brushed grid back fabric, 210 GSM.',
      leadTime: '50-60 Days',
      capacity: '1.5M units/month',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
      priceRange: '$5.20 - $7.30 FOB',
      moq: '2,000 units',
      colors: ['#3B82F6', '#6B7280', '#10B981'],
      genders: ['Men', 'Women', 'Unisex']
    },
    {
      name: 'High-Impact Pro Racerback Active Bra',
      description: 'Features high impact support, breathable mesh back panels for rapid moisture evaporation, flatlock friction-free seams, and double layer supportive comfort band.',
      material: '84% Recycled Ocean Plastics (Nylon) / 16% Lycra elastane knit, 260 GSM.',
      leadTime: '45-55 Days',
      capacity: '1.5M units/month',
      image: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?auto=format&fit=crop&w=800&q=80',
      priceRange: '$3.80 - $5.20 FOB',
      moq: '3,000 units',
      colors: ['#000000', '#EC4899', '#3B82F6'],
      genders: ['Women']
    }
  ]
};

export default function App() {
  // Video reference for the 2030 environmental trailer
  const videoRef = useRef<HTMLVideoElement>(null);

  // Navigation active view states to enable "full site experience"
  const [activeTab, setActiveTab] = useState<'home' | 'our-group' | 'products' | 'promise' | 'locations' | 'news' | 'contact' | 'tko'>('home');
  const [currentPage, setCurrentPage] = useState(1);

  // Page-level Contact Us form states
  const [contactPageForm, setContactPageForm] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    enquiryReason: '',
    city: '',
    country: '',
    howFindUs: '',
    message: ''
  });
  const [isPhoneCountryDropdownOpen, setIsPhoneCountryDropdownOpen] = useState(false);
  const [selectedPhoneCountry, setSelectedPhoneCountry] = useState({
    code: 'US',
    dial: '+1',
    flag: '🇺🇸',
    name: 'United States'
  });
  const [pageContactSubmitted, setPageContactSubmitted] = useState(false);
  const [isPageContactSending, setIsPageContactSending] = useState(false);
  const [socialFeedLimit, setSocialFeedLimit] = useState(4);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [socialLikes, setSocialLikes] = useState<Record<string, number>>({
    'sp-1': 28,
    'sp-2': 14,
    'sp-3': 135,
    'sp-4': 76,
    'sp-5': 88,
    'sp-6': 56
  });
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const handleLikeToggle = (postId: string) => {
    const isLiked = likedPosts[postId];
    setLikedPosts(prev => ({ ...prev, [postId]: !isLiked }));
    setSocialLikes(prev => ({
      ...prev,
      [postId]: (prev[postId] || 0) + (isLiked ? -1 : 1)
    }));
  };
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('All');
  const [productSearch, setProductSearch] = useState('');
  const [productGender, setProductGender] = useState('All');
  const [productMoqLimit, setProductMoqLimit] = useState<'All' | 'Low' | 'Mid' | 'High'>('All');
  const [productViewMode, setProductViewMode] = useState<'grid' | 'list'>('grid');

  // Modals / Interactivity
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isCertificationsOpen, setIsCertificationsOpen] = useState(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Team carousel index state
  const [teamIndex, setTeamIndex] = useState(1); // Default to CEO Mou (index 1) active/middle

  // Sourcing Promise page states
  const [visionIndex, setVisionIndex] = useState(0); // 0 = People, 1 = Passion, 2 = Partnership
  const [certIndex, setCertIndex] = useState(1); // Default to index 1 (GOTS)
  const [activeLocationIndex, setActiveLocationIndex] = useState(2); // Default to Bangladesh (index 2)
  const [active360Hub, setActive360Hub] = useState<string | null>(null); // For locations 360° virtual preview modal
  const [panoramaOffset, setPanoramaOffset] = useState(50); // For locations 360° viewing panning
  const [selectedMilestone, setSelectedMilestone] = useState<{ year: string; title: string; content: string } | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoVolume, setVideoVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Video playback handlers for 2030 sustainability video
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isVideoPlaying) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    } else {
      videoRef.current.play().catch(err => console.log('Video error:', err));
      setIsVideoPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration || 1;
    setVideoProgress((current / duration) * 100);
  };

  const handleSeek = (progressPercent: number) => {
    if (!videoRef.current) return;
    const duration = videoRef.current.duration || 1;
    videoRef.current.currentTime = (progressPercent / 100) * duration;
    setVideoProgress(progressPercent);
  };

  const handleMuteToggle = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // History timeline detail modal
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<{ year: string; title: string; content: string } | null>(null);

  // Floating support form bottom left (widget style)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'assistant', text: string }[]>([
    { sender: 'assistant', text: 'Thank you for reaching out to CWS International. Since we are offline right now, enter your sustainable sourcing query, fabric questions or buyer inquiries below and our system will match it with our databases immediately.' }
  ]);
  const [isChatSending, setIsChatSending] = useState(false);

  // Live clocks for the regional offices
  const [liveTimes, setLiveTimes] = useState<Record<string, string>>({});

  // Contact form submission
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    org: '',
    productType: 'Tees & Tanks',
    quantity: '10000',
    destination: 'United Kingdom',
    message: ''
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Newsletter subscription
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // Search Results State
  const [searchResults, setSearchResults] = useState<{ type: string; title: string; desc: string; action: () => void }[]>([]);

  // Synchronize state with URL path
  useEffect(() => {
    const syncWithUrl = () => {
      const path = window.location.pathname;
      if (path === '/products' || path === '/products/') {
        setActiveTab('products');
        setSelectedProductCategory('All');
      } else if (path === '/our-group' || path === '/our-group/') {
        setActiveTab('our-group');
      } else if (path === '/promise' || path === '/promise/') {
        setActiveTab('promise');
      } else if (path === '/locations' || path === '/locations/') {
        setActiveTab('locations');
      } else if (path === '/news' || path === '/news/') {
        setActiveTab('news');
      } else if (path === '/contact' || path === '/contact/') {
        setActiveTab('contact');
      } else if (path === '/tko' || path === '/tko/') {
        setActiveTab('tko');
      } else if (path === '/' || path === '') {
        setActiveTab('home');
      }
    };

    // Initial sync
    syncWithUrl();

    // Listen to back/forward button clicks
    window.addEventListener('popstate', syncWithUrl);
    return () => {
      window.removeEventListener('popstate', syncWithUrl);
    };
  }, []);

  // Sync URL when activeTab state changes
  useEffect(() => {
    const currentPath = window.location.pathname;
    let targetPath = '/';

    if (activeTab === 'products') {
      targetPath = '/products';
    } else if (activeTab === 'our-group') {
      targetPath = '/our-group';
    } else if (activeTab === 'promise') {
      targetPath = '/promise';
    } else if (activeTab === 'locations') {
      targetPath = '/locations';
    } else if (activeTab === 'news') {
      targetPath = '/news';
    } else if (activeTab === 'contact') {
      targetPath = '/contact';
    } else if (activeTab === 'tko') {
      targetPath = '/tko';
    }

    if (currentPath !== targetPath) {
      window.history.pushState({ tab: activeTab }, '', targetPath);
    }
  }, [activeTab]);

  // Calculate live clock times for Dhaka, Manchester, Delhi, Madrid, Istanbul
  useEffect(() => {
    const updateTime = () => {
      const results: Record<string, string> = {};
      const baseUtc = new Date().getTime() + new Date().getTimezoneOffset() * 60000;

      Object.keys(OFFICE_OFFSETS).forEach(city => {
        const offset = OFFICE_OFFSETS[city];
        const localDate = new Date(baseUtc + (3600000 * offset));
        let hours = localDate.getHours();
        const minutes = localDate.getMinutes().toString().padStart(2, '0');
        const seconds = localDate.getSeconds().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        const hourStr = hours.toString().padStart(2, '0');
        results[city] = `${hourStr}:${minutes}:${seconds} ${ampm}`;
      });
      setLiveTimes(results);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle Search Filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: typeof searchResults = [];

    // Search Products
    Object.entries(PRODUCT_CATALOG).forEach(([cat, items]) => {
      items.forEach(p => {
        if (p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query) || p.material.toLowerCase().includes(query)) {
          results.push({
            type: 'Product Sourcing',
            title: p.name,
            desc: `${p.material} - Lead Time: ${p.leadTime}`,
            action: () => {
              setActiveTab('products');
              setSelectedProductCategory(cat as any);
              setIsSearchOpen(false);
            }
          });
        }
      });
    });

    // Search Locations
    ['Dhaka', 'Manchester', 'Delhi NCR', 'Madrid', 'Istanbul'].forEach(loc => {
      if (loc.toLowerCase().includes(query)) {
        results.push({
          type: 'Global Office',
          title: `CWS Sourcing Office - ${loc}`,
          desc: `Active sourcing and production unit. Offset UTC+${OFFICE_OFFSETS[loc]}`,
          action: () => {
            setActiveTab('locations');
            setIsSearchOpen(false);
          }
        });
      }
    });

    // Search News
    NEWSFEED_ITEMS.forEach(n => {
      if (n.title.toLowerCase().includes(query) || n.excerpt.toLowerCase().includes(query)) {
        results.push({
          type: 'Corporate News',
          title: n.title,
          desc: n.excerpt,
          action: () => {
            setActiveTab('news');
            setIsSearchOpen(false);
          }
        });
      }
    });

    setSearchResults(results);
  }, [searchQuery]);

  // Handle Support Ticket Submit (Using real-time Gemini proxy endpoint /api/chat)
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userMsg = chatMessage;
    const updatedHistory: { sender: 'user' | 'assistant'; text: string }[] = [...chatHistory, { sender: 'user' as const, text: userMsg }];
    setChatHistory(updatedHistory);
    setChatMessage('');
    setIsChatSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: updatedHistory.slice(0, -1) // Excluding the latest message just appended
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory(prev => [...prev, { sender: 'assistant', text: data.text }]);
      } else {
        throw new Error('Proxy API failure.');
      }
    } catch (err) {
      // Robust offline fallback
      setTimeout(() => {
        setChatHistory(prev => [...prev, {
          sender: 'assistant',
          text: `Thank you for leave a message. Your ticket for sourcing support regarding is registered. CWS Sustainable Sourcing agent will reply within 3-4 hours directly to your mail. \n\nWe provide certified AQL 1.5 sourcing solutions covering Tees, Polos, Hoodies, and Activewear securely based in our Dhaka and Istanbul R&D labs.`
        }]);
      }, 1000);
    } finally {
      setIsChatSending(false);
    }
  };

  // Submit contact info
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setIsContactOpen(false);
      setContactSubmitted(false);
      // Clear form
      setContactForm({
        name: '',
        email: '',
        org: '',
        productType: 'Tees & Tanks',
        quantity: '10000',
        destination: 'United Kingdom',
        message: ''
      });
    }, 3000);
  };

  // Submit page-level contact info
  const handlePageContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPageContactSending(true);
    setTimeout(() => {
      setIsPageContactSending(false);
      setPageContactSubmitted(true);
      setContactPageForm({
        name: '',
        companyName: '',
        email: '',
        phone: '',
        enquiryReason: '',
        city: '',
        country: '',
        howFindUs: '',
        message: ''
      });
    }, 1500);
  };

  // Subscribe to Newsletter
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterSubscribed(true);
    setTimeout(() => {
      setNewsletterSubscribed(false);
      setNewsletterEmail('');
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#FFFDFB] text-gray-800 font-sans antialiased selection:bg-[#F15A24]/20 selection:text-[#F15A24] relative overflow-x-hidden">

      {/* HEADER NAVBAR STYLE - White high-end top fold */}
      {activeTab !== 'tko' && (
        <header className="sticky top-0 z-50 bg-[#FFFDFB]/95 backdrop-blur-md border-b border-gray-100 shadow-xs transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

            {/* Brand Logo - transparent CWS logo component */}
            <div className="flex items-center gap-10">
              <button
                onClick={() => { setActiveTab('home'); }}
                className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-[#0072BC]/40 rounded-lg p-1"
                id="header-logo-btn"
              >
                <CWSLogo className="h-12 group-hover:scale-[1.04] transition-transform duration-300" />
              </button>

              {/* Main Navigation links */}
              <nav className="hidden md:flex items-center gap-8">
                <button
                  onClick={() => setActiveTab('our-group')}
                  className={`text-[15px] font-semibold tracking-wide transition-colors focus:outline-none ${activeTab === 'our-group' ? 'text-[#F15A24]' : 'text-gray-800 hover:text-[#F15A24]'}`}
                  id="nav-group"
                >
                  Our Group
                </button>

                {/* Product Sourcing link with dropdown icon style */}
                <button
                  onClick={() => {
                    setActiveTab('products');
                    setSelectedProductCategory('All');
                  }}
                  className={`text-[15px] font-semibold tracking-wide flex items-center gap-1 transition-colors focus:outline-none ${activeTab === 'products' ? 'text-[#F15A24]' : 'text-gray-800 hover:text-[#F15A24]'}`}
                  id="nav-products"
                >
                  Products & Services
                  <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                </button>

                <button
                  onClick={() => setActiveTab('promise')}
                  className={`text-[15px] font-semibold tracking-wide transition-colors focus:outline-none ${activeTab === 'promise' ? 'text-[#F15A24]' : 'text-gray-800 hover:text-[#F15A24]'}`}
                  id="nav-promise"
                >
                  Our Promise
                </button>

                <button
                  onClick={() => setActiveTab('locations')}
                  className={`text-[15px] font-semibold tracking-wide transition-colors focus:outline-none ${activeTab === 'locations' ? 'text-[#F15A24]' : 'text-gray-800 hover:text-[#F15A24]'}`}
                  id="nav-locations"
                >
                  Global Locations
                </button>

                <button
                  onClick={() => setActiveTab('news')}
                  className={`text-[15px] font-semibold tracking-wide transition-colors focus:outline-none ${activeTab === 'news' ? 'text-[#F15A24]' : 'text-gray-800 hover:text-[#F15A24]'}`}
                  id="nav-news"
                >
                  Newsfeed
                </button>

                {/* Separator */}
                <span className="h-5 w-[1px] bg-gray-200" />

                {/* TKO Apparel Dedicated Route Toggler Button */}
                <button
                  onClick={() => setActiveTab('tko')}
                  className={`text-[15px] font-black tracking-normal uppercase transition-colors focus:outline-none flex items-center gap-1 shrink-0 ${(activeTab as string) === 'tko' ? 'text-[#F15A24]' : 'text-gray-900 hover:text-[#F15A24]'}`}
                  id="nav-tko"
                >
                  TKO Apparel
                  <span className="bg-red-600 text-white text-[8px] font-sans font-bold uppercase tracking-none px-1 rounded">NEW</span>
                </button>
              </nav>
            </div>

            {/* Right header options matching screenshot */}
            <div className="flex items-center gap-6">

              {/* Search Area */}
              <div className="relative hidden lg:flex items-center bg-gray-50/80 rounded-full border border-gray-100 hover:border-gray-200 transition-colors px-4 py-2 w-56">
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent border-none text-xs text-gray-700 outline-none w-full"
                  onClick={() => setIsSearchOpen(true)}
                  readOnly
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3 pointer-events-none" />
              </div>

              {/* Mobile Search toggler */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="lg:hidden p-2 text-gray-700 hover:text-[#F15A24] transition-colors focus:outline-none"
                aria-label="Toggle Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Contact Us - oval pill outline button */}
              <button
                onClick={() => { setActiveTab('contact'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                className={`px-6 py-2.5 rounded-full border font-display font-bold text-sm tracking-wide transition-all shadow-xs shrink-0 ${activeTab === 'contact'
                    ? 'bg-[#1E293B] text-white border-transparent'
                    : 'border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white'
                  }`}
                id="header-contact-btn"
              >
                Contact Us
              </button>

              {/* Favorite / Heart icon (orange hex #F15A24) */}
              <button
                onClick={() => setIsCertificationsOpen(true)}
                className="p-1 cursor-pointer group relative"
                aria-label="Favorites"
              >
                <Heart className="w-[18px] h-[18px] text-[#F15A24] fill-[#F15A24] group-hover:scale-110 transition-transform" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-600 animate-ping" />
              </button>

              {/* LinkedIn solid square style */}
              <a
                href="https://linkedin.com/company/cws international"
                target="_blank"
                rel="noreferrer"
                className="text-[#0A66C2] hover:text-[#0A66C2]/80 transition-colors"
                aria-label="LinkedIn Profile"
              >
                <Linkedin className="w-5 h-5 fill-current border border-gray-200 p-0.5 rounded-sm" />
              </a>
            </div>
          </div>
        </header>
      )}

      {/* RENDER DYNAMIC PAGES OR MAIN INDEX HOME BASED ON TAB STATE */}
      <AnimatePresence mode="wait">

        {activeTab === 'home' && (
          <motion.main
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1"
          >

            {/* HERO / INTRO SECTION - Off-white background with soft pale turquoise, gold-orange blobs & map markers */}
            <section className="relative bg-[#FFFDFB] overflow-hidden min-h-[90vh] flex items-center pt-20 pb-24 md:py-32">

              {/* Soft visual background blobs exactly resembling the image's dynamic gradient layout */}
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
                {/* Turquoise/greenish top-right soft glow blob */}
                <div className="absolute top-[5%] right-[-10%] w-[60vw] h-[60vw] max-w-[750px] rounded-full bg-gradient-to-br from-emerald-100/40 to-teal-50/20 blur-[130px]" />

                {/* Yellow/amber-orange soft glow blob on the middle left */}
                <div className="absolute top-[40%] left-[-15%] w-[50vw] h-[50vw] max-w-[650px] rounded-full bg-gradient-to-br from-amber-100/30 to-orange-50/10 blur-[120px]" />

                {/* Deep blue/purple soft backdrop blob near bottom right */}
                <div className="absolute bottom-[-10%] right-[15%] w-[55vw] h-[55vw] max-w-[700px] rounded-full bg-sky-100/30 blur-[140px]" />

                {/* Subtly blurred Map Pins floating in the background to create deep field overlay */}
                <div className="absolute top-[20%] right-[40%] text-emerald-400/20 blur-[1px] animate-[bounce_8s_ease-in-out_infinite] scale-125">
                  <svg className="w-16 h-16 filter drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>

                <div className="absolute top-[60%] right-[10%] text-orange-400/20 blur-[2px] animate-[bounce_11s_ease-in-out_infinite_1s] scale-150">
                  <svg className="w-20 h-20 filter drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>

                <div className="absolute bottom-[10%] left-[25%] text-teal-400/15 blur-[2.5px] animate-[bounce_9s_ease-in-out_infinite_2s] scale-[1.1]">
                  <svg className="w-12 h-12 filter drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>
              </div>

              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center">

                  {/* Left Column Content Area */}
                  <div className="lg:col-span-7 space-y-10">

                    <h1 className="font-sans font-bold text-gray-900 text-[42px] sm:text-[54px] lg:text-[60px] leading-[1.08] tracking-tight max-w-[620px]">
                      Your Global, Local Partner for Sustainable Apparel
                    </h1>

                    <div className="space-y-6 text-gray-650 text-[16px] sm:text-[18px] leading-[1.65] max-w-[580px]">
                      <p>
                        We offer sustainable apparel product development and specialised global sourcing strategies, combined with compliance excellence and intuitive customer service.
                      </p>
                      <p>
                        We strive to always bring newness and innovation to our work, offering an extensive multi-category product range, manufactured in over 100 fully compliant partner factories.
                      </p>
                    </div>

                    {/* Button matching shape and shadow of screenshot layout */}
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setActiveTab('products');
                          setSelectedProductCategory('All');
                        }}
                        className="px-8 py-3.5 bg-gray-100/90 hover:bg-gray-200/95 text-gray-800 font-sans font-bold text-[14px] tracking-wide rounded-full border border-gray-300 shadow-md shadow-gray-200/50 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#0072BC]/30 clickable"
                      >
                        Products & Services
                      </button>
                    </div>
                  </div>

                  {/* Right Column Stats Grid Area (2x2 floating layout in design) */}
                  <div className="lg:col-span-5 flex justify-center">
                    <div className="grid grid-cols-2 gap-6 w-full max-w-[460px]">

                      {/* Box 1: Partner Factories */}
                      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/70 p-6 sm:p-8 flex flex-col justify-center items-center text-center shadow-lg shadow-gray-100/45 group hover:border-[#F15A24]/25 transition-all duration-300 hover:scale-[1.03]">
                        <span className="font-sans font-extrabold text-[44px] sm:text-[50px] text-gray-900 leading-none mb-3 block">140</span>
                        <span className="text-[12px] sm:text-[13px] font-bold text-gray-500 uppercase tracking-widest leading-tight">
                          Partner<br />Factories
                        </span>
                      </div>

                      {/* Box 2: Regional Offices */}
                      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/70 p-6 sm:p-8 flex flex-col justify-center items-center text-center shadow-lg shadow-gray-100/45 group hover:border-[#F15A24]/25 transition-all duration-300 hover:scale-[1.03]">
                        <span className="font-sans font-extrabold text-[44px] sm:text-[50px] text-gray-900 leading-none mb-3 block">5</span>
                        <span className="text-[12px] sm:text-[13px] font-bold text-gray-500 uppercase tracking-widest leading-tight">
                          Regional<br />Offices
                        </span>
                      </div>

                      {/* Box 3: Global Team Members */}
                      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/70 p-6 sm:p-8 flex flex-col justify-center items-center text-center shadow-lg shadow-gray-100/45 group hover:border-[#F15A24]/25 transition-all duration-300 hover:scale-[1.03]">
                        <span className="font-sans font-extrabold text-[44px] sm:text-[50px] text-gray-900 leading-none mb-3 block">800</span>
                        <span className="text-[12px] sm:text-[13px] font-bold text-gray-500 uppercase tracking-widest leading-tight">
                          Global Team<br />Members
                        </span>
                      </div>

                      {/* Box 4: Global Recognitions */}
                      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/70 p-6 sm:p-8 flex flex-col justify-center items-center text-center shadow-lg shadow-gray-100/45 group hover:border-[#F15A24]/25 transition-all duration-300 hover:scale-[1.03]">
                        <span className="font-sans font-extrabold text-[44px] sm:text-[50px] text-gray-900 leading-none mb-3 block">20</span>
                        <span className="text-[12px] sm:text-[13px] font-bold text-gray-500 uppercase tracking-widest leading-tight">
                          Global<br />Recognitions
                        </span>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* ETHICAL & SUSTAINABLE SOLUTIONS - Dark aesthetic slate backdrop section with floating aircraft */}
            <section className="bg-gradient-to-b from-[#7A8A9E] via-[#65768B] to-[#516174] text-white py-20 sm:py-28 px-6 sm:px-8 lg:px-12 relative overflow-hidden">

              {/* Blurred locations layout for background overlay atmosphere */}
              <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute top-[20%] left-[45%] text-rose-500 blur-[3px] scale-150">
                  <svg className="w-16 h-16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>
                <div className="absolute bottom-[20%] right-[30%] text-emerald-400 blur-[1px] scale-125">
                  <svg className="w-14 h-14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>
              </div>

              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center w-full relative z-10">

                {/* Left side: Animated Origami Orange Paper Plane with subtle floating hover */}
                <div className="lg:col-span-5 flex justify-center items-center">
                  <motion.div
                    animate={{ y: [0, -15, 0], x: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
                    className="relative p-6"
                  >
                    {/* Folded paper plane styled directly from reference layout with realistic orange dimensions */}
                    <svg className="w-48 h-40 drop-shadow-[0_12px_24px_rgba(241,90,36,0.35)] cursor-pointer" viewBox="0 0 160 110" fill="none">
                      <polygon points="10,50 150,15 90,100" fill="#E65100" />
                      <polygon points="75,65 150,15 90,100" fill="#FF9100" />
                      <polygon points="10,50 75,65 90,100" fill="#FF6D00" />
                      <polygon points="75,65 65,85 90,100" fill="#FFAB40" />
                    </svg>
                  </motion.div>
                </div>

                {/* Right text panel matching screenshot alignment */}
                <div className="lg:col-span-7 space-y-8 lg:pl-10 text-right lg:text-left flex flex-col items-center lg:items-start select-none">

                  <h2 className="font-sans font-bold text-[36px] sm:text-[45px] leading-[1.12] text-white max-w-[625px]">
                    Ethical & Sustainable Solutions in a Changed World
                  </h2>

                  <div className="space-y-6 text-indigo-50/90 text-[15px] sm:text-[17px] leading-[1.7] max-w-[580px]">
                    <p>
                      We believe in doing things right. As a trusted partner for many global brands and their teams, we consistently champion ethics and transparency in our daily practices.
                    </p>
                    <p>
                      Our open innovation culture encourages our suppliers to use result-oriented production processes, while maintaining environmental and social sustainability.
                    </p>
                  </div>

                  {/* Our Promise button aligned right below block, styled matching pill look */}
                  <div className="pt-2 w-full flex justify-end">
                    <button
                      onClick={() => setActiveTab('promise')}
                      className="px-8 py-3.5 bg-[#FFFDFB] hover:bg-gray-100 text-gray-800 font-sans font-bold text-[13px] tracking-wide rounded-full border border-gray-300 shadow-md shadow-gray-200/50 hover:shadow-lg transition-transform hover:-translate-y-0.5 focus:outline-none"
                    >
                      Our Promise
                    </button>
                  </div>

                </div>

              </div>
            </section>

            {/* THE BEST IS YET TO COME - Soft gray/blue gradient backdrop */}
            <section className="bg-gradient-to-b from-[#FFFDFB] via-slate-100/50 to-[#EAEFF4]/80 py-24 px-6 sm:px-8 lg:px-12 relative overflow-hidden border-b border-gray-100">

              {/* Soft blurred pointer decorations in backdrop */}
              <div className="absolute inset-0 z-0 pointer-events-none opacity-25">
                <div className="absolute top-[30%] right-[20%] text-orange-500 blur-[2px] scale-150 animate-pulse">
                  <svg className="w-16 h-16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>
              </div>

              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center w-full relative z-10">

                {/* Text Content on the left */}
                <div className="lg:col-span-8 space-y-8 text-left">

                  <h2 className="font-sans font-bold text-[36px] sm:text-[45px] leading-[1.12] text-gray-900 max-w-[580px]">
                    The Best is yet to Come
                  </h2>

                  <div className="space-y-6 text-gray-650 text-[15px] sm:text-[17px] leading-[1.7] max-w-[620px]">
                    <p>
                      We continue to improve and evolve our sustainability roadmap, driving continuous development and innovation in everything we do.
                    </p>
                    <p>
                      Our goal is to always tick as many boxes as possible, while advancing our work in responsible product development, ultimately converting to preferred fibres.
                    </p>
                  </div>

                  {/* Action Roadmap pill button */}
                  <div className="pt-2">
                    <button
                      onClick={() => setIsRoadmapOpen(true)}
                      className="px-8 py-3.5 bg-[#FFFDFB] hover:bg-gray-100 text-gray-800 font-sans font-bold text-[13px] tracking-wide rounded-full border border-gray-300 shadow-md shadow-gray-200/55 hover:shadow-lg transition-transform hover:-translate-y-0.5 focus:outline-none"
                    >
                      Our 2030 Roadmap
                    </button>
                  </div>

                </div>

                {/* Right side is empty spacious field containing blurred map pin indicator based on the exact design */}
                <div className="lg:col-span-4 flex justify-center items-center">
                  <div className="relative w-48 h-48 select-none pointer-events-none z-0">
                    {/* Blurred red-orange map location indicator echoing the reference photo */}
                    <div className="absolute inset-0 text-[#F15A24]/15 blur-[5px] scale-150 animate-[pulse_4s_infinite]">
                      <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* OUR CERTIFICATIONS - Rich Slate-blue/purple gradient matching the screenshot layout exactly */}
            <section className="bg-gradient-to-br from-[#8C98AC] via-[#758296] to-[#606D80] text-white py-20 sm:py-28 px-6 sm:px-8 lg:px-12 relative overflow-hidden">

              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center w-full relative z-10">

                {/* Left side: 3 Overlapping Circular Badge Vectors: Global Recycled, Organic GOTS, Friend of ZDHC */}
                <div className="lg:col-span-6 flex justify-center py-6">
                  <div className="relative w-full max-w-[440px] h-[260px] flex items-center justify-between select-none">

                    {/* 1. Global Recycled Standard Logo (Circular Cyan Badge on Left) */}
                    <div className="absolute left-[5%] top-[10%] z-20 bg-[#FFFDFB] border border-gray-150 text-sky-800 p-4 rounded-xl shadow-xl hover:scale-105 transition-transform duration-300 w-[140px] h-[140px] flex flex-col items-center justify-center text-center">
                      <div className="w-14 h-14 rounded-full border-2 border-indigo-500 border-t-transparent flex items-center justify-center text-indigo-700 font-extrabold text-[12px] mb-2 font-mono relative animate-[spin_10s_linear_infinite]">
                        <span className="animate-pulse">GRS</span>
                      </div>
                      <span className="font-bold text-[9px] text-[#1F4E79] uppercase tracking-wider leading-tight">Global Recycled<br />Standard</span>
                    </div>

                    {/* 2. GOTS Global Organic Standard Logo (Circular Green Badge in Middle) */}
                    <div className="absolute left-[38%] top-[25%] z-30 bg-[#FFFDFB] border border-gray-150 text-emerald-800 p-4 rounded-xl shadow-2xl hover:scale-105 transition-transform duration-300 w-[150px] h-[150px] flex flex-col items-center justify-center text-center">
                      <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center text-[#FFFDFB] font-black text-[13px] mb-2 shadow-inner">
                        GOTS
                      </div>
                      <span className="font-bold text-[9px] text-emerald-800 uppercase tracking-wider leading-tight">ORGANIC TEXTILE<br />STANDARD</span>
                    </div>

                    {/* 3. Friend of ZDHC Vendor Logo (White layout) */}
                    <div className="absolute right-[2%] top-[5%] z-10 bg-white/10 backdrop-blur-md border border-white/20 text-[#FFFDFB] p-4 rounded-xl shadow-lg hover:scale-105 transition-transform duration-300 w-[130px] h-[130px] flex flex-col items-center justify-center text-center">
                      <div className="font-black text-white text-[16px] tracking-tight leading-none mb-1 font-mono">ZDHC</div>
                      <div className="h-[2px] w-6 bg-white/60 my-1"></div>
                      <span className="text-[10px] font-medium tracking-wide text-white/90">Friend of ZDHC</span>
                      <span className="text-[8px] font-mono tracking-widest text-white/50 uppercase mt-1">- Vendor -</span>
                    </div>

                  </div>
                </div>

                {/* Right Text Panel matching screenshot */}
                <div className="lg:col-span-6 space-y-8 flex flex-col items-center lg:items-start text-right lg:text-left select-none">

                  <h2 className="font-sans font-bold text-[36px] sm:text-[45px] leading-[1.12] text-white">
                    Our Certifications
                  </h2>

                  <p className="text-indigo-50/90 text-[15px] sm:text-[17px] leading-[1.7] max-w-[520px]">
                    The certifications we have attained for our supply base, products and practices give you the confidence that your brand is sourcing using the best partners and techniques.
                  </p>

                  {/* See All Certifications action button aligned right below text content */}
                  <div className="pt-2 w-full flex justify-end">
                    <button
                      onClick={() => setIsCertificationsOpen(true)}
                      className="px-8 py-3.5 bg-white hover:bg-gray-100 text-gray-800 font-sans font-bold text-[13px] tracking-wide rounded-full border border-gray-300 shadow-md shadow-gray-200/50 hover:shadow-lg transition-transform hover:-translate-y-0.5 focus:outline-none"
                    >
                      See All Certifications
                    </button>
                  </div>

                </div>

              </div>
            </section>

            {/* FULL-WIDTH CERTIFICATION BADGES HORIZONTAL ROW (Directly above Footer as shown in screenshot) */}
            <section className="bg-[#0E1A29] py-12 px-6 sm:px-8 border-b border-slate-800 relative z-10">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 md:justify-between opacity-85 select-none">

                  {/* Badge 1: EcoVadis Silver rating 2023 */}
                  <div className="flex items-center gap-2 text-white">
                    <div className="w-10 h-10 rounded-full border border-slate-600 flex flex-col items-center justify-center bg-slate-800/40 text-[7px] font-mono font-black text-slate-300">
                      <span>SILVER</span>
                      <span className="text-[5px] text-slate-400">2023</span>
                    </div>
                    <div className="text-[10px] font-mono leading-none">
                      <div className="font-bold text-slate-300">ecovadis</div>
                      <div className="text-[7.5px] text-slate-500">Sustainability Rating</div>
                    </div>
                  </div>

                  {/* Badge 2: Friend of ZDHC Vendor */}
                  <div className="text-[11px] font-mono font-bold tracking-tight text-slate-400">
                    Friend of <span className="text-white">ZDHC</span> - Vendor
                  </div>

                  {/* Badge 3: OEKO-TEX Standard 100 */}
                  <div className="border border-slate-700 bg-slate-800/25 px-3 py-1.5 rounded text-center text-white">
                    <div className="text-[10px] font-sans font-black tracking-widest text-[#FFFDFB]">OEKO-TEX ®</div>
                    <div className="text-[6.5px] font-mono tracking-widest text-slate-400">CONFIDENCE IN TEXTILES</div>
                    <div className="text-[8px] font-mono font-bold text-slate-200">STANDARD 100</div>
                  </div>

                  {/* Badge 4: Global Recycled Standard logo representation */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full border border-sky-600 border-dashed flex items-center justify-center text-sky-400 font-black text-[9px]">
                      GRS
                    </div>
                    <span className="text-[9.5px] font-mono text-slate-400 max-w-[100px] leading-tight">Global Recycled Standard</span>
                  </div>

                  {/* Badge 5: Global Organic Standard */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white font-black text-[9px]">
                      GOTS
                    </div>
                    <span className="text-[9.5px] font-mono text-slate-400 max-w-[90px] leading-tight">Global Organic Textile</span>
                  </div>

                  {/* Badge 6: Textile Exchange */}
                  <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-slate-400">
                    <div className="w-4 h-4 rounded-full bg-indigo-500/30 border border-indigo-400"></div>
                    <span>Textile Exchange</span>
                  </div>

                  {/* Badge 7: ISO 9001:2015 */}
                  <div className="flex items-center gap-1 bg-slate-800/10 border border-slate-700/80 px-2.5 py-1 rounded">
                    <div className="text-[11px] font-black text-sky-400">ISO</div>
                    <div className="w-[1px] h-4 bg-slate-750"></div>
                    <div className="text-[7.5px] text-slate-400 leading-none">
                      <div>9001 : 2015</div>
                      <div className="text-[5.5px] text-slate-500 uppercase font-mono">Certified</div>
                    </div>
                  </div>

                  {/* Badge 8: Higg Index */}
                  <div className="font-mono text-xs text-white tracking-widest uppercase font-semibold">
                    Higg Index
                  </div>

                </div>
              </div>
            </section>

          </motion.main>
        )}

        {/* COMPREHENSIVE SUB-PAGE: OUR GROUP */}
        {activeTab === 'our-group' && (
          <motion.div
            key="our-group"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24"
          >
            {/* ABOUT CWS HERO BLOCK */}
            <div className="space-y-8 text-center max-w-4xl mx-auto">
              <h1 className="font-display font-extrabold text-[#111827] text-4xl sm:text-5xl tracking-tight leading-none">About CWS</h1>
              <div className="space-y-6 text-gray-600 text-lg sm:text-xl leading-relaxed max-w-3xl mx-auto">
                <p>
                  We are a global apparel buying and sourcing company with over 40 years of experience in the textile industry, with production and innovation centres in Bangladesh, Türkiye, India, Pakistan, and Egypt.
                </p>
                <p>
                  Over the years, we have developed a range of pioneering solutions for global brands and retailers, while staying true to our mission to combine great product design and quality, with sustainable development, compliance excellence, and design innovation.
                </p>
              </div>
            </div>

            {/* GLOBAL NETWORK SECTION */}
            <div className="space-y-12">
              <div className="text-center">
                <h2 className="font-display font-extrabold text-[#111827] text-3xl sm:text-4xl tracking-tight">Our Global Network</h2>
              </div>

              {/* Grid block for Bangladesh, Türkiye, India, Pakistan, and Egypt */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Bangladesh Sourcing Card */}
                <div className="bg-white border border-gray-150 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    <div className="md:col-span-7 space-y-4">
                      <h3 className="font-display font-black text-gray-900 text-xl tracking-tight">Bangladesh</h3>
                      <ul className="space-y-2 text-sm text-gray-650 leading-relaxed list-disc pl-4">
                        <li>Diversified product range including Flat Knit, Shirting, Woven Bottoms, Innerwear, Outerwear, Technical & Fashion Sportswear</li>
                        <li>Digital design & innovation hub</li>
                        <li>Sustainable supply chain</li>
                      </ul>
                    </div>

                    <div className="hidden md:block md:col-span-1 border-r border-gray-100 h-32 self-center justify-self-center"></div>

                    <div className="md:col-span-4 space-y-3">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-gray-400 block uppercase">Certifications :</span>
                      <div className="grid grid-cols-3 gap-2">
                        {/* ZDHC badge */}
                        <div className="flex flex-col items-center justify-center p-1 bg-sky-50 border border-sky-100 rounded-lg text-center h-12" title="Friend of ZDHC Vendor">
                          <span className="text-[7px] font-black text-[#1F4E79] leading-none mb-1">ZDHC</span>
                          <span className="text-[5.5px] text-[#1F4E79]/80 font-mono uppercase tracking-tighter">Vendor</span>
                        </div>
                        {/* GOTS badge */}
                        <div className="flex flex-col items-center justify-center p-1 bg-emerald-50 border border-emerald-100 rounded-lg text-center h-12" title="GOTS certified organic">
                          <span className="text-[7px] font-black text-emerald-800 leading-none mb-1">GOTS</span>
                          <span className="text-[5.5px] text-emerald-700/80 font-mono uppercase tracking-tighter">Organic</span>
                        </div>
                        {/* OEKO-TEX badge */}
                        <div className="flex flex-col items-center justify-center p-1 bg-teal-50 border border-teal-100 rounded-lg text-center h-12" title="Oeko-Tex Standard 100">
                          <span className="text-[7px] font-black text-teal-800 leading-none mb-0.5">OEKO</span>
                          <span className="text-[5.5px] text-teal-700/80 font-mono uppercase tracking-tighter">Std 100</span>
                        </div>
                        {/* GRS badge */}
                        <div className="flex flex-col items-center justify-center p-1 bg-indigo-50 border border-indigo-100 rounded-lg text-center h-12" title="Global Recycled Standard">
                          <span className="text-[7px] font-black text-indigo-800 leading-none mb-1">GRS</span>
                          <span className="text-[5.5px] text-indigo-700/80 font-mono uppercase tracking-tighter">Recycled</span>
                        </div>
                        {/* Sedex badge */}
                        <div className="flex flex-col items-center justify-center p-1 bg-red-50 border border-red-100 rounded-lg text-center h-12" title="Sedex Members">
                          <span className="text-[7px] font-black text-red-800 leading-none mb-1">SEDEX</span>
                          <span className="text-[5.5px] text-red-700/80 font-mono uppercase tracking-tighter">Member</span>
                        </div>
                        {/* Textile Exchange badge */}
                        <div className="flex flex-col items-center justify-center p-1 bg-amber-50 border border-amber-100 rounded-lg text-center h-12" title="Textile Exchange">
                          <span className="text-[7px] font-black text-amber-800 leading-none mb-1">TEX</span>
                          <span className="text-[5.5px] text-amber-700/80 font-mono uppercase tracking-tighter">Exch.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Türkiye Sourcing Card */}
                <div className="bg-white border border-gray-150 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    <div className="md:col-span-7 space-y-4">
                      <h3 className="font-display font-black text-gray-900 text-xl tracking-tight">Türkiye</h3>
                      <ul className="space-y-2 text-sm text-gray-650 leading-relaxed list-disc pl-4">
                        <li>Specialised product capabilities including Teamwear, Premium Lifestyle ranges</li>
                        <li>Flexible capacity and speed</li>
                        <li>Digital design & innovation hub</li>
                        <li>Short transit time to EU</li>
                      </ul>
                    </div>

                    <div className="hidden md:block md:col-span-1 border-r border-gray-100 h-32 self-center justify-self-center"></div>

                    <div className="md:col-span-4 space-y-3">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-gray-400 block uppercase">Certifications :</span>
                      <div className="grid grid-cols-3 gap-2">
                        {/* ZDHC badge */}
                        <div className="flex flex-col items-center justify-center p-1 bg-sky-50 border border-sky-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-[#1F4E79] leading-none mb-1">ZDHC</span>
                          <span className="text-[5.5px] text-[#1F4E79]/80 font-mono uppercase tracking-tighter">Vendor</span>
                        </div>
                        {/* GOTS badge */}
                        <div className="flex flex-col items-center justify-center p-1 bg-emerald-50 border border-emerald-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-emerald-800 leading-none mb-1">GOTS</span>
                          <span className="text-[5.5px] text-emerald-700/80 font-mono uppercase tracking-tighter">Organic</span>
                        </div>
                        {/* OEKO-TEX */}
                        <div className="flex flex-col items-center justify-center p-1 bg-teal-50 border border-teal-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-teal-800 leading-none mb-0.5">OEKO</span>
                          <span className="text-[5.5px] text-teal-700/80 font-mono uppercase tracking-tighter">Std 100</span>
                        </div>
                        {/* GRS */}
                        <div className="flex flex-col items-center justify-center p-1 bg-indigo-50 border border-indigo-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-indigo-800 leading-none mb-1">GRS</span>
                          <span className="text-[5.5px] text-indigo-700/80 font-mono uppercase tracking-tighter">Recycled</span>
                        </div>
                        {/* Sedex */}
                        <div className="flex flex-col items-center justify-center p-1 bg-red-50 border border-red-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-red-800 leading-none mb-1">SEDEX</span>
                          <span className="text-[5.5px] text-red-700/80 font-mono uppercase tracking-tighter">Member</span>
                        </div>
                        {/* Textile Exchange */}
                        <div className="flex flex-col items-center justify-center p-1 bg-amber-50 border border-amber-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-amber-800 leading-none mb-1">TEX</span>
                          <span className="text-[5.5px] text-amber-700/80 font-mono uppercase tracking-tighter">Exch.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* India Sourcing Card */}
                <div className="bg-white border border-gray-150 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    <div className="md:col-span-7 space-y-4">
                      <h3 className="font-display font-black text-gray-900 text-xl tracking-tight">India</h3>
                      <ul className="space-y-2 text-sm text-gray-650 leading-relaxed list-disc pl-4">
                        <li>Specialised in sustainable & eco products</li>
                        <li>Research & innovation hub</li>
                        <li>Sustainable supply chain</li>
                      </ul>
                    </div>

                    <div className="hidden md:block md:col-span-1 border-r border-gray-100 h-32 self-center justify-self-center"></div>

                    <div className="md:col-span-4 space-y-3">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-gray-400 block uppercase">Certifications :</span>
                      <div className="grid grid-cols-3 gap-2">
                        {/* ZDHC */}
                        <div className="flex flex-col items-center justify-center p-1 bg-sky-50 border border-sky-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-[#1F4E79] leading-none mb-1">ZDHC</span>
                          <span className="text-[5.5px] text-[#1F4E79]/80 font-mono uppercase tracking-tighter">Vendor</span>
                        </div>
                        {/* GOTS */}
                        <div className="flex flex-col items-center justify-center p-1 bg-emerald-50 border border-emerald-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-emerald-800 leading-none mb-1">GOTS</span>
                          <span className="text-[5.5px] text-emerald-700/80 font-mono uppercase tracking-tighter">Organic</span>
                        </div>
                        {/* GRS */}
                        <div className="flex flex-col items-center justify-center p-1 bg-indigo-50 border border-indigo-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-indigo-800 leading-none mb-1">GRS</span>
                          <span className="text-[5.5px] text-indigo-700/80 font-mono uppercase tracking-tighter">Recycled</span>
                        </div>
                        {/* OEKO-TEX */}
                        <div className="flex flex-col items-center justify-center p-1 bg-teal-50 border border-teal-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-teal-800 leading-none mb-0.5">OEKO</span>
                          <span className="text-[5.5px] text-teal-700/80 font-mono uppercase tracking-tighter">Std 100</span>
                        </div>
                        {/* Sedex */}
                        <div className="flex flex-col items-center justify-center p-1 bg-red-50 border border-red-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-red-800 leading-none mb-1">SEDEX</span>
                          <span className="text-[5.5px] text-red-700/80 font-mono uppercase tracking-tighter">Member</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pakistan Sourcing Card */}
                <div className="bg-white border border-gray-150 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    <div className="md:col-span-7 space-y-4">
                      <h3 className="font-display font-black text-gray-900 text-xl tracking-tight">Pakistan</h3>
                      <ul className="space-y-2 text-sm text-gray-650 leading-relaxed list-disc pl-4">
                        <li>Specialised in fabrications - fleece & home textile products</li>
                        <li>Washing innovation hub</li>
                      </ul>
                    </div>

                    <div className="hidden md:block md:col-span-1 border-r border-gray-100 h-32 self-center justify-self-center"></div>

                    <div className="md:col-span-4 space-y-3">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-gray-400 block uppercase">Certifications :</span>
                      <div className="grid grid-cols-3 gap-2">
                        {/* ZDHC */}
                        <div className="flex flex-col items-center justify-center p-1 bg-sky-50 border border-sky-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-[#1F4E79] leading-none mb-1">ZDHC</span>
                          <span className="text-[5.5px] text-[#1F4E79]/80 font-mono uppercase tracking-tighter">Vendor</span>
                        </div>
                        {/* GOTS */}
                        <div className="flex flex-col items-center justify-center p-1 bg-emerald-50 border border-emerald-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-emerald-800 leading-none mb-1">GOTS</span>
                          <span className="text-[5.5px] text-emerald-700/80 font-mono uppercase tracking-tighter">Organic</span>
                        </div>
                        {/* GRS */}
                        <div className="flex flex-col items-center justify-center p-1 bg-indigo-50 border border-indigo-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-indigo-800 leading-none mb-1">GRS</span>
                          <span className="text-[5.5px] text-indigo-700/80 font-mono uppercase tracking-tighter">Recycled</span>
                        </div>
                        {/* OEKO-TEX */}
                        <div className="flex flex-col items-center justify-center p-1 bg-teal-50 border border-teal-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-teal-800 leading-none mb-0.5">OEKO</span>
                          <span className="text-[5.5px] text-teal-700/80 font-mono uppercase tracking-tighter">Std 100</span>
                        </div>
                        {/* Sedex */}
                        <div className="flex flex-col items-center justify-center p-1 bg-red-50 border border-red-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-red-800 leading-none mb-1">SEDEX</span>
                          <span className="text-[5.5px] text-red-700/80 font-mono uppercase tracking-tighter">Member</span>
                        </div>
                        {/* Textile Exchange */}
                        <div className="flex flex-col items-center justify-center p-1 bg-amber-50 border border-amber-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-amber-800 leading-none mb-1">TEX</span>
                          <span className="text-[5.5px] text-amber-700/80 font-mono uppercase tracking-tighter">Exch.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Center aligned Egypt card below */}
              <div className="flex justify-center">
                <div className="bg-white border border-gray-150 rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-xs hover:shadow-md transition-all">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    <div className="md:col-span-7 space-y-4">
                      <h3 className="font-display font-black text-gray-900 text-xl tracking-tight">Egypt</h3>
                      <ul className="space-y-2 text-sm text-gray-650 leading-relaxed list-disc pl-4">
                        <li>Specialised in cut/sew knits</li>
                        <li>Rapid transit to EU/US</li>
                        <li>Duty Free to EU/US</li>
                      </ul>
                    </div>

                    <div className="hidden md:block md:col-span-1 border-r border-gray-100 h-28 self-center justify-self-center"></div>

                    <div className="md:col-span-4 space-y-3">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-gray-400 block uppercase">Certifications :</span>
                      <div className="grid grid-cols-3 gap-2">
                        {/* ZDHC */}
                        <div className="flex flex-col items-center justify-center p-1 bg-sky-50 border border-sky-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-[#1F4E79] leading-none mb-1">ZDHC</span>
                          <span className="text-[5.5px] text-[#1F4E79]/80 font-mono uppercase tracking-tighter">Vendor</span>
                        </div>
                        {/* GOTS */}
                        <div className="flex flex-col items-center justify-center p-1 bg-emerald-50 border border-emerald-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-emerald-800 leading-none mb-1">GOTS</span>
                          <span className="text-[5.5px] text-emerald-700/80 font-mono uppercase tracking-tighter">Organic</span>
                        </div>
                        {/* OEKO-TEX */}
                        <div className="flex flex-col items-center justify-center p-1 bg-teal-50 border border-teal-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-teal-800 leading-none mb-0.5">OEKO</span>
                          <span className="text-[5.5px] text-teal-700/80 font-mono uppercase tracking-tighter">Std 100</span>
                        </div>
                        {/* GRS */}
                        <div className="flex flex-col items-center justify-center p-1 bg-indigo-50 border border-indigo-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-indigo-800 leading-none mb-1">GRS</span>
                          <span className="text-[5.5px] text-indigo-700/80 font-mono uppercase tracking-tighter">Recycled</span>
                        </div>
                        {/* Sedex */}
                        <div className="flex flex-col items-center justify-center p-1 bg-red-50 border border-red-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-red-800 leading-none mb-1">SEDEX</span>
                          <span className="text-[5.5px] text-red-700/80 font-mono uppercase tracking-tighter">Member</span>
                        </div>
                        {/* Textile Exchange */}
                        <div className="flex flex-col items-center justify-center p-1 bg-amber-50 border border-amber-100 rounded-lg text-center h-12">
                          <span className="text-[7px] font-black text-amber-800 leading-none mb-1">TEX</span>
                          <span className="text-[5.5px] text-amber-700/80 font-mono uppercase tracking-tighter">Exch.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* MEET OUR FOUNDER SECTION */}
            <div className="space-y-12">
              <div className="text-center">
                <h2 className="font-display font-extrabold text-[#111827] text-3xl sm:text-4xl tracking-tight">Meet Our Founder</h2>
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-lg shadow-gray-100/40">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

                  {/* Left Column - Large Image */}
                  <div className="lg:col-span-5">
                    <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white aspect-4/3 lg:aspect-square flex items-center justify-center group bg-gray-50">
                      <img
                        src="/src/assets/images/abby_jamal_founder_1780823054622.png"
                        alt="Abby Jamal - Founder & Managing Director"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-950/20 to-transparent pointer-events-none" />
                    </div>
                  </div>

                  {/* Right Column - Biography info */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="space-y-1">
                      <h3 className="font-display font-extrabold text-gray-900 text-3xl tracking-tight">Abby Jamal</h3>
                      <p className="text-sm font-bold text-[#F15A24] uppercase tracking-wider font-mono">Founder & Managing Director</p>
                    </div>

                    <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                      <p>
                        Abby's personal story began in Africa as he was born and raised in Mombasa, Kenya. From an early age, Abby was immersed in the world of textiles by his family's textile business, so it was a natural progression for him to head to the UK and study Textile Technology & Management. Afterwards, he launched his own UK corporate-wear label.
                      </p>
                      <p>
                        Over the years, Abby's sourcing had taken him across the globe, to countries like Portugal, Greece, Peru, Colombia, Paraguay, Brazil, Botswana, Tanzania, Egypt, India, Türkiye, and Bangladesh – to name but a few. Having experienced the usual sourcing pains as a buyer first-hand, Abby decided to create a professional organisation at the source - providing solutions and adding value to the supply chain.
                      </p>
                      <p>
                        After relocating to Bangladesh, he founded CWS in 2001 with a clear mission: to be unique and innovative while redefining global sourcing standards, becoming the best sourcing partner in the apparel sector. Today, Abby's vision empowers a team of over 700 colleagues across the globe, in Bangladesh, Türkiye, India, Pakistan and Egypt; each team member is committed to CWS's values of &quot;passion for perfection.&quot;
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* MEET OUR TEAM SECTION WITH FUNCTIONAL SLIDER */}
            <div className="space-y-12">
              <div className="text-center">
                <h2 className="font-display font-extrabold text-[#111827] text-3xl sm:text-4xl tracking-tight">Meet Our Team</h2>
              </div>

              {/* Carousel wrapper */}
              <div className="relative px-0 sm:px-12 flex items-center justify-center">

                {/* Left navigation arrow strictly styled as in picture */}
                <button
                  onClick={() => setTeamIndex(prev => (prev === 0 ? 2 : prev - 1))}
                  className="absolute left-0 z-10 w-12 h-12 bg-white hover:bg-gray-50 border border-gray-150 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all text-gray-800 disabled:opacity-40"
                  aria-label="Previous Team Member"
                >
                  <svg className="w-5 h-5 text-gray-700 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Grid layout containing cards */}
                <div className="w-full overflow-hidden py-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch">

                    {/* Render team members with highlight on desktop */}
                    {[
                      {
                        idx: 0,
                        name: "Manju",
                        role: "Global Technical",
                        image: "/src/assets/images/manju_technical_1780823098895.png",
                        bio: "Manju was born in Sri Lanka, grew up in Maharagama, and is now living and working in Dhaka, Bangladesh. His work goal is to be \"an exceptional technical ally\" and a resource within the industry and to CWS's supply partners.",
                        focus: "Manju's current focus is virtual development (3D technical) and the application of this technology within CWS's processes.",
                        quote: '"I always enjoy seeing our teams succeed, and this technology we are using is definitely energising us all," he explains.'
                      },
                      {
                        idx: 1,
                        name: "Mou",
                        role: "CEO",
                        image: "/src/assets/images/mou_ceo_1780823078715.png",
                        bio: "Mou mixes commercial strategic thinking and a love of sustainability. \"Building a team of eco and ethical specialists is my lifeblood and what gets me excited about the future possibilities,\" she says.",
                        focus: "A marketing specialist by day, and a wellbeing enthusiast by night, Mou has had a love of Italian food since her years as a student.",
                        quote: '"Sustainability isn\'t just a trend; it\'s the foundational thread of our entire group structure," she highlights.'
                      },
                      {
                        idx: 2,
                        name: "Michael",
                        role: "Business Development",
                        image: "/src/assets/images/michael_bus_dev_1780823118479.png",
                        bio: "Michael was born in Oldenburg, Germany, and studied Economics and Foreign Trade during the 1970s. He is passionate about the global supply chain and the products CWS supplies.",
                        focus: "Michael is grateful for his continued enthusiasm for business consultancy and sales management. I always try to keep my eyes open and learn as I go, he explains.",
                        quote: '"Along my journey, I endeavour to follow the timeless wisdom of \"Whatever you do - do it right.\""'
                      }
                    ].map((m) => {
                      const isActive = teamIndex === m.idx;
                      return (
                        <div
                          key={m.idx}
                          className={`bg-white border text-center rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative ${isActive
                              ? 'border-[#F15A24]/35 ring-1 ring-[#F15A24]/2% shadow-xl md:scale-104 z-20'
                              : 'border-gray-150/80 opacity-70 md:opacity-40 hidden md:flex scale-98 hover:opacity-75 z-10'
                            }`}
                        >
                          {/* Inner card contents */}
                          <div className="space-y-6">

                            {/* Round avatar wrapper with premium frame */}
                            <div className="mx-auto w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-md relative">
                              <img
                                src={m.image}
                                alt={m.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-display font-extrabold text-gray-950 text-xl leading-none">{m.name}</h4>
                              <p className="text-xs font-bold text-[#F15A24] uppercase tracking-wider font-mono">{m.role}</p>
                            </div>

                            <div className="space-y-4 text-xs text-gray-600 leading-relaxed text-center">
                              <p>{m.bio}</p>
                              {m.focus && <p className="font-medium text-gray-750">{m.focus}</p>}
                              {m.quote && <p className="italic font-sans text-gray-500 font-medium">{m.quote}</p>}
                            </div>

                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>

                {/* Right navigation arrow */}
                <button
                  onClick={() => setTeamIndex(prev => (prev === 2 ? 0 : prev + 1))}
                  className="absolute right-0 z-10 w-12 h-12 bg-white hover:bg-gray-50 border border-gray-150 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all text-gray-800 disabled:opacity-40"
                  aria-label="Next Team Member"
                >
                  <svg className="w-5 h-5 text-gray-700 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

              </div>

              {/* Slider Dots exactly corresponding to the image (10 indicators) */}
              <div className="flex items-center justify-center gap-2 pt-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((dotVal) => {
                  // Map active dot to index ranges
                  const isCurDotActive = (dotVal % 3) === teamIndex;
                  return (
                    <button
                      key={dotVal}
                      onClick={() => setTeamIndex(dotVal % 3)}
                      className={`h-2 rounded-full transition-all duration-300 ${isCurDotActive ? 'w-5 bg-gray-900' : 'w-2 bg-gray-250 hover:bg-gray-400'}`}
                      aria-label={`Slide ${dotVal}`}
                    />
                  );
                })}
              </div>

            </div>

            {/* HISTORY OF CWS GRID CARD BLOCK */}
            <div className="space-y-12">
              <div className="text-center">
                <h2 className="font-display font-extrabold text-[#111827] text-3xl sm:text-4xl tracking-tight">History of CWS</h2>
              </div>

              {/* 3 Column Grid Cards for the Timeline nodes */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    year: "1960s",
                    title: "Early Years",
                    excerpt: "Mr. Ahmed Jamal Rawjee, was born in Tanzania, East Africa at the start of the 20t...",
                    content: "Mr. Ahmed Jamal Rawjee, was born in Tanzania, East Africa at the start of the 20th century. Over the years, the family's textiles business expanded across East Africa, laying down deep roots in industrial manufacturing and apparel trade. This heritage inspired subsequent generations."
                  },
                  {
                    year: "1971",
                    title: "The Journey Begins",
                    excerpt: "Born and raised in Mombasa, Kenya, our founder Abby Jamal set off for the U.K. in...",
                    content: "Born and raised in Mombasa, Kenya, our founder Abby Jamal set off for the U.K. in 1971. Sourcing and trade were in his blood. He studied textile technology and management, gaining a deep analytical understanding of apparel weaving, fiber science, and wet-processing."
                  },
                  {
                    year: "1982",
                    title: "First Trip to Bangladesh",
                    excerpt: "Having established a core business selling blank t-shirts and polos, Abby also...",
                    content: "Having established a core business selling blank t-shirts and polos in the United Kingdom, Abby took his first trip to Bangladesh in 1982. He recognized the country's tremendous potential to become a leading global force in apparel manufacturing."
                  },
                  {
                    year: "1983",
                    title: "T-Shirt Pioneer",
                    excerpt: "Abby realised Bangladesh's potential in the garments sector, and encouraged and...",
                    content: "Abby realized Bangladesh's potential in the garments sector, and encouraged and supported local manufacturers. He pioneered some of the earliest high-volume knitwear programs, establishing rigorous quality controls directly at the production source."
                  },
                  {
                    year: "80s",
                    title: "GBTC & OTM",
                    excerpt: "Throughout the 80s Abby and his partner Harry Tucker built Over The Moon (OTM)...",
                    content: "Throughout the 80s, Abby and his partner Harry Tucker built Over The Moon (OTM) and Great Bangladesh T-Shirt Company (GBTC). These ventures popularized premium quality printed jersey garments in major UK and European retail chains."
                  },
                  {
                    year: "Early 90s",
                    title: "J.T.'s Corporation",
                    excerpt: "In the early 90s, Abby and Harry diversified into screen printing. Eventually, they...",
                    content: "In the early 90s, Abby and Harry diversified into advanced screen printing and fabric finishing. Eventually, they formed J.T.'s Corporation to centralize global buying operations and offer bespoke design-to-delivery sourcing."
                  },
                  {
                    year: "1999",
                    title: "The Next Step",
                    excerpt: "Having spent nearly two decades buying apparel from Bangladesh, Abby realised...",
                    content: "Having spent nearly two decades buying apparel from Bangladesh, Abby realized that the traditional broker model was outdated. Sustaining long-term quality required direct physical infrastructure and boots-on-the-ground technical teams."
                  },
                  {
                    year: "2000",
                    title: "J.T.'s Opening in Dhaka",
                    excerpt: "The Great Bangladesh t-shirt company evolved into J.T.'s Bangladesh, and the...",
                    content: "The Great Bangladesh T-Shirt Company evolved into J.T.'s Bangladesh, and the group opened its first major corporate sourcing office in Dhaka, appointing dedicated quality control inspectors and merchandising managers on-site."
                  },
                  {
                    year: "2001",
                    title: "Establishing CWS",
                    excerpt: "Abby rebrands the company as CWS Apparel Buying Solutions. The name \"ZX...",
                    content: "Abby rebranded the company as CWS Apparel Buying Solutions. The name ('CWS') represents a multi-dimensional axis of apparel sourcing—design, quality, and sustainability. Operations expanded with a focus on comprehensive supply chain management."
                  },
                  {
                    year: "2003-07",
                    title: "The New Dawn",
                    excerpt: "As CWS's initial operations began to grow, it became apparent that customers were...",
                    content: "As CWS's initial operations began to grow rapidly, it became apparent that customers wanted a unified partner for multiple apparel categories. The company expanded into flat knit, shirting, denim, and outdoor activewear."
                  },
                  {
                    year: "2008-10",
                    title: "Diversification in Products",
                    excerpt: "While CWS's earlier focus had been on promotional, corporate, sports, and fashi...",
                    content: "While CWS's earlier focus had been on promotional, corporate, sports, and fashion, the company diversified into high-end fashion, technical sportswear, and premium organic lifestyle collections."
                  },
                  {
                    year: "2011-14",
                    title: "Global Presence",
                    excerpt: "To broaden the products solutions for CWS's diverse customer base, new region...",
                    content: "To broaden the production and sourcing solutions for CWS's diverse customer base, new regional offices were established in Türkiye, India, Pakistan, and Egypt, creating an agile, multi-origin sourcing powerhouse."
                  },
                  {
                    year: "2015",
                    title: "Passion for Perfection",
                    excerpt: "2015 was a milestone for CWS, as the company focused on adapting to the...",
                    content: "2015 was a key milestone for CWS, as the company focused on adapting to the modern digital era. We introduced AQL 1.5 standards across all production streams and established direct mill audit laboratories."
                  },
                  {
                    year: "2020",
                    title: "A Vision for the Future",
                    excerpt: "As CWS continues its journey, different countries and continents will become...",
                    content: "As CWS continues its journey, different countries and continents will become fully digitalized. We established our digital transformation labs, implementing virtual 3D prototyping (CLO3D) to eliminate raw sampling waste."
                  },
                  {
                    year: "2021",
                    title: "CWS Global Showroom",
                    excerpt: "We launched CWS Global Showroom at our regional office in Istanbul, Türkiye, to...",
                    content: "We launched CWS Global Showroom at our regional office in Istanbul, Türkiye, to preview seasonal collections virtually and physically, enabling global retail buy-groups to review fabrications and silhouettes with zero delay."
                  }
                ].map((item, keyIdx) => {
                  return (
                    <div
                      key={keyIdx}
                      className="bg-white border border-gray-150 rounded-2xl p-6 flex flex-col justify-between hover:shadow-lg transition-all"
                    >
                      <div className="space-y-3">
                        <span className="font-display font-black text-[#F15A24] text-3xl leading-none block">{item.year}</span>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-400">{item.title}</h4>
                          <p className="text-xs text-gray-600 leading-normal">{item.excerpt}</p>
                        </div>
                      </div>

                      {/* Click trigger and info icon */}
                      <div className="pt-4 flex justify-end">
                        <button
                          onClick={() => setSelectedHistoryItem({ year: item.year, title: item.title, content: item.content })}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-[#F15A24] hover:text-[#F15A24]/80 transition-colors cursor-pointer"
                        >
                          Read More
                          {/* Lucide info icon matching image perfectly */}
                          <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DETAIL MODAL FLYOUT FOR TIMELINE NODES */}
            <AnimatePresence>
              {selectedHistoryItem && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-[#0E1B2D]/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 15 }}
                    className="max-w-md w-full bg-[#FFFDFB] rounded-3xl overflow-hidden shadow-2xl border border-gray-100 p-6 md:p-8 space-y-6 relative text-left"
                  >
                    {/* Close button */}
                    <button
                      onClick={() => setSelectedHistoryItem(null)}
                      className="absolute top-6 right-6 p-1.5 text-gray-450 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
                      aria-label="Close Modal"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="space-y-1.5">
                      <span className="text-xs font-mono font-bold tracking-widest text-[#F15A24] uppercase">{selectedHistoryItem.year} HISTORIC PATH</span>
                      <h3 className="font-display font-extrabold text-2xl text-gray-950 leading-tight">{selectedHistoryItem.title}</h3>
                    </div>

                    <p className="text-sm text-gray-650 leading-relaxed font-sans">{selectedHistoryItem.content}</p>

                    <div className="pt-2">
                      <button
                        onClick={() => setSelectedHistoryItem(null)}
                        className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs tracking-wide rounded-xl shadow-xs transition-colors"
                      >
                        Close History Details
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}

        {/* COMPREHENSIVE SUB-PAGE: PRODUCTS & SERVICES */}
        {activeTab === 'products' && (
          <motion.div
            key="products"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10"
          >
            {/* 1. Sub-page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-gray-100 pb-10">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="bg-[#F15A24]/10 text-[#F15A24] font-mono text-[10px] tracking-widest font-extrabold uppercase px-3 py-1 rounded-full">
                    GLOBAL APPAREL PORTFOLIO
                  </span>
                  <span className="bg-gray-100 text-gray-650 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Showcase
                  </span>
                </div>
                <h1 className="font-display font-extrabold text-[#111827] text-4xl sm:text-5xl tracking-tight">
                  High-Fidelity Product Catalog
                </h1>
                <p className="text-gray-500 text-sm sm:text-base max-w-2xl leading-relaxed">
                  Explore CWS International's premier clothing lines. Seamlessly search and filter through our sustainable cotton T-shirts, premium denim, cozy french terry fleece hoodies, and technical activewear arrays configured for global sourcing.
                </p>
              </div>

              {/* Page-level Sourcing Statistics */}
              <div className="grid grid-cols-3 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-100 divide-x divide-gray-200 shrink-0">
                <div className="px-3 text-center">
                  <div className="font-display font-extrabold text-[#F15A24] text-lg sm:text-xl">AQL 1.5</div>
                  <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Quality Level</div>
                </div>
                <div className="px-3 text-center">
                  <div className="font-display font-extrabold text-[#111827] text-lg sm:text-xl">100%</div>
                  <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Eco-Certified</div>
                </div>
                <div className="px-3 text-center">
                  <div className="font-display font-extrabold text-[#111827] text-lg sm:text-xl">10M+</div>
                  <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Capacity / Mo</div>
                </div>
              </div>
            </div>

            {/* 2. Interactive Control Bar */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-6">
              {/* Category Filter Tabs */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono tracking-widest text-[#F15A24] uppercase block font-bold">
                  Sourcing Category
                </label>
                <div className="flex flex-wrap bg-gray-100 p-1.5 rounded-2xl gap-1.5 w-fit">
                  <button
                    onClick={() => { setSelectedProductCategory('All'); }}
                    className={`px-5 py-2.5 rounded-xl font-display font-bold text-xs transition-all ${selectedProductCategory === 'All' ? 'bg-white text-gray-950 shadow-xs border border-gray-100' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    All Products
                  </button>
                  {Object.keys(PRODUCT_CATALOG).map((catName) => (
                    <button
                      key={catName}
                      onClick={() => { setSelectedProductCategory(catName); }}
                      className={`px-5 py-2.5 rounded-xl font-display font-bold text-xs transition-all ${selectedProductCategory === catName ? 'bg-white text-gray-950 shadow-xs border border-gray-100' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                      {catName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi-Filter Rows: Search, Gender, MOQ Limit, and Grid/List Mode */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-gray-100">
                {/* Search Bar */}
                <div className="md:col-span-5 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search model, fabric, GSM, or features..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#F15A24] focus:ring-1 focus:ring-[#F15A24]/20 transition-all font-sans placeholder:text-gray-400"
                  />
                  {productSearch && (
                    <button
                      onClick={() => setProductSearch('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none text-[10px] font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Gender Filter */}
                <div className="md:col-span-3 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                  <span className="text-[10px] font-mono text-gray-450 uppercase tracking-widest font-bold pr-2 border-r border-gray-200 mr-2 whitespace-nowrap">
                    Fit
                  </span>
                  <select
                    value={productGender}
                    onChange={(e) => setProductGender(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-gray-800 focus:outline-none cursor-pointer py-1.5"
                  >
                    <option value="All">All Genders</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Unisex">Unisex</option>
                  </select>
                </div>

                {/* MOQ Tier */}
                <div className="md:col-span-2 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                  <span className="text-[10px] font-mono text-gray-450 uppercase tracking-widest font-bold pr-2 border-r border-gray-200 mr-2 whitespace-nowrap">
                    MOQ
                  </span>
                  <select
                    value={productMoqLimit}
                    onChange={(e) => setProductMoqLimit(e.target.value as any)}
                    className="w-full bg-transparent border-none text-xs text-gray-800 focus:outline-none cursor-pointer py-1.5"
                  >
                    <option value="All">All MOQ</option>
                    <option value="Low">Low (≤ 2,000)</option>
                    <option value="Mid">Mid (2,001 - 2,500)</option>
                    <option value="High">High (&gt; 2,500)</option>
                  </select>
                </div>

                {/* Grid vs List Toggler */}
                <div className="md:col-span-2 flex items-center justify-end gap-1.5 border-t md:border-t-0 pt-4 md:pt-0">
                  <button
                    onClick={() => setProductViewMode('grid')}
                    className={`px-3 py-2.5 rounded-lg border text-xs transition-all ${productViewMode === 'grid' ? 'bg-[#111827] text-white border-[#111827] font-semibold' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                    title="Grid view"
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setProductViewMode('list')}
                    className={`px-3 py-2.5 rounded-lg border text-xs transition-all ${productViewMode === 'list' ? 'bg-[#111827] text-white border-[#111827] font-semibold' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                    title="List view"
                  >
                    List
                  </button>
                </div>
              </div>

              {/* Dynamic Filter Feedback and Count */}
              <div className="flex items-center justify-between text-xs font-mono pt-4 border-t border-gray-50">
                <span className="text-gray-500">
                  Showing <strong className="text-gray-900 font-bold">
                    {(() => {
                      let list: (ProductType & { category: string; key: string })[] = [];
                      Object.entries(PRODUCT_CATALOG).forEach(([cat, items]) => {
                        items.forEach((p, idx) => {
                          list.push({ ...p, category: cat, key: `${cat}-${idx}` });
                        });
                      });
                      return list.filter(p => {
                        if (selectedProductCategory !== 'All' && p.category !== selectedProductCategory) return false;
                        if (productSearch) {
                          const q = productSearch.toLowerCase();
                          if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q) && !p.material.toLowerCase().includes(q)) return false;
                        }
                        if (productGender !== 'All' && !p.genders.includes(productGender)) return false;
                        if (productMoqLimit !== 'All') {
                          const numericMoq = parseInt(p.moq.replace(/[^0-9]/g, ''), 10) || 0;
                          if (productMoqLimit === 'Low' && numericMoq > 2000) return false;
                          if (productMoqLimit === 'Mid' && (numericMoq <= 2000 || numericMoq > 2500)) return false;
                          if (productMoqLimit === 'High' && numericMoq <= 2500) return false;
                        }
                        return true;
                      }).length;
                    })()}
                  </strong> garment configurations
                </span>
                {(productSearch || productGender !== 'All' || productMoqLimit !== 'All' || selectedProductCategory !== 'All') && (
                  <button
                    onClick={() => {
                      setProductSearch('');
                      setProductGender('All');
                      setProductMoqLimit('All');
                      setSelectedProductCategory('All');
                    }}
                    className="text-[#F15A24] hover:underline font-bold"
                  >
                    Reset Active Filters
                  </button>
                )}
              </div>
            </div>

            {/* 3. Products Grid or List Layout */}
            <AnimatePresence mode="popLayout">
              {(() => {
                let list: (ProductType & { category: string; key: string })[] = [];
                Object.entries(PRODUCT_CATALOG).forEach(([cat, items]) => {
                  items.forEach((p, idx) => {
                    list.push({ ...p, category: cat, key: `${cat}-${idx}` });
                  });
                });
                const filtered = list.filter(p => {
                  if (selectedProductCategory !== 'All' && p.category !== selectedProductCategory) return false;
                  if (productSearch) {
                    const q = productSearch.toLowerCase();
                    if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q) && !p.material.toLowerCase().includes(q)) return false;
                  }
                  if (productGender !== 'All' && !p.genders.includes(productGender)) return false;
                  if (productMoqLimit !== 'All') {
                    const numericMoq = parseInt(p.moq.replace(/[^0-9]/g, ''), 10) || 0;
                    if (productMoqLimit === 'Low' && numericMoq > 2000) return false;
                    if (productMoqLimit === 'Mid' && (numericMoq <= 2000 || numericMoq > 2500)) return false;
                    if (productMoqLimit === 'High' && numericMoq <= 2500) return false;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <motion.div
                      key="no-items"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-white border border-dashed border-gray-250 rounded-3xl py-24 text-center space-y-5"
                    >
                      <div className="mx-auto w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                        <Filter className="w-5 h-5 text-[#F15A24]" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-display font-semibold text-gray-900 text-lg">No garments found</h3>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto">
                          We couldn't find any clothing designs fitting your active filter criteria. Try relaxing your search text or filters.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setProductSearch('');
                          setProductGender('All');
                          setProductMoqLimit('All');
                          setSelectedProductCategory('All');
                        }}
                        className="bg-gray-950 hover:bg-[#F15A24] text-white font-mono text-xs font-bold px-6 py-3 rounded-xl transition-all"
                      >
                        Reset Filter Selection
                      </button>
                    </motion.div>
                  );
                }

                if (productViewMode === 'grid') {
                  return (
                    <motion.div
                      key="grid-layout"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                      {filtered.map((p) => (
                        <div
                          key={p.key}
                          className="border border-gray-150 rounded-3xl bg-white overflow-hidden hover:shadow-xl transition-all relative flex flex-col justify-between group"
                        >
                          {/* Image Frame */}
                          <div className="h-72 w-full bg-gray-100 overflow-hidden relative">
                            <img
                              src={p.image}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                            />
                            {/* Hover Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-5" />

                            {/* Brand Accents */}
                            <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
                              <span className="bg-white/95 backdrop-blur-xs text-gray-900 font-mono text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-md shadow-xs border border-gray-100">
                                {p.category}
                              </span>
                            </div>
                            <div className="absolute top-4 right-4 flex flex-col gap-1.5 items-end2 shadow-xs bg-[#111827]/90 text-white font-mono text-[9px] font-bold px-2.5 py-0.5 rounded-md backdrop-blur-xs">
                              AQL 1.5
                            </div>

                            {/* Quick Fit Tags floating at the bottom */}
                            <div className="absolute bottom-4 left-4 flex gap-1 items-center">
                              {p.genders.map((g) => (
                                <span key={g} className="bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full font-semibold border border-white/10 backdrop-blur-xs">
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Content Frame */}
                          <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                            <div className="space-y-2">
                              <h3 className="font-display font-extrabold text-[#111827] text-lg lg:text-xl hover:text-[#F15A24] transition-colors leading-snug">
                                {p.name}
                              </h3>
                              <p className="text-xs text-gray-600 leading-relaxed min-h-[50px] font-sans">
                                {p.description}
                              </p>
                            </div>

                            {/* Interactive Color Swatches */}
                            <div className="space-y-2 pt-3 border-t border-gray-100">
                              <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block font-bold">
                                Fabric Tone Swatches
                              </span>
                              <div className="flex items-center gap-1.5">
                                {p.colors.map((c, i) => (
                                  <div
                                    key={i}
                                    className="w-5 h-5 rounded-full border border-gray-200 cursor-pointer shadow-xs transform hover:scale-110 hover:border-[#F15A24] transition-all"
                                    style={{ backgroundColor: c }}
                                    title={`Fabric shade options`}
                                  />
                                ))}
                                <span className="text-[10px] text-gray-450 font-mono pl-1">
                                  +{p.colors.length} options
                                </span>
                              </div>
                            </div>

                            {/* Spec Panel */}
                            <div className="border-t border-gray-100 space-y-2.5 pt-4 text-[11px] font-mono">
                              <div className="flex justify-between items-center text-xs pb-1 border-b border-gray-50">
                                <span className="text-gray-400">Target FOB Price</span>
                                <span className="text-[#F15A24] font-extrabold text-sm">{p.priceRange}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Monthly Sourcing Cap</span>
                                <span className="text-gray-800 font-semibold">{p.capacity}</span>
                              </div>
                              <div className="flex justify-between items-start">
                                <span className="text-gray-400">Material Composition</span>
                                <span className="text-gray-800 font-semibold text-right max-w-[150px] truncate" title={p.material}>{p.material}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Average Lead Time</span>
                                <span className="text-gray-800 font-semibold">{p.leadTime}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Minimum Order (MOQ)</span>
                                <span className="text-gray-800 font-semibold">{p.moq}</span>
                              </div>
                            </div>

                            {/* Request Call-to-Action */}
                            <div className="pt-2">
                              <button
                                onClick={() => {
                                  setContactForm({
                                    name: '',
                                    email: '',
                                    org: '',
                                    productType: p.name,
                                    quantity: p.moq.replace(/[^0-9]/g, ''),
                                    destination: 'United Kingdom',
                                    message: `Hello CWS Sourcing Team, we are interested in placing a commercial production order for: "${p.name}". \n\nExpected MOQ: ${p.moq}\nFabric Description: ${p.material}\n\nKindly guide us with physical swatches fabric submission and booking details.`
                                  });
                                  setIsContactOpen(true);
                                }}
                                className="w-full text-center font-display font-bold text-xs bg-[#111827] text-white hover:bg-[#F15A24] py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-hidden"
                              >
                                Inquire Custom RFQ
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key="list-layout"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {filtered.map((p) => (
                      <div
                        key={p.key}
                        className="border border-gray-150 rounded-2xl bg-white p-4 hover:shadow-md transition-all relative flex flex-col md:flex-row items-center justify-between gap-6 group"
                      >
                        {/* Compact Image */}
                        <div className="w-full md:w-32 h-32 md:h-24 rounded-xl overflow-hidden bg-gray-50 shrink-0 relative">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] font-mono px-1.5 py-0.5 rounded">
                            AQL 1.5
                          </span>
                        </div>

                        {/* Info and Description */}
                        <div className="flex-1 space-y-1.5 text-center md:text-left">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center md:justify-start">
                            <span className="text-[10px] bg-gray-100 text-gray-700 font-mono px-2 py-0.5 rounded-full w-fit self-center sm:self-auto">
                              {p.category}
                            </span>
                            <span className="text-[10px] text-gray-550 font-mono font-semibold">
                              Fits: {p.genders.join(', ')}
                            </span>
                          </div>
                          <h3 className="font-display font-extrabold text-[#111827] text-md hover:text-[#F15A24] transition-colors leading-tight">
                            {p.name}
                          </h3>
                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed font-sans">
                            {p.description}
                          </p>
                        </div>

                        {/* Spec Fields */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left font-mono text-[10px] shrink-0 border-t md:border-t-0 pt-4 md:pt-0 w-full md:w-auto border-gray-100">
                          <div className="space-y-1">
                            <span className="text-gray-400 block uppercase tracking-wider">FOB Price</span>
                            <strong className="text-[#F15A24] font-bold text-xs">{p.priceRange}</strong>
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-400 block uppercase tracking-wider">Mo. Capacity</span>
                            <span className="text-gray-800 font-semibold">{p.capacity}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-400 block uppercase tracking-wider">Lead Time</span>
                            <span className="text-gray-800 font-semibold">{p.leadTime}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-400 block uppercase tracking-wider">Min Order (MOQ)</span>
                            <span className="text-gray-800 font-semibold">{p.moq}</span>
                          </div>
                        </div>

                        {/* Action */}
                        <div className="shrink-0 w-full md:w-auto">
                          <button
                            onClick={() => {
                              setContactForm({
                                name: '',
                                email: '',
                                org: '',
                                productType: p.name,
                                quantity: p.moq.replace(/[^0-9]/g, ''),
                                destination: 'United Kingdom',
                                message: `Hello CWS Sourcing Team, we are interested in placing a commercial production order for: "${p.name}". \n\nExpected MOQ: ${p.moq}\nFabric Description: ${p.material}\n\nKindly guide us with physical swatches fabric submission and booking details.`
                              });
                              setIsContactOpen(true);
                            }}
                            className="w-full md:w-auto bg-[#111827] text-white text-xs font-bold font-mono px-5 py-3 rounded-xl hover:bg-[#F15A24] transition-colors flex items-center justify-center gap-1.5 focus:outline-hidden"
                          >
                            RFQ
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </motion.div>
        )}

        {/* COMPREHENSIVE SUB-PAGE: OUR PROMISE */}
        {activeTab === 'promise' && (
          <motion.div
            key="promise"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16"
            id="promise-page"
          >
            {/* 1. OUR VALUES SECTION */}
            <div className="text-center space-y-8 max-w-4xl mx-auto py-8" id="promise-values-section">
              <h1 className="font-display font-extrabold text-[#111827] text-4xl sm:text-5xl tracking-tight">Our Values</h1>
              <div className="space-y-6 text-base sm:text-lg text-gray-650 leading-relaxed font-sans">
                <p>
                  Creating positive impact has always been at the heart of our culture as a company. Our strategic approach really began in 2000, when we rolled out our Social and Ethical Compliance blueprint across our global supply base.
                </p>
                <p>
                  We are committed to working with leading industry eco-communities to further develop our preferred fibre portfolio, and improving industry practices to bring positive environmental and societal changes for our communities.
                </p>
              </div>
            </div>

            {/* 2. OUR VISION SECTION */}
            <div className="space-y-10 py-8 bg-[#FBFBFA] rounded-3xl p-6 sm:p-12 border border-gray-100" id="promise-vision-section">
              <div className="text-center space-y-3 max-w-2xl mx-auto">
                <h2 className="font-display font-extrabold text-gray-900 text-3xl sm:text-4xl tracking-tight">Our Vision</h2>
                <p className="text-sm sm:text-base text-gray-550 font-sans">
                  Our vision always has and will always be anchored in People, Passion, and Partnership.
                </p>
              </div>

              {/* Vision Interactive Slider */}
              <div className="relative max-w-4xl mx-auto flex items-center justify-between gap-4 py-4">
                {/* Previous Button */}
                <button
                  onClick={() => setVisionIndex(prev => (prev - 1 + 3) % 3)}
                  className="p-3 rounded-full border border-gray-200 bg-white text-gray-750 hover:bg-gray-50 active:scale-95 transition-all shadow-sm focus:outline-none shrink-0"
                  aria-label="Previous Slide"
                  id="vision-prev-button"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Main Card */}
                <div className="w-full overflow-hidden bg-white rounded-3xl shadow-lg border border-gray-100 p-6 sm:p-10 text-center relative min-h-[380px] flex flex-col justify-between">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={visionIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6 my-auto"
                    >
                      {/* Icon & Title */}
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-16 h-16 rounded-full bg-[#FFF1ED] flex items-center justify-center text-[#F15A24]">
                          {visionIndex === 0 && <Users className="w-8 h-8" />}
                          {visionIndex === 1 && <Flame className="w-8 h-8" />}
                          {visionIndex === 2 && <Handshake className="w-8 h-8" />}
                        </div>
                        <h3 className="text-3xl font-extrabold text-gray-900 font-display">
                          {visionIndex === 0 && 'People'}
                          {visionIndex === 1 && 'Passion'}
                          {visionIndex === 2 && 'Partnership'}
                        </h3>
                        <span className="text-xs font-mono font-bold tracking-widest text-[#F15A24] uppercase">
                          {visionIndex === 0 && 'Community Goal'}
                          {visionIndex === 1 && 'Design & Quality Goal'}
                          {visionIndex === 2 && 'Sustainable Ecosystem'}
                        </span>
                      </div>

                      {/* Decriptions / Goals */}
                      <div className="space-y-4 max-w-2xl mx-auto text-sm sm:text-base text-gray-650 leading-relaxed font-sans">
                        {visionIndex === 0 && (
                          <>
                            <p>
                              We continuously invest in maintaining a positive impact on the people living and working in our regional locations. In collaboration with suppliers, our teams strive to develop best practices, drive ethical transparency, and identify opportunities for positive change throughout the value chain.
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 italic">
                              In addition, our CSR team and 7 STREAMS Foundation work with factories and brands, championing projects that make a real difference to impacted communities.
                            </p>
                          </>
                        )}
                        {visionIndex === 1 && (
                          <>
                            <p>
                              We are fueled by a relentless passion for perfection in design, fabric construction, and sewing craftsmanship. Our technical squads continuously evaluate fiber arrays, weave densities, colorfastness, and stress-tolerance in our laboratories.
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 italic">
                              Our advanced virtual 3D drafting hubs (CLO3D) allow design teams to perfect sample mockups, decreasing physical sample waste by up to 90% while boosting turnaround.
                            </p>
                          </>
                        )}
                        {visionIndex === 2 && (
                          <>
                            <p>
                              We cultivate robust, reliable alliances with audited textile mills and global retail buyers. True partnership is anchored in mutual respect, shared carbon initiatives, and absolute production transparency.
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 italic">
                              By deploying direct-of-origin quality personnel, automated shipment tracking, and open-book compliance records, we build bulletproof operational trust.
                            </p>
                          </>
                        )}
                      </div>

                      {/* Brand-consistent bottom graphic badges inside slider */}
                      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 border-t border-gray-50">
                        {visionIndex === 0 && (
                          <>
                            <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-1.5 rounded-full border border-gray-100 shadow-3xs" title="7 STREAMS Foundation">
                              <span className="text-[10px] font-mono font-bold text-gray-550">7 STREAMS</span>
                              <div className="w-1.5 h-1.5 rounded-full bg-[#F15A24]" />
                              <span className="text-[9px] text-[#F15A24] font-bold">Woven Lives Together</span>
                            </div>
                            <div className="flex items-center gap-2 bg-yellow-50 px-3.5 py-1.5 rounded-full border border-yellow-100 shadow-3xs" title="Proudly Sourced Ethically">
                              <span className="text-[9px] font-mono font-bold text-yellow-800">BANGLADESH WELFARE APPROVED</span>
                              <div className="w-2 h-2 rounded-full bg-emerald-600" />
                            </div>
                          </>
                        )}
                        {visionIndex === 1 && (
                          <>
                            <div className="flex items-center gap-2 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100 shadow-3xs">
                              <span className="text-[10px] font-mono font-bold text-indigo-700">3D APPAREL HUB</span>
                              <span className="text-[9px] text-gray-500 font-sans">90% Prototype Waste Reduction</span>
                            </div>
                            <div className="flex items-center gap-2 bg-orange-50 px-4 py-1.5 rounded-full border border-orange-100 shadow-3xs">
                              <span className="text-[10px] font-mono font-bold text-orange-850">SMART MATERIAL LAB</span>
                              <span className="text-[9px] text-orange-650 font-bold">100% Quality Inspected</span>
                            </div>
                          </>
                        )}
                        {visionIndex === 2 && (
                          <>
                            <div className="flex items-center gap-2 bg-sky-50 px-4 py-1.5 rounded-full border border-sky-100 shadow-3xs">
                              <span className="text-[10px] font-mono font-bold text-sky-800">ZDHC PORTAL PARTNER</span>
                              <span className="text-[9px] text-sky-650">Level 3 Clean Chemistry</span>
                            </div>
                            <div className="flex items-center gap-2 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100 shadow-3xs">
                              <span className="text-[10px] font-mono font-bold text-emerald-800">ECOVADIS SILVER CODE</span>
                              <span className="text-[9px] text-emerald-600 font-semibold">Top 15% Sourcing Compliance</span>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Next Button */}
                <button
                  onClick={() => setVisionIndex(prev => (prev + 1) % 3)}
                  className="p-3 rounded-full border border-gray-200 bg-white text-gray-750 hover:bg-gray-50 active:scale-95 transition-all shadow-sm focus:outline-none shrink-0"
                  aria-label="Next Slide"
                  id="vision-next-button"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Slider Dots */}
              <div className="flex justify-center items-center gap-2.5">
                {[0, 1, 2].map(idx => (
                  <button
                    key={idx}
                    onClick={() => setVisionIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all focus:outline-none ${visionIndex === idx ? 'bg-black scale-110' : 'bg-gray-300 hover:bg-gray-400'}`}
                    aria-label={`Slide ${idx + 1}`}
                    id={`vision-dot-${idx}`}
                  />
                ))}
              </div>
            </div>

            {/* 3. ETHICAL MILESTONES */}
            <div className="space-y-8 py-8" id="promise-milestones-section">
              <div className="text-center space-y-2">
                <h2 className="font-display font-extrabold text-[#111827] text-3xl sm:text-4xl tracking-tight">Our Ethical Milestones</h2>
                <p className="text-sm sm:text-base text-gray-500 font-sans">
                  Our commitment is to succeed organically
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="promise-milestones-grid">
                {[
                  {
                    year: "2002",
                    text: "Publication of first Ethical Code of Conduct.",
                    content: "CWS publishes its original Sourcing Ethical Code of Conduct, ensuring that all suppliers meet international standards for safe working climates, strict raw material testing, and transparent payroll."
                  },
                  {
                    year: "2003",
                    text: "Launch of in-house Compliance Team & Laboratory.",
                    content: "We set up an in-house chemical testing and factory audit laboratory in Dhaka, with qualified inspection officers to verify fabric and dye standards independent of third parties."
                  },
                  {
                    year: "2005",
                    text: "Establishment of In-house Design & Innovation Teams with...",
                    content: "We established dedicated design and engineering teams to work collaboratively with global buyers, transforming raw apparel concepts into fully spec'd industrial patterns while optimizing fabric consumption."
                  },
                  {
                    year: "2006",
                    text: "First Production of fully traceable Organic Cotton & Fleece Products.",
                    content: "CWS completed its first major bulk order of certified organic cotton garments, confirming complete trace-verification from agricultural fields to final shipping containers."
                  },
                  {
                    year: "2012",
                    text: "Launch of Fire Safety Awareness Training program for vendors...",
                    content: "We introduced comprehensive fire safety workshops and auditing guidelines across our entire supplier network, educating tens of thousands of supervisors and factory workers."
                  },
                  {
                    year: "2013",
                    text: "Onboarding of Independent Audit Team to cross verify factor...",
                    content: "Partnered with independent compliance checkers to conduct unannounced audits of certified mills, ensuring complete integrity across safety, overtime, and building structures."
                  },
                  {
                    year: "2014",
                    text: "Recruitment of In-house Structural Engineer to work...",
                    content: "Recruited highly experienced structural and electrical safety engineers to analyze factory buildings, carrying out rigorous remediation plans for absolute structural safety."
                  },
                  {
                    year: "2016",
                    text: "Creation of Standalone Sustainability Sourcing Team to...",
                    content: "Formed a dedicated sustainability sourcing division to explore and license eco-certified fabrics, biopolymers, and low-water dying technologies across our global origins."
                  },
                  {
                    year: "2017",
                    text: "Investment in 3D Design platforms Optitex & CLO...",
                    content: "CWS scaled its visual workflow by adopting CLO3D software, eliminating physical raw sampling waste by up to 90% and reducing cargo shipping fuel consumption."
                  },
                  {
                    year: "2019",
                    text: "Certification under GOTS.",
                    content: "CWS obtained full corporate GOTS compliance recognition, allowing us to manage and export fully certified organic knit and weave production cycles with total source accountability."
                  },
                  {
                    year: "2020",
                    text: "Transformation of 15% of total production volume into 100%...",
                    content: "Sourcing milestone: Successfully converted 15% of total manufacturing throughput into preferred sustainable fibers, including recycled PET and organic cotton."
                  },
                  {
                    year: "2021",
                    text: "Membership in Textile Exchange, HIGG INDEX & Friends of ZDHC.",
                    content: "Joined premier industry platforms including Higg Index, Textile Exchange, and ZDHC, aligning our tracking targets with science-based carbon reduction goals."
                  }
                ].map((item, idx) => {
                  // Determine if the card text has an ellipsis or if we should show 'Read More' anyway
                  const showReadMore = item.text.endsWith('...') || idx === 2 || idx === 4 || idx === 5 || idx === 6 || idx === 7 || idx === 8 || idx === 10;

                  return (
                    <div
                      key={idx}
                      className="border border-gray-150 p-6 rounded-2xl bg-white shadow-xs space-y-4 hover:shadow-md hover:border-[#F15A24]/25 transition-all text-left flex flex-col justify-between group cursor-pointer h-full"
                      onClick={() => setSelectedMilestone({ year: item.year, title: item.text.replace('...', ''), content: item.content })}
                      id={`milestone-card-${item.year}`}
                    >
                      <div className="space-y-2">
                        <span className="font-display font-black text-[#F15A24] block text-2xl tracking-tight font-sans">
                          {item.year}
                        </span>
                        <p className="text-xs sm:text-[13px] text-gray-750 font-medium leading-relaxed font-sans">
                          • {item.text}
                        </p>
                      </div>

                      {showReadMore && (
                        <div className="pt-2 flex items-center gap-1 text-[#F15A24] text-[11px] font-bold group-hover:underline self-end focus:outline-none">
                          <span>Read More</span>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. OUR PROGRESS SO FAR STATS GRIID */}
            <div className="space-y-8 py-8" id="promise-progress-section">
              <div className="text-center space-y-2 max-w-2xl mx-auto">
                <h2 className="font-display font-extrabold text-[#111827] text-3xl sm:text-4xl tracking-tight">Our Progress So Far</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-[#FAFAFA] gap-6" id="promise-progress-grid">
                {[
                  { percent: "35%", text: "Our total production volume converted to Sustainable Materials" },
                  { percent: "25%", text: "Our Organic Cotton share for total Sustainable Production" },
                  { percent: "8%", text: "Our Recycled Polyester share for total Sustainable Production" },
                  { percent: "15%", text: "Our overall sampling reduction in last 12 months" },
                  { percent: "8%", text: "Our overall Energy and Green House Gases (GHGs) reduction in last 12 months" },
                  { percent: "5%", text: "Our overall waste reduction in last 12 months" },
                  { percent: "30%", text: "Our overall waste water reused in last 12 months" },
                  { percent: "50%", text: "Our suppliers using certified chemicals in last 12 months" }
                ].map((stat, index) => (
                  <div
                    key={index}
                    className="border border-gray-150 p-6 sm:p-8 rounded-2xl bg-[#FCFCFB] shadow-2xs space-y-3 text-center hover:border-[#F15A24]/20 hover:shadow-xs transition-all"
                    id={`stat-card-${index}`}
                  >
                    <span className="font-display font-extrabold text-gray-950 block text-4xl sm:text-5xl tracking-tight font-sans">
                      {stat.percent}
                    </span>
                    <p className="text-xs sm:text-[13px] text-gray-650 leading-relaxed font-sans font-medium px-2">
                      {stat.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. CWS Certifications */}
            <div className="space-y-10 py-8 bg-[#FBFBFA] rounded-3xl p-6 sm:p-12 border border-gray-100" id="promise-certifications-section">
              <div className="text-center space-y-2">
                <h2 className="font-display font-bold text-gray-900 text-3xl sm:text-4xl tracking-tight">CWS Certifications</h2>
              </div>

              {/* Certifications Interactive Carousel */}
              <div className="relative max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-4 py-2">
                {/* Left arrow */}
                <button
                  onClick={() => setCertIndex(prev => (prev - 1 + 7) % 7)}
                  className="p-2.5 sm:p-3 rounded-full border border-gray-200 bg-white text-gray-750 hover:bg-gray-50 active:scale-95 transition-all shadow-sm focus:outline-none shrink-0"
                  aria-label="Previous Certification"
                  id="cert-prev-button"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Slides cards container */}
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden py-3 px-1">
                  {[
                    // We render 3 cards centered around certIndex responsive
                    (certIndex - 1 + 7) % 7,
                    certIndex,
                    (certIndex + 1) % 7
                  ].map((targetIdx, renderingPos) => {
                    const certItems = [
                      {
                        name: "OEKO-TEX (Standard 100)",
                        desc: "STANDARD 100 by OEKO-TEX® is one of the world's best-known labels for textiles tested for harmful substances.",
                        fullText: "STANDARD 100 by OEKO-TEX® is one of the world's best-known labels for apparel tested for hazardous or toxic remnants. It verifies that every component of the garment passes stringent pH, heavy metal, and allergen safety evaluations.",
                        logo: "OEKO-TEX",
                        detailLabel: "STANDARD 100"
                      },
                      {
                        name: "GOTS (Global Organic Textile Standard)",
                        desc: "The Global Organic Textile Standard (GOTS) is a voluntary, certified standard that covers all aspects of the production of all...",
                        fullText: "The Global Organic Textile Standard (GOTS) is the ultimate benchmark for organic fibers, integrating strict ecological, toxicity and social criteria, backed by independent certification of the entire localized procurement chain.",
                        logo: "GOTS",
                        detailLabel: "GLOBAL ORGANIC"
                      },
                      {
                        name: "Friend of ZDHC - Vendor",
                        desc: "This allows us to gain a deeper understanding of ZDHC's work. Further, CWS will have access to ZDHC Solutions,",
                        fullText: "Being a proud Friend of ZDHC enables CWS to actively manage waste-water chemicals, restricted substance thresholds, and zero discharges inside client dye mills, preventing dangerous agricultural runoff.",
                        logo: "ZDHC",
                        detailLabel: "VENDORS FORUM"
                      },
                      {
                        name: "Silver EcoVadis Sustainability Rating",
                        desc: "Placing in the top 15% globally of sustainable apparel sourcing enterprises, highlighting our strict ecological accountability.",
                        fullText: "EcoVadis assessment gauges 21 sustainability criteria across 4 pillars: Environment, Labor & Human Rights, Ethics, and Sustainable Procurement. CWS places in top percentiles globally as a secure responsible supplier.",
                        logo: "EcoVadis",
                        detailLabel: "SILVER RATIO"
                      },
                      {
                        name: "Textile Exchange Member",
                        desc: "Driving down overall CO2 emissions by up to 45% by selecting and tracking recycled and authentic synthetic fiber content.",
                        fullText: "Textile Exchange partnership enables CWS to deploy RCS, CCS, and GRS certified raw polyester and authentic cotton blends, aligning factory output parameters with climate-conscious metrics.",
                        logo: "TextileEx",
                        detailLabel: "GLOBAL MEMBER"
                      },
                      {
                        name: "Global Recycled Standard (GRS)",
                        desc: "A certifying body tracking recycled content, strict processing limits, and environmental chemical restrictions during spinning.",
                        fullText: "The GRS certifies our supply loops utilizing recycled raw materials (like ocean PET plastic blends), auditing production processing controls, water treatments, and toxic exclusion parameters strictly.",
                        logo: "GRS Sourced",
                        detailLabel: "RECYCLED UNION"
                      },
                      {
                        name: "ISO 9001:2015 Quality Management",
                        desc: "Documented processing audits which cover engineering specs, electrical building grids, and final pallet checks.",
                        fullText: "The ISO 9001 registration confirms structural operational excellence encompassing direct pre-production yarn screening, inline inspections, and electrical safety standards across partner mills.",
                        logo: "ISO 9001",
                        detailLabel: "CERTIFIED SYSTEM"
                      }
                    ];

                    const item = certItems[targetIdx];
                    const isActive = renderingPos === 1; // Middle card is the active slide focus

                    return (
                      <div
                        key={targetIdx}
                        className={`border rounded-2xl bg-white p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between text-left h-[260px] cursor-pointer shadow-2xs ${isActive
                            ? 'border-[#F15A24]/40 ring-1 ring-[#F15A24]/10 scale-102 shadow-md z-10'
                            : 'border-gray-150 opacity-40 md:opacity-60 hover:opacity-100 md:scale-98'
                          } ${renderingPos !== 1 ? 'hidden md:flex' : 'flex'}`}
                        onClick={() => {
                          if (!isActive) {
                            setCertIndex(targetIdx);
                          } else {
                            setSelectedMilestone({ year: "Certification", title: item.name, content: item.fullText });
                          }
                        }}
                        id={`cert-item-card-${targetIdx}`}
                      >
                        <div className="space-y-4">
                          {/* Logo graphics consistent with design */}
                          <div className="flex items-center justify-between">
                            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-center font-sans">
                              <span className="text-[10px] font-black text-emerald-800 leading-tight tracking-tighter">
                                {item.logo}
                              </span>
                            </div>
                            <span className="bg-gray-100 text-gray-650 font-mono font-bold text-[9px] px-2 py-0.5 rounded tracking-wide uppercase">
                              {item.detailLabel}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <h4 className="font-display font-extrabold text-gray-900 text-[15px] sm:text-base leading-snug tracking-tight font-sans">
                              {item.name}
                            </h4>
                            <p className="text-gray-500 text-xs leading-normal font-sans line-clamp-3">
                              {item.desc}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-[10px] text-gray-400 font-mono">CWS Portfolio Code</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMilestone({ year: "Certification", title: item.name, content: item.fullText });
                            }}
                            className="text-[#F15A24] text-[11px] font-bold hover:underline flex items-center gap-1 focus:outline-none"
                            id={`cert-readmore-btn-${targetIdx}`}
                          >
                            <span>Read More</span>
                            <span className="text-gray-400 font-normal">ⓘ</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right arrow */}
                <button
                  onClick={() => setCertIndex(prev => (prev + 1) % 7)}
                  className="p-2.5 sm:p-3 rounded-full border border-gray-200 bg-white text-gray-750 hover:bg-gray-50 active:scale-95 transition-all shadow-sm focus:outline-none shrink-0"
                  aria-label="Next Certification"
                  id="cert-next-button"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Dots tracker */}
              <div className="flex justify-center items-center gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map(idx => (
                  <button
                    key={idx}
                    onClick={() => setCertIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all focus:outline-none ${certIndex === idx ? 'bg-black scale-110' : 'bg-gray-300 hover:bg-gray-400'}`}
                    aria-label={`Go to certification ${idx + 1}`}
                    id={`cert-dot-${idx}`}
                  />
                ))}
              </div>
            </div>

            {/* 6. LOOKING TOWARDS 2030 (VIDEO EMBED AND CUSTOM CONTROLS) */}
            <div className="space-y-8 py-8" id="promise-video-section">
              <div className="text-center space-y-2">
                <h2 className="font-display font-extrabold text-[#111827] text-3xl sm:text-4xl tracking-tight">Looking towards 2030</h2>
              </div>

              {/* Beautiful custom styled frame wrapper representing interactive video */}
              <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-gray-200 bg-gray-950 aspect-video group" id="promise-video-player-frame">
                {/* Simulated/Real Video Frame element */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover select-none pointer-events-none"
                  src="https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054273b18f90ab10d9811cb8402ff7a&profile_id=139&oauth2_token_id=57447761"
                  loop
                  muted={isMuted}
                  playsInline
                  onTimeUpdate={handleTimeUpdate}
                />

                {/* Dark natural forest overlay cover visible when not playing or on hover pause */}
                {(!isVideoPlaying || videoProgress === 0) && (
                  <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center p-6 text-center space-y-6 z-10 transition-opacity duration-500">
                    {/* CWS Emblem Container */}
                    <motion.div
                      className="w-32 h-16 sm:w-40 sm:h-20 rounded-2xl bg-white/95 backdrop-blur-md flex items-center justify-center p-3 shadow-lg shadow-black/35 group-hover:scale-105 transition-transform cursor-pointer"
                      onClick={handlePlayPause}
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    >
                      <CWSLogo className="h-10 sm:h-12" />
                    </motion.div>

                    {/* Slogan font with beautiful fade-in entry */}
                    <div className="space-y-2 max-w-lg">
                      <h3 className="text-white text-2xl sm:text-4xl md:text-5xl font-extrabold font-display leading-tight tracking-tight px-4 shadow-black drop-shadow-md">
                        Working together,<br /> we will achieve our target
                      </h3>
                      <p className="text-gray-100 text-xs sm:text-sm font-sans tracking-wide">
                        Click the play trigger to view CWS 2030 Environmental Roadmap.
                      </p>
                    </div>

                    {/* Simple graphics matching flying birds in vector schema */}
                    <div className="absolute bottom-16 sm:bottom-24 right-10 opacity-30 select-none hidden sm:block pointer-events-none">
                      <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,2L14.5,7L19.5,8L15.5,12L16.5,17L12,14.5L7.5,17L8.5,12L4.5,8L9.5,7L12,2Z" className="hidden" />
                        {/* Realistic Bird SVGs */}
                        <path d="M10,4 C11,6 13,6 14,4 C15,6 17,6 18,4 C17,7 14,8 10,4 Z" />
                        <path d="M4,10 C5,11 6.5,11 7.2,10 C8,11 9.5,11 10.2,10 C9.5,12 7.2,13 4,10 Z" transform="scale(0.8) translate(5, 5)" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Controls overlay bar absolute position */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 sm:p-6 flex flex-col gap-3 group-hover:opacity-100 opacity-90 sm:opacity-50 transition-opacity duration-300 z-20">
                  {/* Slider duration progress bar seekable */}
                  <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
                    id="video-seek-track"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const width = rect.width;
                      const nextPercent = (clickX / width) * 100;
                      handleSeek(nextPercent);
                    }}
                  >
                    <div
                      className="bg-[#F15A24] h-full rounded-full transition-all relative"
                      style={{ width: `${videoProgress}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md border border-[#F15A24]" />
                    </div>
                  </div>

                  {/* Operational controls footer: play, time, volum, fullScreen */}
                  <div className="flex items-center justify-between text-white text-xs sm:text-sm font-mono select-none" id="video-footer-controls">
                    <div className="flex items-center gap-4">
                      {/* Play pausing button */}
                      <button
                        onClick={handlePlayPause}
                        className="hover:text-[#F15A24] transition-colors focus:outline-none"
                        aria-label={isVideoPlaying ? "Pause Video" : "Play Video"}
                        id="video-playback-toggle"
                      >
                        {isVideoPlaying ? <Pause className="w-4 h-4 fill-white hover:fill-[#F15A24]" /> : <Play className="w-4 h-4 fill-white hover:fill-[#F15A24]" />}
                      </button>

                      {/* Time indicators */}
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-200">
                        <span>
                          {(() => {
                            if (!videoRef.current) return '0:00';
                            const cur = videoRef.current.currentTime;
                            const m = Math.floor(cur / 60);
                            const s = Math.floor(cur % 60).toString().padStart(2, '0');
                            return `${m}:${s}`;
                          })()}
                        </span>
                        <span className="text-gray-400">/</span>
                        <span>
                          {(() => {
                            if (!videoRef.current || !videoRef.current.duration) return '2:55';
                            const dur = videoRef.current.duration;
                            const m = Math.floor(dur / 60);
                            const s = Math.floor(dur % 60).toString().padStart(2, '0');
                            return `${m}:${s}`;
                          })()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Speaker volume control */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleMuteToggle}
                          className="hover:text-[#F15A24] transition-colors focus:outline-none"
                          aria-label={isMuted ? "Unmute" : "Mute"}
                          id="video-mute-toggle"
                        >
                          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>

                        {/* Miniature volume slider */}
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={isMuted ? 0 : videoVolume}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setVideoVolume(val);
                            if (videoRef.current) {
                              videoRef.current.volume = val;
                              if (val > 0) {
                                videoRef.current.muted = false;
                                setIsMuted(false);
                              }
                            }
                          }}
                          className="w-12 sm:w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#F15A24] hidden sm:block"
                          aria-label="Volume Slider"
                        />
                      </div>

                      {/* Fullscreen button */}
                      <button
                        onClick={() => {
                          if (videoRef.current) {
                            if (videoRef.current.requestFullscreen) {
                              videoRef.current.requestFullscreen();
                            }
                          }
                        }}
                        className="hover:text-[#F15A24] transition-colors focus:outline-none"
                        aria-label="Fullscreen Video"
                        id="video-fullscreen-button"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ETHICAL MILESTONES / CERTIFICATIONS INTEGRATED ACTIVE DETAIL MODAL */}
            <AnimatePresence>
              {selectedMilestone && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-[#0E1B2D]/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 15 }}
                    className="max-w-md w-full bg-[#FFFDFB] rounded-3xl overflow-hidden shadow-2xl border border-gray-100 p-6 md:p-8 space-y-6 relative text-left"
                  >
                    {/* Close button */}
                    <button
                      onClick={() => setSelectedMilestone(null)}
                      className="absolute top-6 right-6 p-1.5 text-gray-450 hover:text-gray-650 rounded-full hover:bg-gray-50 transition-colors focus:outline-none"
                      aria-label="Close Modal"
                      id="milestone-modal-close"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="space-y-1.5">
                      <span className="text-xs font-mono font-bold tracking-widest text-[#F15A24] uppercase">
                        {selectedMilestone.year === "Certification" ? "GUIDELINE CERTIFICATE" : `${selectedMilestone.year} COMPLIANCE STEPS`}
                      </span>
                      <h3 className="font-display font-extrabold text-2xl text-gray-950 leading-tight">
                        {selectedMilestone.title}
                      </h3>
                    </div>

                    <p className="text-sm text-gray-650 leading-relaxed font-sans">
                      {selectedMilestone.content}
                    </p>

                    <div className="pt-2">
                      <button
                        onClick={() => setSelectedMilestone(null)}
                        className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs tracking-wide rounded-xl shadow-xs transition-colors focus:outline-none"
                        id="milestone-modal-confirm-close"
                      >
                        Close Detail Window
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* 360° IMMERSIVE VIRTUAL HUB PREVIEW MODAL */}
              {active360Hub && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-[#0A1121]/95 sm:bg-[#0A1121]/90 backdrop-blur-lg z-100 flex flex-col justify-between p-4 sm:p-8"
                >
                  <div className="flex justify-between items-center text-white border-b border-white/10 pb-4 max-w-5xl mx-auto w-full">
                    <div>
                      <h3 className="font-display font-black text-2xl tracking-tight text-white">360° Virtual Hub: CWS {active360Hub}</h3>
                      <p className="text-[10px] sm:text-xs text-[#F15A24] font-mono uppercase font-black tracking-widest mt-0.5">Clo3D Interactive Production Floor</p>
                    </div>
                    <button
                      onClick={() => setActive360Hub(null)}
                      className="p-2 sm:p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors focus:outline-none"
                      aria-label="Close 360 Viewer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Panorama view field */}
                  <div className="relative flex-1 overflow-hidden rounded-3xl bg-gray-950 my-4 sm:my-6 flex items-center justify-center max-w-5xl mx-auto w-full border border-white/10 shadow-2xl">
                    <div
                      className="absolute inset-y-0 h-full w-[250%] transition-transform ease-out duration-150"
                      style={{
                        backgroundImage: `url(${active360Hub === "Türkiye"
                            ? "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=1600"
                            : "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=1600"
                          })`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        transform: `translateX(${(panoramaOffset - 50) * -0.65}%)`
                      }}
                    />

                    {/* Shading gradient for real depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A1121]/50 via-transparent to-[#0A1121]/20 pointer-events-none" />

                    {/* Center floating HUD telemetry overlay */}
                    <div className="absolute bottom-6 bg-[#0A1121]/85 border border-white/10 px-5 sm:px-6 py-3 rounded-2xl text-center max-w-sm backdrop-blur-md mx-4 pointer-events-none select-none">
                      <span className="text-[10px] font-mono text-[#F15A24] font-bold block mb-1">TELEMETRY: INTEGRATED REACTION</span>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans">
                        Drag the navigation slider below to rotate and inspect the computerized tailoring tables, layout design racks, and laser fabric scanners.
                      </p>
                    </div>
                  </div>

                  {/* Drag Control Slider */}
                  <div className="max-w-xl mx-auto w-full space-y-4 text-center pb-6">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono tracking-widest uppercase">
                      <span>WEST WING / FABRIC STORAGE</span>
                      <span className="text-[#F15A24] font-bold">PANORAMA TELEPORT</span>
                      <span>EAST WING / DESIGN BAHL</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={panoramaOffset}
                      onChange={(e) => setPanoramaOffset(parseInt(e.target.value))}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#F15A24]"
                      aria-label="360 Panorama Drag"
                    />
                    <div className="text-[9px] sm:text-[10px] text-gray-500 font-sans tracking-wide">
                      *Optical feed sourced dynamically via high-precision cameras positioned inside active CWS hubs.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* COMPREHENSIVE SUB-PAGE: GLOBAL LOCATIONS */}
        {activeTab === 'locations' && (
          <motion.div
            key="locations"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16 text-center"
            id="global-locations-page"
          >
            {/* Title section */}
            <div className="space-y-2 mb-6">
              <h1 className="font-display font-extrabold text-[#111827] text-4xl sm:text-5xl tracking-tight text-center">Global Locations</h1>
            </div>

            {/* INTERACTIVE VECTOR WORLD MAP CONTAINER */}
            <div className="relative w-full max-w-5xl mx-auto overflow-hidden rounded-3xl bg-[#FAFAFA] border border-gray-150 p-4 sm:p-8 shadow-xs aspect-[2.1/1]" id="locations-map-card">
              {/* STYLIZED OUTLINE WORLD MAP SVG */}
              <svg className="w-full h-full text-gray-200 fill-[#E6E6E3] stroke-[#F5F5F3] stroke-width-[1.5]" viewBox="0 0 1000 480" xmlns="http://www.w3.org/2000/svg">
                {/* Horizontal & Vertical grid lines representing drafting meridians */}
                <g stroke="#EAEAEA" strokeWidth="0.5" strokeDasharray="3 4">
                  <line x1="0" y1="80" x2="1000" y2="80" />
                  <line x1="0" y1="160" x2="1000" y2="160" />
                  <line x1="0" y1="240" x2="1000" y2="240" />
                  <line x1="0" y1="320" x2="1000" y2="320" />
                  <line x1="0" y1="400" x2="1000" y2="400" />

                  <line x1="166" y1="0" x2="166" y2="480" />
                  <line x1="333" y1="0" x2="333" y2="480" />
                  <line x1="500" y1="0" x2="500" y2="480" />
                  <line x1="666" y1="0" x2="666" y2="480" />
                  <line x1="833" y1="0" x2="833" y2="480" />
                </g>

                {/* Continental outline path renders */}
                {/* North America */}
                <path d="M 120,120 C 140,90 180,90 220,100 C 240,105 250,130 270,130 C 290,130 300,160 280,185 C 265,200 240,190 225,210 C 210,225 190,235 180,260 C 170,285 150,280 145,235 C 140,215 120,215 105,195 C 90,175 85,145 120,120 Z" />
                {/* Greenland */}
                <path d="M 230,75 C 250,65 280,55 305,65 C 300,90 280,105 255,100 C 235,95 225,85 230,75 Z" />
                {/* South America */}
                <path d="M 190,270 C 210,280 235,295 250,315 C 265,335 270,365 255,405 C 235,460 205,485 190,475 C 178,465 175,415 165,365 C 155,315 175,280 190,270 Z" />
                {/* Africa */}
                <path d="M 410,245 C 450,215 495,220 515,245 C 540,275 550,315 535,335 C 515,365 495,415 470,430 C 455,440 445,415 443,375 C 431,345 405,325 400,305 C 395,285 395,265 410,245 Z" />
                {/* Eurasia */}
                <path d="M 365,195 C 390,145 430,125 470,115 C 550,110 620,100 700,105 C 780,110 860,115 910,145 C 895,185 850,205 830,235 C 815,255 810,280 785,295 C 755,315 740,290 710,265 C 690,250 650,255 620,260 C 590,265 550,250 520,240 C 485,230 455,235 410,215 C 385,205 360,210 365,195 Z" />
                {/* Australia */}
                <path d="M 760,375 C 790,360 835,360 855,380 C 860,400 845,430 825,440 C 805,450 775,435 760,415 C 750,395 745,385 760,375 Z" />
              </svg>

              {/* DYNAMIC WORLD PINS LAYER (pointer-events-auto for hover/clicks) */}
              <div className="absolute inset-0 pointer-events-none">
                {[
                  { country: "Egypt", left: 51.0, top: 43.5, label: "Egypt" },
                  { country: "Türkiye", left: 52.0, top: 35.5, label: "Türkiye" },
                  { country: "Bangladesh", left: 71.0, top: 45.8, label: "Bangladesh" },
                  { country: "India", left: 67.7, top: 49.2, label: "India" },
                  { country: "Pakistan", left: 65.4, top: 42.5, label: "Pakistan" }
                ].map((loc, idx) => {
                  const isActive = idx === activeLocationIndex;
                  return (
                    <div
                      key={loc.country}
                      className="absolute pointer-events-auto cursor-pointer flex flex-col items-center justify-center transition-all duration-300"
                      style={{ left: `${loc.left}%`, top: `${loc.top}%` }}
                      onClick={() => setActiveLocationIndex(idx)}
                      id={`map-pin-${loc.country.toLowerCase()}`}
                    >
                      {/* Floating Tooltip Callout above the currently selected pin */}
                      {isActive && (
                        <>
                          {/* Fine grey vertical connector line straight down to pin */}
                          <div className="absolute w-[1px] bg-gray-400 h-[36px] bottom-2.5 z-25 origin-bottom pointer-events-none" />

                          {/* White layout text box callout bubble */}
                          <div className="absolute bottom-[38px] bg-white border border-gray-200 px-4 py-1.5 rounded-xl shadow-md flex items-center z-30 transition-all duration-300 whitespace-nowrap pointer-events-auto">
                            <span className="text-gray-950 font-display font-extrabold text-[12px] sm:text-[13px] tracking-tight">
                              {loc.label}
                            </span>
                          </div>
                        </>
                      )}

                      {/* Concentric rings styled precisely */}
                      <div className="relative flex items-center justify-center w-8 h-8">
                        {isActive && (
                          <span className="absolute w-7 h-7 rounded-full bg-[#F15A24]/25 animate-ping" />
                        )}
                        <span className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-all ${isActive ? 'bg-[#F15A24] scale-120' : 'bg-gray-400 hover:bg-[#F15A24]'
                          }`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LOCATION CARDS SLIDER/CAROUSEL */}
            <div className="relative max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-6 py-6" id="locations-carousel-wrapper">

              {/* Previous carousel control button */}
              <button
                onClick={() => setActiveLocationIndex(prev => (prev - 1 + 5) % 5)}
                className="p-3 rounded-full border border-gray-250 bg-white text-gray-750 hover:bg-gray-50 active:scale-95 transition-all shadow-md focus:outline-none shrink-0"
                aria-label="Previous Location"
                id="location-carousel-prev"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
              </button>

              {/* Row centered deck container */}
              <div className="w-full grid grid-cols-1 md:grid-cols-5 gap-4 py-4 overflow-hidden px-1 items-stretch justify-center min-h-[460px]">
                {[
                  {
                    country: "Egypt",
                    city: "Alexandria",
                    address: "Alexandria (Production)",
                    flagCode: "Egypt",
                    has360: false,
                    activities: { production: true }
                  },
                  {
                    country: "Türkiye",
                    city: "Istanbul",
                    address: "Senlikkoy Mah. Florya Cad. Corner Plaza No: 67 Florya TR-34153 Istanbul",
                    flagCode: "Türkiye",
                    has360: true,
                    activities: { showroom: true, production: true, sourcing: true, design: true, bizDev: true }
                  },
                  {
                    country: "Bangladesh",
                    city: "Dhaka",
                    address: "89/1 Pragati Sharani (Cha), North Badda, Dhaka 1212",
                    flagCode: "Bangladesh",
                    has360: true,
                    activities: { showroom: true, production: true, sourcing: true, design: true, bizDev: true }
                  },
                  {
                    country: "India",
                    city: "Tirupur",
                    address: "8/3809 D1, JP Nagar 3rd Street, Koothampalayam Pirivu, PN Road, Pooluvapatti, Tirupur 641 602",
                    flagCode: "India",
                    has360: false,
                    activities: { showroom: true, production: true, sourcing: true, design: true }
                  },
                  {
                    country: "Pakistan",
                    city: "Lahore",
                    address: "Plot No. 99, Sardar Town, Bhobtian Raiwind Road, Lahore",
                    flagCode: "Pakistan",
                    has360: false,
                    activities: { showroom: true, production: true, sourcing: true }
                  }
                ].map((loc, idx) => {
                  const isActive = idx === activeLocationIndex;
                  const diff = Math.abs(idx - activeLocationIndex);

                  let scaleClass = "scale-92 border-gray-150 opacity-40 md:opacity-60 md:scale-95 bg-[#FAFBFB]";
                  let zIndexClass = "z-10";
                  let shadowClass = "shadow-2xs";

                  if (isActive) {
                    scaleClass = "scale-102 md:scale-105 border-[#F15A24]/35 ring-1 ring-[#F15A24]/10 bg-white z-20";
                    zIndexClass = "z-25 relative";
                    shadowClass = "shadow-lg md:shadow-xl";
                  } else if (diff === 1) {
                    scaleClass = "scale-96 border-gray-150 bg-white opacity-80 z-15";
                    shadowClass = "shadow-xs";
                  }

                  // Responsively hide inactive cards on mobile to prevent clutter
                  const mobileVisibleClass = isActive ? "flex" : "hidden md:flex";

                  const renderFlag = (flag: string) => {
                    switch (flag) {
                      case 'Egypt':
                        return (
                          <div className="w-14 h-9 border border-gray-200 rounded shadow-3xs overflow-hidden flex flex-col">
                            <div className="bg-[#C11B17] h-1/3 w-full" />
                            <div className="bg-white h-1/3 w-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#C29B38]" />
                            </div>
                            <div className="bg-black h-1/3 w-full" />
                          </div>
                        );
                      case 'Türkiye':
                        return (
                          <div className="w-14 h-9 border border-gray-200 rounded shadow-3xs overflow-hidden bg-[#E30A17] relative flex items-center justify-center">
                            <div className="relative w-4.5 h-4.5 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-white relative flex items-center justify-center mr-0.5">
                                <div className="w-2 h-2 bg-[#E30A17] rounded-full absolute -right-0.5" />
                              </div>
                              <span className="text-[7px] text-white absolute right-0 top-0.5 font-bold leading-none">★</span>
                            </div>
                          </div>
                        );
                      case 'Bangladesh':
                        return (
                          <div className="w-14 h-9 border border-gray-200 rounded shadow-3xs overflow-hidden bg-[#006a4e] relative pb-0.5">
                            <div className="w-4.5 h-4.5 rounded-full bg-[#f42a41] absolute top-1/2 left-[44%] -translate-x-1/2 -translate-y-1/2" />
                          </div>
                        );
                      case 'India':
                        return (
                          <div className="w-14 h-9 border border-gray-100 rounded shadow-3xs overflow-hidden flex flex-col">
                            <div className="bg-[#FF9933] h-1/3 w-full" />
                            <div className="bg-white h-1/3 w-full flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full border border-[#000080] flex items-center justify-center">
                                <div className="w-0.5 h-0.5 bg-[#000080] rounded-full" />
                              </div>
                            </div>
                            <div className="bg-[#128807] h-1/3 w-full" />
                          </div>
                        );
                      case 'Pakistan':
                        return (
                          <div className="w-14 h-9 border border-gray-200 rounded shadow-3xs overflow-hidden bg-[#115E3B] relative flex">
                            <div className="w-1/4 h-full bg-white" />
                            <div className="w-3/4 h-full relative flex items-center justify-center pr-1">
                              <div className="w-3 h-3 rounded-full bg-white relative">
                                <div className="w-2.5 h-2.5 bg-[#115E3B] rounded-full absolute -right-0.5 -top-0.5" />
                              </div>
                              <span className="text-[6px] text-white absolute right-1 top-1">★</span>
                            </div>
                          </div>
                        );
                      default:
                        return null;
                    }
                  };

                  const renderActivityDots = (activities: Record<string, boolean | undefined>) => {
                    const dotDetails = [
                      { key: 'showroom', label: 'Showroom', color: 'bg-rose-500' },
                      { key: 'production', label: 'Production', color: 'bg-emerald-500' },
                      { key: 'sourcing', label: 'Sourcing', color: 'bg-orange-500' },
                      { key: 'design', label: 'Design & Innovation', color: 'bg-teal-500' },
                      { key: 'bizDev', label: 'Business Development', color: 'bg-purple-500' }
                    ];
                    return (
                      <div className="grid grid-cols-2 gap-x-3 gap-y-3 py-3 max-w-[210px] mx-auto text-xs font-sans text-gray-700">
                        {dotDetails.map((dot) => {
                          const isActiveDot = !!activities[dot.key];
                          if (!isActiveDot) return null;
                          const isFullWidth = dot.key === 'bizDev';
                          return (
                            <div
                              key={dot.key}
                              className={`flex items-center gap-1.5 justify-center ${isFullWidth ? 'col-span-2 mt-0.5' : ''}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${dot.color} shrink-0`} />
                              <span className="text-[11px] font-semibold text-gray-650 tracking-tight leading-none whitespace-nowrap">
                                {dot.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  };

                  return (
                    <div
                      key={loc.country}
                      className={`border rounded-3xl p-5 sm:p-6 transition-all duration-500 ease-out flex flex-col justify-between text-center min-h-[440px] cursor-pointer relative ${scaleClass} ${zIndexClass} ${shadowClass} ${mobileVisibleClass}`}
                      onClick={() => setActiveLocationIndex(idx)}
                      id={`location-card-${loc.country.toLowerCase()}`}
                    >
                      {/* Flag placed perfectly centered on top border line */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                        {renderFlag(loc.flagCode)}
                      </div>

                      {/* Header info */}
                      <div className="pt-4 space-y-1">
                        <h3 className="font-display font-extrabold text-gray-900 text-2xl tracking-tight leading-none">
                          {loc.country}
                        </h3>
                        <p className="text-gray-400 text-xs font-sans tracking-wide">
                          {loc.city}
                        </p>
                      </div>

                      {/* Activity indicators dynamically selected columns */}
                      <div className="flex-1 flex items-center justify-center my-2">
                        {renderActivityDots(loc.activities)}
                      </div>

                      {/* Operational CTA Buttons stacked */}
                      <div className="space-y-2.5 pt-4 border-t border-gray-50 flex flex-col items-center justify-end">
                        {/* Primary RFQ Direct button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setContactForm(prev => ({
                              ...prev,
                              destination: loc.country === "Türkiye" ? "Turkey" : loc.country,
                              message: `Dear CWS ${loc.country} Team, we would like to inquire about sustainable sourcing and services in ${loc.city}.`
                            }));
                            setIsContactOpen(true);
                          }}
                          className="w-full py-2 bg-[#24426F] hover:bg-[#1a3152] active:scale-98 text-white font-bold text-xs rounded-full transition-all focus:outline-none shadow-3xs"
                          id={`btn-contact-${loc.country.toLowerCase()}`}
                        >
                          Contact
                        </button>

                        {/* Interactive virtual tour activation */}
                        {loc.has360 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPanoramaOffset(50);
                              setActive360Hub(loc.country);
                            }}
                            className="w-full py-2 bg-[#24426F] hover:bg-[#1a3152] active:scale-98 text-white font-bold text-xs rounded-full transition-all focus:outline-none shadow-3xs"
                            id={`btn-360-${loc.country.toLowerCase()}`}
                          >
                            360° View
                          </button>
                        )}
                      </div>

                      {/* Compact text footprint alignment address */}
                      <div className="pt-4 text-[11px] text-gray-500 leading-normal font-sans max-w-[190px] mx-auto min-h-[54px] flex items-center justify-center">
                        <p className="line-clamp-3">{loc.address}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Next carousel control button */}
              <button
                onClick={() => setActiveLocationIndex(prev => (prev + 1) % 5)}
                className="p-3 rounded-full border border-gray-250 bg-white text-gray-750 hover:bg-gray-50 active:scale-95 transition-all shadow-md focus:outline-none shrink-0"
                aria-label="Next Location"
                id="location-carousel-next"
              >
                <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* INTEGRATED SLIDER CIRCLE DOT TRACKER */}
            <div className="flex justify-center items-center gap-2.5 py-4" id="locations-dot-indicator-bar">
              {[0, 1, 2, 3, 4].map((idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveLocationIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all focus:outline-none ${activeLocationIndex === idx ? 'bg-black scale-120' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  aria-label={`Go to location slide ${idx + 1}`}
                  id={`locations-dot-${idx}`}
                />
              ))}
            </div>

            {/* FAST TAB HORIZONTAL BAR LINKS BOTTOM */}
            <div className="border-t border-gray-150 pt-6 max-w-xl mx-auto flex justify-center items-center gap-4 sm:gap-6 flex-wrap font-sans text-xs sm:text-sm text-gray-500 text-normal select-none">
              {["Egypt", "Türkiye", "Bangladesh", "India", "Pakistan"].map((countryName, idx) => {
                const isActive = idx === activeLocationIndex;
                return (
                  <button
                    key={countryName}
                    onClick={() => setActiveLocationIndex(idx)}
                    className={`focus:outline-none pb-1 transition-all ${isActive
                        ? 'text-black font-extrabold border-b border-black'
                        : 'text-gray-500 font-medium hover:text-black'
                      }`}
                    id={`locations-tab-btn-${countryName.toLowerCase()}`}
                  >
                    {countryName}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* COMPREHENSIVE SUB-PAGE: NEWSFEED */}
        {activeTab === 'news' && (
          <motion.div
            key="news"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10"
          >
            {/* Page Header */}
            <div className="space-y-2 border-b border-gray-100 pb-6">
              <span className="text-xs font-mono font-bold tracking-widest text-[#F15A24] uppercase block">
                CWS GLOBAL PRESSROOM
              </span>
              <h1 className="font-display font-black text-[#111827] text-4xl tracking-tight">
                Newsfeed & Corporate Announcements
              </h1>
              <p className="text-gray-500 text-sm max-w-xl font-medium">
                Official publications regarding our material innovations, digital 3D apparel developments, carbon metrics, and direct buying group achievements.
              </p>
            </div>

            {/* Three-Column Grid: Left 2 cols for newsfeed grid, Right 1 col for Social Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* NEWSFEED MAIN CARDS (LEFT 2 COLUMNS) */}
              <div className="lg:col-span-2 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {NEWSFEED_ITEMS.slice((currentPage - 1) * 10, currentPage * 10).map((n) => (
                    <motion.div
                      key={n.id}
                      onClick={() => setSelectedNews(n)}
                      whileHover={{ y: -4 }}
                      className="relative min-h-[360px] rounded-2xl overflow-hidden border border-gray-150/40 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between p-6 cursor-pointer group"
                    >
                      {/* Cover underlay design */}
                      <div
                        className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                        style={{ backgroundImage: `url(${n.bgStyle.unsplashUrl})` }}
                      />
                      {/* Deep darken/color matching gradient overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-b ${n.bgStyle.overlayGradient} opacity-92 group-hover:opacity-88 transition-opacity pointer-events-none`} />

                      {/* Top Header metadata */}
                      <div className="relative z-10 flex justify-between items-start">
                        <span className="bg-white/10 backdrop-blur-xs border border-white/15 text-[9px] font-mono font-extrabold uppercase tracking-widest text-white px-2.5 py-1 rounded-full">
                          {n.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-300 font-medium">
                          {n.readTime}
                        </span>
                      </div>

                      {/* Content block aligned at bottom */}
                      <div className="relative z-10 space-y-3 mt-16">
                        <span className="text-[10px] sm:text-[11px] text-[#F15A24] font-mono font-extrabold uppercase tracking-widest block leading-none">
                          {n.author} | {n.date}
                        </span>
                        <h3 className="font-display font-black text-white text-lg tracking-tight leading-snug group-hover:text-amber-400 transition-colors">
                          {n.title}
                        </h3>
                        <p className="text-xs text-slate-205 line-clamp-3 leading-relaxed font-sans font-medium text-slate-200">
                          {n.excerpt}
                        </p>

                        {/* Tag list */}
                        <div className="flex flex-wrap gap-1 pt-1.5 overflow-hidden max-h-[46px] select-none pointer-events-none">
                          {n.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="text-[8.5px] font-mono font-bold text-slate-350 bg-white/5 hover:bg-white/10 border border-white/5 px-1.5 py-0.5 rounded tracking-tight transition-colors"
                            >
                              {tag}
                            </span>
                          ))}
                          {n.tags.length > 4 && (
                            <span className="text-[8px] font-mono font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                              +{n.tags.length - 4}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Button footer trigger */}
                      <div className="relative z-10 pt-4 mt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[10.5px] font-mono font-black text-[#F15A24] group-hover:underline flex items-center gap-1">
                          Read more <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* PAGINATION NAVIGATION TRACKER */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100 font-mono text-xs select-none">
                  <div className="text-gray-400">
                    Showing <span className="font-bold text-gray-700">{currentPage === 1 ? '1-10' : '11-20'}</span> of <span className="font-bold text-gray-700">20</span> innovations
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Page links */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setCurrentPage(1)}
                        className={`transition-all pb-0.5 focus:outline-none ${currentPage === 1
                            ? 'text-[#F15A24] font-black border-b-2 border-[#F15A24] text-sm'
                            : 'text-gray-500 hover:text-gray-800 font-bold'
                          }`}
                      >
                        1
                      </button>
                      <button
                        onClick={() => setCurrentPage(2)}
                        className={`transition-all pb-0.5 focus:outline-none ${currentPage === 2
                            ? 'text-[#F15A24] font-black border-b-2 border-[#F15A24] text-sm'
                            : 'text-gray-500 hover:text-gray-800 font-bold'
                          }`}
                      >
                        2
                      </button>
                    </div>

                    {/* Next control */}
                    <button
                      onClick={() => setCurrentPage(prev => (prev === 1 ? 2 : prev))}
                      disabled={currentPage === 2}
                      className={`font-bold transition-colors focus:outline-none ${currentPage === 2 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-800 hover:text-[#F15A24]'
                        }`}
                    >
                      Next &gt;
                    </button>

                    {/* Last control */}
                    <button
                      onClick={() => setCurrentPage(2)}
                      disabled={currentPage === 2}
                      className={`font-bold transition-colors focus:outline-none ${currentPage === 2 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-800 hover:text-[#F15A24]'
                        }`}
                    >
                      Last &gt;&gt;
                    </button>
                  </div>
                </div>
              </div>

              {/* SOCIAL TIMELINE COL (RIGHT 1 COLUMN) */}
              <div className="lg:col-span-1 space-y-6">
                {/* Header widget design */}
                <div className="bg-[#0A1121] rounded-2xl p-5 border border-white/5 space-y-2 text-white shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-widest uppercase font-black text-[#F15A24]">GLOBAL NETWORK FEED</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <h2 className="font-display font-black text-xl tracking-tight text-white leading-none">
                    Our Social Feed
                  </h2>
                  <p className="text-[11px] text-slate-305 text-slate-300 leading-relaxed font-sans">
                    Announcements, team insights, and sustainability developments from our operational channels. Hit like to support!
                  </p>
                </div>

                {/* Scrollable feed feed array */}
                <div className="space-y-6 max-h-[950px] overflow-y-auto pr-1">
                  {SOCIAL_POSTS.slice(0, socialFeedLimit).map((post) => {
                    const isLiked = likedPosts[post.id];
                    const count = socialLikes[post.id] || post.likes;

                    return (
                      <div
                        key={post.id}
                        className="bg-white rounded-2xl border border-gray-150 p-5 space-y-4 hover:shadow-md transition-shadow"
                      >
                        {/* Post Header */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00539C] to-[#0097D7] flex items-center justify-center font-display font-black text-[11px] text-white uppercase select-none">
                              cws
                            </div>
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="font-display font-extrabold text-[13px] text-gray-950 tracking-tight leading-none uppercase">
                                  {post.author}
                                </span>
                                {/* Small inline blue checkmark verified shield style */}
                                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center text-white" style={{ fontSize: '7px' }}>
                                  ✔
                                </span>
                              </div>
                              <span className="text-[9.5px] font-mono text-gray-400 font-medium block mt-0.5">
                                {post.date}
                              </span>
                            </div>
                          </div>

                          {/* LinkedIn vector brand logo trigger */}
                          <a
                            href="https://linkedin.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-slate-50 rounded-full text-blue-600 transition-colors focus:outline-none"
                            aria-label="LinkedIn Profile"
                          >
                            <Linkedin className="w-4 h-4 fill-blue-600 stroke-none" />
                          </a>
                        </div>

                        {/* Text Caption content */}
                        <p className="text-xs text-gray-700 leading-relaxed font-sans">
                          {post.text}
                        </p>

                        {/* Interactive dynamic media player / vector banner inside feed */}
                        {post.extraVisualType === 'extreme-weather' && (
                          <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-gray-100/50 shadow-inner flex flex-col justify-between p-5 select-none font-sans">
                            <div
                              className="absolute inset-0 bg-cover bg-center opacity-85 transition-transform duration-700 hover:scale-105"
                              style={{ backgroundImage: `url(${post.image})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/30" />
                            <div className="relative z-10 flex flex-col h-full justify-between">
                              <span className="text-[9px] font-mono text-[#F15A24] bg-[#F15A24]/10 border border-[#F15A24]/20 px-1.5 py-0.5 rounded self-start font-black">
                                climate change
                              </span>
                              <div className="space-y-1.5 text-center my-auto py-2">
                                <p className="text-xl sm:text-2xl font-display font-black tracking-widest text-[#F15A24] uppercase drop-shadow-md">Too Wet</p>
                                <div className="h-[1px] w-8 bg-white/20 mx-auto" />
                                <p className="text-xl sm:text-2xl font-display font-black tracking-widest text-[#F15A24] uppercase drop-shadow-md">Too Dry</p>
                                <div className="h-[1px] w-8 bg-white/20 mx-auto" />
                                <p className="text-xl sm:text-2xl font-display font-black tracking-widest text-[#F15A24] uppercase drop-shadow-md">Too Hot</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] font-mono text-slate-350 font-bold uppercase tracking-widest leading-none">The planet is sending us</p>
                                <h4 className="text-2xl font-display font-black text-white uppercase tracking-tight mt-1">Signals</h4>
                                {/* Waveform spark animation graphic */}
                                <div className="flex items-center justify-center gap-0.5 mt-2.5">
                                  {[1, 2, 4, 3, 2, 1, 3, 5, 2, 3, 2, 4, 2, 3, 1].map((h, i) => (
                                    <span key={i} className="w-[1.5px] bg-[#F15A24] rounded-full" style={{ height: `${h * 4.5}px` }} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {post.extraVisualType === 'eid-mubarak' && (
                          <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-gray-100 shadow-inner flex flex-col justify-between p-5 select-none font-sans">
                            <div
                              className="absolute inset-0 bg-cover bg-center opacity-70 transition-transform duration-700 hover:scale-105"
                              style={{ backgroundImage: `url(${post.image})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-purple-950/60 to-slate-950" />
                            <div className="relative z-10 flex flex-col h-full justify-between items-center py-4 text-center">
                              <span className="text-[9px] font-mono font-bold tracking-widest text-[#FEB300] bg-orange-950/40 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">
                                cws global
                              </span>
                              <div className="space-y-2">
                                <h4 className="text-2xl font-display font-black text-white tracking-wide">Eid Mubarak</h4>
                                <p className="text-[10px] text-zinc-300 leading-relaxed font-sans max-w-[180px] mt-1 mx-auto font-medium">
                                  May the true spirit of sacrifice guide us towards growth and kindness
                                </p>
                              </div>
                              <div className="text-[9.5px] font-mono text-zinc-400 tracking-wider">
                                Global Diversity Sourced Together
                              </div>
                            </div>
                          </div>
                        )}

                        {post.extraVisualType === 'journey' && (
                          <div className="relative aspect-[1.3/1] rounded-2xl overflow-hidden bg-blue-950 border border-gray-100 shadow-inner flex flex-col justify-between p-4 select-none font-sans">
                            <div
                              className="absolute inset-0 bg-cover bg-center opacity-65 transition-transform duration-700 hover:scale-105"
                              style={{ backgroundImage: `url(${post.image})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 via-slate-950/30 to-blue-950/90" />
                            <div className="relative z-10 flex flex-col h-full justify-between">
                              <div className="text-center">
                                <span className="text-[8px] font-mono text-sky-400 font-black uppercase tracking-wider block">JOURNEY OF EXCELLENCE</span>
                                <div className="h-[1px] w-16 bg-[#F15A24] mx-auto mt-1" />
                              </div>

                              {/* Operation scale metrics box row */}
                              <div className="grid grid-cols-3 gap-1 py-1.5 bg-black/45 backdrop-blur-xs rounded-xl border border-white/5 mx-2 text-center">
                                <div>
                                  <p className="text-[11px] font-black text-white font-mono">2,500+</p>
                                  <p className="text-[7.5px] text-gray-300 font-sans tracking-tight">Employees</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-black text-white font-mono">200+</p>
                                  <p className="text-[7.5px] text-gray-300 font-sans tracking-tight">Partners</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-black text-[#F15A24] font-mono">15M/m</p>
                                  <p className="text-[7.5px] text-gray-300 font-sans tracking-tight">Capacity</p>
                                </div>
                              </div>

                              <div className="text-center space-y-0.5">
                                <p className="text-base font-display font-black text-white uppercase tracking-tight">Infinite Possibilities</p>
                                <p className="text-[8px] font-mono text-sky-300 uppercase tracking-widest">Rising Brighter with a Vision</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {post.extraVisualType === 'workers-day' && (
                          <div className="relative aspect-square rounded-2xl overflow-hidden bg-sky-950 border border-gray-100 shadow-inner flex flex-col justify-between p-5 select-none font-sans text-center">
                            <div
                              className="absolute inset-0 bg-cover bg-center opacity-70 transition-transform duration-700 hover:scale-105"
                              style={{ backgroundImage: `url(${post.image})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-sky-950/70" />
                            <div className="relative z-10 flex flex-col h-full justify-between items-center py-4">
                              <span className="text-[9px] font-mono text-amber-500 bg-amber-950/40 border border-amber-500/25 px-2 py-0.5 rounded-full tracking-widest uppercase font-bold">
                                cws craft
                              </span>
                              <div className="space-y-1">
                                <h4 className="text-xl font-display font-medium text-amber-500 tracking-wider">May 1st</h4>
                                <p className="text-[10px] text-orange-200 tracking-widest font-mono uppercase font-black">Happy International</p>
                                <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight leading-none mt-1">Workers' Day</h3>
                              </div>
                              <p className="text-[9px] text-slate-350 font-medium leading-none">
                                Honouring the hands that weave magic
                              </p>
                            </div>
                          </div>
                        )}

                        {post.extraVisualType === 'wellbeing' && (
                          <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-gray-100 shadow-inner flex flex-col justify-between p-5 select-none font-sans">
                            <div
                              className="absolute inset-0 bg-cover bg-center opacity-65 transition-transform duration-700 hover:scale-105"
                              style={{ backgroundImage: `url(${post.image})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-900/30" />
                            <div className="relative z-10 flex flex-col h-full justify-between">
                              <span className="text-[8.5px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-0.5 rounded-full self-start font-black uppercase">
                                health & safety
                              </span>
                              <div className="space-y-1 bg-black/30 backdrop-blur-xs p-3 rounded-xl border border-white/5 mx-1">
                                <p className="text-[13px] font-display font-black text-white leading-tight">Wellbeing grows</p>
                                <p className="text-[9.5px] text-slate-300 font-sans leading-snug font-medium">
                                  when workplaces are designed for people, not just roles.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {post.extraVisualType === 'power-planet-people' && (
                          <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-gray-100 shadow-inner flex flex-col justify-between p-5 select-none font-sans text-center">
                            <div
                              className="absolute inset-0 bg-cover bg-center opacity-75 transition-transform duration-700 hover:scale-105"
                              style={{ backgroundImage: `url(${post.image})` }}
                            />
                            <div className="absolute inset-0 bg-[#0F172A]/70 mix-blend-multiply pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/95 via-transparent to-slate-950/80 pointer-events-none" />
                            <div className="relative z-10 flex flex-col h-full justify-between items-center py-4">
                              <span className="text-[9px] font-mono text-[#F15A24] bg-orange-950/40 border border-orange-500/20 px-2 py-0.5 rounded-full tracking-widest uppercase font-black">
                                ECO SUSTAIN
                              </span>
                              <div className="space-y-1">
                                <h3 className="text-2xl font-display font-black text-white tracking-widest uppercase">POWER.</h3>
                                <h3 className="text-2xl font-display font-black text-[#F15A24] tracking-widest uppercase">PLANET.</h3>
                                <h3 className="text-2xl font-display font-black text-emerald-400 tracking-widest uppercase">PEOPLE.</h3>
                              </div>
                              <div className="space-y-0.5 mt-2">
                                <p className="text-[9.5px] font-sans font-bold text-slate-100">Our partners LEAD with purpose</p>
                                <p className="text-[8px] font-mono text-emerald-300 uppercase tracking-widest">April 22 • Earth Day 2026</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Interactive reaction action bar footer */}
                        <div className="flex items-center gap-6 pt-3 border-t border-gray-100 font-sans text-xs select-none">
                          <button
                            onClick={() => handleLikeToggle(post.id)}
                            className={`flex items-center gap-1.5 transition-colors focus:outline-none ${isLiked ? 'text-red-500 font-bold' : 'text-gray-500 hover:text-red-500'
                              }`}
                          >
                            <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                            <span>{count}</span>
                          </button>

                          <button className="flex items-center gap-1.5 text-gray-500 hover:text-[#F15A24] focus:outline-none">
                            <MessageSquare className="w-4 h-4 text-gray-400" />
                            <span>{post.commentsCount}</span>
                          </button>

                          <button
                            onClick={() => {
                              try {
                                navigator.clipboard.writeText(`https://cwsco.com/news#${post.id}`);
                                alert("Corporate post link copied to clipboard!");
                              } catch {
                                alert("Link anchor set!");
                              }
                            }}
                            className="flex items-center gap-1.5 text-gray-500 hover:text-[#F15A24] focus:outline-none ml-auto"
                            aria-label="Share Post Anchor"
                          >
                            <Send className="w-4 h-4 text-gray-400" />
                            <span className="text-[10px] font-mono uppercase tracking-widest font-black">Share</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Social media "Load More" controls dynamically updating view length */}
                <div className="text-center pt-2 select-none">
                  {socialFeedLimit < SOCIAL_POSTS.length ? (
                    <button
                      onClick={() => setSocialFeedLimit(prev => Math.min(prev + 2, SOCIAL_POSTS.length))}
                      className="w-full py-3 bg-[#FAFAFA] hover:bg-[#F0F0F0] border border-gray-200/80 rounded-2xl font-mono text-[11px] font-extrabold uppercase tracking-widest text-slate-800 transition-colors focus:outline-none"
                    >
                      Load More
                    </button>
                  ) : (
                    <div className="py-2.5 text-center text-[10px] font-mono uppercase tracking-wide text-gray-400">
                      * All brand channels synchronized successfully.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ARTICULAR NEWS DETAILS READER LAYER MODAL */}
            <AnimatePresence>
              {selectedNews && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-110 flex items-center justify-center p-4 overflow-y-auto"
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 15 }}
                    className="bg-white rounded-3xl max-w-2xl w-full border border-gray-150 shadow-2xl overflow-hidden flex flex-col justify-between"
                  >
                    {/* Header Image cover banner inside reader */}
                    <div className="relative h-48 sm:h-56 bg-slate-900 overflow-hidden flex flex-col justify-end p-6">
                      <div
                        className="absolute inset-0 bg-cover bg-center pointer-events-none filter brightness-75 bg-indigo-950"
                        style={{ backgroundImage: `url(${selectedNews.bgStyle.unsplashUrl})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-black/20" />

                      <div className="relative z-10 space-y-1">
                        <span className="bg-[#F15A24] text-white text-[9px] font-mono font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full">
                          {selectedNews.category}
                        </span>
                        <h3 className="text-white font-display font-black text-2xl tracking-tight leading-snug drop-shadow-sm pt-2">
                          {selectedNews.title}
                        </h3>
                      </div>
                    </div>

                    {/* Metadata strip and body reading pane */}
                    <div className="p-6 sm:p-8 space-y-6">
                      {/* Author & publish info */}
                      <div className="flex items-center justify-between text-xs font-mono border-b border-gray-100 pb-4 select-none">
                        <div>
                          <span className="text-gray-400">Written by:</span>
                          <span className="ml-1 font-extrabold text-[#F15A24] uppercase">{selectedNews.author}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Published:</span>
                          <span className="ml-1 font-bold text-gray-700">{selectedNews.date}</span>
                        </div>
                      </div>

                      {/* Content block content */}
                      <div className="font-sans text-xs sm:text-sm text-gray-600 leading-relaxed space-y-4">
                        <p className="font-bold text-gray-800 text-sm">
                          {selectedNews.excerpt}
                        </p>
                        <p>
                          CWS International maintains strict compliance guidelines and quality metrics with global certifying bureaus. Moving into early 2026, we have successfully completed integration phases featuring automated material logistics networks and localized production channels to better serve high-tier buying partnerships.
                        </p>
                        <p>
                          By introducing advanced pre-production virtual lab tailoring through CLO3D suites, our global factories can mitigate layout waste and material dye mismatches ahead of physical industrial runs, creating a durable and highly predictable global delivery pipeline.
                        </p>
                      </div>

                      {/* Complete hashtag drawer */}
                      <div className="flex flex-wrap gap-1.5 pt-4 border-t border-gray-100 select-none">
                        {selectedNews.tags.map(t => (
                          <span
                            key={t}
                            className="bg-slate-50 hover:bg-[#F15A24]/10 text-slate-500 hover:text-[#F15A24] border border-gray-200 hover:border-[#F15A24]/20 transition-all font-mono text-[9px] font-extrabold tracking-tight px-2 py-0.5 rounded"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Reader Close footer action */}
                    <div className="bg-slate-50 px-6 sm:px-8 py-4 border-t border-gray-100 flex justify-end gap-3 select-none">
                      <button
                        onClick={() => {
                          try {
                            navigator.clipboard.writeText(`https://cwsco.com/news#${selectedNews.id}`);
                            alert("Corporate post link copied to clipboard!");
                          } catch {
                            alert("Link copied!");
                          }
                        }}
                        className="py-2.5 px-4 bg-white hover:bg-slate-100 border border-gray-250 rounded-xl font-mono text-[10px] font-black uppercase tracking-widest text-[#1E293B] transition-colors focus:outline-none"
                      >
                        Copy Share Link
                      </button>
                      <button
                        onClick={() => setSelectedNews(null)}
                        className="py-2.5 px-6 bg-[#0A1121] hover:bg-[#1E293B] text-white rounded-xl font-mono text-[10px] font-black uppercase tracking-widest transition-colors focus:outline-none"
                      >
                        Close Reader
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}

        {/* COMPREHENSIVE SUB-PAGE: CONTACT US */}
        {activeTab === 'contact' && (
          <motion.div
            key="contact-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative font-sans bg-[#FAFBFD] py-16 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-[90vh]"
          >
            {/* High-fidelity Connection Coordinates map background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20 md:opacity-30 select-none">
              <svg className="absolute w-full h-full text-slate-300" fill="none" viewBox="0 0 1200 650" preserveAspectRatio="none">
                {/* Grid matrix */}
                <path d="M 0,50 L 1200,50 M 0,150 L 1200,150 M 0,250 L 1200,250 M 0,350 L 1200,350 M 0,450 L 1200,450 M 0,550 L 1200,550" stroke="currentColor" strokeWidth="0.25" strokeDasharray="3 3" />
                <path d="M 100,0 L 100,650 M 200,0 L 200,650 M 300,0 L 300,650 M 400,0 L 400,650 M 500,0 L 500,650 M 600,0 L 600,650 M 700,0 L 700,650 M 800,0 L 800,650 M 900,0 L 900,650 M 1000,0 L 1000,650 M 1100,0 L 1100,650" stroke="currentColor" strokeWidth="0.25" strokeDasharray="3 3" />

                {/* Stylized minimal dotted continents outline */}
                <g fill="currentColor" opacity="0.3">
                  {/* North America dots */}
                  <circle cx="150" cy="180" r="1.5" /><circle cx="170" cy="160" r="1.5" /><circle cx="190" cy="150" r="2" /><circle cx="210" cy="170" r="1.5" /><circle cx="230" cy="190" r="2" /><circle cx="250" cy="210" r="1.5" /><circle cx="270" cy="230" r="2" />
                  {/* Europe & Africa dots */}
                  <circle cx="550" cy="170" r="2" /><circle cx="570" cy="160" r="1.5" /><circle cx="590" cy="180" r="2.5" /><circle cx="610" cy="200" r="2" /><circle cx="630" cy="220" r="1.5" /><circle cx="590" cy="260" r="2" /><circle cx="600" cy="300" r="1.5" /><circle cx="620" cy="340" r="2" /><circle cx="640" cy="380" r="1.5" /><circle cx="660" cy="420" r="2" />
                  {/* Asia/Middle East dots */}
                  <circle cx="680" cy="210" r="2" /><circle cx="700" cy="190" r="2" /><circle cx="720" cy="170" r="2.5" /><circle cx="740" cy="180" r="1.5" /><circle cx="760" cy="200" r="2" /><circle cx="780" cy="220" r="2.5" /><circle cx="800" cy="240" r="2" /><circle cx="820" cy="260" r="1.5" /><circle cx="840" cy="280" r="2" /><circle cx="860" cy="300" r="1.5" />
                  <circle cx="750" cy="250" r="2" /><circle cx="770" cy="270" r="2" /><circle cx="790" cy="290" r="1.5" /><circle cx="810" cy="310" r="2" />
                </g>

                {/* Regional office indicators connected by arcs */}
                <g className="text-[#F15A24]" opacity="0.8">
                  {/* Dhaka Hub */}
                  <circle cx="780" cy="260" r="5" fill="currentColor" />
                  <circle cx="780" cy="260" r="11" stroke="currentColor" strokeWidth="0.5" className="animate-pulse" />

                  {/* Istanbul Lab */}
                  <circle cx="610" cy="190" r="4.5" fill="currentColor" />

                  {/* Alexandria Office */}
                  <circle cx="590" cy="240" r="4" fill="currentColor" />

                  {/* Dubai HQ */}
                  <circle cx="660" cy="250" r="4.5" fill="currentColor" />

                  {/* Fine connection curves */}
                  <path d="M610 190 Q685 220 780 260" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
                  <path d="M590 240 Q625 245 660 250" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
                  <path d="M660 250 Q720 255 780 260" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
                </g>
              </svg>
            </div>

            {/* Origami Paper Airplane Decor matching screenshot */}
            <motion.div
              className="absolute top-16 right-[15%] hidden lg:block z-10"
              initial={{ x: 60, y: 15, opacity: 0 }}
              animate={{ x: 0, y: [0, -10, 0], opacity: 1 }}
              transition={{
                x: { duration: 1.2, ease: "easeOut" },
                y: { repeat: Infinity, duration: 6, ease: "easeInOut" }
              }}
            >
              <svg className="w-56 h-36 drop-shadow-md" viewBox="0 0 160 110" fill="none">
                {/* Origami warm beige folds representing geometric kraft paper plane */}
                <path d="M10 50L150 15L90 100L75 65L10 50Z" fill="#E6D5C3" />
                <path d="M75 65L150 15L90 100" fill="#D2BAA3" />
                <path d="M75 65L65 85L90 100L75 65Z" fill="#C4AA90" />
                {/* Underbody dark shading */}
                <path d="M10 50L75 65L65 85L10 50Z" fill="#B3937B" opacity="0.3" />
              </svg>
            </motion.div>

            {/* Centered Page Header Block */}
            <div className="relative z-10 text-center max-w-2xl mx-auto mb-10 space-y-2 select-none">
              <h1 className="font-display font-extrabold text-[44px] md:text-[54px] text-gray-950 tracking-tight leading-none mb-1 text-center">
                Contact us
              </h1>
              <h2 className="font-display font-bold text-gray-800 text-lg md:text-xl tracking-tight text-center">
                How can we help?
              </h2>
            </div>

            {/* Main Interactive Form Card Container */}
            <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl shadow-slate-200/40 border border-gray-150/45 p-8 md:p-10 relative z-10">

              <AnimatePresence mode="wait">
                {!pageContactSubmitted ? (
                  <motion.div
                    key="page-contact-form"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mb-8 border-b border-gray-100 pb-5">
                      <h3 className="font-display font-extrabold text-[#111827] text-2xl tracking-tight mb-1.5 text-left">
                        Email Request Form
                      </h3>
                      <p className="text-gray-500 font-medium text-xs leading-relaxed max-w-lg text-left">
                        Please use the form below to send us your query. Our team will respond within 24 hours.
                      </p>
                    </div>

                    <form onSubmit={handlePageContactSubmit} className="space-y-6">
                      {/* Name & Company Name side by side */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5 text-left">
                          <label className="text-xs font-bold text-gray-850">Name : *</label>
                          <input
                            type="text"
                            required
                            value={contactPageForm.name}
                            onChange={(e) => setContactPageForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Your full name"
                            className="w-full bg-white border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 text-xs text-gray-800 outline-none transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="text-xs font-bold text-gray-850">Company Name :</label>
                          <input
                            type="text"
                            value={contactPageForm.companyName}
                            onChange={(e) => setContactPageForm(prev => ({ ...prev, companyName: e.target.value }))}
                            placeholder="Your brand or organization"
                            className="w-full bg-white border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 text-xs text-gray-800 outline-none transition-colors"
                          />
                        </div>
                      </div>

                      {/* Email Address */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold text-gray-850">Email Address : *</label>
                        <input
                          type="email"
                          required
                          value={contactPageForm.email}
                          onChange={(e) => setContactPageForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="client@company.dev"
                          className="w-full bg-white border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 text-xs text-gray-800 outline-none transition-colors"
                        />
                      </div>

                      {/* Phone Number & Enquiry Reason side by side */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5 text-left">
                          <label className="text-xs font-bold text-gray-850">Phone Number :</label>
                          <div className="flex items-center gap-2">
                            {/* Dial flag select dropdown */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setIsPhoneCountryDropdownOpen(!isPhoneCountryDropdownOpen)}
                                className="flex items-center gap-1 bg-white border border-gray-200 hover:border-gray-300 rounded-xl px-3 py-2.5 text-xs focus:border-[#F15A24] outline-none select-none transition-all"
                              >
                                <span>{selectedPhoneCountry.flag}</span>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              </button>

                              <AnimatePresence>
                                {isPhoneCountryDropdownOpen && (
                                  <motion.div
                                    className="absolute top-full left-0 z-30 mt-1 bg-white border border-gray-150 rounded-xl shadow-lg max-h-48 overflow-y-auto min-w-[150px] p-1.5 font-sans"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                  >
                                    {COUNTRIES.map((ct) => (
                                      <button
                                        key={ct.code}
                                        type="button"
                                        onClick={() => {
                                          setSelectedPhoneCountry(ct);
                                          setContactPageForm(prev => ({ ...prev, phone: ct.dial + ' ' + prev.phone.replace(/^\+\d+\s*/, '') }));
                                          setIsPhoneCountryDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center justify-between hover:bg-slate-50 px-2.5 py-2 text-left rounded-lg text-xs"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>{ct.flag}</span>
                                          <span className="font-medium text-gray-800">{ct.code}</span>
                                        </div>
                                        <span className="text-gray-400 text-[10px] font-mono leading-none">{ct.dial}</span>
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Phone number field */}
                            <input
                              type="tel"
                              value={contactPageForm.phone}
                              onChange={(e) => setContactPageForm(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder={selectedPhoneCountry.dial + " 555-0123"}
                              className="w-full flex-1 bg-white border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 text-xs text-gray-800 outline-none transition-colors"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="text-xs font-bold text-gray-850">Enquiry Reason :</label>
                          <div className="relative">
                            <select
                              value={contactPageForm.enquiryReason}
                              onChange={(e) => setContactPageForm(prev => ({ ...prev, enquiryReason: e.target.value }))}
                              className="w-full bg-white border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 pr-10 text-xs text-gray-800 outline-none transition-colors appearance-none"
                            >
                              <option value="">- None -</option>
                              <option value="Sourcing Inquiries">Sourcing Inquiries</option>
                              <option value="Digital 3D Design Labs">Digital 3D Design Labs</option>
                              <option value="Global Compliance & Sustainability">Global Compliance & Sustainability</option>
                              <option value="Careers & Internships">Careers & Internships</option>
                              <option value="General Partnership">General Partnership</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      {/* City & Country side by side */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5 text-left">
                          <label className="text-xs font-bold text-gray-850">City : *</label>
                          <input
                            type="text"
                            required
                            value={contactPageForm.city}
                            onChange={(e) => setContactPageForm(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="e.g. Madrid, Copenhagen"
                            className="w-full bg-white border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 text-xs text-gray-800 outline-none transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="text-xs font-bold text-gray-850">Country : *</label>
                          <input
                            type="text"
                            required
                            value={contactPageForm.country}
                            onChange={(e) => setContactPageForm(prev => ({ ...prev, country: e.target.value }))}
                            placeholder="e.g. Spain, Denmark"
                            className="w-full bg-white border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 text-xs text-gray-800 outline-none transition-colors"
                          />
                        </div>
                      </div>

                      {/* How did you find us */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold text-gray-850">How did you find us? :</label>
                        <div className="relative">
                          <select
                            value={contactPageForm.howFindUs}
                            onChange={(e) => setContactPageForm(prev => ({ ...prev, howFindUs: e.target.value }))}
                            className="w-full bg-white border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 pr-10 text-xs text-gray-800 outline-none transition-colors appearance-none"
                          >
                            <option value="">- None -</option>
                            <option value="Search Engine (Google, Bing)">Search Engine (Google, Bing)</option>
                            <option value="LinkedIn or Social Media">LinkedIn or Social Media</option>
                            <option value="Business Conference / Fair">Business Conference / Fair</option>
                            <option value="Industry Publication">Industry Publication</option>
                            <option value="Client Reference">Client Reference</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                      </div>

                      {/* Message Textarea */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold text-gray-850">Message : *</label>
                        <textarea
                          required
                          rows={4}
                          value={contactPageForm.message}
                          onChange={(e) => setContactPageForm(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Describe your inquiry or sourcing parameters in detail..."
                          className="w-full bg-white border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 text-xs text-gray-800 outline-none transition-colors resize-none"
                        />
                      </div>

                      {/* Footer submit row matching screenshot */}
                      <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-50 select-none">
                        <button
                          type="submit"
                          disabled={isPageContactSending}
                          className="w-full sm:w-auto px-10 py-3 bg-[#1F2937] hover:bg-[#111827] text-white font-sans font-bold text-xs tracking-wide rounded-full shadow-md hover:shadow-lg transition-all focus:outline-none flex items-center justify-center gap-2"
                        >
                          {isPageContactSending ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <span>Submit Enquiry</span>
                          )}
                        </button>

                        <span className="text-[10px] sm:text-xs font-mono font-medium text-gray-400">
                          (*) indicates mandatory fields
                        </span>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="page-contact-success"
                    className="py-12 px-4 text-center space-y-6"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 100 }}
                  >
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-md">
                      <Check className="w-8 h-8" />
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-display font-extrabold text-[#111827] text-2xl tracking-tight text-center">
                        Enquiry Submitted Successfully!
                      </h3>
                      <p className="text-gray-500 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto text-center">
                        Thank you for reaching out to CWS International. Sourcing ticket has been generated. Our team will contact you within the next 24 hours.
                      </p>
                    </div>

                    <div className="pt-4 select-none">
                      <button
                        onClick={() => setPageContactSubmitted(false)}
                        className="px-6 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 text-xs font-bold rounded-full transition-colors focus:outline-none"
                      >
                        Submit Another Enquiry
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* TKO BRANDED DETACHED LANDING PAGE */}
        {activeTab === 'tko' && (
          <motion.div
            key="tko"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
          >
            <TKOPage />
          </motion.div>
        )}

      </AnimatePresence>

      {activeTab !== 'tko' && (
        <>
          {/* FULL-STATION CERTIFICATION SPONSORS BANNER STRIP - Matches bottom strip exactly */}
          <section className="bg-[#0E1B2D] py-10 mt-12 border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
              <span className="text-[10px] font-mono tracking-[0.25em] text-[#F15A24] uppercase font-bold">Verified Auditor Seals & Standard Compliance</span>

              {/* Scrollable grid strip containing monochrome white logos of the standard certification companies */}
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-75 py-4">

                <div className="flex flex-col items-center">
                  <span className="text-sm font-black text-white tracking-widest leading-none font-mono">ECOVADIS</span>
                  <span className="text-[9px] text-[#F15A24]/80 font-mono uppercase tracking-widest mt-1">Silver Rating</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-sm font-black text-white tracking-widest leading-none">ZDHC</span>
                  <span className="text-[9px] text-gray-400 font-mono uppercase tracking-widest mt-1">Friend Vendor</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-sm font-black text-white tracking-widest leading-none">OEKO-TEX</span>
                  <span className="text-[9px] text-gray-400 font-mono uppercase tracking-widest mt-1">Standard 100</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-sm font-black text-white tracking-widest leading-none">GRS</span>
                  <span className="text-[9px] text-gray-400 font-mono uppercase tracking-widest mt-1">Recycled Standard</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-sm font-black text-white tracking-widest leading-none">GOTS</span>
                  <span className="text-[9px] text-[#F15A24]/80 font-mono uppercase tracking-widest mt-1">Organic Standard</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-sm font-black text-white tracking-widest leading-none">TEXTILE</span>
                  <span className="text-[9px] text-gray-400 font-mono uppercase tracking-wide mt-1">Exchange Group</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-sm font-black text-white tracking-widest leading-none font-mono">ISO 9001</span>
                  <span className="text-[9px] text-gray-400 font-mono uppercase tracking-widest mt-1">Registered</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-sm font-black text-white tracking-widest leading-none">HIGG</span>
                  <span className="text-[9px] text-gray-400 font-mono uppercase tracking-widest mt-1">Index Audited</span>
                </div>

              </div>
            </div>
          </section>

          {/* DOUBLE-LEVEL INTEGRATED FOOTER SECTION - Color scheme matches carbon-deep sapphire */}
          <footer className="bg-[#0E1A29] text-gray-300 pt-16 pb-8 border-t border-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 border-b border-slate-800 pb-12">

              {/* Left Column - CWS summary text & dynamic newsletter subscribe state */}
              <div className="lg:col-span-5 space-y-6">

                {/* Transparent footer logo */}
                <div className="flex items-center gap-4">
                  <CWSLogo className="h-10" />
                  <span className="font-display font-semibold text-lg text-white tracking-wide">CWS International</span>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
                  Our mission is to be the ultimate bespoke global sourcing partner delivering sustainable innovation, leading design collaboration, compliance & CSR excellence, and intuitive client service.
                </p>

                {/* Newsletter Subscription block */}
                <div className="space-y-3 pt-4">
                  <span className="text-xs uppercase font-mono tracking-widest font-bold text-[#F15A24]">Newsletter Subscription</span>

                  <AnimatePresence mode="wait">
                    {!newsletterSubscribed ? (
                      <motion.form
                        key="newsletter-form"
                        onSubmit={handleNewsletterSubmit}
                        className="space-y-4 max-w-sm"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="space-y-1">
                          <label className="text-[11px] font-mono text-gray-400 block mb-1">Email Address :</label>
                          <input
                            type="email"
                            required
                            value={newsletterEmail}
                            onChange={(e) => setNewsletterEmail(e.target.value)}
                            placeholder="yourname@domain.com"
                            className="w-full bg-[#11243A] border border-slate-700/80 rounded-lg px-4 py-2.5 text-xs text-white outline-none focus:border-[#F15A24] transition-colors"
                          />
                        </div>

                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            id="newsletter-agree"
                            required
                            className="accent-[#F15A24] mt-0.5 rounded"
                          />
                          <label htmlFor="newsletter-agree" className="text-[10px] text-gray-400 leading-tight">
                            By clicking Subscribe, I am requesting that CWS International send me newsletters and updates to this email address. I agree to the <span className="underline hover:text-white cursor-pointer">Privacy Policy & Cookie Policy</span>.
                          </label>
                        </div>

                        <button
                          type="submit"
                          className="px-6 py-2 bg-white hover:bg-gray-100 text-gray-900 font-display font-bold text-xs rounded-full shadow-md shadow-gray-950/25 transition-transform hover:-translate-y-0.5"
                        >
                          Subscribe
                        </button>
                      </motion.form>
                    ) : (
                      <motion.div
                        key="newsletter-success"
                        className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-lg text-xs text-emerald-300 max-w-sm"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <p className="font-bold flex items-center gap-1.5 mb-1 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" /> Subscription Confirmed!
                        </p>
                        <p>We've registered your email address successfully. Thank you for connecting with CWS International.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Center Column with 5 structured quicklink columns */}
              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-5 gap-6 text-[11px] font-mono tracking-wider">

                {/* Products & Services */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-white block">Products & Services</span>
                  <ul className="space-y-2 text-gray-400">
                    <li><button onClick={() => { setActiveTab('products'); setSelectedProductCategory('Activewear'); }} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Athleisure</button></li>
                    <li><button onClick={() => { setActiveTab('products'); setSelectedProductCategory('Jackets & Outerwear'); }} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Corporate</button></li>
                    <li><button onClick={() => { setActiveTab('products'); setSelectedProductCategory('Activewear'); }} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Sports</button></li>
                    <li><button onClick={() => { setActiveTab('products'); setSelectedProductCategory('Denim & Jeans'); }} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Lifestyle</button></li>
                  </ul>
                </div>

                {/* Product Types */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-white block">Product Types</span>
                  <ul className="space-y-2 text-gray-400">
                    <li><button onClick={() => { setActiveTab('products'); setSelectedProductCategory('T-Shirts & Polos'); }} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Tees</button></li>
                    <li><button onClick={() => { setActiveTab('products'); setSelectedProductCategory('T-Shirts & Polos'); }} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Polos</button></li>
                    <li><button onClick={() => { setActiveTab('products'); setSelectedProductCategory('Hoodies & Sweats'); }} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Hoodies / Sweats</button></li>
                    <li><button onClick={() => { setActiveTab('products'); setSelectedProductCategory('T-Shirts & Polos'); }} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Shirts</button></li>
                  </ul>
                </div>

                {/* Company Info */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-white block">Company Info</span>
                  <ul className="space-y-2 text-gray-400">
                    <li><button onClick={() => setActiveTab('our-group')} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">About</button></li>
                    <li><button onClick={() => setActiveTab('promise')} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Our Promise</button></li>
                    <li><button onClick={() => setActiveTab('locations')} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Meet Our Team</button></li>
                    <li><button onClick={() => setActiveTab('our-group')} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">History of CWS</button></li>
                  </ul>
                </div>

                {/* Privacy & Cookies */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-white block">Privacy & Cookies</span>
                  <ul className="space-y-2 text-gray-400">
                    <li><button onClick={() => alert("Privacy policy page")} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Privacy Policy</button></li>
                    <li><button onClick={() => alert("Cookie policy page")} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Cookie Policy</button></li>
                  </ul>
                </div>

                {/* Customer Enquiries */}
                <div className="space-y-3 col-span-2 sm:col-span-1">
                  <span className="text-xs font-bold text-white block">Customer Enquiries</span>
                  <ul className="space-y-2 text-gray-400">
                    <li><button onClick={() => { setActiveTab('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Contact Us</button></li>
                    <li><button onClick={() => setActiveTab('locations')} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Global Locations</button></li>
                    <li><button onClick={() => setActiveTab('news')} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Newsfeed</button></li>
                  </ul>
                </div>

              </div>
            </div>

            {/* Bottom Level Footer Panel */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] font-mono text-slate-400 uppercase tracking-widest">

              <div className="flex items-center gap-3">
                <a
                  href="https://linkedin.com/company/cws international"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0A66C2] hover:text-[#0A66C2]/80 transition-colors"
                  aria-label="LinkedIn Profile"
                >
                  <Linkedin className="w-5 h-5 fill-current border border-slate-700/80 p-0.5 rounded-sm" />
                </a>
                <span className="text-gray-500 max-w-[420px] leading-relaxed lowercase text-[10.5px]">
                  CWS International DMCC, Suite No.2701, Platinum Tower, Cluster &quot;I&quot;, Jumeirah Lake Towers, P.O. Box 43720, Dubai
                </span>
              </div>

              <span>© All rights reserved by CWS International</span>
            </div>
          </footer>


          {/* FLOATING CHAT / AUTO-RESOLVER SUPPORT WIDGET AT BOTTOM-LEFT */}
          <div className="fixed bottom-6 left-6 z-40">
            <AnimatePresence>
              {isChatOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-white border border-gray-150 rounded-2xl shadow-2xl w-[320px] md:w-[350px] overflow-hidden mb-4"
                >
                  <div className="bg-[#103D54] p-4 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      <div>
                        <h4 className="text-xs font-bold leading-none">CWS Offline Support</h4>
                        <span className="text-[9px] font-mono text-teal-200">Leave a Sourcing Message</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsChatOpen(false)}
                      className="p-1 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
                      aria-label="Close Chat"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Chat Message Box */}
                  <div className="h-[240px] overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                    {chatHistory.map((h, i) => (
                      <div key={i} className={`flex ${h.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${h.sender === 'user' ? 'bg-[#F15A24] text-white rounded-br-none' : 'bg-white border border-gray-150 text-gray-700 rounded-bl-none shadow-xs'}`}>
                          {h.text}
                        </div>
                      </div>
                    ))}
                    {isChatSending && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-gray-100 p-3 rounded-2xl shadow-xs text-xs text-gray-400 font-mono italic flex items-center gap-1.5 rounded-bl-none">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                          Connecting with AI Coordinator...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message entry */}
                  <form onSubmit={handleChatSubmit} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      required
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Enter message..."
                      className="w-full text-xs text-gray-700 px-3 py-2 outline-none border border-gray-200 focus:border-[#F15A24] rounded-xl"
                    />
                    <button
                      type="submit"
                      className="p-2 bg-[#F15A24] text-white rounded-xl hover:bg-[#F15A24]/90 transition-colors focus:outline-none shadow-xs"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Floating Trigger Button */}
            <button
              onClick={() => setIsChatOpen(prev => !prev)}
              className="flex items-center gap-2.5 bg-[#103D54] hover:bg-[#0E354A] text-white px-4 py-3 rounded-full shadow-xl shadow-gray-450/40 transition-transform active:scale-95 text-xs font-bold leading-none focus:outline-none"
            >
              <MessageSquare className="w-4 h-4" />
              <span>We're offline, Leave a message</span>
            </button>
          </div>


          {/* SEARCH OVERLAY PANEL */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[#0E1B2D]/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
              >
                <div className="max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 p-6 md:p-8 space-y-6 relative">
                  <button
                    onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                    className="absolute top-6 right-6 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 focus:outline-none"
                    aria-label="Close Search"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="space-y-2 text-center md:text-left">
                    <h3 className="font-display font-extrabold text-2xl text-gray-950">Intelligent Portal Search</h3>
                    <p className="text-gray-400 text-xs">Filter through our textile categories, audit certificates, and corporate office sites immediately.</p>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      required
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type here (e.g., Athleisure, Dhaka, GOTS, Rajib)..."
                      className="w-full text-base text-gray-800 bg-gray-50 border border-gray-200 focus:border-[#F15A24] rounded-2xl px-5 py-3.5 pr-12 outline-none font-medium text-gray-700"
                    />
                    <Search className="w-5 h-5 text-gray-400 absolute right-4 top-4.5" />
                  </div>

                  {/* Results */}
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50 pr-2">
                    {searchResults.length > 0 ? (
                      searchResults.map((r, i) => (
                        <button
                          key={i}
                          onClick={r.action}
                          className="w-full text-left py-3.5 hover:bg-gray-55 px-3 rounded-xl transition-all flex justify-between items-center group focus:outline-none"
                        >
                          <div>
                            <span className="font-mono text-[9px] uppercase font-bold text-[#F15A24] bg-orange-50 px-2 py-0.5 rounded-md">{r.type}</span>
                            <h4 className="font-display font-bold text-gray-950 text-sm mt-1.5 group-hover:text-[#F15A24] transition-colors">{r.title}</h4>
                            <p className="text-xs text-gray-400 leading-normal mt-1">{r.desc}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#F15A24] transition-colors translate-x-0 group-hover:translate-x-1" />
                        </button>
                      ))
                    ) : searchQuery.trim() ? (
                      <div className="py-8 text-center text-xs text-gray-400 italic">
                        No results found matching your query. Try searching for "Tees", "Madrid", or "EcoVadis".
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-gray-400">
                        Type a key term above to filter CWS databases in real time.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


          {/* 2030 ROADMAP MILESTONES MODAL */}
          <AnimatePresence>
            {isRoadmapOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[#0E1B2D]/85 backdrop-blur-md flex items-center justify-center p-4"
              >
                <div className="max-w-2xl w-full bg-[#102B3D] text-white rounded-3xl overflow-hidden shadow-2xl border border-teal-900/40 p-6 md:p-8 space-y-6 relative">
                  <button
                    onClick={() => setIsRoadmapOpen(false)}
                    className="absolute top-6 right-6 p-1.5 text-teal-300 hover:text-white rounded-full hover:bg-white/5 focus:outline-none animate-bounce"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="space-y-2">
                    <span className="text-xs font-mono font-bold tracking-widest text-teal-400 uppercase">SUSTAINABLE FABRIC FUTURE</span>
                    <h3 className="font-display font-extrabold text-2xl">CWS Our 2030 Sustainability Roadmap</h3>
                    <p className="text-teal-200/70 text-xs">Verifiable milestones aligned with global climate targets and Circular Apparel initiatives.</p>
                  </div>

                  {/* Milestones timeline */}
                  <div className="space-y-6 pt-4 font-mono text-xs">

                    <div className="relative pl-6 pb-4 border-l-2 border-teal-500/40">
                      <span className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-teal-400" />
                      <div className="flex justify-between text-teal-300 font-bold mb-1">
                        <span>2026 Milestone: High Carbon Integrity</span>
                        <span className="bg-teal-950 text-teal-300 border border-teal-900 px-2 py-0.5 rounded text-[9px] uppercase">100% On-Track</span>
                      </div>
                      <p className="text-teal-100/70 leading-relaxed">Silver EcoVadis rating confirmed. Digital sampling share surpassed 90%, saving thousands of gallons of rinse water across knit lines.</p>
                    </div>

                    <div className="relative pl-6 pb-4 border-l-2 border-teal-500/40">
                      <span className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-yellow-500" />
                      <div className="flex justify-between text-yellow-400 font-bold mb-1">
                        <span>2028 Target: Zero Chemical Residues</span>
                        <span className="bg-teal-950 text-yellow-400 border border-yellow-900/30 px-2 py-0.5 rounded text-[9px] uppercase">Active Plan</span>
                      </div>
                      <p className="text-teal-100/70 leading-relaxed">Transitioning 100% of dye partners to strict ZDHC Level 3 wastewater parameters. Initiating pilot zero-emission ocean freighters.</p>
                    </div>

                    <div className="relative pl-6">
                      <span className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-orange-500" />
                      <div className="flex justify-between text-orange-400 font-bold mb-1">
                        <span>2030 Ultimate Goal: Complete Fiber Circularity</span>
                        <span className="bg-teal-950 text-orange-400 border border-orange-950/40 px-2 py-0.5 rounded text-[9px] uppercase">Strategic Goal</span>
                      </div>
                      <p className="text-teal-100/70 leading-relaxed">Convert 100% of brand buyer production orders to preferred materials (recycled cotton, ocean plastic PET, modal, organic linen).</p>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


          {/* CERTIFICATIONS VERIFICATION MODAL */}
          <AnimatePresence>
            {isCertificationsOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[#0E1B2D]/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
              >
                <div className="max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 p-6 md:p-8 space-y-6 relative">
                  <button
                    onClick={() => setIsCertificationsOpen(false)}
                    className="absolute top-6 right-6 p-1.5 text-gray-400 hover:text-gray-650 rounded-full hover:bg-gray-100 focus:outline-none"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="space-y-2">
                    <span className="text-xs font-mono font-bold tracking-widest text-[#F15A24] uppercase">Global Compliance Database</span>
                    <h3 className="font-display font-extrabold text-2xl text-gray-950">Active Certifications Portfolio</h3>
                    <p className="text-gray-400 text-xs">All certification files are verified directly by leading inspection bureaus and updated dynamically.</p>
                  </div>

                  {/* Grid lists of current certifications */}
                  <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto pr-2">

                    <div className="py-4 font-mono text-xs flex justify-between items-start gap-4">
                      <div>
                        <span className="font-bold text-[#F15A24]">EcoVadis 2026 - Silver Sustainability Rating</span>
                        <p className="text-gray-500 leading-normal mt-1">Sourcing operations placed in top 15% globally of responsible standard supply chains.</p>
                      </div>
                      <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase shrink-0 text-[9px]">Verified / 2026</span>
                    </div>

                    <div className="py-4 font-mono text-xs flex justify-between items-start gap-4">
                      <div>
                        <span className="font-bold text-gray-900">GOTS - Global Organic Textile Standard</span>
                        <p className="text-gray-500 leading-normal mt-1 font-sans">Strict audit confirming material sourcing passes 100% organic cotton parameters without pesticides.</p>
                      </div>
                      <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase shrink-0 text-[9px]">Verified</span>
                    </div>

                    <div className="py-4 font-mono text-xs flex justify-between items-start gap-4">
                      <div>
                        <span className="font-bold text-gray-900">ZDHC - Zero Discharge of Hazardous Chemicals</span>
                        <p className="text-gray-500 leading-normal mt-1 font-sans">Direct governance showing dye houses clear out trace chemical water residues correctly.</p>
                      </div>
                      <span className="bg-sky-50 text-sky-800 font-bold px-2 py-0.5 rounded uppercase shrink-0 text-[9px]">Friend / Active</span>
                    </div>

                    <div className="py-4 font-mono text-xs flex justify-between items-start gap-4">
                      <div>
                        <span className="font-bold text-gray-900">GRS - Global Recycled Standard</span>
                        <p className="text-gray-500 leading-normal mt-1 font-sans">Traceable recycling of ocean plastics (Repreve) converted to high-performance textiles.</p>
                      </div>
                      <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase shrink-0 text-[9px]">Verified</span>
                    </div>

                    <div className="py-4 font-mono text-xs flex justify-between items-start gap-4">
                      <div>
                        <span className="font-bold text-gray-900">ISO 9001:2015 Quality Management Systems</span>
                        <p className="text-gray-500 leading-normal mt-1 font-sans">Documented processing controls covering pre-production, inline, and final warehouse quality cycles.</p>
                      </div>
                      <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase shrink-0 text-[9px]">Registered</span>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


          {/* COMPREHENSIVE CONTACT US / SOURCING INQUIRY DRAWER */}
          <AnimatePresence>
            {isContactOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[#0E1B2D]/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
              >
                <div className="max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 p-6 md:p-8 space-y-6 relative">
                  <button
                    onClick={() => setIsContactOpen(false)}
                    className="absolute top-6 right-6 p-1.5 text-gray-400 hover:text-gray-650 rounded-full hover:bg-gray-100 focus:outline-none"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold tracking-widest text-[#F15A24] uppercase">Secure Corporate RFQ</span>
                    <h3 className="font-display font-extrabold text-2xl text-gray-950">Inquire Sustainable Sourcing Solutions</h3>
                    <p className="text-gray-400 text-xs">Complete this routing ticket to connect directly with the specialist R&D coordinator in Madrid, London, Dhaka or Istanbul.</p>
                  </div>

                  <AnimatePresence mode="wait">
                    {!contactSubmitted ? (
                      <motion.form
                        key="contact-form"
                        onSubmit={handleContactSubmit}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs text-gray-700"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >

                        <div className="space-y-1.5">
                          <label className="font-bold">Your Name *</label>
                          <input
                            type="text"
                            required
                            value={contactForm.name}
                            onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="John Doe"
                            className="w-full bg-gray-50 border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 text-xs text-gray-805 outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold">Business Email Address *</label>
                          <input
                            type="email"
                            required
                            value={contactForm.email}
                            onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="john@brandlabel.com"
                            className="w-full bg-gray-50 border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 text-xs text-gray-805 outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold">Organization / Retail Label *</label>
                          <input
                            type="text"
                            required
                            value={contactForm.org}
                            onChange={(e) => setContactForm(prev => ({ ...prev, org: e.target.value }))}
                            placeholder="Brand Name Ltd"
                            className="w-full bg-gray-50 border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 text-xs text-gray-850 outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold">Target Product Stream *</label>
                          <select
                            value={contactForm.productType}
                            onChange={(e) => setContactForm(prev => ({ ...prev, productType: e.target.value }))}
                            className="w-full bg-gray-50 border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 text-xs text-gray-800 outline-none"
                          >
                            <option value="Tees & Tanks">Tees & Tanks (Jersey)</option>
                            <option value="Premium Polos">Premium Polos (Pique)</option>
                            <option value="Hoodies & Sweats">Hoodies & Sweats (Fleece)</option>
                            <option value="Casual Shirts">Casual & Dress Shirts</option>
                            <option value="Athleisure">Athleisure & Sportswear</option>
                            <option value="Corporate uniform">Corporate Sourcing</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold">Requested Quantity *</label>
                          <input
                            type="number"
                            required
                            value={contactForm.quantity}
                            onChange={(e) => setContactForm(prev => ({ ...prev, quantity: e.target.value }))}
                            placeholder="Minimum MOQ 5000"
                            className="w-full bg-gray-50 border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 text-xs text-gray-850 outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold">Destination Market *</label>
                          <input
                            type="text"
                            required
                            value={contactForm.destination}
                            onChange={(e) => setContactForm(prev => ({ ...prev, destination: e.target.value }))}
                            placeholder="United Kingdom, Spain, Sweden"
                            className="w-full bg-gray-50 border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 text-xs text-gray-850 outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2 space-y-1.5">
                          <label className="font-bold">Inquiry Message *</label>
                          <textarea
                            required
                            value={contactForm.message}
                            onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                            placeholder="Detail material specification weights, testing standards required (GOTS/GRS)..."
                            rows={3}
                            className="w-full bg-gray-50 border border-gray-200 focus:border-[#F15A24] rounded-xl px-4 py-2.5 text-xs text-gray-850 outline-none resize-none"
                          />
                        </div>

                        <div className="sm:col-span-2 pt-4">
                          <button
                            type="submit"
                            className="w-full py-3 bg-[#F15A24] hover:bg-[#F15A24]/90 text-white font-display font-bold text-sm tracking-wide rounded-xl shadow-md shadow-[#F15A24]/20 transition-transform focus:outline-none"
                          >
                            File RFQ Sourcing Ticket
                          </button>
                        </div>

                      </motion.form>
                    ) : (
                      <motion.div
                        key="contact-success"
                        className="p-8 bg-emerald-50 border border-emerald-250 text-center rounded-2xl text-emerald-800 space-y-4"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                          <Check className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-display font-extrabold text-lg text-emerald-950">Inquiry Received Successfully!</h4>
                          <p className="text-sm text-emerald-700/80 font-sans max-w-sm mx-auto">Our specialist coordinator in the closest regional office will compile draft fabric cards and email details within a business day.</p>
                          <p className="text-xs text-emerald-900/40 font-mono mt-3">TICKET #CWS-RFQ-{Math.floor(Math.random() * 8999) + 1000} IS QUEUED</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

    </div>
  );
}
