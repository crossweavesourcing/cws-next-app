import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Cross Weave Sourcing',
  robots: { index: false, follow: false },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="py-24 bg-white text-neutral-900 min-h-screen">
      <div className="max-w-3xl mx-auto px-6 md:px-12 space-y-8">
        <h1 className="text-4xl font-black uppercase tracking-tight">Privacy Policy</h1>
        <div className="prose max-w-none text-neutral-700 space-y-6">
          <p className="font-bold text-[#E02424] uppercase tracking-widest text-xs">
            [PLACEHOLDER FOR LEGAL REVIEW]
          </p>
          <p>
            This is a placeholder for the Privacy Policy. 
            Before publishing the site for production use, this page must be reviewed and 
            updated by qualified legal counsel to ensure compliance with applicable data privacy 
            regulations (e.g., GDPR, CCPA).
          </p>
          <h2>Information We Collect</h2>
          <p>[Legal content goes here]</p>
          
          <h2>How We Use Your Information</h2>
          <p>[Legal content goes here]</p>
          
          <h2>Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at info@crossweavesourcing.com.</p>
        </div>
      </div>
    </main>
  );
}
