"use client"

import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { SidebarEventsList } from '@/components/video-player/sidebar-events-list'
import type { EventsManagerProps } from './types'

// Custom close button component that can use the sidebar context
function CustomCloseButton({ isFullscreen }: { isFullscreen: boolean }) {
  const { setOpen } = useSidebar()

  if (!isFullscreen) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setOpen(false)}
      className="h-8 w-8 p-0 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30"
      title="Close Events Panel"
    >
      <X className="h-4 w-4" />
    </Button>
  )
}

export function EventsManager({
  matchState,
  onEventSave,
  onEventDelete,
  onDeleteAllEvents,
  onEventSeek,
  onGenerateSampleEvents,
  onGenerateCastletownEvents,
  onGenerateGaaJsonEvents,
  onTeamUpdate,
  onToggleSecondHalf,
  onExportData,
  teams,
  isFullscreen,
  // Add this new prop with default
  showEventsManager = true,
  onFilterChange,
  sidebarOpen = true,
  onSidebarOpenChange
}: EventsManagerProps) {
  return (
    <SidebarProvider defaultOpen={true} className="dark">
      <Sidebar
        side="right"
        variant={isFullscreen ? "floating" : "sidebar"}
        collapsible="offcanvas"
        className={`${
          isFullscreen 
            ? "!fixed !top-0 !right-0 z-[100] h-full w-[25.2rem]" 
            : "!relative !top-0 !right-0 z-50 h-[800px] border-l"
        } dark:bg-sidebar dark:text-sidebar-foreground dark:border-sidebar-border`}
        style={{
          '--sidebar-width': isFullscreen ? '25.2rem' : '20rem',
          '--sidebar-width-icon': '3rem',
        } as any}
      >
        <SidebarHeader className="flex flex-row items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Events</span>
          </div>
          <div className="flex items-center gap-2">
            <CustomCloseButton isFullscreen={isFullscreen} />
            <SidebarTrigger 
              className={`${isFullscreen ? 'h-8 w-8 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/30' : ''}`}
              title="Hide Events Panel"
            />
          </div>
        </SidebarHeader>
        <SidebarContent className={`overflow-y-auto ${isFullscreen ? 'max-h-[90vh]' : 'max-h-[780px]'}`}>
          <SidebarEventsList
            events={matchState.tagHistory}
            matchState={matchState}
            onEventDelete={onEventDelete}
            onDeleteAll={onDeleteAllEvents}
            onEventSeek={onEventSeek}
            onGenerateSampleEvents={onGenerateSampleEvents}
            onGenerateCastletownEvents={onGenerateCastletownEvents}
            onGenerateGaaJsonEvents={onGenerateGaaJsonEvents}
            onFilterChange={onFilterChange}
          />
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  )
}
