import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accessibility Statement | Cross Weave Sourcing',
  robots: { index: false, follow: false },
};

export default function AccessibilityPage() {
  return (
    <main className="py-24 bg-white text-neutral-900 min-h-screen">
      <div className="max-w-3xl mx-auto px-6 md:px-12 space-y-8">
        <h1 className="text-4xl font-black uppercase tracking-tight">Accessibility Statement</h1>
        <div className="prose max-w-none text-neutral-700 space-y-6">
          <p className="font-bold text-[#E02424] uppercase tracking-widest text-xs">
            [PLACEHOLDER FOR LEGAL REVIEW]
          </p>
          <p>
            This is a placeholder for the Accessibility Statement. 
            Before publishing the site for production use, this page must be reviewed and 
            updated by qualified legal counsel.
          </p>
          <h2>Our Commitment to Accessibility</h2>
          <p>[Legal content goes here]</p>
          
          <h2>Feedback</h2>
          <p>We welcome your feedback on the accessibility of our website. Please let us know if you encounter accessibility barriers on Cross Weave Sourcing.</p>
        </div>
      </div>
    </main>
  );
}
