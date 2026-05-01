'use client';

import Link from 'next/link';
import { Check, ChevronDown, Copy, Link2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useCallback, useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLinkIcon } from '@/components/ui/external-link-icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { track } from '@/lib/analytics';
import { HW_REGISTRY } from '@semianalysisai/inferencex-constants';

// Keep these metric-key groups in sync with chart-utils/chart configs when new source-backed
// metrics are added; this helper owns which caption notes and caveats appear for each family.
const POWER_SOURCE_METRICS = new Set(['y_tpPerMw', 'y_inputTputPerMw', 'y_outputTputPerMw']);
const TOTAL_COST_METRICS = new Set(['y_costh', 'y_costn', 'y_costr']);
const OUTPUT_COST_METRICS = new Set(['y_costhOutput', 'y_costnOutput', 'y_costrOutput']);
const INPUT_COST_METRICS = new Set(['y_costhi', 'y_costni', 'y_costri']);
const POWER_VALUES = Object.fromEntries(
  Object.entries(HW_REGISTRY).map(([base, specs]) => [base, `${specs.power}kW`]),
);

function MetricBadges({
  label,
  values,
}: {
  label: string;
  values: Record<string, string | number>;
}) {
  return (
    <p className="text-muted-foreground mb-2 flex flex-wrap gap-2 items-center">
      {label}{' '}
      {Object.entries(values).map(([base, value]) => (
        <Badge key={base} variant="outline">
          {base.toUpperCase()}: {value}
        </Badge>
      ))}
    </p>
  );
}

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <p className="text-muted-foreground">
      <small>
        Source:{' '}
        <Link target="_blank" className="underline hover:text-foreground" href={href}>
          {children}
          <ExternalLinkIcon />
        </Link>
      </small>
    </p>
  );
}

function DisaggCaveat({
  visible,
  calculationNoun,
  comparisonNoun = calculationNoun,
}: {
  visible: boolean;
  calculationNoun: string;
  comparisonNoun?: string;
}) {
  return (
    <div
      className={`overflow-hidden transition-all duration-200 ease-in-out ${
        visible ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <p className="text-muted-foreground text-xs mt-2 border-l-2 border-amber-500 pl-2 bg-amber-500/5 py-1">
        <strong>Note:</strong> Disaggregated inference configurations (e.g., MoRI SGLang, Dynamo
        TRT) calculate {calculationNoun} per decode GPU or per prefill GPU, rather than per total
        GPU count. This makes direct {comparisonNoun} comparison with aggregated configs not an
        apples-to-apples comparison.
      </p>
    </div>
  );
}

function getCostValues(selectedYAxisMetric: string) {
  return Object.fromEntries(
    Object.entries(HW_REGISTRY).map(([base, specs]) => [
      base,
      selectedYAxisMetric === 'y_costh' ||
      selectedYAxisMetric === 'y_costhOutput' ||
      selectedYAxisMetric === 'y_costhi'
        ? specs.costh
        : selectedYAxisMetric === 'y_costn' ||
            selectedYAxisMetric === 'y_costnOutput' ||
            selectedYAxisMetric === 'y_costni'
          ? specs.costn
          : specs.costr,
    ]),
  );
}

export function ChartShareActions() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<'idle' | 'copied' | 'twitter' | 'linkedin'>('idle');

  if (pathname.startsWith('/embed/')) return null;

  const getShareUrl = useCallback(() => {
    if (typeof window === 'undefined') return 'https://inferencex.semianalysis.com';
    return window.location.href;
  }, []);

  const pushFeedback = useCallback((value: 'copied' | 'twitter' | 'linkedin') => {
    setFeedback(value);
    setTimeout(() => setFeedback('idle'), 2000);
  }, []);

  const handleCopy = useCallback(async () => {
    const url = getShareUrl();
    track('share_link_copied');
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.append(textArea);
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
    pushFeedback('copied');
    setOpen(false);
    window.dispatchEvent(new CustomEvent('inferencex:action'));
  }, [getShareUrl, pushFeedback]);

  const handleShareTwitter = useCallback(() => {
    const url = getShareUrl();
    const shareText =
      'Check out InferenceX — open-source ML inference benchmarks comparing GPUs across real-world workloads.';
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400',
    );
    track('social_share_twitter');
    pushFeedback('twitter');
    setOpen(false);
  }, [getShareUrl, pushFeedback]);

  const handleShareLinkedIn = useCallback(() => {
    const url = getShareUrl();
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer,width=600,height=600',
    );
    track('social_share_linkedin');
    pushFeedback('linkedin');
    setOpen(false);
  }, [getShareUrl, pushFeedback]);

  const buttonLabel =
    feedback === 'copied'
      ? 'Link copied'
      : feedback === 'twitter'
        ? 'Opened X'
        : feedback === 'linkedin'
          ? 'Opened LinkedIn'
          : 'Share';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid="share-button"
          variant="secondary"
          size="sm"
          className={`h-8 gap-1.5 rounded-md px-3 text-xs font-medium transition-all duration-200 ${
            feedback === 'idle' ? '' : 'bg-emerald-500 text-white hover:bg-emerald-500/90'
          }`}
          aria-label={buttonLabel}
        >
          {feedback === 'idle' ? (
            <Link2 className="size-3.5 transition-colors duration-200" />
          ) : (
            <Check className="size-3.5 transition-colors duration-200" />
          )}
          <span>{buttonLabel}</span>
          <ChevronDown className="size-3.5 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="!w-auto !min-w-0 p-1 sm:w-52 sm:p-1.5">
        <div
          className={`hidden sm:flex mb-1 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-all duration-200 ${
            feedback === 'copied' ? 'max-h-8 opacity-100' : 'max-h-0 opacity-0 overflow-hidden py-0'
          }`}
        >
          <Check className="size-3.5 text-emerald-500" />
          <span>Link copied to clipboard</span>
        </div>
        <button
          type="button"
          className="flex w-9 h-9 items-center justify-center rounded-md hover:bg-accent sm:w-full sm:h-auto sm:justify-start sm:gap-2 sm:px-2.5 sm:py-2 sm:text-sm"
          onClick={handleCopy}
        >
          <Copy className="size-4" />
          <span className="hidden sm:inline">Copy link</span>
        </button>
        <button
          type="button"
          data-testid="share-twitter"
          className="flex w-9 h-9 items-center justify-center rounded-md hover:bg-accent sm:w-full sm:h-auto sm:justify-start sm:gap-2 sm:px-2.5 sm:py-2 sm:text-sm"
          onClick={handleShareTwitter}
        >
          <span className="inline-flex size-4 items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </span>
          <span className="hidden sm:inline">Share on X</span>
        </button>
        <button
          type="button"
          data-testid="share-linkedin"
          className="flex w-9 h-9 items-center justify-center rounded-md hover:bg-accent sm:w-full sm:h-auto sm:justify-start sm:gap-2 sm:px-2.5 sm:py-2 sm:text-sm"
          onClick={handleShareLinkedIn}
        >
          <span className="inline-flex size-4 items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </span>
          <span className="hidden sm:inline">Share on LinkedIn</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}

export function MetricAssumptionNotes({
  selectedYAxisMetric,
  includeAllPowerThroughputMetrics = true,
  includePowerThroughputCaveat = true,
}: {
  selectedYAxisMetric: string;
  // Historical trends only annotates y_tpPerMw and intentionally omits per-MW caveats to preserve
  // the tab's existing caption contract while sharing the same helper as inference.
  includeAllPowerThroughputMetrics?: boolean;
  includePowerThroughputCaveat?: boolean;
}) {
  const showPowerSource = includeAllPowerThroughputMetrics
    ? POWER_SOURCE_METRICS.has(selectedYAxisMetric)
    : selectedYAxisMetric === 'y_tpPerMw';
  const showTotalCostSource = TOTAL_COST_METRICS.has(selectedYAxisMetric);
  const showOutputCostSource = OUTPUT_COST_METRICS.has(selectedYAxisMetric);
  const showInputCostSource = INPUT_COST_METRICS.has(selectedYAxisMetric);
  const showInputThroughputCaveat = selectedYAxisMetric === 'y_inputTputPerGpu';
  const showOutputThroughputCaveat = selectedYAxisMetric === 'y_outputTputPerGpu';
  const showJouleSource = selectedYAxisMetric.startsWith('y_j');

  const costValues =
    showTotalCostSource || showOutputCostSource || showInputCostSource
      ? getCostValues(selectedYAxisMetric)
      : null;

  return (
    <>
      {showPowerSource && (
        <>
          <MetricBadges label="All in Power/GPU:" values={POWER_VALUES} />
          <SourceLink href="https://semianalysis.com/datacenter-industry-model/">
            SemiAnalysis Datacenter Industry Model
          </SourceLink>
        </>
      )}
      {costValues && (
        <>
          <MetricBadges label="TCO $/GPU/hr:" values={costValues} />
          <SourceLink href="https://semianalysis.com/ai-cloud-tco-model/">
            SemiAnalysis Market August 2025 Pricing Surveys & AI Cloud TCO Model
          </SourceLink>
        </>
      )}
      <DisaggCaveat visible={selectedYAxisMetric.startsWith('y_cost')} calculationNoun="cost" />
      <DisaggCaveat visible={showInputThroughputCaveat} calculationNoun="input throughput" />
      <DisaggCaveat visible={showOutputThroughputCaveat} calculationNoun="output throughput" />
      {includePowerThroughputCaveat && (
        <DisaggCaveat
          visible={POWER_SOURCE_METRICS.has(selectedYAxisMetric)}
          calculationNoun="power"
        />
      )}
      {showJouleSource && (
        <>
          <MetricBadges label="All in Power/GPU:" values={POWER_VALUES} />
          <SourceLink href="https://semianalysis.com/datacenter-industry-model/">
            SemiAnalysis Datacenter Industry Model
          </SourceLink>
        </>
      )}
      <DisaggCaveat
        visible={showJouleSource}
        calculationNoun="Joules"
        comparisonNoun="Joules per token"
      />
    </>
  );
}
