import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  FileText,
  CreditCard,
  Activity,
} from 'lucide-react';
import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

import {
  getProject,
  getFinancialSummary,
  getProjectDocuments,
  getProjectPayments,
  getProjectActivityLog,
} from '@/api/projects';
import type {
  Project,
  ProjectFinancialSummary,
  Document,
  Payment,
  AuditLog,
} from '@shared/api.interface';

import ProjectInfoCard from './ProjectInfoCard';

const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-HK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [financial, setFinancial] = useState<ProjectFinancialSummary | null>(
    null,
  );
  const [documents, setDocuments] = useState<Document[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activityLog, setActivityLog] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState('documents');

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [proj, fin, docs, pays, log] = await Promise.all([
        getProject(id),
        getFinancialSummary(id),
        getProjectDocuments(id, 1, 20),
        getProjectPayments(id, 1, 20),
        getProjectActivityLog(id, 1, 20),
      ]);
      setProject(proj);
      setFinancial(fin);
      setDocuments(docs.items);
      setPayments(pays.items);
      setActivityLog(log.items);
    } catch (err) {
      logger.error('Failed to fetch project detail', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const docColumns: TableColumnsType<Document> = [
    {
      title: 'Document Name',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      ellipsis: true,
      render: (name: string) => (
        <span className="text-sm font-medium">{name}</span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Badge variant="outline" className="rounded-full">
          {type}
        </Badge>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      align: 'right',
      render: (_: unknown, record: Document) =>
        record.amount ? (
          <span className="font-mono text-sm">
            {formatCurrency(record.amount, record.currency || 'HKD')}
          </span>
        ) : (
          '—'
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => (
        <span className="text-sm capitalize">{status.replace('-', ' ')}</span>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => (
        <span className="text-sm text-muted-foreground font-mono">
          {new Date(date).toLocaleDateString('en-HK')}
        </span>
      ),
    },
  ];

  const paymentColumns: TableColumnsType<Payment> = [
    {
      title: 'Payment #',
      dataIndex: 'paymentNumber',
      key: 'paymentNumber',
      width: 160,
      render: (num: string) => (
        <span className="font-mono text-sm font-medium">{num}</span>
      ),
    },
    {
      title: 'Vendor',
      dataIndex: 'vendor',
      key: 'vendor',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      align: 'right',
      render: (_: unknown, record: Payment) => (
        <span className="font-mono text-sm">
          {formatCurrency(record.amount, record.currency)}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Badge
          variant="outline"
          className={`rounded-full ${
            status === 'processed'
              ? 'bg-success/15 text-success border-success/30'
              : status === 'rejected'
                ? 'bg-destructive/15 text-destructive border-destructive/30'
                : status === 'approved'
                  ? 'bg-info/15 text-info border-info/30'
                  : 'bg-warning/15 text-warning border-warning/30'
          }`}
        >
          <span className="size-1.5 rounded-full bg-current mr-1.5" />
          {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
        </Badge>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date?: string) => (
        <span className="text-sm text-muted-foreground font-mono">
          {date || '—'}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded-sm animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-64 bg-card border border-border rounded-sm animate-pulse" />
          <div className="h-64 bg-card border border-border rounded-sm animate-pulse col-span-2" />
        </div>
      </div>
    );
  }

  if (!project || !financial) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/projects')}
        >
          Back to Projects
        </Button>
      </div>
    );
  }

  const utilization = financial.utilizationPercent;

  return (
    <div className="space-y-4">
      {/* Back button & title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/projects')}
          className="-ml-2"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {project.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">
            {project.code}
          </p>
        </div>
      </div>

      {/* Budget warning banners */}
      {utilization > 100 && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Budget Exceeded</AlertTitle>
          <AlertDescription>
            This project has exceeded its budget by{' '}
            <span className="font-mono font-medium">
              {formatCurrency(
                Math.abs(financial.remainingBudget),
                financial.currency,
              )}
            </span>
            . Current utilization is {utilization.toFixed(1)}%.
          </AlertDescription>
        </Alert>
      )}
      {utilization >= 80 && utilization <= 100 && (
        <Alert variant="warning">
          <AlertTriangle className="size-4" />
          <AlertTitle>Budget Approaching Limit</AlertTitle>
          <AlertDescription>
            This project has used {utilization.toFixed(1)}% of its budget.
            Remaining:{' '}
            <span className="font-mono font-medium">
              {formatCurrency(financial.remainingBudget, financial.currency)}
            </span>
            .
          </AlertDescription>
        </Alert>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Info + Budget */}
        <div className="lg:col-span-1">
          <ProjectInfoCard project={project} financial={financial} />
        </div>

        {/* Right column: Tabs */}
        <div className="lg:col-span-2">
          <Card className="rounded-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Project Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="documents" className="gap-1.5">
                    <FileText className="size-4" />
                    Documents
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({documents.length})
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="gap-1.5">
                    <CreditCard className="size-4" />
                    Payments
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({payments.length})
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="gap-1.5">
                    <Activity className="size-4" />
                    Activity Log
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({activityLog.length})
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="documents" className="mt-4">
                  {documents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="size-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No documents linked yet</p>
                    </div>
                  ) : (
                    <Table
                      rowKey="id"
                      columns={docColumns}
                      dataSource={documents}
                      pagination={false}
                      size="middle"
                      scroll={{ x: 700 }}
                    />
                  )}
                </TabsContent>

                <TabsContent value="payments" className="mt-4">
                  {payments.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CreditCard className="size-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No payments recorded yet</p>
                    </div>
                  ) : (
                    <Table
                      rowKey="id"
                      columns={paymentColumns}
                      dataSource={payments}
                      pagination={false}
                      size="middle"
                      scroll={{ x: 700 }}
                    />
                  )}
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                  {activityLog.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Activity className="size-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No activity recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {activityLog.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
                        >
                          <div className="size-2 mt-2 rounded-full bg-accent shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="rounded-full text-xs"
                                >
                                  {entry.action}
                                </Badge>
                                <span className="text-sm text-foreground font-medium">
                                  {entry.entityType}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground font-mono shrink-0">
                                {new Date(
                                  entry.createdAt,
                                ).toLocaleString('en-HK')}
                              </span>
                            </div>
                            {entry.fieldChanges &&
                              Object.keys(entry.fieldChanges).length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {Object.entries(entry.fieldChanges).map(
                                    ([field, change]) => (
                                      <div
                                        key={field}
                                        className="text-xs flex items-start gap-2"
                                      >
                                        <span className="text-muted-foreground shrink-0 w-28">
                                          {field}
                                        </span>
                                        <span className="text-destructive line-through">
                                          {String(
                                            (change as { before: unknown; after: unknown })
                                              .before ?? '—',
                                          )}
                                        </span>
                                        <span className="text-muted-foreground">
                                          →
                                        </span>
                                        <span className="text-success">
                                          {String(
                                            (change as { before: unknown; after: unknown })
                                              .after ?? '—',
                                          )}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}
                            <p className="text-xs text-muted-foreground mt-1.5">
                              by {entry.createdBy || 'System'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
