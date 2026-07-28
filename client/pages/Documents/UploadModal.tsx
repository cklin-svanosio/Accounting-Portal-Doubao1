import { useState } from 'react';
import {
  Upload,
  FileUp,
  Loader2,
  FileText,
  X,
  Sparkles,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';

import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Label } from '@client/src/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';

import * as documentsApi from '@client/src/api/documents';
import { DOCUMENT_TYPES, formatFileSize } from './document-utils';
import type { DocumentType } from '@shared/api.interface';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}

const UploadModal = ({ open, onOpenChange, onUploaded }: UploadModalProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<DocumentType>('invoice');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<
    'idle' | 'uploading' | 'extracting' | 'done'
  >('idle');

  const reset = () => {
    setUploadFile(null);
    setUploadStage('idle');
    setUploadProgress(0);
    setUploadType('invoice');
    setUploading(false);
  };

  const handleClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) reset();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadStage('idle');
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadFile(file);
      setUploadStage('idle');
      setUploadProgress(0);
    } else {
      toast.error('Please upload a PDF file');
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadStage('uploading');
    setUploadProgress(0);

    try {
      for (let i = 0; i <= 80; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        setUploadProgress(i);
      }

      const mockFileUrl = `https://example.com/documents/${Date.now()}/${uploadFile.name}`;

      setUploadStage('extracting');
      setUploadProgress(90);

      const result = await documentsApi.createDocument({
        name: uploadFile.name,
        type: uploadType,
        fileUrl: mockFileUrl,
        fileSize: uploadFile.size,
      });

      setUploadProgress(100);
      setUploadStage('done');

      toast.success(
        result.isDuplicate
          ? 'Document uploaded (duplicate detected)'
          : 'Document uploaded successfully',
      );

      onUploaded();
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 800);
    } catch (err) {
      logger.error('Upload failed', err);
      toast.error('Failed to upload document');
      setUploadStage('idle');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a PDF document for AI-powered data extraction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Document Type
            </Label>
            <Select
              value={uploadType}
              onValueChange={(v) => setUploadType(v as DocumentType)}
              disabled={uploading}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.filter((t) => t.value !== 'all').map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-sm">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="relative flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:border-accent/50"
          >
            {uploadFile ? (
              <div className="flex w-full items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-medium">
                    {uploadFile.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(uploadFile.size)}
                  </div>
                </div>
                {!uploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setUploadFile(null)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ) : (
              <>
                <FileUp className="mb-2 size-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drag and drop PDF here</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  or click to browse
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </>
            )}
          </div>

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {uploadStage === 'uploading' ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : uploadStage === 'extracting' ? (
                    <>
                      <Sparkles className="size-3.5 animate-pulse text-accent" />
                      AI extracting data...
                    </>
                  ) : (
                    'Done'
                  )}
                </span>
                <span className="font-mono text-muted-foreground">
                  {uploadProgress}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              reset();
            }}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Processing
              </>
            ) : (
              <>
                <Upload className="size-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;
