"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Hand, 
  Sparkles,
  Target,
  CheckCircle2
} from 'lucide-react'

interface TaggingModeSelectorProps {
  onModeSelect: (mode: 'manual' | 'ai') => void
}

export function TaggingModeSelector({ onModeSelect }: TaggingModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<'manual' | 'ai' | null>(null)

  const handleModeSelect = (mode: 'manual' | 'ai') => {
    setSelectedMode(mode)
    onModeSelect(mode)
  }

  return (
    <div className="backdrop-blur-sm rounded-lg p-6 border bg-gray-100/50 border-gray-200/50 dark:bg-gray-800/30 dark:border-gray-600/30">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-500/20 rounded-lg">
          <CheckCircle2 className="h-6 w-6 text-green-400" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Match Time Markers Complete!</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Choose your tagging approach to continue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Manual Tagging Option */}
        <div 
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            selectedMode === 'manual' 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-gray-300/30 dark:border-gray-600/30 hover:border-blue-400/50 hover:bg-blue-500/5'
          }`}
          onClick={() => handleModeSelect('manual')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${
              selectedMode === 'manual' ? 'bg-blue-500/20' : 'bg-gray-300/40 dark:bg-gray-700/50'
            }`}>
              <Hand className={`h-5 w-5 ${
                selectedMode === 'manual' ? 'text-blue-400' : 'text-gray-600 dark:text-gray-400'
              }`} />
            </div>
            <div>
              <h4 className={`font-medium ${
                selectedMode === 'manual' ? 'text-blue-300' : 'text-gray-800 dark:text-gray-200'
              }`}>
                Manual Tagging
              </h4>
            </div>
          </div>
          <p className={`text-sm ${
            selectedMode === 'manual' ? 'text-blue-200' : 'text-gray-600 dark:text-gray-400'
          }`}>
            Continue tagging events manually as you watch the video. Full control over every event.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Target className="h-3 w-3 text-gray-500 dark:text-gray-500" />
            <span className="text-xs text-gray-500 dark:text-gray-500">Real-time tagging</span>
          </div>
        </div>

        {/* AI Analysis Option */}
        <div 
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            selectedMode === 'ai' 
              ? 'border-green-500 bg-green-500/10' 
              : 'border-gray-300/30 dark:border-gray-600/30 hover:border-green-400/50 hover:bg-green-500/5'
          }`}
          onClick={() => handleModeSelect('ai')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${
              selectedMode === 'ai' ? 'bg-green-500/20' : 'bg-gray-300/40 dark:bg-gray-700/50'
            }`}>
              <Brain className={`h-5 w-5 ${
                selectedMode === 'ai' ? 'text-green-400' : 'text-gray-600 dark:text-gray-400'
              }`} />
            </div>
            <div>
              <h4 className={`font-medium ${
                selectedMode === 'ai' ? 'text-green-300' : 'text-gray-800 dark:text-gray-200'
              }`}>
                AI Video Analysis
              </h4>
            </div>
          </div>
          <p className={`text-sm ${
            selectedMode === 'ai' ? 'text-green-200' : 'text-gray-600 dark:text-gray-400'
          }`}>
            Let AI analyze the match periods automatically using your tagged time markers.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-gray-500 dark:text-gray-500" />
            <span className="text-xs text-gray-500 dark:text-gray-500">Automated detection</span>
          </div>
        </div>
      </div>

      {selectedMode && (
        <div className="mt-6 text-center">
          <Button 
            onClick={() => handleModeSelect(selectedMode)}
            className={`px-6 py-3 ${
              selectedMode === 'manual' 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
            size="lg"
          >
            {selectedMode === 'manual' ? (
              <>
                <Hand className="h-5 w-5 mr-2" />
                Continue Manual Tagging
              </>
            ) : (
              <>
                <Brain className="h-5 w-5 mr-2" />
                Start AI Analysis
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
} 