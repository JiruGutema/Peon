'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { rollbackService, listPreviews, deletePreview } from '@/services/api/service';
import { listDeployments, cancelDeployment, type DeploymentListItem } from '@/services/api/deployment';
import { Panel } from '@/components/app/page';
import { ConfirmButton } from '@/components/app/confirm';
import { StatusBadge } from '@/components/app/status-badge';
import { LocalDateTime } from '@/components/app/local-datetime';
import { invalidateServiceQueries } from '@/lib/queries/service';

export function DeploymentsSection({
  serviceId,
  projectId,
  onDeploy,
  onForceDeploy,
}: {
  serviceId: string;
  projectId: string;
  onDeploy: () => void;
  onForceDeploy: () => void;
}) {
  const qc = useQueryClient();
  const { data: deployments } = useQuery({
    queryKey: ['deployments', serviceId],
    queryFn: () => listDeployments(serviceId),
    refetchInterval: (query) => {
      const list = query.state.data;
      if (list?.some((d) => d.status === 'QUEUED' || d.status === 'IN_PROGRESS')) return 2000;
      return false;
    },
  });
  const { data: previews } = useQuery({
    queryKey: ['previews', serviceId],
    queryFn: () => listPreviews(serviceId),
  });

  const rollbackMut = useMutation({
    mutationFn: (deploymentId: string) => rollbackService(serviceId, deploymentId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['deployments', serviceId] });
      toast.success('Rollback queued');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const cancelMut = useMutation({
    mutationFn: (deploymentId: string) => cancelDeployment(deploymentId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['deployments', serviceId] });
      await invalidateServiceQueries(qc, { serviceId, projectId });
      toast.success('Deployment cancelled');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const delPreviewMut = useMutation({
    mutationFn: (id: string) => deletePreview(serviceId, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['previews', serviceId] });
      await qc.invalidateQueries({ queryKey: ['deployments', serviceId] });
      await invalidateServiceQueries(qc, { serviceId, projectId });
      toast.success('Preview deleted');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  const previewByPr = new Map((previews ?? []).map((p) => [p.pullRequestId, p]));

  /** Active preview envs: prefer ServicePreview rows; fall back to latest deploy per PR. */
  type PreviewPanelRow = {
    key: string;
    pullRequestId: number;
    fqdn: string | null;
    status: string;
    previewId: string | null;
    latestDeploymentId: string | null;
  };
  const previewPanelRows: PreviewPanelRow[] = (() => {
    const fromApi = (previews ?? []).map((p) => ({
      key: p.id,
      pullRequestId: p.pullRequestId,
      fqdn: p.fqdn,
      status: p.status,
      previewId: p.id,
      latestDeploymentId:
        deployments?.find((d) => d.isPreview && d.pullRequestId === p.pullRequestId)?.id ?? null,
    }));
    if (fromApi.length > 0) return fromApi;

    const byPr = new Map<number, DeploymentListItem>();
    for (const d of deployments ?? []) {
      if (!d.isPreview || d.pullRequestId == null) continue;
      if (!byPr.has(d.pullRequestId)) byPr.set(d.pullRequestId, d);
    }
    return [...byPr.values()].map((d) => ({
      key: `deploy-${d.id}`,
      pullRequestId: d.pullRequestId!,
      fqdn: d.previewUrl,
      status: d.status,
      previewId: null,
      latestDeploymentId: d.id,
    }));
  })();

  return (
    <div className="space-y-4">
      <Panel
        title="deployments"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={onForceDeploy}
              title="Clear cached source and rebuild without Docker/Nixpacks cache"
            >
              <RefreshCw className="size-3.5" /> Force rebuild
            </Button>
            <Button onClick={onDeploy}>Deploy now</Button>
          </div>
        }
        contentClassName="divide-y"
      >
        {deployments?.length ? (
          deployments.map((d: DeploymentListItem) => {
            const preview =
              d.isPreview && d.pullRequestId != null
                ? previewByPr.get(d.pullRequestId)
                : undefined;
            return (
              <div
                key={d.id}
                className="hover:bg-secondary/50 flex items-center justify-between gap-4 px-4 py-3 transition-colors"
              >
                <Link
                  href={`/projects/${projectId}/services/${serviceId}/deployments/${d.id}`}
                  className="flex min-w-0 flex-1 items-center gap-2 text-sm"
                >
                  <StatusBadge status={d.status} />
                  {d.isPreview && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      preview{d.pullRequestId != null ? ` #${d.pullRequestId}` : ''}
                    </Badge>
                  )}
                  <span className="text-muted-foreground font-mono text-xs">
                    {d.commitSha ? d.commitSha.slice(0, 7) : d.uuid.slice(0, 7)}
                  </span>
                  {d.commitMessage && (
                    <span className="text-foreground max-w-72 truncate text-xs">
                      {d.commitMessage}
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs">
                    <LocalDateTime value={d.createdAt} />
                  </span>
                </Link>
                <div className="flex shrink-0 gap-2">
                  {d.previewUrl && (
                    <Button asChild size="sm" variant="ghost">
                      <a href={d.previewUrl} target="_blank" rel="noopener noreferrer" title={d.previewUrl}>
                        <ExternalLink className="size-3.5" /> Open
                      </a>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/projects/${projectId}/services/${serviceId}/deployments/${d.id}`}>
                      View
                    </Link>
                  </Button>
                  {(d.status === 'QUEUED' || d.status === 'IN_PROGRESS') && (
                    <ConfirmButton
                      title="Cancel this deployment?"
                      description="Stops the in-progress deploy. Partial changes on the server may remain until the next successful deploy."
                      confirmLabel="Cancel deployment"
                      variant="outline"
                      confirmVariant="default"
                      size="sm"
                      disabled={cancelMut.isPending}
                      onConfirm={() => cancelMut.mutate(d.id)}
                    >
                      Cancel
                    </ConfirmButton>
                  )}
                  {!d.isPreview &&
                    (d.status === 'FINISHED' || d.status === 'FAILED') &&
                    d.commitSha && (
                      <ConfirmButton
                        title="Rollback to this deployment?"
                        description="Queues a new deploy using this commit. Current running version will be replaced."
                        confirmLabel="Rollback"
                        variant="outline"
                        confirmVariant="default"
                        size="sm"
                        disabled={rollbackMut.isPending}
                        onConfirm={() => rollbackMut.mutate(d.id)}
                      >
                        Rollback
                      </ConfirmButton>
                    )}
                  {preview && (
                    <ConfirmButton
                      title={`Delete preview for PR #${preview.pullRequestId}?`}
                      description="Stops and removes this preview deployment from the server."
                      confirmLabel="Delete"
                      variant="ghost"
                      size="sm"
                      disabled={delPreviewMut.isPending}
                      onConfirm={() => delPreviewMut.mutate(preview.id)}
                    >
                      <Trash2 className="size-3.5" /> Delete
                    </ConfirmButton>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-muted-foreground p-6 text-center text-[12.5px]">no deployments yet.</div>
        )}
      </Panel>

      <Panel title="preview deployments" contentClassName="divide-y px-4">
        {previewPanelRows.length ? (
          previewPanelRows.map((p) => {
            const href = p.fqdn
              ? p.fqdn.startsWith('http')
                ? p.fqdn
                : `https://${p.fqdn}`
              : null;
            return (
              <div key={p.key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge variant="outline" className="text-[10px]">
                    preview #{p.pullRequestId}
                  </Badge>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-phosphor hover:underline inline-flex min-w-0 items-center gap-1 truncate font-mono text-[12px]"
                      title={href}
                    >
                      <ExternalLink className="size-3 shrink-0" />
                      <span className="truncate">{href.replace(/^https?:\/\//, '')}</span>
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-[12px]">no URL yet</span>
                  )}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={p.status} />
                  {p.latestDeploymentId && (
                    <Button asChild size="sm" variant="ghost">
                      <Link
                        href={`/projects/${projectId}/services/${serviceId}/deployments/${p.latestDeploymentId}`}
                      >
                        View
                      </Link>
                    </Button>
                  )}
                  {p.previewId && (
                    <ConfirmButton
                      title={`Delete preview for PR #${p.pullRequestId}?`}
                      description="Stops and removes this preview deployment from the server."
                      confirmLabel="Delete"
                      variant="ghost"
                      size="sm"
                      disabled={delPreviewMut.isPending}
                      onConfirm={() => delPreviewMut.mutate(p.previewId!)}
                    >
                      <Trash2 className="size-3.5" /> Delete
                    </ConfirmButton>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-muted-foreground py-6 text-center text-[12.5px]">
            No active preview environments. Enable Preview deployments in Configuration, then open a
            PR against this service&apos;s branch.
          </div>
        )}
      </Panel>
    </div>
  );
}
