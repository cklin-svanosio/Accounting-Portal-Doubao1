import { useState, useEffect } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  PlusIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckIcon,
  FileTextIcon,
  CreditCardIcon,
  LayoutTemplateIcon,
  EyeIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { paymentAdvices as advicesApi } from '@/api';
import type { PaymentAdvice } from '@shared/api.interface';
import { formatCurrency, formatDate } from './advice-utils';

interface PaymentOption {
  id: string;
  paymentNumber: string;
  vendor: string;
  amount: number;
  currency: string;
}

interface TemplateOption {
  id: string;
  name: string;
  isDefault: boolean;
}

interface GenerateAdviceModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (advice: PaymentAdvice) => void;
}

const STEPS = [
  { id: 1, title: 'Select Payment', icon: CreditCardIcon },
  { id: 2, title: 'Select Template', icon: LayoutTemplateIcon },
  { id: 3, title: 'Preview', icon: EyeIcon },
  { id: 4, title: 'Confirm', icon: CheckIcon },
];

const GenerateAdviceModal = ({ open, onClose, onGenerated }: GenerateAdviceModalProps) => {
  const [step, setStep] = useState(1);
  const [payments, setPayments] = useState<PaymentOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewContent, setPreviewContent] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedPayment('');
      setSelectedTemplate('');
      setPreviewContent(null);
      loadOptions();
    }
  }, [open]);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const [paymentsRes, templatesRes] = await Promise.all([
        advicesApi.getPaymentsForDropdown(),
        advicesApi.getTemplatesForDropdown(),
      ]);
      setPayments(paymentsRes.items);
      setTemplates(templatesRes.items);
      const defaultTmpl = templatesRes.items.find((t) => t.isDefault);
      if (defaultTmpl) setSelectedTemplate(defaultTmpl.id);
    } catch (err) {
      logger.error('Failed to load options', err);
      toast.error('Failed to load options');
    } finally {
      setLoading(false);
    }
  };

  const selectedPaymentObj = payments.find((p) => p.id === selectedPayment);
  const selectedTemplateObj = templates.find((t) => t.id === selectedTemplate);

  const canProceed = () => {
    if (step === 1) return !!selectedPayment;
    return true;
  };

  const handleNext = () => {
    if (step === 3) {
      // Build preview
      if (selectedPaymentObj) {
        setPreviewContent({
          adviceNumber: 'ADV-XXXXXXXX-XXXX',
          paymentNumber: selectedPaymentObj.paymentNumber,
          vendor: selectedPaymentObj.vendor,
          amount: selectedPaymentObj.amount,
          currency: selectedPaymentObj.currency,
          templateName: selectedTemplateObj?.name ?? 'Default',
        });
      }
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const handleGenerate = async () => {
    if (!selectedPayment) return;
    setGenerating(true);
    try {
      const advice = await advicesApi.generateAdvice({
        paymentId: selectedPayment,
        templateId: selectedTemplate || undefined,
      });
      toast.success('Payment advice generated successfully');
      onGenerated(advice);
      onClose();
    } catch (err) {
      logger.error('Failed to generate advice', err);
      toast.error('Failed to generate payment advice');
    } finally {
      setGenerating(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-6">
      {STEPS.map((s, idx) => (
        <div key={s.id} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-colors ${
              step >= s.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {step > s.id ? <CheckIcon className="h-4 w-4" /> : s.id}
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={`w-8 h-0.5 mx-1 ${
                step > s.id ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="payment-select">Select Payment</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Choose a payment to generate the advice from
        </p>
        <Select value={selectedPayment} onValueChange={setSelectedPayment}>
          <SelectTrigger id="payment-select" className="w-full">
            <SelectValue placeholder="Select a payment..." />
          </SelectTrigger>
          <SelectContent>
            {payments.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="font-mono mr-2">{p.paymentNumber}</span>
                <span className="text-muted-foreground">{p.vendor}</span>
                <span className="ml-auto font-mono">
                  {formatCurrency(p.amount, p.currency)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedPaymentObj && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selected Payment</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment #</span>
              <span className="font-mono">{selectedPaymentObj.paymentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendor</span>
              <span>{selectedPaymentObj.vendor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-mono">
                {formatCurrency(selectedPaymentObj.amount, selectedPaymentObj.currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="template-select">Select Template</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Choose a template (optional, uses default if not specified)
        </p>
        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
          <SelectTrigger id="template-select" className="w-full">
            <SelectValue placeholder="Select a template..." />
          </SelectTrigger>
          <SelectContent>
            {templates.length === 0 ? (
              <SelectItem value="__default__" disabled>
                No templates found, will use system default
              </SelectItem>
            ) : (
              templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                  {t.isDefault && (
                    <span className="ml-2 text-xs text-muted-foreground">(Default)</span>
                  )}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      {selectedTemplateObj && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selected Template</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{selectedTemplateObj.name}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Type</span>
              <span>Payment Advice</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileTextIcon className="h-4 w-4 text-primary" />
            Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="border-b border-border pb-3">
            <h3 className="text-lg font-bold text-primary">PAYMENT ADVICE</h3>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              {previewContent?.adviceNumber as string ?? 'ADV-XXXXXXXX-XXXX'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Vendor</p>
              <p className="font-medium mt-0.5">{selectedPaymentObj?.vendor ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment #</p>
              <p className="font-medium mt-0.5 font-mono">
                {selectedPaymentObj?.paymentNumber ?? '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount</p>
              <p className="font-medium mt-0.5 font-mono">
                {selectedPaymentObj
                  ? formatCurrency(selectedPaymentObj.amount, selectedPaymentObj.currency)
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Template</p>
              <p className="font-medium mt-0.5">
                {selectedTemplateObj?.name ?? 'Default'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground text-center">
        Review the preview before generating. You can edit the advice after creation.
      </p>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 text-center py-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
        <CheckIcon className="h-8 w-8 text-green-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Ready to Generate</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Click Generate to create the payment advice.
        </p>
      </div>
      <Card className="text-left">
        <CardContent className="pt-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment</span>
            <span className="font-mono">{selectedPaymentObj?.paymentNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Template</span>
            <span>{selectedTemplateObj?.name ?? 'Default'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span>Draft</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusIcon className="h-5 w-5 text-primary" />
            Generate Payment Advice
          </DialogTitle>
          <DialogDescription>
            {STEPS[step - 1]?.title ?? ''}
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="min-h-[320px]">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : (
            renderStepContent()
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || loading || generating}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Back
          </Button>
          {step < 4 ? (
            <Button onClick={handleNext} disabled={!canProceed() || loading}>
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateAdviceModal;
