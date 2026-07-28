import { Badge } from '@client/src/components/ui/badge';
import type { DocumentStatus, DocumentType } from '@shared/api.interface';

const statusBadgeVariant = (
  status: DocumentStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'approved':
      return 'default';
    case 'pending-review':
      return 'outline';
    case 'needs-correction':
      return 'secondary';
    case 'duplicate':
      return 'destructive';
    case 'archived':
      return 'secondary';
    default:
      return 'secondary';
  }
};

const StatusBadge = ({ status }: { status: DocumentStatus }) => {
  const variant = statusBadgeVariant(status);
  const dotColor: Record<DocumentStatus, string> = {
    'pending-review': 'bg-warning',
    approved: 'bg-success',
    'needs-correction': 'bg-muted-foreground',
    duplicate: 'bg-destructive',
    archived: 'bg-muted-foreground',
  };
  return (
    <Badge
      variant={variant}
      className="gap-1.5 rounded-full px-2.5 font-normal"
    >
      <span
        className={`inline-block size-1.5 rounded-full ${dotColor[status]}`}
      />
      {status
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')}
    </Badge>
  );
};

const formatCurrency = (amount?: number, currency?: string) => {
  if (amount === undefined || amount === null) return '—';
  const curr = currency || 'HKD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: curr,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const DOCUMENT_TYPES: { value: DocumentType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'contract', label: 'Contract' },
  { value: 'payment-advice', label: 'Payment Advice' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'loan-schedule', label: 'Loan Schedule' },
  { value: 'swop-breakdown', label: 'SWOP Breakdown' },
];

const STATUS_OPTIONS: { value: DocumentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending-review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'needs-correction', label: 'Needs Correction' },
  { value: 'duplicate', label: 'Duplicate' },
];

export {
  StatusBadge,
  formatCurrency,
  formatDate,
  formatFileSize,
  DOCUMENT_TYPES,
  STATUS_OPTIONS,
};
