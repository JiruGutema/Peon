"use client"

import { use, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageContainer } from "@/components/app/page"
import { getServer } from "@/services/api/server"
import { TabWithActivity } from "@/components/server/activity-panel"
import { GeneralSection } from "@/components/server/general-section"
import { AdvancedSection } from "@/components/server/advanced-section"
import { TerminalSection } from "@/components/server/terminal-section"
import { ProxySection } from "@/components/server/proxy-section"
import { DestinationsSection } from "@/components/server/destinations-section"
import { DangerSection } from "@/components/server/danger-section"

const TABS_LIST_CLASS =
  "h-auto w-full justify-start gap-5 rounded-none border-b bg-transparent p-0"
const TABS_TRIGGER_CLASS =
  "rounded-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-0 pb-2 text-[12.5px] shadow-none data-[state=active]:border-phosphor data-[state=active]:bg-transparent data-[state=active]:text-phosphor data-[state=active]:shadow-none"

export default function ServerDetailPage({
  params,
}: {
  params: Promise<{ serverId: string }>
}) {
  const { serverId } = use(params)
  const qc = useQueryClient()
  const [tab, setTab] = useState("general")

  const { data: server, isLoading } = useQuery({
    queryKey: ["server", serverId],
    queryFn: () => getServer(serverId),
    refetchInterval: (q) =>
      q.state.data?.settings?.isSentinelEnabled ? 30_000 : false,
  })

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["server", serverId] })

  if (isLoading || !server) {
    return (
      <PageContainer>
        <div className="h-20 animate-pulse rounded-lg bg-accent" />
        <div className="h-64 animate-pulse rounded-lg bg-accent" />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <Tabs value={tab} onValueChange={setTab} className="w-full min-w-0">
        <TabsList className={TABS_LIST_CLASS}>
          <TabsTrigger className={TABS_TRIGGER_CLASS} value="general">
            General
          </TabsTrigger>
          <TabsTrigger className={TABS_TRIGGER_CLASS} value="proxy">
            Gateway
          </TabsTrigger>
          <TabsTrigger className={TABS_TRIGGER_CLASS} value="terminal">
            Terminal
          </TabsTrigger>
          <TabsTrigger className={TABS_TRIGGER_CLASS} value="advanced">
            Advanced
          </TabsTrigger>
          <TabsTrigger className={TABS_TRIGGER_CLASS} value="destinations">
            Destinations
          </TabsTrigger>
          <TabsTrigger className={TABS_TRIGGER_CLASS} value="danger">
            Danger
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="pt-6">
          <TabWithActivity serverId={server.id}>
            <GeneralSection key={server.id} server={server} onSaved={invalidate} />
          </TabWithActivity>
        </TabsContent>
        <TabsContent value="proxy" className="pt-6">
          <TabWithActivity serverId={server.id}>
            <ProxySection server={server} onChanged={invalidate} />
          </TabWithActivity>
        </TabsContent>
        <TabsContent value="terminal" className="pt-6">
          <TerminalSection serverId={server.id} />
        </TabsContent>
        <TabsContent value="advanced" className="pt-6">
          <TabWithActivity serverId={server.id}>
            <AdvancedSection server={server} onSaved={invalidate} />
          </TabWithActivity>
        </TabsContent>
        <TabsContent value="destinations" className="pt-6">
          <DestinationsSection server={server} onChanged={invalidate} />
        </TabsContent>
        <TabsContent value="danger" className="pt-6">
          <DangerSection server={server} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
