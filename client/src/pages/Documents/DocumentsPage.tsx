import { useCallback, useEffect, useMemo, useState } from 'react';
import { Upload, Search, Eye, FileText } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';

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
  Tabs,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import { Card, CardContent } from '@client/src/components/ui/card';

import * as documentsApi from '@client/src/api/documents';
import {
  StatusBadge,
  formatCurrency,
  formatDate,
  DOCUMENT_TYPES,
  STATUS_OPTIONS,
} from './document-utils';
import ReviewDrawer from './ReviewDrawer';
import UploadModal from './UploadModal';
import type {
  Document,
  DocumentType,
  DocumentStatus,
  DocumentListParams,
} from '@shared/api.interface';

const DocumentsPage = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>(
    'all',
  );
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params: DocumentListParams = {
        page,
        pageSize,
        type: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
      };
      const res = await documentsApi.getDocuments(params);
      setDocuments(res.items);
      setTotal(res.total);
    } catch (err) {
      logger.error('Failed to fetch documents', err);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, typeFilter, statusFilter, search]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleTypeChange = (value: string) => {
    setTypeFilter(value as DocumentType | 'all');
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as DocumentStatus | 'all');
    setPage(1);
  };

  const handleRowClick = (record: Document) => {
    setSelectedDoc(record);
    setDrawerOpen(true);
  };

  const handleDocUpdated = (updated: Document) => {
    setSelectedDoc(updated);
    setDocuments((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d)),
    );
  };

  const columns: TableColumnsType<Document> = useMemo(
    () => [
      {
        title: 'Document Name',
        dataIndex: 'name',
        key: 'name',
        width: 220,
        ellipsis: true,
        render: (text: string) => (
          <div className="flex items-center gap-2">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium text-foreground">
              {text}
            </span>
          </div>
        ),
      },
      {
        title: 'Type',
        dataIndex: 'type',
        key: 'type',
        width: 130,
        render: (type: DocumentType) => (
          <span className="text-xs capitalize text-muted-foreground">
            {type.replace(/-/g, ' ')}
          </span>
        ),
      },
      {
        title: 'Invoice #',
        dataIndex: 'invoiceNumber',
        key: 'invoiceNumber',
        width: 130,
        render: (val?: string) => (
          <span className="font-mono text-xs">{val || '—'}</span>
        ),
      },
      {
        title: 'Vendor',
        dataIndex: 'vendor',
        key: 'vendor',
        width: 170,
        ellipsis: true,
        render: (val?: string) => (
          <span className="truncate text-sm">{val || '—'}</span>
        ),
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        width: 120,
        align: 'right',
        render: (_: unknown, record: Document) => (
          <span className="font-mono text-sm tabular-nums">
            {formatCurrency(record.amount, record.currency)}
          </span>
        ),
      },
      {
        title: 'Currency',
        dataIndex: 'currency',
        key: 'currency',
        width: 80,
        render: (val?: string) => (
          <span className="font-mono text-xs">{val || '—'}</span>
        ),
      },
      {
        title: 'Project',
        dataIndex: 'projectId',
        key: 'projectId',
        width: 150,
        render: (val?: string) => (
          <span className="font-mono text-xs text-muted-foreground">
            {val || '—'}
          </span>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 140,
        render: (status: DocumentStatus) => <StatusBadge status={status} />,
      },
      {
        title: 'Upload Date',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 110,
        render: (val: string) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(val)}
          </span>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 70,
        fixed: 'right',
        render: (_: unknown, record: Document) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick(record);
            }}
          >
            <Eye className="size-3.5" />
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4" data-ai-section-type="card-list">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Documents</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Upload, review and manage financial documents
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" />
          Upload Document
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <Tabs
              value={typeFilter}
              onValueChange={handleTypeChange}
              className="w-full"
            >
              <TabsList className="h-auto w-full flex-wrap gap-1 bg-transparent p-0">
                {DOCUMENT_TYPES.map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="h-7 rounded-full border border-transparent px-3 text-xs data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center gap-2">
              <form
                onSubmit={handleSearch}
                className="relative min-w-[200px] max-w-md flex-1"
              >
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, invoice #, vendor..."
                  className="h-9 pl-8 text-sm"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </form>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-9 w-[160px] text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem
                      key={s.value}
                      value={s.value}
                      className="text-sm"
                    >
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <div className="overflow-hidden rounded-sm border border-border bg-card shadow-sm">
        <Table<Document>
          rowKey="id"
          columns={columns}
          dataSource={documents}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (t: number) => `${t} documents`,
            onChange: (p: number, ps: number) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          onRow={(record: Document) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer', height: 48 },
          })}
          size="small"
          scroll={{ x: 1200 }}
        />
      </div>

      <UploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={fetchDocuments}
      />

      <ReviewDrawer
        document={selectedDoc}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdated={handleDocUpdated}
      />
    </div>
  );
};

export default DocumentsPage;
