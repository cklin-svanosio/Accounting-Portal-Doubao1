import { useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { payments as paymentsApi } from '@/api';
import type { Project, Document, CreatePaymentRequest } from '@shared/api.interface';
import { formatCurrency } from './payment-utils';

interface CreatePaymentModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  projects: Project[];
}

const CreatePaymentModal = ({
  open,
  onClose,
  onCreated,
  projects,
}: CreatePaymentModalProps) => {
  const [form, setForm] = useState<CreatePaymentRequest>({
    vendor: '',
    amount: 0,
    currency: 'HKD',
    exchangeRate: 1,
    paymentMethod: 'bank-transfer',
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);

  const handleProjectChange = async (projectId: string) => {
    setForm((f) => ({ ...f, projectId: projectId === 'none' ? undefined : projectId }));
    if (projectId && projectId !== 'none') {
      setDocsLoading(true);
      try {
        const res = await fetch(
          `/api/documents?projectId=${projectId}&status=approved&type=invoice&pageSize=50`,
        );
        const data = await res.json();
        if (data.items) setDocuments(data.items);
      } catch (err) {
        logger.error('Failed to load documents', err);
      } finally {
        setDocsLoading(false);
      }
    } else {
      setDocuments([]);
    }
  };

  const handleDocumentChange = (docId: string) => {
    setSelectedDocId(docId);
    if (docId) {
      const doc = documents.find((d) => d.id === docId);
      if (doc) {
        setForm((f) => ({
          ...f,
          documentId: doc.id,
          vendor: doc.vendor ?? f.vendor,
          amount: doc.amount ?? f.amount,
          currency: doc.currency ?? f.currency,
          exchangeRate: doc.exchangeRate ?? f.exchangeRate,
        }));
      }
    }
  };

  const hkdEquivalent =
    form.amount && form.exchangeRate ? form.amount * form.exchangeRate : 0;

  const handleSubmit = async () => {
    if (!form.vendor || !form.amount || !form.currency) {
      toast.error('Please fill in required fields');
      return;
    }
    setLoading(true);
    try {
      await paymentsApi.createPayment(form);
      toast.success('Payment created successfully');
      onCreated();
      // Reset form
      setForm({
        vendor: '',
        amount: 0,
        currency: 'HKD',
        exchangeRate: 1,
        paymentMethod: 'bank-transfer',
      });
      setSelectedDocId('');
    } catch (err) {
      logger.error('Failed to create payment', err);
      toast.error('Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={form.projectId ?? 'none'}
                onValueChange={handleProjectChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Invoice / Document</Label>
              <Select
                value={selectedDocId}
                onValueChange={handleDocumentChange}
                disabled={!form.projectId || docsLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={docsLoading ? 'Loading...' : 'Select invoice'}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {documents.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.invoiceNumber ?? d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vendor</Label>
            <Input
              value={form.vendor}
              onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
              placeholder="Vendor name"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={form.amount || ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HKD">HKD</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CNY">CNY</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Exchange Rate</Label>
              <Input
                type="number"
                step="0.0001"
                value={form.exchangeRate ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    exchangeRate: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={form.paymentMethod ?? 'bank-transfer'}
                onValueChange={(v) => setForm((f) => ({ ...f, paymentMethod: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit-card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.dueDate ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dueDate: e.target.value || undefined }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>HKD Equivalent</Label>
            <div className="h-9 px-3 flex items-center rounded-md border border-border bg-muted/30 font-mono text-sm">
              {formatCurrency(hkdEquivalent, 'HKD')}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={form.approvalComments ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, approvalComments: e.target.value }))
              }
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePaymentModal;
