import { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  XIcon,
  Edit3Icon,
  CheckCircle2Icon,
  Trash2Icon,
  DownloadIcon,
  FileTextIcon,
  Building2Icon,
  CreditCardIcon,
  CalendarIcon,
  SaveIcon,
  XCircleIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { paymentAdvices as advicesApi } from '@/api';
import type { PaymentAdviceDetail, PaymentAdviceStatus } from '@shared/api.interface';
import { StatusBadge, formatCurrency, formatDate, formatDateTime } from './advice-utils';
import { showConfirm } from '@lark-apaas/client-toolkit';

interface AdviceDetailDrawerProps {
  open: boolean;
  adviceId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

const AdviceDetailDrawer = ({
  open,
  adviceId,
  onClose,
  onUpdated,
  onDeleted,
}: AdviceDetailDrawerProps) => {
  const [advice, setAdvice] = useState<PaymentAdviceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAdvice = useCallback(async () => {
    if (!adviceId) return;
    setLoading(true);
    try {
      const data = await advicesApi.getPaymentAdvice(adviceId);
      setAdvice(data);
    } catch (err) {
      logger.error('Failed to fetch payment advice', err);
      toast.error('Failed to load payment advice');
    } finally {
      setLoading(false);
    }
  }, [adviceId]);

  useEffect(() => {
    if (open && adviceId) {
      fetchAdvice();
      setEditMode(false);
    } else {
      setAdvice(null);
    }
  }, [open, adviceId, fetchAdvice]);

  const handleEdit = () => {
    if (!advice?.content) return;
    const contentStr: Record<string, string> = {};
    Object.entries(advice.content).forEach(([key, val]) => {
      contentStr[key] = val != null ? String(val) : '';
    });
    setEditContent(contentStr);
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!advice) return;
    setActionLoading(true);
    try {
      const updated = await advicesApi.updatePaymentAdvice(advice.id, {
        content: editContent,
      });
      setAdvice({ ...advice, ...updated, content: editContent });
      setEditMode(false);
      toast.success('Advice updated successfully');
      onUpdated?.();
    } catch (err) {
      logger.error('Failed to update advice', err);
      toast.error('Failed to update advice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!advice) return;
    setActionLoading(true);
    try {
      const updated = await advicesApi.finalizeAdvice(advice.id);
      setAdvice({ ...advice, status: updated.status as PaymentAdviceStatus });
      toast.success('Advice finalized successfully');
      onUpdated?.();
    } catch (err) {
      logger.error('Failed to finalize advice', err);
      toast.error('Failed to finalize advice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!advice) return;
    if (!await showConfirm('Are you sure you want to delete this payment advice?')) return;
    setActionLoading(true);
    try {
      await advicesApi.deletePaymentAdvice(advice.id);
      toast.success('Advice deleted');
      onDeleted?.();
      onClose();
    } catch (err) {
      logger.error('Failed to delete advice', err);
      toast.error('Failed to delete advice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    toast.info('PDF download is coming soon');
  };

  const content = (advice?.content ?? {}) as Record<string, string | number | null | undefined>;

  return (
    <Drawer open={open} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="w-full max-w-3xl h-full right-0 left-auto border-l">
        <DrawerHeader className="border-b border-border px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <DrawerTitle className="text-lg font-semibold flex items-center gap-2">
                <FileTextIcon className="h-5 w-5 text-primary" />
                Payment Advice Detail
              </DrawerTitle>
              <DrawerDescription className="font-mono text-sm mt-1">
                {advice?.adviceNumber ?? 'Loading...'}
              </DrawerDescription>
            </div>
            <div className="flex items-center gap-2">
              {advice && <StatusBadge status={advice.status} />}
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <XIcon className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : !advice ? (
            <div className="text-center py-12 text-muted-foreground">No data</div>
          ) : (
            <>
              {/* Action Bar */}
              <div className="flex flex-wrap gap-2">
                {!editMode ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleEdit} disabled={actionLoading}>
                      <Edit3Icon className="h-4 w-4" />
                      Edit
                    </Button>
                    {advice.status === 'draft' && (
                      <Button variant="default" size="sm" onClick={handleFinalize} disabled={actionLoading}>
                        <CheckCircle2Icon className="h-4 w-4" />
                        Finalize
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={actionLoading}>
                      <DownloadIcon className="h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDelete}
                      disabled={actionLoading}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2Icon className="h-4 w-4" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={handleSave} disabled={actionLoading}>
                      <SaveIcon className="h-4 w-4" />
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMode(false)}
                      disabled={actionLoading}
                    >
                      <XCircleIcon className="h-4 w-4" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>

              {/* Advice Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Advice Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-b border-border pb-4">
                    <h3 className="text-xl font-bold text-primary mb-1">PAYMENT ADVICE</h3>
                    <p className="text-sm text-muted-foreground font-mono">
                      {advice.adviceNumber}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Vendor</p>
                      <p className="font-medium mt-0.5">{content?.vendor ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Payment #</p>
                      <p className="font-medium mt-0.5 font-mono">{content?.paymentNumber ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Amount</p>
                      <p className="font-medium mt-0.5 font-mono">
                        {formatCurrency(
                          content?.amount as number | undefined,
                          (content?.currency as string) ?? 'HKD',
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Currency</p>
                      <p className="font-medium mt-0.5">{content?.currency ?? '-'}</p>
                    </div>
                    {content?.exchangeRate && (
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">Exchange Rate</p>
                        <p className="font-medium mt-0.5 font-mono">{String(content.exchangeRate)}</p>
                      </div>
                    )}
                    {content?.hkdEquivalent && (
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">HKD Equivalent</p>
                        <p className="font-medium mt-0.5 font-mono">
                          {formatCurrency(content.hkdEquivalent as number, 'HKD')}
                        </p>
                      </div>
                    )}
                    {content?.paymentMethod && (
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">Payment Method</p>
                        <p className="font-medium mt-0.5">{String(content.paymentMethod)}</p>
                      </div>
                    )}
                    {content?.dueDate && (
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">Due Date</p>
                        <p className="font-medium mt-0.5">{formatDate(content.dueDate as string)}</p>
                      </div>
                    )}
                    {content?.invoiceNumber && (
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">Invoice #</p>
                        <p className="font-medium mt-0.5 font-mono">{String(content.invoiceNumber)}</p>
                      </div>
                    )}
                    {content?.projectCode && (
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">Project</p>
                        <p className="font-medium mt-0.5">
                          {content.projectCode} - {content.projectName ?? ''}
                        </p>
                      </div>
                    )}
                  </div>

                  {editMode && (
                    <div className="border-t border-border pt-4 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Edit Fields
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(editContent)
                          .filter(([key]) =>
                            ['vendor', 'paymentNumber', 'currency', 'paymentMethod'].includes(key),
                          )
                          .map(([key, val]) => (
                            <div key={key}>
                              <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                              <Input
                                value={val}
                                onChange={(e) =>
                                  setEditContent((prev) => ({ ...prev, [key]: e.target.value }))
                                }
                                className="mt-1"
                              />
                            </div>
                          ))}
                      </div>
                      <div>
                        <Label className="text-xs">Notes</Label>
                        <Textarea
                          value={editContent.notes ?? ''}
                          onChange={(e) =>
                            setEditContent((prev) => ({ ...prev, notes: e.target.value }))
                          }
                          placeholder="Add notes to the advice..."
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <CreditCardIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Payment</p>
                      <p className="font-mono">{advice.payment?.paymentNumber ?? '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building2Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Project</p>
                      <p>{advice.project ? `${advice.project.code} - ${advice.project.name}` : '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileTextIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Template</p>
                      <p>{advice.template?.name ?? 'Default'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p>{formatDateTime(advice.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                      <p>{formatDateTime(advice.updatedAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AdviceDetailDrawer;
