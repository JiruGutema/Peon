'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Play,
  Square,
  RotateCw,
  Rocket,
  ExternalLink,
  Layers,
  RefreshCw,
  PauseCircle,
} from 'lucide-react';
import { githubBranchUrl, githubCommitUrl, githubRepoUrl } from '@/lib/github-urls';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type ServiceDetail, type ServiceControlAction } from '@/services/api/service';
import { listDeployments, deploymentPreviewUrl } from '@/services/api/deployment';
import { Panel } from '@/components/app/page';
import { ConfirmButton } from '@/components/app/confirm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StatusBadge } from '@/components/app/status-badge';
import { KindChip } from '@/components/app/kind-chip';
import { LocalDateTime } from '@/components/app/local-datetime';
import { DetailField, Row } from './fields';

const KIND_LABELS: Record<string, string> = {
  GIT_APP: 'Application (Git)',
  DOCKERFILE: 'Dockerfile',
  DOCKER_IMAGE: 'Docker Image',
  STATIC: 'Static Site',
  NIXPACKS: 'Nixpacks',
  DATABASE: 'Database',
  COMPOSE: 'Compose',
};

export function OverviewSection({
  svc,
  projectId,
  onDeploy,
  onForceDeploy,
  onControl,
  onOpenDeployments,
  busy,
}: {
  svc: ServiceDetail;
  projectId: string;
  onDeploy: () => void;
  onForceDeploy: () => void;
  onControl: (action: ServiceControlAction) => void;
  onOpenDeployments: () => void;
  busy: boolean;
}) {
  const { data: deployments } = useQuery({
    queryKey: ['deployments', svc.id],
    queryFn: () => listDeployments(svc.id),
  });
  // Production panel should reflect the live deploy (last success), not a later failed/queued attempt.
  const productionDeployment =
    deployments?.find((d) => !d.isPreview && d.status === 'FINISHED') ?? null;
  const hasDeployment = !!productionDeployment;
  // Status alone, not suspendedAt: the API reconciles status to SUSPENDED exactly
  // when suspendedAt is set, and the optimistic cache patch after a control
  // action only updates status. Reading suspendedAt here would keep the
  // suspended UI on screen until the refetch lands, and a second Resume click
  // would 409. suspendedAt is still used below for the "suspended since" label.
  const isSuspended = svc.status === 'SUSPENDED';
  const isRunning = !isSuspended && ['RUNNING', 'STARTING'].includes(svc.status);

  const domains = (svc.fqdn ?? '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
  const primary = domains[0];
  const primaryUrl = primary
    ? primary.startsWith('http')
      ? primary
      : `https://${primary}`
    : null;
  const repoUrl = githubRepoUrl(svc.gitRepository);
  const branchUrl = githubBranchUrl(svc.gitRepository, svc.gitBranch);
  const commitSha = productionDeployment?.commitSha ?? svc.gitCommitSha;
  const commitUrl = githubCommitUrl(svc.gitRepository, commitSha);
  const deploymentHref = productionDeployment
    ? `/projects/${projectId}/services/${svc.id}/deployments/${productionDeployment.id}`
    : null;

  return (
    <div className="space-y-4">
      {isSuspended && (
        <Alert>
          <PauseCircle className="size-4" />
          <AlertTitle>Service suspended</AlertTitle>
          <AlertDescription>
            <span>
              Containers are stopped. Deploys, git webhooks, scheduled tasks, and backups stay
              paused until you resume. Domains, environment variables, and volumes are kept.
              Resuming starts the containers again, or rebuilds the service if its image was
              cleaned up in the meantime.
              {svc.suspendedAt && (
                <>
                  {' '}
                  Suspended <LocalDateTime value={svc.suspendedAt} />.
                </>
              )}
            </span>
            <Button
              size="sm"
              className="mt-2 w-fit"
              onClick={() => onControl('resume')}
              disabled={busy}
            >
              <Play className="size-3.5" /> Resume service
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Panel
        title="production deployment"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {repoUrl && (
              <Button asChild size="sm" variant="outline">
                <a href={repoUrl} target="_blank" rel="noreferrer">
                  Repository <ExternalLink className="size-3" />
                </a>
              </Button>
            )}
            {isSuspended ? (
              <Button size="sm" onClick={() => onControl('resume')} disabled={busy}>
                <Play className="size-3.5" /> Resume
              </Button>
            ) : isRunning ? (
              <>
                <Button size="sm" variant="outline" onClick={() => onControl('stop')} disabled={busy}>
                  <Square className="size-3.5" /> Stop
                </Button>
                <Button size="sm" variant="outline" onClick={() => onControl('restart')} disabled={busy}>
                  <RotateCw className="size-3.5" /> Restart
                </Button>
                <ConfirmButton
                  size="sm"
                  variant="outline"
                  confirmVariant="default"
                  confirmLabel="Suspend"
                  title="Suspend this service?"
                  description="Containers stop and stay stopped. Deploys, git webhooks, scheduled tasks, and backups are paused until you resume. Configuration, domains, and volumes are kept."
                  onConfirm={() => onControl('suspend')}
                  disabled={busy}
                >
                  <PauseCircle className="size-3.5" /> Suspend
                </ConfirmButton>
              </>
            ) : hasDeployment ? (
              <Button size="sm" variant="outline" onClick={() => onControl('start')} disabled={busy}>
                <Play className="size-3.5" /> Start
              </Button>
            ) : null}
            {primaryUrl && !isSuspended && (
              <Button asChild size="sm" variant="outline">
                <a href={primaryUrl} target="_blank" rel="noreferrer">
                  Visit <ExternalLink className="size-3" />
                </a>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onForceDeploy}
              disabled={busy || isSuspended}
              title={
                isSuspended
                  ? 'Resume the service before deploying'
                  : 'Clear cached source and rebuild without Docker/Nixpacks cache'
              }
            >
              <RefreshCw className="size-3.5" /> Force rebuild
            </Button>
            <Button
              onClick={onDeploy}
              disabled={busy || isSuspended}
              title={isSuspended ? 'Resume the service before deploying' : undefined}
            >
              <Rocket className="size-4" /> {hasDeployment ? 'Redeploy' : 'Deploy now'}
            </Button>
          </div>
        }
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground text-[11.5px]">
              {svc.gitBranch
                ? `To update your Production Deployment, push to the ${svc.gitBranch} branch.`
                : 'Deploy manually or configure a git source to deploy on push.'}
            </span>
            <Button size="sm" variant="ghost" onClick={onOpenDeployments}>
              <Layers className="size-3.5" /> Deployments
            </Button>
          </div>
        }
        contentClassName="p-4"
      >
        <div className="grid gap-6 md:grid-cols-[minmax(280px,360px)_1fr] md:items-start">
          <div className="border-border-bright relative aspect-[4/3] w-full overflow-hidden rounded-md border bg-gradient-to-br from-secondary to-background">
            {productionDeployment?.hasPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={deploymentPreviewUrl(productionDeployment.id)}
                alt={`${svc.name} deployment preview`}
                className="size-full object-cover object-top"
              />
            ) : (
              <div className="grid size-full place-items-center">
                <span className="text-phosphor font-heading text-4xl font-extrabold uppercase">
                  {svc.name[0]}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <DetailField label="Service">
              <p className="font-semibold">{svc.name}</p>
            </DetailField>
            <DetailField label="Server">
              <p className="font-mono text-[12px]">
                {svc.server ? `${svc.server.name} · ${svc.server.ip}` : 'No server assigned'}
              </p>
            </DetailField>
            <DetailField label="Source">
              <div className="flex flex-wrap items-center gap-2">
                <KindChip kind={svc.kind} />
                <StatusBadge status={svc.status} />
              </div>
            </DetailField>
            <DetailField label="Deployment">
              {productionDeployment && deploymentHref ? (
                <Link href={deploymentHref} className="font-mono text-[12px] hover:underline">
                  {productionDeployment.uuid}
                </Link>
              ) : (
                <p className="text-muted-foreground font-mono text-[12px]">No successful deployment</p>
              )}
            </DetailField>
            <DetailField label="Domains">
              {domains.length ? (
                <div className="flex flex-col gap-1">
                  {domains.map((d) => (
                    <a
                      key={d}
                      href={d.startsWith('http') ? d : `https://${d}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground inline-flex items-center gap-1 font-medium hover:underline"
                    >
                      {d.replace(/^https?:\/\//, '')} <ExternalLink className="size-3" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No domains configured</p>
              )}
            </DetailField>
            <DetailField label="Created">
              <p>
                {productionDeployment ? (
                  <LocalDateTime value={productionDeployment.createdAt} />
                ) : (
                  '—'
                )}
                {productionDeployment?.triggeredBy ? ` by ${productionDeployment.triggeredBy}` : ''}
              </p>
            </DetailField>
            <DetailField label="Branch">
              {svc.gitBranch ? (
                branchUrl ? (
                  <a
                    href={branchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[12px] hover:underline"
                  >
                    {svc.gitBranch}
                  </a>
                ) : (
                  <p className="font-mono text-[12px]">{svc.gitBranch}</p>
                )
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </DetailField>
            <DetailField label="Commit">
              {commitSha ? (
                <p className="font-mono text-[12px]">
                  {commitUrl ? (
                    <a
                      href={commitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-secondary hover:bg-secondary/80 rounded px-1.5 py-0.5 hover:underline"
                    >
                      {commitSha.slice(0, 7)}
                    </a>
                  ) : (
                    <span className="bg-secondary rounded px-1.5 py-0.5">{commitSha.slice(0, 7)}</span>
                  )}
                  {productionDeployment?.commitMessage ? (
                    <span className="text-muted-foreground ml-2 font-sans">
                      {productionDeployment.commitMessage}
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  {svc.kind === 'DATABASE' ? KIND_LABELS[svc.kind] : 'No git source'}
                </p>
              )}
            </DetailField>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel
          title="recent deployments"
          actions={
            <Button size="sm" variant="ghost" onClick={onOpenDeployments}>
              View all
            </Button>
          }
          contentClassName="divide-y"
        >
          {(deployments ?? []).slice(0, 5).length ? (
            (deployments ?? []).slice(0, 5).map((d) => (
              <div
                key={d.id}
                className="hover:bg-secondary/50 flex items-center justify-between gap-3 px-4 py-2.5 transition-colors"
              >
                <Link
                  href={`/projects/${projectId}/services/${svc.id}/deployments/${d.id}`}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  <StatusBadge status={d.status} />
                  {d.isPreview && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      preview{d.pullRequestId != null ? ` #${d.pullRequestId}` : ''}
                    </Badge>
                  )}
                  <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                    {d.commitSha ? d.commitSha.slice(0, 7) : d.uuid.slice(0, 7)}
                  </span>
                  {d.commitMessage ? (
                    <span className="text-foreground min-w-0 truncate text-[11.5px]">{d.commitMessage}</span>
                  ) : null}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  {d.previewUrl && (
                    <a
                      href={d.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={d.previewUrl}
                      className="text-muted-foreground hover:text-phosphor inline-flex items-center gap-1 text-[11px] transition-colors"
                    >
                      <ExternalLink className="size-3" />
                      Open
                    </a>
                  )}
                  <span className="text-muted-foreground text-[11px]">
                    <LocalDateTime value={d.createdAt} />
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground p-6 text-center text-[12.5px]">no deployments yet.</div>
          )}
        </Panel>
        <Panel title="activity" contentClassName="px-4 py-2">
          <Row label="deployments" value={svc._count.deployments} />
          <Row label="environment vars" value={svc._count.environmentVars} />
          <Row label="volumes" value={svc._count.persistentVolumes} />
          <Row label="previews" value={svc._count.previews} />
          <Row label="webhooks" value={svc._count.webhooks} />
        </Panel>
      </div>
    </div>
  );
}
