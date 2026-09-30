'use client';

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Boxes } from 'lucide-react';
import {
  getProject,
  getProjectMembers,
  removeProjectMember,
} from '@/services/api/project';
import {
  type ServiceKind,
  type ServiceListItem,
} from '@/services/api/service';
import { PageContainer, PageHeader } from '@/components/app/page';
import { DataTable } from '@/components/app/data-table';
import { LocalDateTime } from '@/components/app/local-datetime';
import { TemplateMarketplaceDialog } from '@/components/app/template-marketplace';
import { EmptyState } from '@/components/app/empty-state';
import { StatusBadge } from '@/components/app/status-badge';
import { KindChip } from '@/components/app/kind-chip';
import { ProjectMembersTab } from '@/components/app/project-members-tab';
import { ProjectSettingsTab } from '@/components/app/project-settings-tab';
import { NewServiceDialog } from '@/components/app/new-service-dialog';
import { useAuthStore } from '@/store/auth';
import { useProjectServices } from '@/lib/queries/service';

const KIND_LABELS: Record<ServiceKind, string> = {
  GIT_APP: 'Application (Git)',
  DOCKERFILE: 'Dockerfile',
  DOCKER_IMAGE: 'Docker Image',
  STATIC: 'Static Site',
  NIXPACKS: 'Nixpacks',
  DATABASE: 'Database',
  COMPOSE: 'Compose',
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <ProjectDetail_ params={params} />
    </Suspense>
  );
}

function ProjectDetail_({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const workspaceId = useAuthStore((s) => s.currentWorkspaceId);
  const tab = searchParams.get('tab') ?? 'services';

  const { data } = useQuery({ queryKey: ['project', projectId], queryFn: () => getProject(projectId) });
  const { data: members } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => getProjectMembers(projectId),
    enabled: tab === 'members',
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) => removeProjectMember(projectId, userId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast.success('Member removed');
    },
  });

  return (
    <PageContainer>
      <PageHeader
        title={data?.project.name ?? 'Project'}
        description={data ? data.project.description || 'No description' : undefined}
        actions={
          tab === 'services' && data?.canManage ? (
            <>
              <TemplateMarketplaceDialog projectId={projectId} />
              <NewServiceDialog projectId={projectId} />
            </>
          ) : undefined
        }
      />

      {tab === 'services' && <ServicesTab projectId={projectId} />}

      {tab === 'members' && (
        <ProjectMembersTab
          projectId={projectId}
          workspaceId={workspaceId!}
          canManage={data?.canManage ?? false}
          members={members ?? []}
          onRemove={(userId) => removeMut.mutate(userId)}
        />
      )}

      {tab === 'settings' &&
        (data?.project ? (
          <ProjectSettingsTab
            key={`${data.project.id}-${data.project.name}-${data.project.description ?? ''}`}
            project={data.project}
            canManage={data.canManage}
          />
        ) : (
          <div className="bg-accent h-40 animate-pulse rounded-lg" />
        ))}
    </PageContainer>
  );
}

function ServicesTab({ projectId }: { projectId: string }) {
  const { data: services, isLoading } = useProjectServices(projectId);

  return (
    <DataTable<ServiceListItem>
      columns={[
        {
          key: 'name',
          header: 'Name',
          cell: (svc) => (
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{svc.name}</span>
              <span className="text-muted-foreground truncate text-sm font-normal">
                {svc.description || KIND_LABELS[svc.kind]}
              </span>
            </span>
          ),
        },
        { key: 'kind', header: 'Kind', cell: (svc) => <KindChip kind={svc.kind} /> },
        { key: 'status', header: 'Status', cell: (svc) => <StatusBadge status={svc.status} /> },
        {
          key: 'updated',
          header: 'Created',
          cell: (svc) => <LocalDateTime value={svc.createdAt} />,
        },
      ]}
      rows={services ?? []}
      rowKey={(svc) => svc.id}
      rowHref={(svc) => `/projects/${projectId}/services/${svc.id}`}
      isLoading={isLoading}
      emptyState={
        <EmptyState
          icon={Boxes}
          title="No services yet"
          description="Create your first application, database, or compose stack in this project."
        />
      }
    />
  );
}
