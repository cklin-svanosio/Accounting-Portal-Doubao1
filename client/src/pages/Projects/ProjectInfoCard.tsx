import { Calendar, User, DollarSign } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import type { Project, ProjectFinancialSummary } from '@shared/api.interface';

const statusVariant: Record<string, string> = {
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

const getUtilizationTextColor = (percent: number): string => {
  if (percent > 100) return 'text-destructive';
  if (percent >= 80) return 'text-warning';
  return 'text-success';
};

const BudgetDonut = ({
  percent,
  currency,
  budget,
  spent,
}: {
  percent: number;
  currency: string;
  budget: number;
  spent: number;
}) => {
  const clamped = Math.min(percent, 100);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (clamped / 100) * circumference;
  const strokeColor =
    percent > 100
      ? 'hsl(0, 72%, 51%)'
      : percent >= 80
        ? 'hsl(38, 92%, 50%)'
        : 'hsl(152, 60%, 42%)';

  return (
    <div className="flex items-center gap-6">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(220, 13%, 91%)"
            strokeWidth="10"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-2xl font-bold font-mono ${getUtilizationTextColor(percent)}`}
          >
            {percent.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">utilized</span>
        </div>
      </div>
      <div className="space-y-3 flex-1">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground">Budget</span>
          <span className="font-mono text-sm font-medium">
            {formatCurrency(budget, currency)}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground">Spent</span>
          <span className="font-mono text-sm font-medium">
            {formatCurrency(spent, currency)}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground">Remaining</span>
          <span
            className={`font-mono text-sm font-medium ${budget - spent < 0 ? 'text-destructive' : ''}`}
          >
            {formatCurrency(budget - spent, currency)}
          </span>
        </div>
      </div>
    </div>
  );
};

interface ProjectInfoCardProps {
  project: Project;
  financial: ProjectFinancialSummary;
}

const ProjectInfoCard = ({ project, financial }: ProjectInfoCardProps) => {
  const utilization = financial.utilizationPercent;

  return (
    <div className="space-y-4">
      <Card className="rounded-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Project Info</CardTitle>
            <Badge
              variant="outline"
              className={`rounded-full ${statusVariant[project.status] || ''}`}
            >
              <span className="size-1.5 rounded-full bg-current mr-1.5" />
              {project.status.charAt(0).toUpperCase() +
                project.status.slice(1).replace('-', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Description
            </p>
            <p className="text-sm text-foreground">
              {project.description || 'No description provided'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-3" />
                Start Date
              </div>
              <p className="text-sm font-mono">{project.startDate || '—'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-3" />
                End Date
              </div>
              <p className="text-sm font-mono">{project.endDate || '—'}</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="size-3" />
              Responsible Person
            </div>
            <p className="text-sm">
              {project.responsiblePerson || 'Unassigned'}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <DollarSign className="size-3" />
              Burn Rate
            </div>
            <p className="text-sm font-mono">
              {formatCurrency(financial.burnRate, financial.currency)}/mo
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Budget vs Actual</CardTitle>
          <CardDescription>Financial performance overview</CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetDonut
            percent={utilization}
            currency={financial.currency}
            budget={financial.budget}
            spent={financial.actualSpending}
          />
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">
                Utilization
              </span>
              <span
                className={`text-xs font-mono font-medium ${getUtilizationTextColor(utilization)}`}
              >
                {utilization.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={Math.min(utilization, 100)}
              className={`h-1.5 [&>div]:${getUtilizationColor(utilization)}`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectInfoCard;
