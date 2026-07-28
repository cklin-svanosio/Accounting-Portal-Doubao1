import React, { useState, useEffect } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  ArrowRightLeft,
  RefreshCw,
  XCircle,
  Calendar,
  StickyNote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  reconciliation as reconciliationApi,
} from '@/api';
import { StatusBadge, formatCurrency, formatDate } from './reconciliation-utils';
import { MatchDialog } from './MatchDialog';
import { FollowUpDialog } from './FollowUpDialog';
import type {
  ReconciliationSummary,
  Payment,
  Document,
  Reconciliation,
} from '@shared/api.interface';

type ReconciliationRow = Reconciliation & {
  paymentNumber?: string;
  invoiceNumber?: string;
  vendor?: string;
};

const ReconciliationPage: React.FC = () => {
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [unmatchedPayments, setUnmatchedPayments] = useState<Payment[]>([]);
  const [unmatchedDocuments, setUnmatchedDocuments] = useState<Document[]>([]);
  const [history, setHistory] = useState<ReconciliationRow[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [followUpRecord, setFollowUpRecord] = useState<ReconciliationRow | null>(null);
  const [searchPayments, setSearchPayments] = useState('');
  const [searchDocuments, setSearchDocuments] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sumRes, payRes, docRes, histRes] = await Promise.all([
        reconciliationApi.getSummary(),
        reconciliationApi.getUnmatchedPayments(),
        reconciliationApi.getUnmatchedDocuments(),
        reconciliationApi.getReconciliations({ page: 1, pageSize: 20 }),
      ]);
      setSummary(sumRes);
      setUnmatchedPayments(payRes.items);
      setUnmatchedDocuments(docRes.items);
      setHistory(histRes.items);
    } catch (err) {
      logger.error('Failed to load reconciliation data', err);
      toast.error('Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleMatch = async (matchedAmount: number, matchType: 'full' | 'partial') => {
    if (!selectedPaymentId || !selectedDocumentId) return;
    try {
      await reconciliationApi.matchPaymentToDocument({
        paymentId: selectedPaymentId,
        documentId: selectedDocumentId,
        matchedAmount,
        matchType,
      });
      toast.success('Reconciliation matched successfully');
      setSelectedPaymentId(null);
      setSelectedDocumentId(null);
      setMatchDialogOpen(false);
      loadAll();
    } catch (err) {
      logger.error('Failed to match reconciliation', err);
      toast.error('Failed to match reconciliation');
    }
  };

  const handleUnmatch = async (id: string) => {
    try {
      await reconciliationApi.unmatch(id);
      toast.success('Reconciliation unmatched');
      loadAll();
    } catch (err) {
      logger.error('Failed to unmatch', err);
      toast.error('Failed to unmatch reconciliation');
    }
  };

  const handleFollowUpSave = async (followUpDate: string, followUpNotes?: string) => {
    if (!followUpRecord) return;
    try {
      await reconciliationApi.setFollowUp(followUpRecord.id, {
        followUpDate,
        followUpNotes,
      });
      toast.success('Follow-up updated');
      setFollowUpDialogOpen(false);
      setFollowUpRecord(null);
      loadAll();
    } catch (err) {
      logger.error('Failed to update follow-up', err);
      toast.error('Failed to update follow-up');
    }
  };

  const openFollowUp = (record: ReconciliationRow) => {
    setFollowUpRecord(record);
    setFollowUpDialogOpen(true);
  };

  const selectedPayment = unmatchedPayments.find((p) => p.id === selectedPaymentId);
  const selectedDocument = unmatchedDocuments.find((d) => d.id === selectedDocumentId);
  const canMatch = selectedPaymentId && selectedDocumentId;

  const filteredPayments = unmatchedPayments.filter(
    (p) =>
      !searchPayments ||
      p.paymentNumber.toLowerCase().includes(searchPayments.toLowerCase()) ||
      p.vendor.toLowerCase().includes(searchPayments.toLowerCase()),
  );

  const filteredDocuments = unmatchedDocuments.filter(
    (d) =>
      !searchDocuments ||
      (d.invoiceNumber ?? '').toLowerCase().includes(searchDocuments.toLowerCase()) ||
      (d.vendor ?? '').toLowerCase().includes(searchDocuments.toLowerCase()),
  );

  const statCards = [
    {
      label: 'Matched Amount',
      value: summary ? formatCurrency(summary.matchedAmount, summary.matchedCurrency) : '-',
      icon: CheckCircle2,
      accent: 'text-[hsl(152_60%_42%)]',
      bg: 'bg-[hsl(152_60%_96%)]',
    },
    {
      label: 'Partial Payments',
      value: summary?.partialCount ?? 0,
      icon: Clock,
      accent: 'text-[hsl(38_92%_50%)]',
      bg: 'bg-[hsl(38_90%_96%)]',
    },
    {
      label: 'Unmatched Items',
      value: summary?.unmatchedCount ?? 0,
      icon: AlertTriangle,
      accent: 'text-[hsl(0_72%_51%)]',
      bg: 'bg-[hsl(0_70%_97%)]',
    },
    {
      label: 'Under Review',
      value: summary?.underReviewCount ?? 0,
      icon: Eye,
      accent: 'text-[hsl(203_56%_52%)]',
      bg: 'bg-[hsl(203_60%_96%)]',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[hsl(222_47%_11%)]">
            Reconciliation
          </h1>
          <p className="mt-1 text-sm text-[hsl(220_9%_46%)]">
            Match payments to invoices and track follow-ups
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAll}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-ai-section-type="card-stat">
        {statCards.map((card) => (
          <Card key={card.label} className="rounded-sm border-[hsl(220_13%_91%)] shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-[hsl(220_9%_46%)] uppercase tracking-wide">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold font-mono text-[hsl(222_47%_11%)]">
                    {card.value}
                  </p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-sm ${card.bg}`}>
                  <card.icon className={card.accent} size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Match Section */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Unmatched Payments */}
        <Card className="rounded-sm border-[hsl(220_13%_91%)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-3">
            <CardTitle className="text-sm font-semibold text-[hsl(222_47%_11%)]">
              Unmatched Payments
            </CardTitle>
            <span className="rounded-full bg-[hsl(0_70%_97%)] px-2 py-0.5 text-xs font-medium text-[hsl(0_70%_40%)]">
              {unmatchedPayments.length}
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 pb-3">
              <Input
                placeholder="Search payment or vendor..."
                value={searchPayments}
                onChange={(e) => setSearchPayments(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {filteredPayments.length === 0 ? (
                <div className="py-12 text-center text-sm text-[hsl(220_9%_46%)]">
                  {loading ? 'Loading...' : 'No unmatched payments'}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[hsl(220_14%_96%)]">
                    <tr className="text-left text-xs font-medium text-[hsl(220_9%_46%)]">
                      <th className="w-10 px-4 py-2 font-medium"></th>
                      <th className="px-2 py-2 font-medium">Payment #</th>
                      <th className="px-2 py-2 font-medium">Vendor</th>
                      <th className="px-2 py-2 text-right font-medium">Amount</th>
                      <th className="px-4 py-2 text-right font-medium">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        onClick={() => setSelectedPaymentId(payment.id)}
                        className={`h-12 cursor-pointer border-t border-[hsl(220_13%_91%)] transition-colors ${
                          selectedPaymentId === payment.id
                            ? 'bg-[hsl(203_60%_96%)]'
                            : 'hover:bg-[hsl(220_14%_96%)]'
                        }`}
                      >
                        <td className="px-4">
                          <input
                            type="radio"
                            checked={selectedPaymentId === payment.id}
                            onChange={() => setSelectedPaymentId(payment.id)}
                            className="h-4 w-4 accent-[hsl(203_56%_52%)]"
                          />
                        </td>
                        <td className="px-2 font-mono text-xs font-medium text-[hsl(222_47%_11%)]">
                          {payment.paymentNumber}
                        </td>
                        <td className="px-2 text-[hsl(222_47%_11%)] truncate max-w-[140px]">
                          {payment.vendor}
                        </td>
                        <td className="px-2 text-right font-mono text-[hsl(222_47%_11%)]">
                          {formatCurrency(payment.amount, payment.currency)}
                        </td>
                        <td className="px-4 text-right text-xs text-[hsl(220_9%_46%)]">
                          {formatDate(payment.dueDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unmatched Invoices */}
        <Card className="rounded-sm border-[hsl(220_13%_91%)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-3">
            <CardTitle className="text-sm font-semibold text-[hsl(222_47%_11%)]">
              Unmatched Invoices
            </CardTitle>
            <span className="rounded-full bg-[hsl(0_70%_97%)] px-2 py-0.5 text-xs font-medium text-[hsl(0_70%_40%)]">
              {unmatchedDocuments.length}
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 pb-3">
              <Input
                placeholder="Search invoice or vendor..."
                value={searchDocuments}
                onChange={(e) => setSearchDocuments(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {filteredDocuments.length === 0 ? (
                <div className="py-12 text-center text-sm text-[hsl(220_9%_46%)]">
                  {loading ? 'Loading...' : 'No unmatched invoices'}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[hsl(220_14%_96%)]">
                    <tr className="text-left text-xs font-medium text-[hsl(220_9%_46%)]">
                      <th className="w-10 px-4 py-2 font-medium"></th>
                      <th className="px-2 py-2 font-medium">Invoice #</th>
                      <th className="px-2 py-2 font-medium">Vendor</th>
                      <th className="px-2 py-2 text-right font-medium">Amount</th>
                      <th className="px-4 py-2 text-right font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc) => (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedDocumentId(doc.id)}
                        className={`h-12 cursor-pointer border-t border-[hsl(220_13%_91%)] transition-colors ${
                          selectedDocumentId === doc.id
                            ? 'bg-[hsl(203_60%_96%)]'
                            : 'hover:bg-[hsl(220_14%_96%)]'
                        }`}
                      >
                        <td className="px-4">
                          <input
                            type="radio"
                            checked={selectedDocumentId === doc.id}
                            onChange={() => setSelectedDocumentId(doc.id)}
                            className="h-4 w-4 accent-[hsl(203_56%_52%)]"
                          />
                        </td>
                        <td className="px-2 font-mono text-xs font-medium text-[hsl(222_47%_11%)]">
                          {doc.invoiceNumber ?? '-'}
                        </td>
                        <td className="px-2 text-[hsl(222_47%_11%)] truncate max-w-[140px]">
                          {doc.vendor ?? '-'}
                        </td>
                        <td className="px-2 text-right font-mono text-[hsl(222_47%_11%)]">
                          {formatCurrency(doc.amount, doc.currency)}
                        </td>
                        <td className="px-4 text-right text-xs text-[hsl(220_9%_46%)]">
                          {formatDate(doc.invoiceDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => setMatchDialogOpen(true)}
          disabled={!canMatch}
          className="gap-2"
          style={{ backgroundColor: canMatch ? 'hsl(203, 56%, 52%)' : undefined }}
        >
          <ArrowRightLeft size={16} />
          Match Selected
        </Button>
      </div>

      {/* Reconciliation History */}
      <Card className="rounded-sm border-[hsl(220_13%_91%)] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-3">
          <CardTitle className="text-sm font-semibold text-[hsl(222_47%_11%)]">
            Reconciliation History
          </CardTitle>
          <span className="text-xs text-[hsl(220_9%_46%)]">
            {history.length} records
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <div className="py-12 text-center text-sm text-[hsl(220_9%_46%)]">
              {loading ? 'Loading...' : 'No reconciliation records yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[hsl(220_14%_96%)]">
                  <tr className="text-left text-xs font-medium text-[hsl(220_9%_46%)]">
                    <th className="px-4 py-2.5 font-medium">Payment #</th>
                    <th className="px-4 py-2.5 font-medium">Invoice #</th>
                    <th className="px-4 py-2.5 font-medium">Vendor</th>
                    <th className="px-4 py-2.5 text-right font-medium">Matched Amount</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Follow-up</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((rec) => (
                    <tr
                      key={rec.id}
                      className="h-12 border-t border-[hsl(220_13%_91%)]"
                    >
                      <td className="px-4 font-mono text-xs font-medium text-[hsl(222_47%_11%)]">
                        {rec.paymentNumber ?? '-'}
                      </td>
                      <td className="px-4 font-mono text-xs text-[hsl(222_47%_11%)]">
                        {rec.invoiceNumber ?? '-'}
                      </td>
                      <td className="px-4 text-[hsl(222_47%_11%)]">
                        {rec.vendor ?? '-'}
                      </td>
                      <td className="px-4 text-right font-mono text-[hsl(222_47%_11%)]">
                        {formatCurrency(rec.matchedAmount)}
                      </td>
                      <td className="px-4">
                        <StatusBadge status={rec.status} />
                      </td>
                      <td className="px-4 text-xs text-[hsl(220_9%_46%)]">
                        {rec.status === 'partial' ? (
                          rec.followUpDate ? (
                            <div className="flex items-center gap-1">
                              <Calendar size={12} />
                              {formatDate(rec.followUpDate)}
                              {rec.followUpNotes && (
                                <StickyNote size={12} className="ml-1" />
                              )}
                            </div>
                          ) : (
                            <span className="text-[hsl(38_92%_50%)]">Not set</span>
                          )
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {rec.status === 'partial' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openFollowUp(rec)}
                              className="h-7 px-2 text-xs"
                            >
                              <Calendar size={12} className="mr-1" />
                              Follow-up
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnmatch(rec.id)}
                            className="h-7 px-2 text-xs text-[hsl(0_72%_51%)] hover:text-[hsl(0_72%_51%)]"
                          >
                            <XCircle size={12} className="mr-1" />
                            Unmatch
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match Dialog */}
      <MatchDialog
        open={matchDialogOpen}
        onOpenChange={setMatchDialogOpen}
        payment={selectedPayment}
        document={selectedDocument}
        onMatch={handleMatch}
      />

      {/* Follow-up Dialog */}
      <FollowUpDialog
        open={followUpDialogOpen}
        onOpenChange={setFollowUpDialogOpen}
        record={followUpRecord}
        onSave={handleFollowUpSave}
      />
    </div>
  );
};

export default ReconciliationPage;
