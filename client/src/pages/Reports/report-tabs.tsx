import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  InvoiceVolumePoint,
  ProjectFinancialRow,
  PaymentStatusBreakdown,
  PaymentAgingBucket,
  ExceptionRecord,
  AuditLog,
} from '@shared/api.interface';

const NAVY = '#0A2463';
const TEAL = '#3E92CC';
const AMBER = '#F59E0B';
const RED = '#DC2626';
const GREEN = '#10B981';

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

// ─── Tab 1: Invoice Volume ────────────────────────────────────────────

interface InvoiceVolumeTabProps {
  data: InvoiceVolumePoint[];
  months: number;
  onMonthsChange: (m: number) => void;
}

export const InvoiceVolumeTab = ({ data, months, onMonthsChange }: InvoiceVolumeTabProps) => {
  const option: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0, data: ['Invoice Count', 'Total Amount (HKD)'] },
      grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.map((p) => p.month),
        axisLine: { lineStyle: { color: '#E5E7EB' } },
      },
      yAxis: [
        { type: 'value', name: 'Count', axisLine: { lineStyle: { color: '#E5E7EB' } } },
        { type: 'value', name: 'Amount (HKD)', axisLine: { lineStyle: { color: '#E5E7EB' } } },
      ],
      series: [
        {
          name: 'Invoice Count',
          type: 'line',
          smooth: true,
          itemStyle: { color: NAVY },
          areaStyle: { color: 'rgba(10, 36, 99, 0.1)' },
          data: data.map((p) => p.count),
        },
        {
          name: 'Total Amount (HKD)',
          type: 'line',
          smooth: true,
          yAxisIndex: 1,
          itemStyle: { color: TEAL },
          areaStyle: { color: 'rgba(62, 146, 204, 0.1)' },
          data: data.map((p) => p.totalAmount),
        },
      ],
    }),
    [data],
  );

  const exportCsv = (): void => {
    const rows = data.map((d) => ({
      Month: d.month,
      Count: d.count,
      'Total Amount (HKD)': d.totalAmount,
      Currency: d.currency,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice Volume');
    XLSX.writeFile(wb, 'invoice-volume-report.xlsx');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Period:</span>
          <Select value={String(months)} onValueChange={(v) => onMonthsChange(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
              <SelectItem value="24">Last 24 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={exportCsv}>Export CSV</Button>
      </div>

      <Card className="shadow-sm border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Monthly Invoice Volume</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-[320px]">
            <ReactECharts option={option} theme="ud" style={{ height: '100%' }} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Data Table</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Table>
            <TableHeader>
              <TableRow className="h-12">
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Invoice Count</TableHead>
                <TableHead className="text-right">Total Amount (HKD)</TableHead>
                <TableHead className="text-right">Currency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.month} className="h-12">
                  <TableCell className="font-mono">{row.month}</TableCell>
                  <TableCell className="text-right font-mono">{row.count.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">
                    HK${row.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">{row.currency}</TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Tab 2: Project Financial Summary ─────────────────────────────────

interface ProjectFinancialTabProps {
  data: ProjectFinancialRow[];
  total: { budget: number; actual: number; variance: number; currency: string };
  status: string;
  onStatusChange: (s: string) => void;
}

export const ProjectFinancialTab = ({ data, total, status, onStatusChange }: ProjectFinancialTabProps) => {
  const option: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { type: 'scroll', bottom: 0, data: ['Budget', 'Actual'] },
      grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.map((p) => p.projectCode),
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisLabel: { rotate: 30, fontSize: 11 },
      },
      yAxis: { type: 'value', name: 'Amount (HKD)', axisLine: { lineStyle: { color: '#E5E7EB' } } },
      series: [
        {
          name: 'Budget',
          type: 'bar',
          itemStyle: { color: NAVY },
          barGap: 0,
          data: data.map((p) => p.budget),
        },
        {
          name: 'Actual',
          type: 'bar',
          itemStyle: { color: TEAL },
          data: data.map((p) => p.actual),
        },
      ],
    }),
    [data],
  );

  const exportCsv = (): void => {
    const rows = data.map((d) => ({
      'Project Code': d.projectCode,
      'Project Name': d.projectName,
      Budget: d.budget,
      Actual: d.actual,
      Variance: d.variance,
      'Variance %': `${d.variancePercent.toFixed(2)}%`,
      Currency: d.currency,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Project Financial');
    XLSX.writeFile(wb, 'project-financial-summary.xlsx');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={exportCsv}>Export CSV</Button>
      </div>

      <Card className="shadow-sm border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Budget vs Actual by Project</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-[320px]">
            <ReactECharts option={option} theme="ud" style={{ height: '100%' }} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Summary Table</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Table>
            <TableHeader>
              <TableRow className="h-12">
                <TableHead>Project Code</TableHead>
                <TableHead>Project Name</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Variance %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const overBudget = row.variancePercent < 0;
                return (
                  <TableRow key={row.projectId} className="h-12">
                    <TableCell className="font-mono">{row.projectCode}</TableCell>
                    <TableCell>{row.projectName}</TableCell>
                    <TableCell className="text-right font-mono">
                      HK${row.budget.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      HK${row.actual.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${overBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                      HK${row.variance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${overBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                      {row.variancePercent.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="h-12 bg-muted/30 font-semibold">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right font-mono">
                  HK${total.budget.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono">
                  HK${total.actual.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono">
                  HK${total.variance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {total.budget > 0 ? ((total.variance / total.budget) * 100).toFixed(2) : '0.00'}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-sm">No data</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Tab 3: Payment Status Dashboard ──────────────────────────────────

interface PaymentStatusTabProps {
  byStatus: PaymentStatusBreakdown[];
  aging: PaymentAgingBucket[];
  startDate: string;
  endDate: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onApply: () => void;
}

export const PaymentStatusTab = ({
  byStatus,
  aging,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
}: PaymentStatusTabProps) => {
  const pieOption: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { type: 'scroll', bottom: 0 },
      series: [
        {
          name: 'Payment Status',
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: { label: { show: false } },
          data: byStatus.map((p, i) => ({
            name: p.status,
            value: p.amount,
            itemStyle: { color: [NAVY, TEAL, AMBER, GREEN, RED][i % 5] },
          })),
        },
      ],
    }),
    [byStatus],
  );

  const exportCsv = (): void => {
    const statusRows = byStatus.map((s) => ({
      Status: s.status,
      Count: s.count,
      'Amount (HKD)': s.amount,
    }));
    const agingRows = aging.map((a) => ({
      Bucket: a.bucket,
      Count: a.count,
      'Amount (HKD)': a.amount,
    }));
    const ws = XLSX.utils.aoa_to_sheet([
      ['Payment Status Breakdown'],
      ['Status', 'Count', 'Amount (HKD)'],
      ...statusRows.map((r) => [r.Status, r.Count, r['Amount (HKD)']]),
      [],
      ['Aging Buckets'],
      ['Bucket', 'Count', 'Amount (HKD)'],
      ...agingRows.map((r) => [r.Bucket, r.Count, r['Amount (HKD)']]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payment Status');
    XLSX.writeFile(wb, 'payment-status-dashboard.xlsx');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Date Range:</span>
          <Input
            type="date"
            className="w-40"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            className="w-40"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
          <Button size="sm" onClick={onApply}>Apply</Button>
        </div>
        <Button size="sm" onClick={exportCsv}>Export CSV</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">Payment Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-[320px]">
              <ReactECharts option={pieOption} theme="ud" style={{ height: '100%' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">Aging Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Table>
              <TableHeader>
                <TableRow className="h-12">
                  <TableHead>Bucket</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Amount (HKD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aging.map((row) => (
                  <TableRow key={row.bucket} className="h-12">
                    <TableCell>{row.bucket}</TableCell>
                    <TableCell className="text-right font-mono">{row.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">
                      HK${row.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
                {aging.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No aging data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Table>
            <TableHeader>
              <TableRow className="h-12">
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Amount (HKD)</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const total = byStatus.reduce((s, r) => s + r.amount, 0);
                return byStatus.map((row) => (
                  <TableRow key={row.status} className="h-12">
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{row.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">
                      HK${row.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {total > 0 ? ((row.amount / total) * 100).toFixed(1) : '0.0'}%
                    </TableCell>
                  </TableRow>
                ));
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Tab 4: Exception Report ──────────────────────────────────────────

interface ExceptionReportTabProps {
  items: ExceptionRecord[];
  byCategory: Array<{ category: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
  total: number;
  category: string;
  severity: string;
  status: string;
  onCategoryChange: (v: string) => void;
  onSeverityChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onViewCenter: () => void;
}

export const ExceptionReportTab = ({
  items,
  byCategory,
  total,
  category,
  severity,
  status,
  onCategoryChange,
  onSeverityChange,
  onStatusChange,
  onViewCenter,
}: ExceptionReportTabProps) => {
  const barOption: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { type: 'scroll', bottom: 0, data: ['Exceptions'] },
      grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        data: byCategory.map((c) => c.category),
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisLabel: { rotate: 20, fontSize: 11 },
      },
      yAxis: { type: 'value', name: 'Count', axisLine: { lineStyle: { color: '#E5E7EB' } } },
      series: [
        {
          name: 'Exceptions',
          type: 'bar',
          itemStyle: { color: TEAL },
          barWidth: '40%',
          data: byCategory.map((c) => c.count),
        },
      ],
    }),
    [byCategory],
  );

  const exportCsv = (): void => {
    const rows = items.map((e) => ({
      ID: e.id,
      Category: e.category,
      Severity: e.severity,
      Title: e.title,
      Status: e.status,
      'Entity Type': e.entityType,
      'Created At': e.createdAt,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Exceptions');
    XLSX.writeFile(wb, 'exception-report.xlsx');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Category:</span>
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-36">
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
            <Select value={severity} onValueChange={onSeverityChange}>
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
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={status} onValueChange={onStatusChange}>
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
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onViewCenter}>
            View in Exception Center
          </Button>
          <Button size="sm" onClick={exportCsv}>Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">Exceptions by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-[300px]">
              <ReactECharts option={barOption} theme="ud" style={{ height: '100%' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-sm">
                <div className="text-xs text-muted-foreground">Total Exceptions</div>
                <div className="text-xl font-bold font-mono mt-1">{total}</div>
              </div>
              {byCategory.slice(0, 3).map((c) => (
                <div key={c.category} className="p-3 border rounded-sm">
                  <div className="text-xs text-muted-foreground capitalize">{c.category}</div>
                  <div className="text-xl font-bold font-mono mt-1">{c.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Exception List</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Table>
            <TableHeader>
              <TableRow className="h-12">
                <TableHead>Severity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Created</TableHead>
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
                  <TableCell className="text-sm">{row.title}</TableCell>
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
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No exceptions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Tab 5: Audit Trail ───────────────────────────────────────────────

interface AuditTrailTabProps {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  entityType: string;
  userId: string;
  startDate: string;
  endDate: string;
  onEntityTypeChange: (v: string) => void;
  onUserIdChange: (v: string) => void;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onApply: () => void;
}

export const AuditTrailTab = ({
  items,
  total,
  page,
  pageSize,
  entityType,
  userId,
  startDate,
  endDate,
  onEntityTypeChange,
  onUserIdChange,
  onStartDateChange,
  onEndDateChange,
  onPageChange,
  onApply,
}: AuditTrailTabProps) => {
  const exportCsv = (): void => {
    const rows = items.map((a) => ({
      ID: a.id,
      'Entity Type': a.entityType,
      'Entity ID': a.entityId,
      Action: a.action,
      'Created By': a.createdBy ?? '',
      'Created At': a.createdAt,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
    XLSX.writeFile(wb, 'audit-trail.xlsx');
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Entity:</span>
            <Select value={entityType} onValueChange={onEntityTypeChange}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="exception">Exception</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">User ID:</span>
            <Input
              className="w-40"
              placeholder="User ID"
              value={userId}
              onChange={(e) => onUserIdChange(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="w-36"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              className="w-36"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={onApply}>Apply</Button>
        </div>
        <Button size="sm" onClick={exportCsv}>Export CSV</Button>
      </div>

      <Card className="shadow-sm border">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Audit Logs
            <span className="text-xs text-muted-foreground ml-2 font-normal">
              {total} total records
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Table>
            <TableHeader>
              <TableRow className="h-12">
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id} className="h-12">
                  <TableCell className="font-mono text-xs">
                    {new Date(row.createdAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {row.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize text-sm">{row.entityType}</TableCell>
                  <TableCell className="font-mono text-xs">{row.entityId.slice(0, 8)}...</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.createdBy ? row.createdBy.slice(0, 12) : 'System'}
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No audit logs found
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
                  onClick={() => onPageChange(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
