import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Star, Filter } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

import * as settingsApi from '@/api/settings';
import type { Template, TemplateType } from '@shared/api.interface';

const TEMPLATE_TYPES: { value: TemplateType; label: string }[] = [
  { value: 'payment-advice', label: 'Payment Advice' },
  { value: 'document-export', label: 'Document Export' },
];

interface FormState {
  name: string;
  type: TemplateType;
  fieldMapping: string;
  isDefault: boolean;
}

const TemplatesTab = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: '',
    type: 'payment-advice',
    fieldMapping: '{\n  "vendor": "vendor_name",\n  "amount": "total_amount",\n  "currency": "currency_code"\n}',
    isDefault: false,
  });
  const [jsonError, setJsonError] = useState('');

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsApi.getTemplates(
        filterType === 'all' ? undefined : filterType,
      );
      setTemplates(data);
    } catch (err) {
      logger.error('Failed to load templates', err);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: '',
      type: 'payment-advice',
      fieldMapping: '{\n  "vendor": "vendor_name",\n  "amount": "total_amount",\n  "currency": "currency_code"\n}',
      isDefault: false,
    });
    setJsonError('');
    setDialogOpen(true);
  };

  const openEdit = (tpl: Template) => {
    setEditingId(tpl.id);
    setForm({
      name: tpl.name,
      type: tpl.type,
      fieldMapping: JSON.stringify(tpl.fieldMapping, null, 2),
      isDefault: tpl.isDefault,
    });
    setJsonError('');
    setDialogOpen(true);
  };

  const validateJson = (value: string): boolean => {
    try {
      JSON.parse(value);
      setJsonError('');
      return true;
    } catch {
      setJsonError('Invalid JSON format');
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateJson(form.fieldMapping)) return;
    try {
      const payload = {
        name: form.name,
        type: form.type,
        fieldMapping: JSON.parse(form.fieldMapping) as Record<string, unknown>,
        isDefault: form.isDefault,
      };
      if (editingId) {
        await settingsApi.updateTemplate(editingId, payload);
      } else {
        await settingsApi.createTemplate(payload);
      }
      setDialogOpen(false);
      loadTemplates();
    } catch (err) {
      logger.error('Failed to save template', err);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await settingsApi.setDefaultTemplate(id);
      loadTemplates();
    } catch (err) {
      logger.error('Failed to set default template', err);
    }
  };

  const filtered = templates;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Templates</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 h-8">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {TEMPLATE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? 'Edit Template' : 'Create Template'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label htmlFor="tpl-name">Template Name</Label>
                    <Input
                      id="tpl-name"
                      placeholder="e.g. Standard Payment Advice"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tpl-type">Template Type</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => setForm({ ...form, type: v as TemplateType })}
                    >
                      <SelectTrigger id="tpl-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tpl-mapping">Field Mapping (JSON)</Label>
                    <Textarea
                      id="tpl-mapping"
                      className="font-mono text-xs h-48"
                      value={form.fieldMapping}
                      onChange={(e) => {
                        setForm({ ...form, fieldMapping: e.target.value });
                        validateJson(e.target.value);
                      }}
                    />
                    {jsonError && (
                      <p className="text-xs text-destructive">{jsonError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Define source-to-output field mapping in JSON format
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="tpl-default"
                      checked={form.isDefault}
                      onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                      className="size-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <Label htmlFor="tpl-default" className="cursor-pointer">
                      Set as default template for this type
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={!!jsonError || !form.name}>
                    {editingId ? 'Save Changes' : 'Create Template'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No templates found
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((tpl) => (
              <div
                key={tpl.id}
                className="flex items-center justify-between p-4 rounded-sm border bg-card hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-sm bg-accent/10 flex items-center justify-center">
                    <Star className="size-5 text-accent" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{tpl.name}</span>
                      {tpl.isDefault && (
                        <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {TEMPLATE_TYPES.find((t) => t.value === tpl.type)?.label || tpl.type}
                      {' · '}
                      {Object.keys(tpl.fieldMapping || {}).length} fields mapped
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(tpl)}>
                    <Pencil className="size-3.5 mr-1" />
                    Edit
                  </Button>
                  {!tpl.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(tpl.id)}
                    >
                      <Star className="size-3.5 mr-1" />
                      Set Default
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TemplatesTab;
