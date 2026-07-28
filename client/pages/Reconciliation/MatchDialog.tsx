import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from './reconciliation-utils';
import type { Payment, Document, MatchType } from '@shared/api.interface';

interface MatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | undefined;
  document: Document | undefined;
  onMatch: (matchedAmount: number, matchType: MatchType) => void;
}

export const MatchDialog: React.FC<MatchDialogProps> = ({
  open,
  onOpenChange,
  payment,
  document: doc,
  onMatch,
}) => {
  const [matchedAmount, setMatchedAmount] = useState('');
  const [matchType, setMatchType] = useState<MatchType>('full');

  useEffect(() => {
    if (open && payment) {
      setMatchedAmount(String(payment.amount));
      const docAmount = doc?.amount ?? 0;
      const isFull =
        payment.amount === docAmount && payment.currency === doc?.currency;
      setMatchType(isFull ? 'full' : 'partial');
    }
  }, [open, payment, doc]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(matchedAmount);
    if (amount > 0) {
      onMatch(amount, matchType);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-sm border border-[hsl(220_13%_91%)] bg-white shadow-md">
        <div className="flex items-center justify-between border-b border-[hsl(220_13%_91%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-[hsl(203_56%_52%)]" />
            <h3 className="text-base font-semibold text-[hsl(222_47%_11%)]">
              Match Payment to Invoice
            </h3>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[hsl(220_9%_46%)] hover:text-[hsl(222_47%_11%)]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {/* Payment Info */}
          <div className="rounded-sm border border-[hsl(220_13%_91%)] bg-[hsl(220_14%_96%)] p-3">
            <p className="text-xs font-medium text-[hsl(220_9%_46%)]">Payment</p>
            <p className="mt-1 font-mono text-sm font-semibold text-[hsl(222_47%_11%)]">
              {payment?.paymentNumber ?? '-'}
            </p>
            <p className="text-xs text-[hsl(222_47%_11%)]">{payment?.vendor}</p>
            <p className="mt-1 font-mono text-sm font-semibold text-[hsl(222_47%_11%)]">
              {formatCurrency(payment?.amount ?? 0, payment?.currency)}
            </p>
          </div>

          <div className="flex justify-center">
            <ArrowRightLeft size={16} className="text-[hsl(220_9%_46%)]" />
          </div>

          {/* Document Info */}
          <div className="rounded-sm border border-[hsl(220_13%_91%)] bg-[hsl(220_14%_96%)] p-3">
            <p className="text-xs font-medium text-[hsl(220_9%_46%)]">Invoice</p>
            <p className="mt-1 font-mono text-sm font-semibold text-[hsl(222_47%_11%)]">
              {doc?.invoiceNumber ?? '-'}
            </p>
            <p className="text-xs text-[hsl(222_47%_11%)]">{doc?.vendor ?? '-'}</p>
            <p className="mt-1 font-mono text-sm font-semibold text-[hsl(222_47%_11%)]">
              {formatCurrency(doc?.amount ?? 0, doc?.currency)}
            </p>
          </div>

          {/* Match Type */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[hsl(222_47%_11%)]">
              Match Type
            </label>
            <div className="flex gap-2">
              {(['full', 'partial'] as MatchType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMatchType(type)}
                  className={`flex-1 rounded-sm border px-3 py-2 text-xs font-medium transition-colors ${
                    matchType === type
                      ? 'border-[hsl(203_56%_52%)] bg-[hsl(203_60%_96%)] text-[hsl(203_60%_30%)]'
                      : 'border-[hsl(220_13%_91%)] bg-white text-[hsl(220_9%_46%)] hover:border-[hsl(220_13%_85%)]'
                  }`}
                >
                  {type === 'full' ? 'Full Match' : 'Partial Match'}
                </button>
              ))}
            </div>
          </div>

          {/* Matched Amount */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[hsl(222_47%_11%)]">
              Matched Amount
            </label>
            <Input
              type="number"
              step="0.01"
              value={matchedAmount}
              onChange={(e) => setMatchedAmount(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!matchedAmount || Number(matchedAmount) <= 0}
              style={{ backgroundColor: 'hsl(203, 56%, 52%)' }}
            >
              Confirm Match
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
