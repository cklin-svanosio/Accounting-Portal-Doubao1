import { useState, useEffect } from 'react';
import {
  DollarSign,
  Hash,
  FileText,
  Users,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import ExchangeRatesTab from './components/ExchangeRatesTab';
import ProjectCodesTab from './components/ProjectCodesTab';
import TemplatesTab from './components/TemplatesTab';
import UserManagementTab from './components/UserManagementTab';

type TabKey = 'exchange-rates' | 'project-codes' | 'templates' | 'users';

const TABS: { key: TabKey; label: string; icon: typeof DollarSign }[] = [
  { key: 'exchange-rates', label: 'Exchange Rates', icon: DollarSign },
  { key: 'project-codes', label: 'Project Codes', icon: Hash },
  { key: 'templates', label: 'Templates', icon: FileText },
  { key: 'users', label: 'User Management', icon: Users },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('exchange-rates');

  useEffect(() => {
    logger.info('Settings page loaded');
  }, []);

  return (
    <div className="flex gap-6">
      {/* Left vertical tabs */}
      <Card className="w-56 shrink-0 p-2 h-fit">
        <div className="px-3 py-2">
          <h2 className="text-sm font-semibold text-foreground">Settings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            System configuration
          </p>
        </div>
        <nav className="flex flex-col gap-1 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <Button
                key={tab.key}
                variant={isActive ? 'default' : 'ghost'}
                className="justify-start gap-2 w-full"
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon className="size-4" />
                {tab.label}
              </Button>
            );
          })}
        </nav>
      </Card>

      {/* Right content area */}
      <div className="flex-1 min-w-0">
        {activeTab === 'exchange-rates' && <ExchangeRatesTab />}
        {activeTab === 'project-codes' && <ProjectCodesTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'users' && <UserManagementTab />}
      </div>
    </div>
  );
};

export default SettingsPage;
