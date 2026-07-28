import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  RotateCcwIcon,
  CheckCheckIcon,
  FileTextIcon,
  ClockIcon,
  UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { payments as paymentsApi } from '@/api';
import type { Payment, SwopBreakdown, PaymentStatus } from '@shared/api.interface';
import {
  StatusBadge,
  formatCurrency,
  formatDate,
  formatDateTime,
} from './payment-utils';

const PaymentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [swopBreakdown, setSwopBreakdown] = useState<SwopBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<{
    type: 'approve' | 'reject' | 'revision' | null;
    comments: string;
  }>({ type: null, comments: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPayment = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, swop] = await Promise.all([
        paymentsApi.getPayment(id),
        paymentsApi.getSwopBreakdown(id),
      ]);
      setPayment(p);
      setSwopBreakdown(swop.items);
    } catch (err) {
      logger.error('Failed to fetch payment detail', err);
      toast.error('Failed to load payment');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  const handleAction = async () => {
    if (!payment || !actionDialog.type) return;
    setActionLoading(true);
    try {
      let updated: Payment;
      if (actionDialog.type === 'approve') {
        updated = await paymentsApi.approvePayment(payment.id, actionDialog.comments);
        toast.success('Payment approved');
      } else if (actionDialog.type === 'reject') {
        updated = await paymentsApi.rejectPayment(payment.id, actionDialog.comments);
        toast.success('Payment rejected');
      } else {
        updated = await paymentsApi.requestRevision(payment.id, actionDialog.comments);
        toast.success('Revision requested');
      }
      setPayment(updated);
      setActionDialog({ type: null, comments: '' });
    } catch (err) {
      logger.error('Action failed', err);
      toast.error('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkProcessed = async () => {
    if (!payment) return;
    try {
      const updated = await paymentsApi.markProcessed(payment.id);
      setPayment(updated);
      toast.success('Payment marked as processed');
    } catch (err) {
      logger.error('Failed to mark processed', err);
      toast.error('Action failed');
    }
  };

  const canApprove = (status: PaymentStatus) =>
    status === 'draft' || status === 'review';
  const canReject = (status: PaymentStatus) =>
    status === 'draft' || status === 'review' || status === 'approved';
  const canRequestRevision = (status: PaymentStatus) =>
    status === 'review' || status === 'approved';
  const canMarkProcessed = (status: PaymentStatus) => status === 'approved';

  if (loading) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="text-muted-foreground">Loading payment...</div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="text-muted-foreground">Payment not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/payments')}>
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">
              {payment.paymentNumber}
            </h1>
            <StatusBadge status={payment.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Created {formatDateTime(payment.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          {canApprove(payment.status) && (
            <Button
              variant="default"
              onClick={() => setActionDialog({ type: 'approve', comments: '' })}
            >
              <CheckCircleIcon className="h-4 w-4" />
              Approve
            </Button>
          )}
          {canReject(payment.status) && (
            <Button
              variant="destructive"
              onClick={() => setActionDialog({ type: 'reject', comments: '' })}
            >
              <XCircleIcon className="h-4 w-4" />
              Reject
            </Button>
          )}
          {canRequestRevision(payment.status) && (
            <Button
              variant="outline"
              onClick={() => setActionDialog({ type: 'revision', comments: '' })}
            >
              <RotateCcwIcon className="h-4 w-4" />
              Request Revision
            </Button>
          )}
          {canMarkProcessed(payment.status) && (
            <Button variant="default" onClick={handleMarkProcessed}>
              <CheckCheckIcon className="h-4 w-4" />
              Mark as Processed
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Payment Info */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <InfoRow label="Payment #" value={payment.paymentNumber} mono />
              <InfoRow label="Vendor" value={payment.vendor} />
              <InfoRow
                label="Amount"
                value={formatCurrency(payment.amount, payment.currency)}
                mono
              />
              <InfoRow label="Currency" value={payment.currency} />
              <InfoRow
                label="Exchange Rate"
                value={payment.exchangeRate?.toString() ?? '-'}
                mono
              />
              <InfoRow
                label="HKD Equivalent"
                value={formatCurrency(payment.hkdEquivalent, 'HKD')}
                mono
              />
              <InfoRow label="Payment Method" value={payment.paymentMethod ?? '-'} />
              <InfoRow label="Due Date" value={formatDate(payment.dueDate)} />
              <InfoRow
                label="Project"
                value={
                  payment.projectId ? (
                    <Link
                      to={`/projects/${payment.projectId}`}
                      className="text-accent hover:underline"
                    >
                      View Project
                    </Link>
                  ) : (
                    '-'
                  )
                }
              />
              <InfoRow
                label="Document"
                value={payment.documentId ? 'Linked' : '-'}
              />
            </div>
          </CardContent>
        </Card>

        {/* Approval Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TimelineItem
                icon={<FileTextIcon className="h-4 w-4" />}
                title="Created"
                description={`by ${payment.createdBy ?? 'System'}`}
                timestamp={formatDateTime(payment.createdAt)}
                done
              />
              {payment.approvedAt && (
                <TimelineItem
                  icon={<CheckCircleIcon className="h-4 w-4" />}
                  title="Approved"
                  description={`by ${payment.approvedBy ?? 'Unknown'}`}
                  timestamp={formatDateTime(payment.approvedAt)}
                  done
                />
              )}
              {payment.status === 'processed' && (
                <TimelineItem
                  icon={<CheckCheckIcon className="h-4 w-4" />}
                  title="Processed"
                  description="Payment completed"
                  timestamp={formatDateTime(payment.updatedAt)}
                  done
                />
              )}
              {payment.status === 'rejected' && (
                <TimelineItem
                  icon={<XCircleIcon className="h-4 w-4" />}
                  title="Rejected"
                  description={payment.approvalComments ?? 'No comments'}
                  timestamp={formatDateTime(payment.updatedAt)}
                  done
                  destructive
                />
              )}
              {payment.status === 'draft' && payment.approvalComments && (
                <TimelineItem
                  icon={<RotateCcwIcon className="h-4 w-4" />}
                  title="Revision Requested"
                  description={payment.approvalComments}
                  timestamp={formatDateTime(payment.updatedAt)}
                  done
                />
              )}
              <TimelineItem
                icon={<ClockIcon className="h-4 w-4" />}
                title="Current Status"
                description={payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                active
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Comments */}
      {payment.approvalComments && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{payment.approvalComments}</p>
          </CardContent>
        </Card>
      )}

      {/* SWOP Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">SWOP Breakdown</CardTitle>
          <span className="text-sm text-muted-foreground">
            {swopBreakdown.length} records
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {swopBreakdown.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No SWOP breakdown records
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="h-10">
                  <TableHead className="text-xs font-medium">From</TableHead>
                  <TableHead className="text-xs font-medium text-right">Amount</TableHead>
                  <TableHead className="text-xs font-medium">To</TableHead>
                  <TableHead className="text-xs font-medium text-right">Amount</TableHead>
                  <TableHead className="text-xs font-medium">Rate</TableHead>
                  <TableHead className="text-xs font-medium">Trade Date</TableHead>
                  <TableHead className="text-xs font-medium">Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {swopBreakdown.map((s) => (
                  <TableRow key={s.id} className="h-12">
                    <TableCell className="text-sm">{s.fromCurrency}</TableCell>
                    <TableCell className="text-sm text-right font-mono">
                      {formatCurrency(s.fromAmount, s.fromCurrency)}
                    </TableCell>
                    <TableCell className="text-sm">{s.toCurrency}</TableCell>
                    <TableCell className="text-sm text-right font-mono">
                      {formatCurrency(s.toAmount, s.toCurrency)}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {s.exchangeRate.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(s.tradeDate)}</TableCell>
                    <TableCell className="text-sm font-mono">
                      {s.referenceNumber ?? '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.type !== null}
        onOpenChange={(o) => !o && setActionDialog({ type: null, comments: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'approve' && 'Approve Payment'}
              {actionDialog.type === 'reject' && 'Reject Payment'}
              {actionDialog.type === 'revision' && 'Request Revision'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Comments</Label>
            <Textarea
              value={actionDialog.comments}
              onChange={(e) =>
                setActionDialog((d) => ({ ...d, comments: e.target.value }))
              }
              placeholder="Add comments..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ type: null, comments: '' })}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.type === 'reject' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading
                ? 'Processing...'
                : actionDialog.type === 'approve'
                  ? 'Approve'
                  : actionDialog.type === 'reject'
                    ? 'Reject'
                    : 'Request Revision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const InfoRow = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div>
    <div className="text-xs text-muted-foreground mb-1">{label}</div>
    <div className={`text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value}</div>
  </div>
);

const TimelineItem = ({
  icon,
  title,
  description,
  timestamp,
  done,
  active,
  destructive,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  timestamp?: string;
  done?: boolean;
  active?: boolean;
  destructive?: boolean;
}) => (
  <div className="flex gap-3">
    <div
      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        destructive
          ? 'bg-red-100 text-red-600'
          : done
            ? 'bg-green-100 text-green-600'
            : active
              ? 'bg-accent/10 text-accent'
              : 'bg-gray-100 text-gray-400'
      }`}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground truncate">{description}</div>
      {timestamp && (
        <div className="text-xs text-muted-foreground mt-0.5">{timestamp}</div>
      )}
    </div>
  </div>
);

export default PaymentDetailPage;
