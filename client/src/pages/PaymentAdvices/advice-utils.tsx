import type { PaymentAdviceStatus } from '@shared/api.interface';

export const STATUS_OPTIONS: Array<{
  value: PaymentAdviceStatus | 'all';
  label: string;
  color: string;
  dotColor: string;
}> = [
  { value: 'all', label: 'All', color: 'bg-gray-50 text-gray-700', dotColor: 'bg-gray-400' },
  { value: 'draft', label: 'Draft', color: 'bg-gray-50 text-gray-700', dotColor: 'bg-gray-400' },
  { value: 'finalized', label: 'Finalized', color: 'bg-green-50 text-green-700', dotColor: 'bg-green-500' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-50 text-blue-700', dotColor: 'bg-blue-500' },
];

export interface StatusBadgeProps {
  status: PaymentAdviceStatus;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const option = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[1];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${option.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${option.dotColor}`} />
      {option.label.charAt(0).toUpperCase() + option.label.slice(1)}
    </span>
  );
};

export const formatCurrency = (
  amount: number | string | undefined | null,
  currency = 'HKD',
): string => {
  if (amount == null) return '-';
  const num = typeof amount === 'string' ? Number(amount) : amount;
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('en-US', {
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
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (
  date: string | Date | undefined | null,
): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
