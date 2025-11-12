"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { 
  Brain, 
  Play, 
  Clock, 
  Layers, 
  Sparkles,
  CheckCircle2,
  Settings,
  Zap,
  X
} from 'lucide-react'
import type { PromptType, MatchTimeMarkers } from '@/lib/api/generated/types.gen'

interface TaggingAIAnalysisFormProps {
  onSubmit: (params: {
    teamId: string
    promptTypes?: PromptType[]
    maxSegments?: number
    geminiModel?: 'gemini-1.5-flash' | 'gemini-1.5-pro'
    matchTimeMarkers: MatchTimeMarkers
  }) => void
  isLoading?: boolean
  teamId: string
  matchTimeMarkers: MatchTimeMarkers
  analysisProgress?: number
  analysisAttempt?: number
  analysisError?: string | null
  onStopAnalysis?: () => void
  currentTaskId?: string | null
}

const PROMPT_TYPES: { value: PromptType; label: string; description: string }[] = [
  {
    value: 'GAA_EVENT_ANALYSIS',
    label: 'GAA Event Analysis',
    description: 'Analyzes GAA match events including scores, fouls, turnovers, and key plays'
  }
]

const GEMINI_MODELS: { value: 'gemini-1.5-flash' | 'gemini-1.5-pro'; label: string; description: string }[] = [
  {
    value: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    description: 'Faster processing, good for quick analysis'
  },
  {
    value: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro', 
    description: 'More accurate analysis, better for detailed insights'
  }
]

export function TaggingAIAnalysisForm({ 
  onSubmit, 
  isLoading = false, 
  teamId,
  matchTimeMarkers,
  analysisProgress,
  analysisAttempt,
  analysisError,
  onStopAnalysis,
  currentTaskId
}: TaggingAIAnalysisFormProps) {
  const [selectedPromptTypes, setSelectedPromptTypes] = useState<PromptType[]>(['GAA_EVENT_ANALYSIS'])
  const [maxSegments, setMaxSegments] = useState<number | undefined>(undefined)
  const [geminiModel, setGeminiModel] = useState<'gemini-1.5-flash' | 'gemini-1.5-pro'>('gemini-1.5-flash')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handlePromptTypeChange = (promptType: PromptType, checked: boolean) => {
    if (checked) {
      setSelectedPromptTypes(prev => [...prev, promptType])
    } else {
      setSelectedPromptTypes(prev => prev.filter(p => p !== promptType))
    }
  }

  const handleSubmit = () => {
    onSubmit({
      teamId,
      promptTypes: selectedPromptTypes.length > 0 ? selectedPromptTypes : undefined,
      maxSegments,
      geminiModel, // Always send the gemini model, don't filter out defaults
      matchTimeMarkers,
    })
  }

  // Helper function to format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate estimated segments based on match time markers
  const firstHalfDuration = matchTimeMarkers.halfTime - matchTimeMarkers.firstHalfStart
  const secondHalfDuration = matchTimeMarkers.fullTime - matchTimeMarkers.secondHalfStart
  const totalMatchDuration = firstHalfDuration + secondHalfDuration
  const estimatedSegments = Math.ceil(totalMatchDuration / 15)
  const actualSegmentsToAnalyze = maxSegments ? Math.min(estimatedSegments, maxSegments) : estimatedSegments
  const estimatedProcessingTime = actualSegmentsToAnalyze * Math.max(selectedPromptTypes.length, 1) * 5 // ~5 seconds per segment per prompt

  return (
    <div className="backdrop-blur-sm rounded-lg border overflow-hidden bg-gray-100/50 border-gray-200/50 dark:bg-gray-800/30 dark:border-gray-600/30">
      {/* Header */}
      <div className="p-4 border-b bg-gray-300/40 border-gray-300/30 dark:bg-gray-800/50 dark:border-gray-600/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Brain className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">AI Video Analysis</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {Math.floor(totalMatchDuration / 60)}m match • {formatTime(matchTimeMarkers.firstHalfStart)}-{formatTime(matchTimeMarkers.halfTime)} | {formatTime(matchTimeMarkers.secondHalfStart)}-{formatTime(matchTimeMarkers.fullTime)}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
            Ready
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Step 1: Analysis Types */}
        <div className="space-y-3 text-gray-800 dark:text-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-green-400">1</span>
            </div>
            <Label className="text-sm font-medium text-gray-800 dark:text-gray-200">Select Analysis Types</Label>
          </div>
          
          <div className="space-y-2 ml-8">
            {PROMPT_TYPES.map((promptType) => (
              <div key={promptType.value} className="flex items-start space-x-3 p-3 rounded-lg border transition-colors bg-gray-300/20 border-gray-300/30 hover:bg-gray-300/30 dark:bg-gray-700/20 dark:border-gray-600/30 dark:hover:bg-gray-700/30">
                <Checkbox
                  id={promptType.value}
                  checked={selectedPromptTypes.includes(promptType.value)}
                  onCheckedChange={(checked: boolean) => 
                    handlePromptTypeChange(promptType.value, checked)
                  }
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label 
                    htmlFor={promptType.value} 
                    className="text-sm font-medium cursor-pointer text-gray-800 dark:text-gray-200"
                  >
                    {promptType.label}
                  </Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                    {promptType.description}
                  </p>
                </div>
              </div>
            ))}
            
            {selectedPromptTypes.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 rounded p-2">
                <CheckCircle2 className="h-4 w-4" />
                {selectedPromptTypes.length} analysis type{selectedPromptTypes.length > 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Quick Start */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-green-400">2</span>
              </div>
              <Label className="text-sm font-medium text-gray-800 dark:text-gray-200">Analysis Settings</Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-7 px-3 text-xs text-gray-400 hover:text-gray-200"
            >
              <Settings className="h-3 w-3 mr-1" />
              {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
            </Button>
          </div>

          <div className="ml-8">
            {!showAdvanced ? (
              /* Simple View */
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-700/20 rounded-lg border border-gray-600/30">
                  <div>
                    <p className="text-sm font-medium text-gray-200">Default Settings</p>
                    <p className="text-xs text-gray-400">Fast analysis • Full match</p>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-gray-600/30 text-gray-300">
                    Recommended
                  </Badge>
                </div>
                
                <div className="text-center p-3 bg-gray-700/10 rounded border border-gray-600/20">
                  <p className="text-xs text-gray-400">
                    {selectedPromptTypes.length > 0 ? (
                      <>
                        Will analyze <span className="text-green-400 font-medium">full match</span> in approximately <span className="text-green-400 font-medium">{Math.ceil(estimatedProcessingTime / 60)} minutes</span>
                      </>
                    ) : (
                      <span className="text-amber-400">Select an analysis type to see processing estimate</span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              /* Advanced View */
              <div className="space-y-4">
                {/* Model Selection */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-300 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI Model
                  </Label>
                  <Select value={geminiModel} onValueChange={(value: typeof geminiModel) => setGeminiModel(value)}>
                    <SelectTrigger className="bg-gray-700/30 border-gray-600/30 text-gray-200 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {GEMINI_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          <div className="flex flex-col py-1">
                            <span className="text-gray-200 text-sm font-medium">{model.label}</span>
                            <span className="text-xs text-gray-400">{model.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Video Coverage */}
                <div className="space-y-3">
                  <Label className="text-sm text-gray-300 flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Video Coverage
                  </Label>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-gray-700/20 rounded-lg border border-gray-600/30">
                      <input
                        type="radio"
                        id="full-video"
                        name="coverage"
                        checked={maxSegments === undefined}
                        onChange={() => setMaxSegments(undefined)}
                        className="text-green-500"
                      />
                      <Label htmlFor="full-video" className="text-sm text-gray-200 cursor-pointer flex-1">
                        Analyze entire match
                        <span className="block text-xs text-gray-400 mt-1">
                          ~{estimatedSegments} segments • {Math.ceil(totalMatchDuration / 60)} minutes of video
                        </span>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-gray-700/20 rounded-lg border border-gray-600/30">
                      <input
                        type="radio"
                        id="limited-segments"
                        name="coverage"
                        checked={maxSegments !== undefined}
                        onChange={() => setMaxSegments(2)}
                        className="text-green-500"
                      />
                      <div className="flex-1">
                        <Label htmlFor="limited-segments" className="text-sm text-gray-200 cursor-pointer">
                          Limit analysis
                        </Label>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-400">Analyze first</span>
                          <Input
                            type="number"
                            value={maxSegments || 2}
                            onChange={(e) => setMaxSegments(Number(e.target.value))}
                            min={1}
                            max={estimatedSegments}
                            disabled={maxSegments === undefined}
                            className="bg-gray-800/50 border-gray-600/30 text-gray-200 h-8 w-16 text-center text-xs"
                          />
                          <span className="text-xs text-gray-400">segments</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center p-2 bg-gray-700/10 rounded border border-gray-600/20">
                    <p className="text-xs text-gray-400">
                      {selectedPromptTypes.length === 0 ? (
                        <span className="text-amber-400">Select an analysis type to see processing estimate</span>
                      ) : maxSegments ? (
                        `Will analyze first ${maxSegments} segments (~${Math.ceil((maxSegments * selectedPromptTypes.length * 5) / 60)} minutes processing time)`
                      ) : (
                        `Will analyze full match (~${Math.ceil(estimatedProcessingTime / 60)} minutes processing time)`
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analysis Status & Controls */}
        {isLoading ? (
          <div className="space-y-4">
            {/* Progress Display */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400" />
                  <span className="text-sm font-medium text-blue-400">
                    Analysis in Progress
                  </span>
                </div>
                {currentTaskId && (
                  <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30">
                    Task: {currentTaskId.slice(0, 8)}...
                  </Badge>
                )}
              </div>
              
              {/* Progress Bar */}
              {analysisProgress !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Progress</span>
                    <span>{Math.round(analysisProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.min(analysisProgress, 100)}%` }}
                    />
                  </div>
                  {analysisAttempt !== undefined && (
                    <p className="text-xs text-gray-400">
                      Polling attempt {analysisAttempt} • Elapsed time: {Math.floor((analysisAttempt * 3) / 60)}m {(analysisAttempt * 3) % 60}s
                    </p>
                  )}
                </div>
              )}
              
              <p className="text-xs text-gray-400 mt-2">
                This may take 2-10 minutes depending on match length and analysis complexity. You can safely navigate away - the analysis will continue in the background.
              </p>
            </div>
            
            {/* Stop Button */}
            {onStopAnalysis && (
              <Button 
                onClick={onStopAnalysis}
                variant="outline"
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 h-10"
              >
                <X className="h-4 w-4 mr-2" />
                Stop Analysis
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Error Display */}
            {analysisError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <span className="font-medium">Analysis Failed:</span>
                  <span>{analysisError}</span>
                </div>
              </div>
            )}
            
            {/* Start Analysis Button */}
            <Button 
              onClick={handleSubmit}
              disabled={selectedPromptTypes.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-sm font-medium"
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              Start AI Analysis
            </Button>
            
            {selectedPromptTypes.length === 0 && (
              <p className="text-xs text-amber-400 text-center">
                Please select at least one analysis type to continue
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 