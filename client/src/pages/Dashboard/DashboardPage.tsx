import { useEffect, useState } from 'react';
import {
  FileText,
  CreditCard,
  DollarSign,
  AlertTriangle,
  PieChart,
  Clock,
  ArrowUpRight,
  Eye,
} from 'lucide-react';
import CountUp from 'react-countup';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { reports } from '@/api';
import type {
  DashboardKpis,
  InvoiceVolumePoint,
  PaymentStatusBreakdown,
  ActivityItem,
  ExceptionRecord,
} from '@shared/api.interface';
import { exceptions } from '@/api';

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

const DashboardPage = () => {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [invoiceVolume, setInvoiceVolume] = useState<InvoiceVolumePoint[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusBreakdown[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [openExceptions, setOpenExceptions] = useState<ExceptionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const [k, iv, ps, ra, ex] = await Promise.all([
          reports.getDashboardKpis(),
          reports.getInvoiceVolume(6),
          reports.getPaymentStatusDistribution(),
          reports.getRecentActivity(10),
          exceptions.getExceptions({ status: 'open', pageSize: 5, page: 1 }),
        ]);
        setKpis(k);
        setInvoiceVolume(iv.items);
        setPaymentStatus(ps.items);
        setActivities(ra.items);
        setOpenExceptions(ex.items);
      } catch (err) {
        logger.error('Dashboard load failed', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const invoiceChartOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', bottom: 0, data: ['Invoice Count', 'Total Amount (HKD)'] },
    grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
    xAxis: {
      type: 'category',
      data: invoiceVolume.map((p) => p.month),
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
        data: invoiceVolume.map((p) => p.count),
      },
      {
        name: 'Total Amount (HKD)',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        itemStyle: { color: TEAL },
        areaStyle: { color: 'rgba(62, 146, 204, 0.1)' },
        data: invoiceVolume.map((p) => p.totalAmount),
      },
    ],
  };

  const paymentPieOption: EChartsOption = {
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
        data: paymentStatus.map((p, i) => ({
          name: p.status,
          value: p.amount,
          itemStyle: { color: [NAVY, TEAL, AMBER, GREEN, RED][i % 5] },
        })),
      },
    ],
  };

  if (loading || !kpis) {
    return <div className="p-6 text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4" data-ai-section-type="card-stat">
        <KpiCard
          title="Pending Invoices"
          value={kpis.pendingInvoices}
          icon={<FileText className="h-5 w-5" />}
          accent={AMBER}
          change="+12% from last month"
          changeUp
        />
        <KpiCard
          title="Pending Approvals"
          value={kpis.pendingApprovals}
          icon={<CreditCard className="h-5 w-5" />}
          accent={AMBER}
          change="+5 this week"
          changeUp
        />
        <KpiCard
          title="Monthly Payment Volume"
          value={kpis.monthlyPaymentVolume}
          icon={<DollarSign className="h-5 w-5" />}
          accent={GREEN}
          prefix="HK$ "
          decimals={0}
          change="+8.2% MoM"
          changeUp
        />
        <KpiCard
          title="Exception Alerts"
          value={kpis.exceptionAlerts}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent={RED}
          change="-3 from last week"
          changeUp={false}
        />
        <KpiCard
          title="Budget Risk Projects"
          value={kpis.budgetRiskProjects}
          icon={<PieChart className="h-5 w-5" />}
          accent={NAVY}
          change="At 80%+ utilization"
          changeUp
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending Items */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground text-xs">Top 5 pending review</div>
                <div className="text-xs text-muted-foreground">
                  {kpis.pendingInvoices} documents pending review
                </div>
                <Button variant="ghost" size="sm" className="w-full text-xs justify-start px-0 text-primary">
                  <Eye className="h-3 w-3 mr-1" />
                  View all documents
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-500" />
                Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground text-xs">Awaiting approval</div>
                <div className="text-xs text-muted-foreground">
                  {kpis.pendingApprovals} payments in review
                </div>
                <Button variant="ghost" size="sm" className="w-full text-xs justify-start px-0 text-primary">
                  <Eye className="h-3 w-3 mr-1" />
                  View all payments
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Charts */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">Monthly Invoice Volume</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="h-[300px]">
                <ReactECharts option={invoiceChartOption} theme="ud" style={{ height: '100%' }} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">Payment Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="h-[300px]">
                <ReactECharts option={paymentPieOption} theme="ud" style={{ height: '100%' }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-sm border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
              {activities.slice(0, 8).map((a) => (
                <div key={a.id} className="relative pl-8">
                  <div
                    className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white"
                    style={{ backgroundColor: TEAL }}
                  />
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium text-foreground">{a.title}</div>
                      <div className="text-xs text-muted-foreground">{a.description}</div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {new Date(a.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-sm text-muted-foreground pl-8">No recent activity</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exception Alerts */}
      <Card className="shadow-sm border">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Exception Alerts
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-primary">
            View All <ArrowUpRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3" data-ai-section-type="card-list">
            {openExceptions.map((ex) => (
              <div
                key={ex.id}
                className="p-3 border rounded-sm bg-card hover:border-accent cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium px-2 py-0"
                    style={{ borderLeft: `3px solid ${severityColor[ex.severity] || '#6B7280'}` }}
                  >
                    {ex.severity}
                  </Badge>
                </div>
                <div className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                  {ex.title}
                </div>
                <div className="text-xs text-muted-foreground capitalize">{ex.category}</div>
              </div>
            ))}
            {openExceptions.length === 0 && (
              <div className="col-span-full text-sm text-muted-foreground text-center py-4">
                No open exceptions
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface KpiCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  prefix?: string;
  decimals?: number;
  change: string;
  changeUp: boolean;
}

const KpiCard = ({ title, value, icon, accent, prefix, decimals, change, changeUp }: KpiCardProps) => (
  <Card className="shadow-sm border overflow-hidden">
    <div className="h-1" style={{ backgroundColor: accent }} />
    <CardContent className="p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        <div className="p-1.5 rounded-sm" style={{ backgroundColor: `${accent}15`, color: accent }}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold font-mono text-foreground">
        {prefix}
        <CountUp end={value} duration={0.8} decimals={decimals ?? 0} separator="," />
      </div>
      <div className={`text-xs mt-1 flex items-center gap-1 ${changeUp ? 'text-emerald-600' : 'text-red-500'}`}>
        <ArrowUpRight className={`h-3 w-3 ${!changeUp ? 'rotate-180' : ''}`} />
        {change}
      </div>
    </CardContent>
  </Card>
);

export default DashboardPage;
