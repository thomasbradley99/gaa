"use client"


import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  Trophy,
  Flag,
  Target,
  Timer
} from 'lucide-react'
import type { MatchTimeMarkersProgress, MatchTimeMarkers } from '@/lib/types/tagging'

interface MatchTimeMarkersTrackerProps {
  progress: MatchTimeMarkersProgress
  nextRequiredEvent: string | null
  matchTimeMarkers: MatchTimeMarkers | null
  onAutoFillVideoAnalysis?: (markers: MatchTimeMarkers) => void
}

export function MatchTimeMarkersTracker({
  progress,
  nextRequiredEvent,
  matchTimeMarkers,
  onAutoFillVideoAnalysis
}: MatchTimeMarkersTrackerProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getCompletedCount = () => {
    return Object.values(progress).filter(p => p.completed).length
  }

  const progressPercent = (getCompletedCount() / 4) * 100

  const events = [
    {
      key: 'firstHalfThrowUp',
      label: 'First Half Throw-up',
      icon: Trophy,
      progress: progress.firstHalfThrowUp,
      description: 'Tag the first throw-up to mark match start'
    },
    {
      key: 'halfTimeWhistle',
      label: 'Half Time Whistle',
      icon: Timer,
      progress: progress.halfTimeWhistle,
      description: 'Tag the half time whistle'
    },
    {
      key: 'secondHalfThrowUp',
      label: 'Second Half Throw-up',
      icon: Target,
      progress: progress.secondHalfThrowUp,
      description: 'Tag the second half throw-up'
    },
    {
      key: 'fullTimeWhistle',
      label: 'Full Time Whistle',
      icon: Flag,
      progress: progress.fullTimeWhistle,
      description: 'Tag the full time whistle to mark match end'
    }
  ]

  const isAllCompleted = getCompletedCount() === 4
  const hasAnyProgress = getCompletedCount() > 0

  return (
    <div className="backdrop-blur-sm rounded-lg p-4 border bg-gray-100/50 border-gray-200/50 dark:bg-gray-800/30 dark:border-gray-600/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-yellow-500/20 rounded-lg">
          <Clock className="h-5 w-5 text-yellow-400" />
        </div>
        <span className="font-semibold text-gray-800 dark:text-gray-200">Match Time Markers</span>
        <Badge 
          variant="outline" 
          className={`ml-auto text-xs ${
            isAllCompleted 
              ? 'bg-green-500/20 text-green-300 border-green-500/30' 
              : 'bg-gray-200 text-gray-500 border-gray-300 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30'
          }`}
        >
          {getCompletedCount()}/4 Complete
        </Badge>
      </div>
      
      {hasAnyProgress && (
        <div className="space-y-2 mb-4">
          <Progress 
            value={progressPercent} 
            className="h-2 bg-gray-300/40 dark:bg-gray-700/50" 
          />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {matchTimeMarkers 
              ? "All markers captured! Video analysis form will be auto-filled."
              : nextRequiredEvent 
                ? `Next: Tag ${nextRequiredEvent}`
                : "Tag events in order to capture match timing"
            }
          </p>
        </div>
             )}
       
       <div className="space-y-3">
         {events.map((event, index) => {
           const Icon = event.icon
           const isCompleted = event.progress.completed
           const isCurrent = !isCompleted && events.slice(0, index).every(e => e.progress.completed)
           
           return (
             <div 
               key={event.key}
               className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                 isCompleted 
                   ? 'bg-green-500/10 border-green-500/30' 
                   : isCurrent 
                     ? 'bg-yellow-500/10 border-yellow-500/30 ring-2 ring-yellow-500/20' 
                     : 'bg-gray-200/80 border-gray-300 dark:bg-gray-700/50 dark:border-gray-600/30'
               }`}
             >
               <div className={`flex-shrink-0 ${
                 isCompleted ? 'text-green-400' : isCurrent ? 'text-yellow-400' : 'text-gray-500 dark:text-gray-500'
               }`}>
                 {isCompleted ? (
                   <CheckCircle2 className="h-5 w-5" />
                 ) : (
                   <Circle className="h-5 w-5" />
                 )}
               </div>
               
               <Icon className={`h-4 w-4 flex-shrink-0 ${
                 isCompleted ? 'text-green-400' : isCurrent ? 'text-yellow-400' : 'text-gray-500 dark:text-gray-500'
               }`} />
               
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2">
                   <span className={`font-medium ${
                     isCompleted ? 'text-green-300' : isCurrent ? 'text-yellow-600 dark:text-yellow-300' : 'text-gray-700 dark:text-gray-400'
                   }`}>
                     {event.label}
                   </span>
                   {isCurrent && (
                     <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30">
                       NEXT
                     </Badge>
                   )}
                 </div>
                 <p className={`text-xs ${
                   isCompleted ? 'text-green-400' : isCurrent ? 'text-yellow-400' : 'text-gray-500 dark:text-gray-500'
                 }`}>
                   {isCompleted 
                     ? `Tagged at ${formatTime(event.progress.time!)}`
                     : event.description
                   }
                 </p>
               </div>
               
               {isCurrent && (
                 <ArrowRight className="h-4 w-4 text-yellow-400 animate-pulse" />
               )}
             </div>
           )
         })}
         
         {matchTimeMarkers && onAutoFillVideoAnalysis && (
           <div className="mt-4 pt-3 border-t border-gray-600/30">
             <Button 
               onClick={() => onAutoFillVideoAnalysis(matchTimeMarkers)}
               className="w-full bg-green-600 hover:bg-green-700 text-white"
               size="sm"
             >
               <CheckCircle2 className="h-4 w-4 mr-2" />
               Auto-Fill Video Analysis Form
             </Button>
           </div>
         )}
       </div>
     </div>
  )
} 