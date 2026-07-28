import React, { useState, useEffect } from 'react';
import { Calendar, StickyNote, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Reconciliation } from '@shared/api.interface';

type ReconciliationRow = Reconciliation & {
  paymentNumber?: string;
  invoiceNumber?: string;
  vendor?: string;
};

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: ReconciliationRow | null;
  onSave: (followUpDate: string, followUpNotes?: string) => void;
}

export const FollowUpDialog: React.FC<FollowUpDialogProps> = ({
  open,
  onOpenChange,
  record,
  onSave,
}) => {
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  useEffect(() => {
    if (open && record) {
      setFollowUpDate(record.followUpDate ?? '');
      setFollowUpNotes(record.followUpNotes ?? '');
    }
  }, [open, record]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (followUpDate) {
      onSave(followUpDate, followUpNotes || undefined);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-sm border border-[hsl(220_13%_91%)] bg-white shadow-md">
        <div className="flex items-center justify-between border-b border-[hsl(220_13%_91%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[hsl(38_92%_50%)]" />
            <h3 className="text-base font-semibold text-[hsl(222_47%_11%)]">
              Set Follow-up
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
          <div className="rounded-sm border border-[hsl(220_13%_91%)] bg-[hsl(38_90%_96%)] p-3">
            <p className="text-xs font-medium text-[hsl(38_80%_35%)]">
              Partial Reconciliation
            </p>
            <p className="mt-1 font-mono text-xs text-[hsl(222_47%_11%)]">
              {record?.paymentNumber ?? '-'} / {record?.invoiceNumber ?? '-'}
            </p>
            <p className="text-xs text-[hsl(222_47%_11%)]">{record?.vendor}</p>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[hsl(222_47%_11%)]">
              <Calendar size={12} />
              Follow-up Date
            </label>
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[hsl(222_47%_11%)]">
              <StickyNote size={12} />
              Notes (optional)
            </label>
            <textarea
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
              rows={3}
              placeholder="Add follow-up notes..."
              className="w-full rounded-md border border-[hsl(220_13%_91%)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[hsl(203_56%_52%)] focus:ring-1 focus:ring-[hsl(203_56%_52%)]/20"
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
              disabled={!followUpDate}
              style={{ backgroundColor: 'hsl(203, 56%, 52%)' }}
            >
              Save Follow-up
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
