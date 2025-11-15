'use client'

import { useState, useRef } from 'react'
import { Upload, Link as LinkIcon, X, FileVideo } from 'lucide-react'
import { games } from '@/lib/api-client'

interface UploadSectionProps {
  teamId: string
  teamName: string
  onGameCreated: () => void
}

export default function UploadSection({ teamId, teamName, onGameCreated }: UploadSectionProps) {
  const [videoUrl, setVideoUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [useFileUpload, setUseFileUpload] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setError('Please select a video file')
        return
      }
      // Validate file size (max 2GB)
      if (file.size > 2 * 1024 * 1024 * 1024) {
        setError('File size must be less than 2GB')
        return
      }
      setSelectedFile(file)
      setVideoUrl('') // Clear URL when file selected
      setError('')
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFileToS3 = async (file: File, uploadUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100
          setUploadProgress(percentComplete)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve()
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'))
      })

      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUploadProgress(0)

    if (!title) {
      setError('Title is required')
      return
    }

    if (!videoUrl && !selectedFile) {
      setError('Please provide a video URL or upload a file')
      return
    }

    setLoading(true)

    try {
      let s3Key: string | undefined
      let originalFilename: string | undefined
      let fileSize: number | undefined

      // If file upload, upload to S3 first
      if (selectedFile) {
        // Get presigned URL
        const uploadUrlData = await games.getUploadUrl(selectedFile.name, selectedFile.type)
        
        // Upload file to S3
        await uploadFileToS3(selectedFile, uploadUrlData.uploadUrl)
        
        s3Key = uploadUrlData.s3Key
        originalFilename = selectedFile.name
        fileSize = selectedFile.size
      }

      // Create game record
      await games.create({
        title,
        description: description || undefined,
        teamId,
        videoUrl: videoUrl || undefined,
        s3Key,
        originalFilename,
        fileSize,
      })

      // Reset form
      setVideoUrl('')
      setTitle('')
      setDescription('')
      setSelectedFile(null)
      setUseFileUpload(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onGameCreated()
    } catch (err: any) {
      setError(err.message || 'Failed to create game')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Add New Game</h2>
      <p className="text-sm text-gray-400 mb-4">Team: <span className="text-white font-medium">{teamName}</span></p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Dublin vs Kerry"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            rows={2}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Toggle between URL and File Upload */}
        <div className="flex gap-4 border-b border-gray-700 pb-4">
          <button
            type="button"
            onClick={() => {
              setUseFileUpload(false)
              setSelectedFile(null)
              setVideoUrl('')
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              !useFileUpload
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            Video URL
          </button>
          <button
            type="button"
            onClick={() => {
              setUseFileUpload(true)
              setVideoUrl('')
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              useFileUpload
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
        </div>

        {/* VEO URL Input */}
        {!useFileUpload && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <LinkIcon className="inline w-4 h-4 mr-2" />
              Video URL
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://veo.co/teams/123/matches/456"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Paste VEO, Trace, or Spiideo URL
            </p>
          </div>
        )}

        {/* File Upload */}
        {useFileUpload && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Upload className="inline w-4 h-4 mr-2" />
              Video File
            </label>
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 transition-colors"
              >
                <FileVideo className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-400 mb-1">Click to select video file</p>
                <p className="text-xs text-gray-500">MP4, MOV, AVI (max 2GB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border border-gray-600 rounded-lg p-4 bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileVideo className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="text-white font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-gray-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Uploading... {Math.round(uploadProgress)}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || (useFileUpload && !selectedFile) || (!useFileUpload && !videoUrl)}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? (uploadProgress > 0 ? `Uploading... ${Math.round(uploadProgress)}%` : 'Adding Game...') : 'Add Game'}
        </button>
      </form>
    </div>
  )
}

