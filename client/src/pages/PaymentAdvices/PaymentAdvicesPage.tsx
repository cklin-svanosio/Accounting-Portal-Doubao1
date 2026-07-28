import { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { PlusIcon, SearchIcon, FilterIcon, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Card, CardContent } from '@/components/ui/card';
import { paymentAdvices as advicesApi } from '@/api';
import type { PaymentAdvice, PaymentAdviceStatus, Project } from '@shared/api.interface';
import {
  StatusBadge,
  formatCurrency,
  formatDate,
  STATUS_OPTIONS,
} from './advice-utils';
import GenerateAdviceModal from './GenerateAdviceModal';
import AdviceDetailDrawer from './AdviceDetailDrawer';

const PaymentAdvicesPage = () => {
  const [advices, setAdvices] = useState<PaymentAdvice[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<PaymentAdviceStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAdviceId, setSelectedAdviceId] = useState<string | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  const fetchAdvices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        status: statusFilter === 'all' ? undefined : statusFilter,
        projectId: projectFilter === 'all' ? undefined : projectFilter,
        search: search || undefined,
      };
      const result = await advicesApi.getPaymentAdvices(params);
      setAdvices(result.items);
      setTotal(result.total);
    } catch (err) {
      logger.error('Failed to fetch payment advices', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, projectFilter, search]);

  useEffect(() => {
    fetchAdvices();
  }, [fetchAdvices]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const result = await fetch('/api/projects?pageSize=100');
        const data = await result.json();
        if (data.items) setProjects(data.items);
      } catch (err) {
        logger.error('Failed to load projects', err);
      }
    };
    loadProjects();
  }, []);

  const handleRowClick = (id: string) => {
    setSelectedAdviceId(id);
    setDetailOpen(true);
  };

  const handleGenerated = () => {
    setGenerateOpen(false);
    fetchAdvices();
  };

  const handleUpdated = () => {
    fetchAdvices();
  };

  const handleDeleted = () => {
    setDetailOpen(false);
    setSelectedAdviceId(null);
    fetchAdvices();
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-disabled={page === 1}
              className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          {pages.map((p) => (
            <PaginationItem key={p}>
              <PaginationLink
                isActive={p === page}
                onClick={() => setPage(p)}
                className="cursor-pointer"
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-disabled={page === totalPages}
              className={
                page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Payment Advices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate and manage payment advices for vendors
          </p>
        </div>
        <Button onClick={() => setGenerateOpen(true)}>
          <PlusIcon className="h-4 w-4" />
          Generate Advice
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b border-border">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setStatusFilter(opt.value);
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusFilter === opt.value
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by advice #, payment #, or vendor..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4 text-muted-foreground" />
              <Select
                value={projectFilter}
                onValueChange={(v) => {
                  setProjectFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="h-12">
                <TableHead className="font-mono text-xs font-medium">Advice #</TableHead>
                <TableHead className="text-xs font-medium">Payment #</TableHead>
                <TableHead className="text-xs font-medium">Project</TableHead>
                <TableHead className="text-xs font-medium">Vendor</TableHead>
                <TableHead className="text-xs font-medium text-right">Amount</TableHead>
                <TableHead className="text-xs font-medium">Currency</TableHead>
                <TableHead className="text-xs font-medium">Status</TableHead>
                <TableHead className="text-xs font-medium">Generated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : advices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No payment advices found
                  </TableCell>
                </TableRow>
              ) : (
                advices.map((a) => {
                  const content = (a.content ?? {}) as Record<
                    string,
                    string | number | undefined
                  >;
                  return (
                    <TableRow
                      key={a.id}
                      className="h-12 cursor-pointer"
                      onClick={() => handleRowClick(a.id)}
                    >
                      <TableCell className="font-mono text-sm">{a.adviceNumber}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {content.paymentNumber ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {content.projectCode ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm truncate max-w-[200px]">
                        {content.vendor ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono">
                        {formatCurrency(content.amount, content.currency as string)}
                      </TableCell>
                      <TableCell className="text-sm">{content.currency ?? '-'}</TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(a.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {renderPagination()}
        </CardContent>
      </Card>

      <GenerateAdviceModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onGenerated={handleGenerated}
      />

      <AdviceDetailDrawer
        open={detailOpen}
        adviceId={selectedAdviceId}
        onClose={() => {
          setDetailOpen(false);
          setSelectedAdviceId(null);
        }}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  );
};

export default PaymentAdvicesPage;
