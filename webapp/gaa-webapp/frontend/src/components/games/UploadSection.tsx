'use client'

import { useState, useRef } from 'react'
import { Upload, Link as LinkIcon, X, FileVideo } from 'lucide-react'
import { games } from '@/lib/api-client'
import clubsData from '@/components/pitch-finder/gaapitchfinder_data.json'

interface Club {
  Club: string
  County: string
  Province: string
  Code: string
}

const clubs: Club[] = clubsData as Club[]

interface UploadSectionProps {
  teamId: string
  teamName: string
  onGameCreated: () => void
}

// Get unique counties for filtering
const counties = Array.from(new Set(clubs.map(c => c.County))).sort()

export default function UploadSection({ teamId, teamName, onGameCreated }: UploadSectionProps) {
  const [videoUrl, setVideoUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [oppositionCounty, setOppositionCounty] = useState('')
  const [oppositionClub, setOppositionClub] = useState('')
  const [showOppositionDropdown, setShowOppositionDropdown] = useState(false)
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([])
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

  const handleOppositionChange = (value: string) => {
    setOppositionClub(value)
    if (value.trim()) {
      // Filter clubs by county (if selected) and search term
      let filtered = clubs.filter(club => {
        const matchesSearch = club.Club.toLowerCase().includes(value.toLowerCase())
        const matchesCounty = !oppositionCounty || club.County === oppositionCounty
        return matchesSearch && matchesCounty
      })
      
      // Remove duplicates by club name
      const uniqueClubs = filtered.reduce((acc: Club[], club) => {
        if (!acc.find(c => c.Club === club.Club)) {
          acc.push(club)
        }
        return acc
      }, [])
      
      setFilteredClubs(uniqueClubs.slice(0, 10)) // Show max 10 suggestions
      setShowOppositionDropdown(true)
    } else {
      setShowOppositionDropdown(false)
    }
  }

  const selectOpposition = (club: Club) => {
    setOppositionClub(club.Club)
    setOppositionCounty(club.County)
    setShowOppositionDropdown(false)
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
      setOppositionCounty('')
      setOppositionClub('')
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
    <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">Squad: <span className="text-white font-medium">{teamName}</span></p>
      </div>

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
            className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
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
            className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
          />
        </div>

        {/* Opposition Club Selector */}
        <div className="grid grid-cols-2 gap-4">
          {/* County Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Opposition County
            </label>
            <select
              value={oppositionCounty}
              onChange={(e) => {
                setOppositionCounty(e.target.value)
                setOppositionClub('') // Reset club when county changes
              }}
              className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
            >
              <option value="">All Counties</option>
              {counties.map(county => (
                <option key={county} value={county}>{county}</option>
              ))}
            </select>
          </div>

          {/* Club Autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Opposition Club
            </label>
            <input
              type="text"
              value={oppositionClub}
              onChange={(e) => handleOppositionChange(e.target.value)}
              onFocus={() => oppositionClub && setShowOppositionDropdown(true)}
              onBlur={() => setTimeout(() => setShowOppositionDropdown(false), 200)}
              placeholder="Type club name..."
              className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
            />
            {showOppositionDropdown && filteredClubs.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-[#0f0f0f] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {filteredClubs.map((club, index) => (
                  <button
                    key={`${club.Club}-${index}`}
                    type="button"
                    onClick={() => selectOpposition(club)}
                    className="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors text-white text-sm border-b border-white/5 last:border-0"
                  >
                    <div className="font-medium">{club.Club}</div>
                    <div className="text-xs text-gray-400">{club.County}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toggle between URL and File Upload */}
        <div className="flex gap-4 border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={() => {
              setUseFileUpload(false)
              setSelectedFile(null)
              setVideoUrl('')
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              !useFileUpload
                ? 'bg-[#2D8B4D] text-white'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
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
                ? 'bg-[#2D8B4D] text-white'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
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
              className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
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
                className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center cursor-pointer hover:border-[#2D8B4D] transition-colors"
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
              <div className="border border-white/10 rounded-lg p-4 bg-black/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileVideo className="w-8 h-8 text-[#2D8B4D]" />
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
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-3">
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="bg-[#2D8B4D] h-2 rounded-full transition-all"
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
          className="w-full px-4 py-2 bg-[#2D8B4D] hover:bg-[#2D8B4D]/80 disabled:bg-black/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? (uploadProgress > 0 ? `Uploading... ${Math.round(uploadProgress)}%` : 'Adding Match...') : 'Add Match'}
        </button>
      </form>
    </div>
  )
}

