import { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  History,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Save,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';

import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@client/src/components/ui/drawer';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@client/src/components/ui/alert';
import { Label } from '@client/src/components/ui/label';
import { Card, CardContent } from '@client/src/components/ui/card';
import { Separator } from '@client/src/components/ui/separator';

import * as documentsApi from '@client/src/api/documents';
import {
  StatusBadge,
  formatDate,
  formatFileSize,
} from './document-utils';
import { VersionList } from './VersionList';
import type { Document } from '@shared/api.interface';

interface ReviewDrawerProps {
  document: Document | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (doc: Document) => void;
}

const ReviewDrawer = ({
  document: doc,
  open,
  onClose,
  onUpdated,
}: ReviewDrawerProps) => {
  const [activeTab, setActiveTab] = useState('details');
  const [editing, setEditing] = useState<Partial<Document>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (doc) {
      setEditing({});
      setActiveTab('details');
    }
  }, [doc?.id]);

  const handleSaveEdits = async () => {
    if (!doc || Object.keys(editing).length === 0) return;
    setSaving(true);
    try {
      const updated = await documentsApi.updateDocument(doc.id, editing);
      onUpdated(updated);
      setEditing({});
      toast.success('Document updated');
    } catch (err) {
      logger.error('Failed to update document', err);
        toast.error('Failed to update document');
    } finally {
      setSaving(false);
    }
  };

  const handleReviewAction = async (
    action: 'approve' | 'reject' | 'correct',
  ) => {
    if (!doc) return;
    setSaving(true);
    try {
      const fields =
        action === 'correct' && Object.keys(editing).length > 0
          ? editing
          : undefined;
      const updated = await documentsApi.reviewDocument(doc.id, {
        action,
        fields,
      });
      onUpdated(updated);
      setEditing({});
      toast.success(
        action === 'approve'
          ? 'Document approved'
          : action === 'reject'
            ? 'Sent back for correction'
            : 'Corrections submitted for review',
      );
    } catch (err) {
      logger.error('Review action failed', err);
      toast.error('Action failed');
    } finally {
      setSaving(false);
    }
  };

  if (!doc) return null;

  const fieldValue = <K extends keyof Document>(key: K): Document[K] => {
    return (editing[key] as Document[K]) ?? doc[key];
  };

  return (
    <Drawer open={open} onOpenChange={onClose} direction="right">
      <DrawerContent className="h-full w-full max-w-xl border-l">
        <DrawerHeader className="border-b pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="truncate text-base font-semibold">
                {doc.name}
              </DrawerTitle>
              <DrawerDescription className="mt-1 flex items-center gap-2 text-xs">
                <FileSpreadsheet className="size-3.5" />
                v{doc.version} · Updated {formatDate(doc.updatedAt)}
              </DrawerDescription>
            </div>
            <StatusBadge status={doc.status} />
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          {doc.status === 'duplicate' && (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>Duplicate invoice detected</AlertTitle>
                <AlertDescription>
                  This invoice number already exists in the system.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="px-4 pt-2"
          >
            <TabsList>
              <TabsTrigger value="details" className="text-xs">
                Details
              </TabsTrigger>
              <TabsTrigger value="versions" className="text-xs">
                <History className="mr-1 size-3.5" />
                Versions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-4">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {doc.name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatFileSize(doc.fileSize)} · PDF
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 gap-1 text-xs"
                        onClick={() => window.open(doc.fileUrl, '_blank')}
                      >
                        <ExternalLink className="size-3.5" />
                        View PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Extracted Fields
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Invoice #
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      value={fieldValue('invoiceNumber') || ''}
                      onChange={(e) =>
                        setEditing((p) => ({
                          ...p,
                          invoiceNumber: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Vendor
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      value={fieldValue('vendor') || ''}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, vendor: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Amount
                    </Label>
                    <Input
                      type="number"
                      className="h-8 font-mono text-xs"
                      value={fieldValue('amount') ?? ''}
                      onChange={(e) =>
                        setEditing((p) => ({
                          ...p,
                          amount: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Currency
                    </Label>
                    <Select
                      value={fieldValue('currency') || ''}
                      onValueChange={(v) =>
                        setEditing((p) => ({ ...p, currency: v }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {['HKD', 'USD', 'EUR', 'GBP', 'CNY', 'JPY'].map(
                          (c) => (
                            <SelectItem key={c} value={c} className="text-xs">
                              {c}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Exchange Rate
                    </Label>
                    <Input
                      type="number"
                      step="0.0001"
                      className="h-8 font-mono text-xs"
                      value={fieldValue('exchangeRate') ?? ''}
                      onChange={(e) =>
                        setEditing((p) => ({
                          ...p,
                          exchangeRate: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Invoice Date
                    </Label>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={fieldValue('invoiceDate') || ''}
                      onChange={(e) =>
                        setEditing((p) => ({
                          ...p,
                          invoiceDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Project ID
                    </Label>
                    <Input
                      className="h-8 font-mono text-xs"
                      value={fieldValue('projectId') || ''}
                      onChange={(e) =>
                        setEditing((p) => ({
                          ...p,
                          projectId: e.target.value || undefined,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="bg-success text-success-foreground hover:bg-success/90"
                  disabled={saving || doc.status === 'approved'}
                  onClick={() => handleReviewAction('approve')}
                >
                  <CheckCircle2 className="size-4" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={saving || doc.status === 'needs-correction'}
                  onClick={() => handleReviewAction('reject')}
                >
                  <XCircle className="size-4" />
                  Request Correction
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving || Object.keys(editing).length === 0}
                  onClick={handleSaveEdits}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save Edits
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="versions" className="mt-4">
              <VersionList documentId={doc.id} />
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ReviewDrawer;
