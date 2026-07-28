import { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { exceptions, reports } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import type {
  ExceptionRecord,
  ExceptionStatus,
  ExceptionCategory,
  ExceptionSeverity,
} from '@shared/api.interface';

const severityColor: Record<string, string> = {
  critical: '#DC2626',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#6B7280',
};

const statusColor: Record<string, string> = {
  open: '#DC2626',
  'in-review': '#F59E0B',
  resolved: '#10B981',
  'false-positive': '#6B7280',
};

const ExceptionsPage = () => {
  const [items, setItems] = useState<ExceptionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [severity, setSeverity] = useState<string>('all');

  const [selected, setSelected] = useState<ExceptionRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<ExceptionStatus>('open');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const res = await exceptions.getExceptions({
          page,
          pageSize,
          status: status === 'all' ? undefined : (status as ExceptionStatus),
          category: category === 'all' ? undefined : (category as ExceptionCategory),
          severity: severity === 'all' ? undefined : (severity as ExceptionSeverity),
        });
        setItems(res.items);
        setTotal(res.total);
      } catch (err) {
        logger.error('Exceptions load failed', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, pageSize, status, category, severity]);

  const openDetail = async (id: string): Promise<void> => {
    try {
      const ex = await exceptions.getExceptionById(id);
      setSelected(ex);
      setUpdateStatus(ex.status);
      setResolutionNotes(ex.resolutionNotes ?? '');
      setDetailOpen(true);
    } catch (err) {
      logger.error('Exception detail load failed', err);
      toast.error('Failed to load exception detail');
    }
  };

  const handleUpdate = async (): Promise<void> => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await exceptions.updateException(selected.id, {
        status: updateStatus,
        resolutionNotes,
      });
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSelected(updated);
      toast.success('Exception updated successfully');
      setDetailOpen(false);
    } catch (err) {
      logger.error('Exception update failed', err);
      toast.error('Failed to update exception');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const statsCards = [
    { label: 'Total Exceptions', value: total, icon: AlertTriangle, color: '#0A2463' },
    { label: 'Open', value: items.filter((i) => i.status === 'open').length, icon: Clock, color: '#DC2626' },
    { label: 'In Review', value: items.filter((i) => i.status === 'in-review').length, icon: AlertTriangle, color: '#F59E0B' },
    { label: 'Resolved', value: items.filter((i) => i.status === 'resolved').length, icon: CheckCircle, color: '#10B981' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Exception Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and resolve system exceptions
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-ai-section-type="card-stat">
        {statsCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="shadow-sm border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                  <div className="p-1.5 rounded-sm" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">{s.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-review">In Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="false-positive">False Positive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Category:</span>
              <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="extraction-mismatch">Extraction Mismatch</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                  <SelectItem value="budget-overrun">Budget Overrun</SelectItem>
                  <SelectItem value="reconciliation">Reconciliation</SelectItem>
                  <SelectItem value="rate-expired">Rate Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Severity:</span>
              <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm border">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Exception List
            <span className="text-xs text-muted-foreground ml-2 font-normal">
              {total} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Table>
            <TableHeader>
              <TableRow className="h-12">
                <TableHead>Severity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id} className="h-12">
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-medium"
                      style={{ borderLeft: `3px solid ${severityColor[row.severity] || '#6B7280'}` }}
                    >
                      {row.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize text-sm">{row.category}</TableCell>
                  <TableCell className="text-sm font-medium">{row.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">
                    {row.entityType}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-medium capitalize"
                      style={{ borderLeft: `3px solid ${statusColor[row.status] || '#6B7280'}` }}
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground font-mono">
                    {new Date(row.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(row.id)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No exceptions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" style={{ color: selected ? severityColor[selected.severity] : '#6B7280' }} />
              Exception Detail
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Severity</div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium"
                    style={{ borderLeft: `3px solid ${severityColor[selected.severity] || '#6B7280'}` }}
                  >
                    {selected.severity}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Category</div>
                  <div className="text-sm capitalize">{selected.category}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Entity Type</div>
                  <div className="text-sm capitalize">{selected.entityType}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Created</div>
                  <div className="text-sm font-mono">
                    {new Date(selected.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Title</div>
                <div className="text-sm font-medium">{selected.title}</div>
              </div>

              {selected.description && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Description</div>
                  <div className="text-sm text-foreground bg-muted/30 p-3 rounded-sm">
                    {selected.description}
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Update Status</div>
                  <Select value={updateStatus} onValueChange={(v) => setUpdateStatus(v as ExceptionStatus)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-review">In Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="false-positive">False Positive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Resolution Notes</div>
                  <Textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Add resolution notes..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? 'Saving...' : 'Update Exception'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExceptionsPage;
