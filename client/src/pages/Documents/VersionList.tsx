import { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Badge } from '@client/src/components/ui/badge';
import { Card, CardContent } from '@client/src/components/ui/card';
import { Skeleton } from '@client/src/components/ui/skeleton';

import * as documentsApi from '@client/src/api/documents';
import { formatDate } from './document-utils';
import type { DocumentVersion } from '@shared/api.interface';

interface VersionListProps {
  documentId: string;
}

const VersionList = ({ documentId }: VersionListProps) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentsApi.getDocumentVersions(documentId);
      setVersions(res.items);
    } catch (err) {
      logger.error('Failed to load versions', err);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No version history available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {versions.map((v) => (
        <Card key={v.id} className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">v{v.version}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(v.createdAt)}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {v.changeSummary || 'No summary'}
            </div>
            {v.changedFields && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.keys(v.changedFields).map((field) => (
                  <Badge
                    key={field}
                    variant="secondary"
                    className="rounded-full text-[10px] font-normal"
                  >
                    {field}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export { VersionList };
