'use client'

import { useState, useEffect } from 'react'
import { Check, Palette } from 'lucide-react'

// GAA team colors - Each team has ONE kit with TWO colors
const GAA_TEAM_COLORS = {
  'Dublin': { primary: '#0066CC', secondary: '#87CEEB', name: 'Dublin (Sky Blue & Navy)' },
  'Kerry': { primary: '#016F32', secondary: '#FFD700', name: 'Kerry (Green & Gold)' },
  'Mayo': { primary: '#DC143C', secondary: '#016F32', name: 'Mayo (Red & Green)' },
  'Tyrone': { primary: '#FFFFFF', secondary: '#DC143C', name: 'Tyrone (White & Red)' },
  'Cork': { primary: '#DC143C', secondary: '#FFFFFF', name: 'Cork (Red & White)' },
  'Galway': { primary: '#8B0000', secondary: '#FFFFFF', name: 'Galway (Maroon & White)' },
  'Donegal': { primary: '#016F32', secondary: '#FFD700', name: 'Donegal (Green & Gold)' },
  'Kilkenny': { primary: '#000000', secondary: '#FFB300', name: 'Kilkenny (Black & Amber)' },
  'Limerick': { primary: '#016F32', secondary: '#FFFFFF', name: 'Limerick (Green & White)' },
  'Tipperary': { primary: '#0066CC', secondary: '#FFD700', name: 'Tipperary (Blue & Gold)' },
  'Waterford': { primary: '#0066CC', secondary: '#FFFFFF', name: 'Waterford (Blue & White)' },
  'Clare': { primary: '#FFB300', secondary: '#0066CC', name: 'Clare (Saffron & Blue)' },
  'Wexford': { primary: '#800080', secondary: '#FFD700', name: 'Wexford (Purple & Gold)' },
  'Meath': { primary: '#016F32', secondary: '#FFD700', name: 'Meath (Green & Gold)' },
  'Kildare': { primary: '#FFFFFF', secondary: '#C0C0C0', name: 'Kildare (White)' },
  'Armagh': { primary: '#FF6600', secondary: '#FFFFFF', name: 'Armagh (Orange & White)' },
  'Roscommon': { primary: '#FFD700', secondary: '#0066CC', name: 'Roscommon (Primrose & Blue)' },
  'Down': { primary: '#DC143C', secondary: '#000000', name: 'Down (Red & Black)' },
  'Monaghan': { primary: '#FFFFFF', secondary: '#0066CC', name: 'Monaghan (White & Blue)' },
  'Derry': { primary: '#DC143C', secondary: '#FFFFFF', name: 'Derry (Red & White)' },
} as const

interface TeamColorPickerProps {
  teamId: string
  currentPrimaryColor?: string
  currentSecondaryColor?: string
  onColorsUpdated?: () => void
  apiClient: any
}

export default function TeamColorPicker({
  teamId,
  currentPrimaryColor = '#016F32',
  currentSecondaryColor = '#FFD700',
  onColorsUpdated,
  apiClient
}: TeamColorPickerProps) {
  const [primaryColor, setPrimaryColor] = useState(currentPrimaryColor)
  const [secondaryColor, setSecondaryColor] = useState(currentSecondaryColor)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPresets, setShowPresets] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    setPrimaryColor(currentPrimaryColor)
    setSecondaryColor(currentSecondaryColor)
  }, [currentPrimaryColor, currentSecondaryColor])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      await apiClient.updateTeamColors(teamId, {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
      })
      setSuccess(true)
      onColorsUpdated?.()
      
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update colors')
    } finally {
      setSaving(false)
    }
  }

  const applyPreset = (preset: { primary: string; secondary: string }) => {
    setPrimaryColor(preset.primary)
    setSecondaryColor(preset.secondary)
  }

  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-gray-800">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-[#D1FB7A]" />
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">Team Kit Colors</h3>
            <p className="text-sm text-gray-400">
              {isExpanded ? 'Click to collapse' : primaryColor && secondaryColor ? `${primaryColor} • ${secondaryColor}` : 'Click to set your team colors'}
            </p>
          </div>
        </div>
        <div className="text-gray-400">
          {isExpanded ? '▲' : '▼'}
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-800 pt-6">
          <p className="text-sm text-gray-400 mb-4">
            GAA teams have one kit with two colors (e.g., Kerry: Green & Gold)
          </p>

      {/* Color Pickers */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Primary Color
          </label>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer"
              style={{ backgroundColor: primaryColor }}
              onClick={() => document.getElementById('primary-color-input')?.click()}
            />
            <input
              id="primary-color-input"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-24 h-10 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded text-white font-mono text-sm"
              placeholder="#016F32"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Secondary Color
          </label>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer"
              style={{ backgroundColor: secondaryColor }}
              onClick={() => document.getElementById('secondary-color-input')?.click()}
            />
            <input
              id="secondary-color-input"
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="w-24 h-10 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded text-white font-mono text-sm"
              placeholder="#FFD700"
            />
          </div>
        </div>
      </div>

      {/* GAA Team Presets */}
      <div className="mb-6">
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="text-sm font-medium text-gray-300 mb-3 hover:text-white transition-colors"
        >
          {showPresets ? '▼' : '▶'} Quick Select: Common GAA Teams
        </button>
        
        {showPresets && (
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 bg-[#0f0f0f] rounded border border-gray-800">
            {Object.entries(GAA_TEAM_COLORS).map(([key, colors]) => (
              <button
                key={key}
                onClick={() => applyPreset(colors)}
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-800 transition-colors text-left group"
              >
                <div className="flex gap-1">
                  <div
                    className="w-6 h-6 rounded border border-gray-700"
                    style={{ backgroundColor: colors.primary }}
                  />
                  <div
                    className="w-6 h-6 rounded border border-gray-700"
                    style={{ backgroundColor: colors.secondary }}
                  />
                </div>
                <span className="text-sm text-gray-400 group-hover:text-white">
                  {key}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="mb-6 p-4 bg-[#0f0f0f] rounded border border-gray-800">
        <p className="text-sm text-gray-400 mb-2">Kit Preview:</p>
        <div className="flex gap-4">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-lg mb-2"
              style={{ backgroundColor: primaryColor }}
            />
            <p className="text-xs text-gray-500">Primary</p>
          </div>
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-lg mb-2"
              style={{ backgroundColor: secondaryColor }}
            />
            <p className="text-xs text-gray-500">Secondary</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="space-y-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#D1FB7A] text-black font-semibold py-2.5 rounded hover:bg-[#c5ef6e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {success && <Check className="w-4 h-4" />}
          {saving ? 'Saving...' : success ? 'Saved!' : 'Save Team Colors'}
        </button>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        {success && (
          <p className="text-sm text-[#D1FB7A] text-center">
            Colors updated successfully!
          </p>
        )}
      </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Your team's kit colors will be displayed in game videos and match events
          </p>
        </div>
      )}
    </div>
  )
}

