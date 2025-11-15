'use client'

import { useState, useEffect } from 'react'
import { Check, Palette } from 'lucide-react'

// Common GAA team colors for quick selection
const GAA_TEAM_COLORS = {
  'Dublin': { home: '#0066CC', away: '#87CEEB', name: 'Dublin (Sky Blue)' },
  'Kerry': { home: '#016F32', away: '#FFD700', name: 'Kerry (Green & Gold)' },
  'Mayo': { home: '#DC143C', away: '#016F32', name: 'Mayo (Red & Green)' },
  'Tyrone': { home: '#FFFFFF', away: '#DC143C', name: 'Tyrone (White & Red)' },
  'Cork': { home: '#DC143C', away: '#FFFFFF', name: 'Cork (Red)' },
  'Galway': { home: '#8B0000', away: '#FFFFFF', name: 'Galway (Maroon)' },
  'Donegal': { home: '#016F32', away: '#FFD700', name: 'Donegal (Green & Gold)' },
  'Kilkenny': { home: '#000000', away: '#FFB300', name: 'Kilkenny (Black & Amber)' },
  'Limerick': { home: '#016F32', away: '#FFFFFF', name: 'Limerick (Green)' },
  'Tipperary': { home: '#0066CC', away: '#FFD700', name: 'Tipperary (Blue & Gold)' },
  'Waterford': { home: '#0066CC', away: '#FFFFFF', name: 'Waterford (Blue)' },
  'Clare': { home: '#FFB300', away: '#0066CC', name: 'Clare (Saffron & Blue)' },
  'Wexford': { home: '#800080', away: '#FFD700', name: 'Wexford (Purple & Gold)' },
  'Meath': { home: '#016F32', away: '#FFD700', name: 'Meath (Green & Gold)' },
  'Kildare': { home: '#FFFFFF', away: '#C0C0C0', name: 'Kildare (White)' },
  'Armagh': { home: '#FF6600', away: '#FFFFFF', name: 'Armagh (Orange)' },
  'Roscommon': { home: '#FFD700', away: '#0066CC', name: 'Roscommon (Primrose & Blue)' },
  'Down': { home: '#DC143C', away: '#000000', name: 'Down (Red & Black)' },
  'Monaghan': { home: '#FFFFFF', away: '#0066CC', name: 'Monaghan (White & Blue)' },
  'Derry': { home: '#DC143C', away: '#FFFFFF', name: 'Derry (Red & White)' },
} as const

interface TeamColorPickerProps {
  teamId: string
  currentHomeColor?: string
  currentAwayColor?: string
  onColorsUpdated?: () => void
  apiClient: any
}

export default function TeamColorPicker({
  teamId,
  currentHomeColor = '#016F32',
  currentAwayColor = '#FFFFFF',
  onColorsUpdated,
  apiClient
}: TeamColorPickerProps) {
  const [homeColor, setHomeColor] = useState(currentHomeColor)
  const [awayColor, setAwayColor] = useState(currentAwayColor)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPresets, setShowPresets] = useState(true)

  useEffect(() => {
    setHomeColor(currentHomeColor)
    setAwayColor(currentAwayColor)
  }, [currentHomeColor, currentAwayColor])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      await apiClient.updateTeamColors(teamId, {
        home_color: homeColor,
        away_color: awayColor,
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

  const applyPreset = (preset: { home: string; away: string }) => {
    setHomeColor(preset.home)
    setAwayColor(preset.away)
  }

  return (
    <div className="bg-[#1a1a1a] p-6 rounded-lg border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-5 h-5 text-[#D1FB7A]" />
        <h3 className="text-lg font-semibold text-white">Team Colors</h3>
      </div>

      {/* Color Pickers */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Home Color
          </label>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer"
              style={{ backgroundColor: homeColor }}
              onClick={() => document.getElementById('home-color-input')?.click()}
            />
            <input
              id="home-color-input"
              type="color"
              value={homeColor}
              onChange={(e) => setHomeColor(e.target.value)}
              className="w-24 h-10 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={homeColor}
              onChange={(e) => setHomeColor(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded text-white font-mono text-sm"
              placeholder="#016F32"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Away Color
          </label>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer"
              style={{ backgroundColor: awayColor }}
              onClick={() => document.getElementById('away-color-input')?.click()}
            />
            <input
              id="away-color-input"
              type="color"
              value={awayColor}
              onChange={(e) => setAwayColor(e.target.value)}
              className="w-24 h-10 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={awayColor}
              onChange={(e) => setAwayColor(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded text-white font-mono text-sm"
              placeholder="#FFFFFF"
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
                    style={{ backgroundColor: colors.home }}
                  />
                  <div
                    className="w-6 h-6 rounded border border-gray-700"
                    style={{ backgroundColor: colors.away }}
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
        <p className="text-sm text-gray-400 mb-2">Preview:</p>
        <div className="flex gap-4">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-lg mb-2"
              style={{ backgroundColor: homeColor }}
            />
            <p className="text-xs text-gray-500">Home</p>
          </div>
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-lg mb-2"
              style={{ backgroundColor: awayColor }}
            />
            <p className="text-xs text-gray-500">Away</p>
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
        These colors will be used to display your team in game videos and match events
      </p>
    </div>
  )
}

