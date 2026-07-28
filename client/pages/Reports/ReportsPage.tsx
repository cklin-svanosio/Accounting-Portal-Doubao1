import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  BarChart3,
  FileText,
  CreditCard,
  AlertTriangle,
  History,
} from 'lucide-react';
import { reports } from '@/api';
import type {
  InvoiceVolumePoint,
  ProjectFinancialRow,
  PaymentStatusBreakdown,
  PaymentAgingBucket,
  ExceptionRecord,
  AuditLog,
} from '@shared/api.interface';
import {
  InvoiceVolumeTab,
  ProjectFinancialTab,
  PaymentStatusTab,
  ExceptionReportTab,
  AuditTrailTab,
} from './report-tabs';

type TabKey = 'invoice' | 'project' | 'payment' | 'exception' | 'audit';

interface TabItem {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabItem[] = [
  { key: 'invoice', label: 'Monthly Invoice Volume', icon: <FileText className="h-4 w-4" /> },
  { key: 'project', label: 'Project Financial Summary', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'payment', label: 'Payment Status Dashboard', icon: <CreditCard className="h-4 w-4" /> },
  { key: 'exception', label: 'Exception Report', icon: <AlertTriangle className="h-4 w-4" /> },
  { key: 'audit', label: 'Audit Trail', icon: <History className="h-4 w-4" /> },
];

const ReportsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('invoice');
  const [loading, setLoading] = useState(true);

  // Invoice volume state
  const [invoiceData, setInvoiceData] = useState<InvoiceVolumePoint[]>([]);
  const [invoiceMonths, setInvoiceMonths] = useState(12);

  // Project financial state
  const [projectData, setProjectData] = useState<ProjectFinancialRow[]>([]);
  const [projectTotal, setProjectTotal] = useState({
    budget: 0,
    actual: 0,
    variance: 0,
    currency: 'HKD',
  });
  const [projectStatus, setProjectStatus] = useState('all');

  // Payment status state
  const [paymentByStatus, setPaymentByStatus] = useState<PaymentStatusBreakdown[]>([]);
  const [paymentAging, setPaymentAging] = useState<PaymentAgingBucket[]>([]);
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');

  // Exception report state
  const [exceptionItems, setExceptionItems] = useState<ExceptionRecord[]>([]);
  const [exceptionByCategory, setExceptionByCategory] = useState<
    Array<{ category: string; count: number }>
  >([]);
  const [exceptionBySeverity, setExceptionBySeverity] = useState<
    Array<{ severity: string; count: number }>
  >([]);
  const [exceptionTotal, setExceptionTotal] = useState(0);
  const [exceptionCategory, setExceptionCategory] = useState('all');
  const [exceptionSeverity, setExceptionSeverity] = useState('all');
  const [exceptionStatus, setExceptionStatus] = useState('all');

  // Audit log state
  const [auditItems, setAuditItems] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize] = useState(20);
  const [auditEntityType, setAuditEntityType] = useState('all');
  const [auditUserId, setAuditUserId] = useState('');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');

  useEffect(() => {
    const loadTab = async (): Promise<void> => {
      setLoading(true);
      try {
        switch (activeTab) {
          case 'invoice': {
            const res = await reports.getReportInvoiceVolume(invoiceMonths);
            setInvoiceData(res.items);
            break;
          }
          case 'project': {
            const res = await reports.getProjectFinancialSummary(
              projectStatus === 'all' ? undefined : projectStatus,
            );
            setProjectData(res.items);
            setProjectTotal(res.total);
            break;
          }
          case 'payment': {
            const res = await reports.getPaymentStatusDashboard({
              startDate: paymentStartDate || undefined,
              endDate: paymentEndDate || undefined,
            });
            setPaymentByStatus(res.byStatus);
            setPaymentAging(res.aging);
            break;
          }
          case 'exception': {
            const res = await reports.getExceptionReport({
              category: exceptionCategory === 'all' ? undefined : exceptionCategory,
              severity: exceptionSeverity === 'all' ? undefined : exceptionSeverity,
              status: exceptionStatus === 'all' ? undefined : exceptionStatus,
            });
            setExceptionItems(res.items);
            setExceptionByCategory(res.byCategory);
            setExceptionBySeverity(res.bySeverity);
            setExceptionTotal(res.total);
            break;
          }
          case 'audit': {
            const res = await reports.getAuditLogs({
              page: auditPage,
              pageSize: auditPageSize,
              entityType: auditEntityType === 'all' ? undefined : auditEntityType,
              userId: auditUserId || undefined,
              startDate: auditStartDate || undefined,
              endDate: auditEndDate || undefined,
            });
            setAuditItems(res.items);
            setAuditTotal(res.total);
            break;
          }
        }
      } catch (err) {
        logger.error('Reports load failed', err);
      } finally {
        setLoading(false);
      }
    };
    loadTab();
  }, [
    activeTab,
    invoiceMonths,
    projectStatus,
    paymentStartDate,
    paymentEndDate,
    exceptionCategory,
    exceptionSeverity,
    exceptionStatus,
    auditPage,
    auditPageSize,
    auditEntityType,
    auditUserId,
    auditStartDate,
    auditEndDate,
  ]);

  const handleMonthsChange = (m: number): void => {
    setInvoiceMonths(m);
  };

  const handleStatusChange = (s: string): void => {
    setProjectStatus(s);
  };

  const handlePaymentApply = (): void => {
    // trigger reload via state change is already handled by useEffect deps
    setPaymentStartDate(paymentStartDate);
  };

  const handleAuditApply = (): void => {
    setAuditPage(1);
  };

  const handleViewExceptionCenter = (): void => {
    navigate('/exceptions');
  };

  return (
    <div className="flex h-full">
      {/* Left vertical tab nav */}
      <div className="w-64 border-r bg-card flex-shrink-0 py-4">
        <div className="px-4 pb-3 border-b mb-2">
          <h2 className="text-sm font-semibold text-foreground">Reports</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Financial & operational insights
          </p>
        </div>
        <nav className="space-y-1 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm transition-colors text-left ${
                activeTab === tab.key
                  ? 'bg-accent/10 text-accent font-medium border-l-2 border-accent'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Right content area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">
              {tabs.find((t) => t.key === activeTab)?.label}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {getTabDescription(activeTab)}
            </p>
          </div>

          {loading ? (
            <div className="text-muted-foreground text-sm py-12 text-center">
              Loading report...
            </div>
          ) : (
            <>
              {activeTab === 'invoice' && (
                <InvoiceVolumeTab
                  data={invoiceData}
                  months={invoiceMonths}
                  onMonthsChange={handleMonthsChange}
                />
              )}
              {activeTab === 'project' && (
                <ProjectFinancialTab
                  data={projectData}
                  total={projectTotal}
                  status={projectStatus}
                  onStatusChange={handleStatusChange}
                />
              )}
              {activeTab === 'payment' && (
                <PaymentStatusTab
                  byStatus={paymentByStatus}
                  aging={paymentAging}
                  startDate={paymentStartDate}
                  endDate={paymentEndDate}
                  onStartDateChange={setPaymentStartDate}
                  onEndDateChange={setPaymentEndDate}
                  onApply={handlePaymentApply}
                />
              )}
              {activeTab === 'exception' && (
                <ExceptionReportTab
                  items={exceptionItems}
                  byCategory={exceptionByCategory}
                  bySeverity={exceptionBySeverity}
                  total={exceptionTotal}
                  category={exceptionCategory}
                  severity={exceptionSeverity}
                  status={exceptionStatus}
                  onCategoryChange={setExceptionCategory}
                  onSeverityChange={setExceptionSeverity}
                  onStatusChange={setExceptionStatus}
                  onViewCenter={handleViewExceptionCenter}
                />
              )}
              {activeTab === 'audit' && (
                <AuditTrailTab
                  items={auditItems}
                  total={auditTotal}
                  page={auditPage}
                  pageSize={auditPageSize}
                  entityType={auditEntityType}
                  userId={auditUserId}
                  startDate={auditStartDate}
                  endDate={auditEndDate}
                  onEntityTypeChange={setAuditEntityType}
                  onUserIdChange={setAuditUserId}
                  onStartDateChange={setAuditStartDate}
                  onEndDateChange={setAuditEndDate}
                  onPageChange={setAuditPage}
                  onApply={handleAuditApply}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const getTabDescription = (tab: TabKey): string => {
  switch (tab) {
    case 'invoice':
      return 'Track invoice volume trends over time';
    case 'project':
      return 'Compare budget vs actual spending across projects';
    case 'payment':
      return 'Payment status breakdown and aging analysis';
    case 'exception':
      return 'Exception analysis by category and severity';
    case 'audit':
      return 'Complete audit trail of all system activities';
    default:
      return '';
  }
};

export default ReportsPage;
