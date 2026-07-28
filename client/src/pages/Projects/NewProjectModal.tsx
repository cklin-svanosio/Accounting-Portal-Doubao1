import { useState, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Sparkles, ChevronLeft, ChevronRight, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { suggestCode, createProject } from '@/api/projects';
import type { CreateProjectPayload } from '@/api/projects';

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Financial Info' },
  { id: 3, label: 'Time & People' },
];

const CURRENCIES = ['HKD', 'USD', 'CNY', 'EUR', 'GBP', 'SGD', 'JPY'];

interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (project: { id: string }) => void;
}

const NewProjectModal = ({
  open,
  onOpenChange,
  onCreated,
}: NewProjectModalProps) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateProjectPayload>({
    code: '',
    name: '',
    description: '',
    budget: 0,
    currency: 'HKD',
    startDate: '',
    endDate: '',
    responsiblePerson: '',
  });

  const updateField = useCallback(
    <K extends keyof CreateProjectPayload>(
      key: K,
      value: CreateProjectPayload[K],
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSuggestCode = useCallback(async () => {
    try {
      const result = await suggestCode('PRJ');
      updateField('code', result.suggestedCode);
    } catch (err) {
      logger.error('Failed to suggest project code', { err });
    }
  }, [updateField]);

  const canNext = () => {
    if (step === 1) return form.code.trim() && form.name.trim();
    if (step === 2) return form.budget > 0 && form.currency;
    if (step === 3) return true;
    return false;
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!canNext()) return;
    setSubmitting(true);
    try {
      const created = await createProject({
        ...form,
        budget: Number(form.budget),
      });
      logger.info(`Project created: ${created.id}`);
      onCreated?.(created);
      onOpenChange(false);
      setStep(1);
      setForm({
        code: '',
        name: '',
        description: '',
        budget: 0,
        currency: 'HKD',
        startDate: '',
        endDate: '',
        responsiblePerson: '',
      });
    } catch (err) {
      logger.error('Failed to create project', { err });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStep(1);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Create a new project to track budget and spending.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={`size-7 flex items-center justify-center rounded-sm text-xs font-medium ${
                    step >= s.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s.id ? <Check className="size-4" /> : s.id}
                </div>
                <span
                  className={`text-xs font-medium ${
                    step >= s.id ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px mx-3 ${
                    step > s.id ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="min-h-[280px] py-2">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Project Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => updateField('code', e.target.value)}
                    placeholder="e.g. PRJ-001"
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSuggestCode}
                    className="shrink-0"
                  >
                    <Sparkles className="size-4" />
                    Suggest
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Enter project name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description || ''}
                  onChange={(e) =>
                    updateField('description', e.target.value)
                  }
                  placeholder="Brief description of the project"
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.budget || ''}
                  onChange={(e) =>
                    updateField('budget', Number(e.target.value))
                  }
                  placeholder="Enter budget amount"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(val) => updateField('currency', val)}
                >
                  <SelectTrigger id="currency" className="w-full">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((cur) => (
                      <SelectItem key={cur} value={cur}>
                        {cur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate || ''}
                    onChange={(e) =>
                      updateField('startDate', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate || ''}
                    onChange={(e) => updateField('endDate', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsiblePerson">Responsible Person</Label>
                <Input
                  id="responsiblePerson"
                  value={form.responsiblePerson || ''}
                  onChange={(e) =>
                    updateField('responsiblePerson', e.target.value)
                  }
                  placeholder="Enter responsible person's name"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handlePrev}
            disabled={step === 1}
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canNext()}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !canNext()}
              >
                {submitting ? 'Creating...' : 'Create Project'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectModal;
