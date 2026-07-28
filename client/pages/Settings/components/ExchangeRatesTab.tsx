import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Ban, AlertTriangle } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import * as settingsApi from '@/api/settings';
import type { ExchangeRate } from '@shared/api.interface';

const isStale = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return diffMs > 30 * 24 * 60 * 60 * 1000;
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

interface FormState {
  currency: string;
  rateToHkd: string;
  effectiveDate: string;
}

const ExchangeRatesTab = () => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    currency: '',
    rateToHkd: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
  });

  const loadRates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsApi.getExchangeRates();
      setRates(data);
    } catch (err) {
      logger.error('Failed to load exchange rates', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      currency: '',
      rateToHkd: '',
      effectiveDate: new Date().toISOString().slice(0, 10),
    });
    setDialogOpen(true);
  };

  const openEdit = (rate: ExchangeRate) => {
    setEditingId(rate.id);
    setForm({
      currency: rate.currency,
      rateToHkd: String(rate.rateToHkd),
      effectiveDate: rate.effectiveDate,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        currency: form.currency.toUpperCase(),
        rateToHkd: parseFloat(form.rateToHkd),
        effectiveDate: form.effectiveDate,
      };
      if (editingId) {
        await settingsApi.updateExchangeRate(editingId, payload);
      } else {
        await settingsApi.createExchangeRate(payload);
      }
      setDialogOpen(false);
      loadRates();
    } catch (err) {
      logger.error('Failed to save exchange rate', err);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await settingsApi.deactivateExchangeRate(id);
      loadRates();
    } catch (err) {
      logger.error('Failed to deactivate exchange rate', err);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Exchange Rates</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add Rate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Edit Exchange Rate' : 'Add Exchange Rate'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency Code</Label>
                <Input
                  id="currency"
                  placeholder="e.g. USD"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  disabled={!!editingId}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Rate to HKD</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 7.80"
                  value={form.rateToHkd}
                  onChange={(e) => setForm({ ...form, rateToHkd: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveDate">Effective Date</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={form.effectiveDate}
                  onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingId ? 'Save Changes' : 'Create Rate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Current Rate (to HKD)</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!loading && rates.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No exchange rates found
                </TableCell>
              </TableRow>
            )}
            {!loading && rates.map((rate) => {
              const stale = rate.status === 'active' && isStale(rate.effectiveDate);
              return (
                <TableRow key={rate.id}>
                  <TableCell className="font-mono font-medium">{rate.currency}</TableCell>
                  <TableCell className="text-right font-mono">
                    {rate.rateToHkd.toFixed(4)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{formatDate(rate.effectiveDate)}</span>
                      {stale && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border border-amber-200"
                          title="Rate not updated in 30+ days"
                        >
                          <AlertTriangle className="size-3 mr-1" />
                          Stale
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {rate.status === 'active' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-50 text-slate-600 border border-slate-200">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(rate)}
                      >
                        <Pencil className="size-3.5 mr-1" />
                        Edit
                      </Button>
                      {rate.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeactivate(rate.id)}
                        >
                          <Ban className="size-3.5 mr-1" />
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ExchangeRatesTab;
