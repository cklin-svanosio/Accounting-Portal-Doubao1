import { useState, useEffect, useCallback } from 'react';
import { Save, CheckCircle2, FolderKanban } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import * as settingsApi from '@/api/settings';
import type { ProjectCodeConfig } from '@shared/api.interface';

const ProjectCodesTab = () => {
  const [config, setConfig] = useState<ProjectCodeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsApi.getProjectCodeConfig();
      setConfig(data);
    } catch (err) {
      logger.error('Failed to load project code config', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      const updated = await settingsApi.updateProjectCodeConfig({
        prefix: config.prefix,
        sequenceDigits: config.sequenceDigits,
        namingConvention: config.namingConvention,
      });
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      logger.error('Failed to save project code config', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Config form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Code Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
            <div className="space-y-2">
              <Label htmlFor="prefix">Prefix</Label>
              <Input
                id="prefix"
                value={config.prefix}
                onChange={(e) => setConfig({ ...config, prefix: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Fixed prefix for all project codes
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="digits">Sequence Digits</Label>
              <Input
                id="digits"
                type="number"
                min={2}
                max={6}
                value={config.sequenceDigits}
                onChange={(e) =>
                  setConfig({ ...config, sequenceDigits: parseInt(e.target.value, 10) || 3 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Number of digits in the sequence (2-6)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="convention">Naming Convention</Label>
              <Input
                id="convention"
                value={config.namingConvention}
                onChange={(e) => setConfig({ ...config, namingConvention: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Pattern used for code generation
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="size-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="size-4" />
                Configuration saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sample codes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sample Generated Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {config.sampleCodes.map((code) => (
              <Badge
                key={code}
                variant="outline"
                className="font-mono text-sm px-3 py-1.5 bg-slate-50"
              >
                {code}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Based on current convention: <span className="font-mono">{config.namingConvention}</span>
          </p>
        </CardContent>
      </Card>

      {/* Usage statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="p-4 rounded-sm border bg-slate-50">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <FolderKanban className="size-4" />
                Total Projects
              </div>
              <div className="text-2xl font-semibold font-mono text-foreground">
                {config.totalProjects}
              </div>
            </div>
            <div className="p-4 rounded-sm border bg-slate-50">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Active Projects
              </div>
              <div className="text-2xl font-semibold font-mono text-foreground">
                {config.activeProjects}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectCodesTab;
