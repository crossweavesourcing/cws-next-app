'use client';

import React from 'react';

export function FAQAccordion({ faqs }: { faqs: { question: string; answer: string }[] }) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <div className="space-y-4">
      {faqs.map((faq, idx) => (
        <details key={idx} className="group rounded border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3 font-bold text-neutral-900 dark:text-white">
            <span dangerouslySetInnerHTML={{ __html: faq.question }} />
            <span className="ml-4 transition-transform group-open:rotate-180">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </summary>
          <div 
            className="px-4 pb-4 pt-2 text-neutral-600 dark:text-neutral-400 prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: faq.answer }}
          />
        </details>
      ))}
    </div>
  );
}
