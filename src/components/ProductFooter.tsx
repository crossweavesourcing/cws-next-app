import Image from 'next/image';
import Link from 'next/link';
import { Facebook, Instagram, Linkedin } from 'lucide-react';

const productCategories = ['Knit', 'Woven', 'Sweater', 'Bag', 'Wallet', 'Hat'];

export default function ProductFooter() {
  return (
    <footer className="landing-cws-footer bg-[#DDDBCF] text-neutral-900 pt-16 pb-12 border-t border-neutral-300">
      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
        <div className="col-span-1 md:col-span-5 space-y-6">
          <div className="w-40 h-12 relative mb-4">
            <Image
              src="/cws_logo.png"
              alt="CWS"
              fill
              sizes="(max-width: 768px) 160px, 160px"
              className="object-contain object-left"
            />
          </div>

          <div className="space-y-6 text-neutral-700">
            <div className="text-[11px] font-sans tracking-wider uppercase">
              <span className="font-sans font-bold uppercase tracking-[0.15em] text-[10px] text-black block mb-2">Bangladesh Office</span>
              <p className="leading-relaxed text-neutral-600 normal-case font-light">
                Bashundhara R/A, Road No. 3, Lane No. 3, House No. 1339/A, Ward No. 24, Chittagong, Bangladesh
              </p>
            </div>
            <div className="text-[11px] font-sans tracking-wider uppercase">
              <span className="font-sans font-bold uppercase tracking-[0.15em] text-[10px] text-black block mb-2">USA Office & Mailing Address</span>
              <p className="leading-relaxed text-neutral-600 normal-case font-light">
                PO Box: 41, 26 S White Horse Pike, Somerdale, NJ 08083, USA
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 space-y-4 md:border-l md:border-neutral-300/60 md:pl-8">
          <h5 className="font-sans font-bold uppercase tracking-[0.15em] text-xs text-black">About Us</h5>
          <ul className="space-y-2 text-[11px] font-sans tracking-wider text-neutral-700 uppercase">
            <li><Link href="/#about" className="hover:text-black transition-colors">Our Approach</Link></li>
            <li><Link href="/#what-we-do" className="hover:text-black transition-colors">What We Do</Link></li>
            <li><Link href="/#strategy" className="hover:text-black transition-colors">Company Strategy</Link></li>
            <li><Link href="/#responsibility" className="hover:text-black transition-colors">Management</Link></li>
          </ul>
        </div>

        <div className="col-span-1 md:col-span-2 space-y-4 md:border-l md:border-neutral-300/60 md:pl-8">
          <h5 className="font-sans font-bold uppercase tracking-[0.15em] text-xs text-black">Product Categories</h5>
          <ul className="space-y-2 text-[11px] font-sans tracking-wider text-neutral-700 uppercase">
            {productCategories.map((category) => (
              <li key={category}>
                <Link href={`/products?category=${encodeURIComponent(category)}`} className="hover:text-black transition-colors">
                  {category}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-1 md:col-span-3 space-y-6 md:border-l md:border-neutral-300/60 md:pl-8">
          <div className="space-y-4">
            <h5 className="font-sans font-bold uppercase tracking-[0.15em] text-xs text-black">Corporate Responsibility</h5>
            <ul className="space-y-2 text-[11px] font-sans tracking-wider text-neutral-700 uppercase">
              <li><Link href="/#responsibility" className="hover:text-black transition-colors">Do The Right Thing</Link></li>
            </ul>
          </div>

          <div className="space-y-4 border-t border-neutral-300/60 pt-5">
            <h5 className="font-sans font-bold uppercase tracking-[0.15em] text-xs text-black">Follow Us</h5>
            <div className="flex gap-4 pt-1">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-black/5 hover:bg-[#E02424] hover:text-white transition-all text-neutral-700 focus:outline-none focus:ring-1 focus:ring-black/25"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-black/5 hover:bg-[#E02424] hover:text-white transition-all text-neutral-700 focus:outline-none focus:ring-1 focus:ring-black/25"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-black/5 hover:bg-[#E02424] hover:text-white transition-all text-neutral-700 focus:outline-none focus:ring-1 focus:ring-black/25"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-8 mt-12 border-t border-neutral-300 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-neutral-600 font-sans uppercase tracking-wider">
        <span className="ml-auto">© {new Date().getFullYear()} Cross Weave Sourcing (CWS). All rights reserved.</span>
      </div>
    </footer>
  );
}
