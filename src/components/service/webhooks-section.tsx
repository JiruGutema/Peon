'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Callout, CalloutBullets } from '@/components/app/callout';
import { listWebhooks, createWebhook, deleteWebhook } from '@/services/api/service';
import { Panel } from '@/components/app/page';
import { ConfirmButton } from '@/components/app/confirm';
import { publicEnv } from '@/lib/env';

export function WebhooksSection({
  serviceId,
  gitBranch,
}: {
  serviceId: string;
  gitBranch: string | null;
}) {
  const qc = useQueryClient();
  const [provider, setProvider] = useState<'generic' | 'github' | 'gitlab'>('generic');
  const { data: webhooks } = useQuery({
    queryKey: ['webhooks', serviceId],
    queryFn: () => listWebhooks(serviceId),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['webhooks', serviceId] });

  const createMut = useMutation({
    mutationFn: () => createWebhook(serviceId, provider),
    onSuccess: async () => {
      await invalidate();
      toast.success('Webhook created');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteWebhook(serviceId, id),
    onSuccess: invalidate,
  });

  function webhookUrl(token: string) {
    return `${publicEnv.appUrl.replace(/\/$/, '')}/api/webhooks/${token}`;
  }

  async function copyUrl(token: string) {
    try {
      await navigator.clipboard.writeText(webhookUrl(token));
      toast.success('Webhook URL copied');
    } catch {
      toast.error('Could not copy URL');
    }
  }

  return (
    <div className="space-y-4">
      <Callout title="Independent deploy webhooks" defaultOpen>
        <p>
          These are standalone URLs for this service only. Create one, copy the URL, and call it from
          GitHub, GitLab, CI, or any HTTP client. A matching push queues a deployment
          {gitBranch ? (
            <>
              {' '}
              for branch <span className="text-foreground font-mono">{gitBranch}</span>
            </>
          ) : null}
          .
        </p>
        <CalloutBullets>
          <li>
            <b>Generic</b> — <span className="font-mono">POST</span> JSON to the URL. The path token
            authenticates the request. Include <span className="font-mono">ref</span> /{' '}
            <span className="font-mono">after</span> like a GitHub push payload if you want branch
            filtering and commit metadata.
          </li>
          <li>
            <b>GitHub</b> — Repo Settings → Webhooks → Add webhook. Content type{' '}
            <span className="font-mono">application/json</span>. Set the webhook Secret to the same
            token as in the URL (Peon verifies <span className="font-mono">X-Hub-Signature-256</span>
            ). Events: Push.
          </li>
          <li>
            <b>GitLab</b> — Project → Settings → Webhooks. Paste the URL and set Secret token to the
            path token (sent as <span className="font-mono">X-Gitlab-Token</span>). Trigger on Push
            events.
          </li>
          <li>
            Auto-deploy must be enabled on the service. GitHub ping events are acknowledged without
            deploying.
          </li>
        </CalloutBullets>
      </Callout>

      <Panel
        title="deploy webhooks"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-36">
              <SearchableSelect
                value={provider}
                onValueChange={(v) => setProvider(v as 'generic' | 'github' | 'gitlab')}
                placeholder="Select provider"
                size="sm"
                options={[
                  { value: 'generic', label: 'Generic' },
                  { value: 'github', label: 'GitHub' },
                  { value: 'gitlab', label: 'GitLab' },
                ]}
              />
            </div>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              New webhook
            </Button>
          </div>
        }
        contentClassName="divide-y"
      >
        {webhooks?.length ? (
          webhooks.map((w) => (
            <div
              key={w.id}
              className="hover:bg-secondary flex min-w-0 items-center justify-between gap-4 px-4 py-3 text-[12.5px] transition-colors"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
                <span className="min-w-0 break-all font-mono text-xs">{webhookUrl(w.token)}</span>
                <span className="text-muted-foreground text-xs">
                  provider: {w.provider}
                  {w.provider !== 'generic' ? ' · use the path token as the webhook secret' : ''}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyUrl(w.token)}
                  title="Copy URL"
                >
                  <Copy className="size-3.5" />
                </Button>
                <ConfirmButton
                  onConfirm={() => delMut.mutate(w.id)}
                  title="Delete webhook?"
                  description="External systems calling this webhook URL will stop triggering deployments."
                >
                  <Trash2 className="size-4" /> Delete
                </ConfirmButton>
              </div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground p-6 text-center text-[12.5px]">
            No webhooks yet. Create one to get a deploy URL.
          </div>
        )}
      </Panel>
    </div>
  );
}
