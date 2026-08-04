import { Panel } from '../../_components/DashboardComponents';
import type { SeoHealthFinding } from '@/lib/seo/health';

const severityClass: Record<SeoHealthFinding['severity'], string> = {
  error: 'bg-red-500/10 text-red-600',
  warning: 'bg-amber-500/10 text-amber-700',
  recommendation: 'bg-blue-500/10 text-blue-700',
  info: 'bg-neutral-200 text-neutral-600',
};

export function SeoHealthPanel({ findings, score }: { findings: SeoHealthFinding[]; score: number }) {
  return (
    <Panel eyebrow="Publishing Readiness" title="SEO Health">
      <div className="mb-4 flex items-center justify-between border border-neutral-200 bg-neutral-50 p-4">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">SEO completeness</span>
        <span className="text-2xl font-black text-neutral-950">{score}/100</span>
      </div>
      {findings.length === 0 ? (
        <p className="border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-700">No SEO health findings detected in the inspected source data.</p>
      ) : (
        <div className="space-y-2">
          {findings.slice(0, 20).map((finding, index) => (
            <div key={`${finding.module}-${finding.target}-${index}`} className="grid gap-3 border border-neutral-200 bg-white p-3 text-sm md:grid-cols-[140px_1fr]">
              <span className={`inline-flex w-fit items-center px-2 py-1 text-[10px] font-bold uppercase ${severityClass[finding.severity]}`}>{finding.severity}</span>
              <div>
                <p className="font-bold text-neutral-950">{finding.module}: {finding.target}</p>
                <p className="mt-1 text-neutral-600">{finding.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
