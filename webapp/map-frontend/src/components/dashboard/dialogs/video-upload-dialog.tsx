"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useVideoUpload } from "@/hooks/use-videos"
import { 
  Upload, 
  FileVideo, 
  AlertCircle, 
  CheckCircle, 
  X,
  Loader2,
  Link
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface VideoUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId?: string
  gameId?: string
  isPublic?: boolean
  onUploadComplete?: () => void
}

const MAX_FILE_SIZE = 9 * 1024 * 1024 * 1024 // 9GB
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']

export function VideoUploadDialog({ 
  open, 
  onOpenChange, 
  teamId, 
  gameId,
  isPublic = false,
  onUploadComplete
}: VideoUploadDialogProps) {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState("")
  const [error, setError] = useState("")
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState<string>("")
  const [isDragOver, setIsDragOver] = useState(false)
  
  const videoUpload = useVideoUpload()

  const validateFile = (selectedFile: File): string | null => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      return "Please select a valid video file (MP4, MOV, AVI, or WebM)"
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      return "File size must be less than 9GB"
    }

    return null
  }

  const validateUrl = (url: string): string | null => {
    if (!url.trim()) {
      return "Please enter a video URL"
    }

    try {
      new URL(url)
    } catch {
      return "Please enter a valid URL"
    }

    return null
  }

  const handleFileSelect = (selectedFile: File) => {
    setError("")
    const validationError = validateFile(selectedFile)
    if (validationError) {
      setError(validationError)
      return
    }

    setFile(selectedFile)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVideoUrl(event.target.value)
    setError("")
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")

    // Validate required fields for non-public videos
    if (!isPublic && (!teamId || !gameId)) {
      setError("Team ID and Game ID are required for team videos")
      return
    }

    if (uploadMethod === 'file') {
      if (!file) {
        setError("Please select a video file")
        return
      }
    } else {
      const urlError = validateUrl(videoUrl)
      if (urlError) {
        setError(urlError)
        return
      }
    }

    try {
      const payload = {
        ...(teamId && { teamId }),
        ...(gameId && { gameId }),
        isPublic,
        ...(uploadMethod === 'file' && file ? { file } : { videoUrl }),
        onProgress: ({ stage, percentage, loaded, total }: any) => {
          setProgress(percentage)
          switch (stage) {
            case 'getting-url':
              setStage(uploadMethod === 'file' ? 'Getting upload URL...' : 'Starting video download...')
              break
            case 'uploading':
              if (uploadMethod === 'file' && loaded && total) {
                const loadedMB = (loaded / 1024 / 1024).toFixed(1)
                const totalMB = (total / 1024 / 1024).toFixed(1)
                setStage(`Uploading video... ${loadedMB}MB / ${totalMB}MB`)
              } else {
                setStage('Downloading and processing video...')
              }
              break
            case 'creating-record':
              setStage('Creating video record...')
              break
            case 'complete':
              setStage('Upload complete!')
              break
            default:
              setStage(stage)
          }
        }
      } as any // Use any to bypass type checking for now

      await videoUpload.mutateAsync(payload)
      
      // Reset form
      setFile(null)
      setVideoUrl("")
      setProgress(0)
      setStage("")
      onUploadComplete?.()
      onOpenChange(false)
    } catch (err) {
      console.error('Upload failed:', err)
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    }
  }

  const handleClose = () => {
    if (!videoUpload.isPending) {
      setFile(null)
      setVideoUrl("")
      setError("")
      setProgress(0)
      setStage("")
      setIsDragOver(false)
      onOpenChange(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const canSubmit = uploadMethod === 'file' ? !!file : !!videoUrl.trim()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Video
          </DialogTitle>
          <DialogDescription>
            Upload a video file or provide a URL to import a video for this game.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Upload Progress */}
          {videoUpload.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{stage}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Upload Method Tabs */}
          <Tabs 
            value={uploadMethod} 
            onValueChange={(value) => setUploadMethod(value as 'file' | 'url')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file" className="flex items-center gap-2">
                <FileVideo className="h-4 w-4" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                From URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4">
              {/* Drag & Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <FileVideo className="h-12 w-12 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium text-lg">{file.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                    {!videoUpload.isPending && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFile(null)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove File
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <Upload className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium text-lg">
                        {isDragOver ? 'Drop your video here' : 'Drag & drop your video here'}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        or click to browse
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('video-file-input')?.click()}
                      disabled={videoUpload.isPending}
                    >
                      Choose File
                    </Button>
                    <input
                      id="video-file-input"
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      disabled={videoUpload.isPending}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground text-center">
                Supported formats: MP4, MOV, AVI, WebM. Maximum size: 9GB
              </div>
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video-url">Video URL</Label>
                <Input
                  id="video-url"
                  type="url"
                  placeholder="https://example.com/video.mp4"
                  value={videoUrl}
                  onChange={handleUrlChange}
                  disabled={videoUpload.isPending}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                Enter a direct link to a video file. The video will be downloaded and processed automatically.
              </div>
            </TabsContent>
          </Tabs>

          {/* Upload Success */}
          {videoUpload.isSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Video uploaded successfully! Processing will begin automatically.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={videoUpload.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || videoUpload.isPending}
            >
              {videoUpload.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : uploadMethod === 'file' ? (
                <FileVideo className="h-4 w-4 mr-2" />
              ) : (
                <Link className="h-4 w-4 mr-2" />
              )}
              {videoUpload.isPending ? "Uploading..." : uploadMethod === 'file' ? "Upload Video" : "Import Video"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 