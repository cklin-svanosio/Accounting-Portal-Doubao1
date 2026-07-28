import React from 'react';
import { cn } from '@/lib/utils';
import type { ReconciliationStatus, MatchType } from '@shared/api.interface';

// ─── Status Badge ────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: ReconciliationStatus;
  className?: string;
}

const STATUS_STYLES: Record<ReconciliationStatus, { dot: string; bg: string; text: string; border: string }> = {
  matched: {
    dot: 'bg-[hsl(152_60%_42%)]',
    bg: 'bg-[hsl(152_60%_96%)]',
    text: 'text-[hsl(152_60%_32%)]',
    border: 'border-[hsl(152_50%_88%)]',
  },
  partial: {
    dot: 'bg-[hsl(38_92%_50%)]',
    bg: 'bg-[hsl(38_90%_96%)]',
    text: 'text-[hsl(38_80%_35%)]',
    border: 'border-[hsl(38_80%_88%)]',
  },
  unmatched: {
    dot: 'bg-[hsl(0_72%_51%)]',
    bg: 'bg-[hsl(0_70%_97%)]',
    text: 'text-[hsl(0_70%_40%)]',
    border: 'border-[hsl(0_60%_90%)]',
  },
  'under-review': {
    dot: 'bg-[hsl(203_56%_52%)]',
    bg: 'bg-[hsl(203_60%_96%)]',
    text: 'text-[hsl(203_60%_35%)]',
    border: 'border-[hsl(203_50%_88%)]',
  },
};

const STATUS_LABELS: Record<ReconciliationStatus, string> = {
  matched: 'Matched',
  partial: 'Partial',
  unmatched: 'Unmatched',
  'under-review': 'Under Review',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES['under-review'];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        style.bg,
        style.text,
        style.border,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {STATUS_LABELS[status]}
    </span>
  );
};

// ─── Formatting ──────────────────────────────────────────────────────

export const formatCurrency = (
  amount: number | string | undefined | null,
  currency = 'HKD',
): string => {
  if (amount == null || amount === '') return '-';
  const num = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(num)) return '-';
  return new Intl.NumberFormat('en-HK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatDate = (
  date: string | Date | undefined | null,
): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-HK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

// ─── Options ─────────────────────────────────────────────────────────

export const STATUS_OPTIONS: Array<{ value: ReconciliationStatus; label: string }> = [
  { value: 'matched', label: 'Matched' },
  { value: 'partial', label: 'Partial' },
  { value: 'unmatched', label: 'Unmatched' },
  { value: 'under-review', label: 'Under Review' },
];

export const MATCH_TYPE_OPTIONS: Array<{ value: MatchType; label: string }> = [
  { value: 'full', label: 'Full Match' },
  { value: 'partial', label: 'Partial Match' },
];
