import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Search, Plus, FolderKanban } from 'lucide-react';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { listProjects } from '@/api/projects';
import type { Project, ProjectStatus } from '@shared/api.interface';

import NewProjectModal from './NewProjectModal';

const STATUS_OPTIONS: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'archived', label: 'Archived' },
];

const statusVariant: Record<ProjectStatus, string> = {
  active: 'bg-success/15 text-success border-success/30',
  completed: 'bg-info/15 text-info border-info/30',
  'on-hold': 'bg-warning/15 text-warning border-warning/30',
  archived: 'bg-muted text-muted-foreground border-border',
};

const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-HK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const getUtilizationColor = (percent: number): string => {
  if (percent > 100) return 'bg-destructive';
  if (percent >= 80) return 'bg-warning';
  return 'bg-success';
};

const ProjectsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listProjects({
        page,
        pageSize,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setProjects(result.items);
      setTotal(result.total);
    } catch (err) {
      logger.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      setStatusFilter(value);
      setPage(1);
    },
    [],
  );

  const handleRowClick = useCallback(
    (record: Project) => {
      navigate(`/projects/${record.id}`);
    },
    [navigate],
  );

  const columns = useMemo<TableColumnsType<Project>>(
    () => [
      {
        title: 'Project Code',
        dataIndex: 'code',
        key: 'code',
        width: 140,
        render: (code: string) => (
          <span className="font-mono text-sm font-medium">{code}</span>
        ),
      },
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: 240,
        ellipsis: true,
        render: (name: string) => (
          <span className="text-sm font-medium text-foreground">{name}</span>
        ),
      },
      {
        title: 'Responsible Person',
        dataIndex: 'responsiblePerson',
        key: 'responsiblePerson',
        width: 160,
        render: (person?: string) => (
          <span className="text-sm text-muted-foreground">
            {person || '—'}
          </span>
        ),
      },
      {
        title: 'Budget',
        dataIndex: 'budget',
        key: 'budget',
        width: 140,
        align: 'right',
        render: (_: unknown, record: Project) => (
          <span className="font-mono text-sm">
            {formatCurrency(record.budget, record.currency)}
          </span>
        ),
      },
      {
        title: 'Budget Utilization',
        dataIndex: 'utilization',
        key: 'utilization',
        width: 200,
        render: (_: unknown, record: Project) => {
          // Placeholder — actual utilization comes from financial summary
          const percent = Math.min(
            Math.round((record.budget * 0.5 / record.budget) * 100),
            100,
          );
          return (
            <div className="flex items-center gap-3 min-w-[180px]">
              <Progress
                value={percent}
                className={`h-1.5 flex-1 [&>div]:${getUtilizationColor(percent)}`}
              />
              <span className="font-mono text-xs text-muted-foreground w-12 text-right">
                {percent}%
              </span>
            </div>
          );
        },
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status: ProjectStatus) => (
          <Badge
            variant="outline"
            className={`rounded-full ${statusVariant[status]}`}
          >
            <span className="size-1.5 rounded-full bg-current mr-1.5" />
            {status.charAt(0).toUpperCase() +
              status.slice(1).replace('-', ' ')}
          </Badge>
        ),
      },
      {
        title: 'Start Date',
        dataIndex: 'startDate',
        key: 'startDate',
        width: 120,
        render: (date?: string) => (
          <span className="text-sm text-muted-foreground font-mono">
            {date || '—'}
          </span>
        ),
      },
      {
        title: 'End Date',
        dataIndex: 'endDate',
        key: 'endDate',
        width: 120,
        render: (date?: string) => (
          <span className="text-sm text-muted-foreground font-mono">
            {date || '—'}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track project budgets, spending, and financial performance
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="size-4" />
          New Project
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger size="sm" className="w-40 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-sm shadow-sm overflow-hidden">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={projects}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (t) => `Total ${t} projects`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' },
          })}
          size="middle"
          scroll={{ x: 1100 }}
        />
      </div>

      <NewProjectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={() => {
          fetchProjects();
        }}
      />
    </div>
  );
};

export default ProjectsPage;
