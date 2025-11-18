'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { RotateCcw, Check, Users } from 'lucide-react';

// Dynamically import Leaflet components with SSR disabled
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

import rawPitches from './gaapitchfinder_data.json';

interface Pitch {
  File: string;
  Club: string;
  Pitch: string;
  Code: string;
  Latitude: number | null;
  Longitude: number | null;
  Province: string;
  Country: string;
  Division: string;
  County: string;
  Directions: string;
  Twitter: string;
  Elevation: number | null;
  annual_rainfall: number | null;
  rain_days: number | null;
}

const pitches: Pitch[] = rawPitches as Pitch[];

// Constants matching the original Python script
const MAP_CENTER = [53.4129, -7.9135]; // Center of Ireland
const MAP_ZOOM_DESKTOP = 6.5; // Balanced zoom for desktop/landscape
const MAP_ZOOM_MOBILE = 5; // Much more zoomed out for mobile/portrait

const MAP_OPACITY_NORMALIZATION = 2500; // Max rainfall for opacity calculation

interface PitchFinderProps {
  onClubSelect?: (club: Pitch) => void;
  showSelectButton?: boolean;
  onCreateTeam?: (club: Pitch) => void;
  isCreatingTeam?: boolean;
}

export function PitchFinder({ onClubSelect, showSelectButton = false, onCreateTeam, isCreatingTeam = false }: PitchFinderProps) {
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedCounty, setSelectedCounty] = useState('all');
  const [selectedClub, setSelectedClub] = useState('all');
  const [selectedClubData, setSelectedClubData] = useState<Pitch | null>(null);
  const [search, setSearch] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [leaflet, setLeaflet] = useState<any>(null);
  const mapRef = useRef<any>(null);
  const [mapZoom, setMapZoom] = useState(MAP_ZOOM_DESKTOP);
  
  // Ensure we're on the client side and load Leaflet
  useEffect(() => {
    setIsClient(true);
    // Import Leaflet on client side
    import('leaflet').then((L) => {
      setLeaflet(L.default);
    });
  }, []);

  // Detect orientation and set appropriate zoom
  useEffect(() => {
    const updateZoom = () => {
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      setMapZoom(isPortrait ? MAP_ZOOM_MOBILE : MAP_ZOOM_DESKTOP);
    };
    
    updateZoom();
    window.addEventListener('resize', updateZoom);
    window.addEventListener('orientationchange', updateZoom);
    
    return () => {
      window.removeEventListener('resize', updateZoom);
      window.removeEventListener('orientationchange', updateZoom);
    };
  }, []);

  // Fix Leaflet default icons and create icon only on client side
  useEffect(() => {
    if (!isClient || !leaflet) return;
    
    delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
    leaflet.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
  }, [isClient, leaflet]);

  // Create icon only on client side - smaller and more transparent
  const icon = isClient && leaflet ? leaflet.divIcon({
    className: 'custom-dot',
    html: '<div style="background-color: rgba(255, 215, 0, 0.6); width: 5px; height: 5px; border-radius: 50%; border: 0.5px solid rgba(255,255,255,0.5);"></div>',
    iconSize: [5, 5],
    iconAnchor: [2.5, 2.5]
  }) : null;
  
  // Province to counties mapping
  const provinceToCounties: Record<string, string[]> = {
    Ulster: [
      'Antrim', 'Armagh', 'Cavan', 'Derry', 'Donegal', 'Down', 'Fermanagh', 'Monaghan', 'Tyrone'
    ],
    Connacht: [
      'Galway', 'Leitrim', 'Mayo', 'Roscommon', 'Sligo'
    ],
    Leinster: [
      'Carlow', 'Dublin', 'Kildare', 'Kilkenny', 'Laois', 'Longford', 'Louth', 'Meath', 'Offaly', 'Westmeath', 'Wexford', 'Wicklow'
    ],
    Munster: [
      'Clare', 'Cork', 'Kerry', 'Limerick', 'Tipperary', 'Waterford'
    ]
  };

  // All provinces (hardcoded for dropdown)
  const provinces = ['Ulster', 'Connacht', 'Leinster', 'Munster'];

  // Filter counties for dropdown based on selected province
  const counties = selectedProvince !== 'all'
    ? provinceToCounties[selectedProvince] || []
    : Array.from(new Set(pitches.map((p: Pitch) => p.County))).sort();

  // Filter clubs for dropdown based on selected province/county
  const clubs = pitches.filter((p: Pitch) => {
    if (selectedProvince !== 'all' && p.Province !== selectedProvince) return false;
    if (selectedCounty !== 'all' && p.County !== selectedCounty) return false;
    return true;
  }).map((p: Pitch) => p.Club).sort();

  // Create unique clubs list with their original indices
  const uniqueClubs = Array.from(new Set(clubs)).map(clubName => {
    const firstOccurrence = pitches.findIndex(p => p.Club === clubName);
    return { name: clubName, index: firstOccurrence };
  });

  // Filtering for table/map
  const filtered = pitches.filter((p: Pitch) => {
    const matchesSearch = 
      p.Club.toLowerCase().includes(search.toLowerCase()) ||
      (p.Pitch && p.Pitch.toLowerCase().includes(search.toLowerCase())) ||
      p.County.toLowerCase().includes(search.toLowerCase());
    const matchesProvince = selectedProvince === 'all' || p.Province === selectedProvince;
    const matchesCounty = selectedCounty === 'all' || p.County === selectedCounty;
    const matchesClub = selectedClub === 'all' || p.Club === selectedClub;
    return matchesSearch && matchesProvince && matchesCounty && matchesClub;
  });

  // Show only markers for clubs in the filtered results
  const mapPitches = filtered.filter(p => p.Latitude && p.Longitude && p.annual_rainfall);

  // Don't render map until client side
  if (!isClient) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Loading placeholder for map */}
          <div className="w-full h-[300px] sm:h-[400px] lg:h-[600px] rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center order-2 lg:order-1">
            <div className="text-gray-400">Loading map...</div>
          </div>
          {/* Controls placeholder */}
          <div className="flex flex-col space-y-2 text-gray-100 order-1 lg:order-2 lg:h-[600px]">
            {/* Search and Filters */}
            <div className="space-y-2 bg-black/80 rounded-lg p-3 border border-gray-900 shadow-lg">
              <h3 className="text-sm font-semibold text-gray-200">Filters & Search</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search by club, pitch, or county..."
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    if (selectedClub !== 'all') setSelectedClub('all');
                  }}
                  className="w-full p-2 rounded-lg bg-black border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600"
                />
                <div className="grid grid-cols-3 gap-2 items-center">
                  <select
                    value={selectedProvince}
                    onChange={e => setSelectedProvince(e.target.value)}
                    className="w-full p-2 rounded-lg bg-black border border-gray-700 text-gray-100"
                  >
                    <option value="all">All Provinces</option>
                    {provinces.map(province => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                  <select
                    value={selectedCounty}
                    onChange={e => setSelectedCounty(e.target.value)}
                    className="w-full p-2 rounded-lg bg-black border border-gray-700 text-gray-100"
                  >
                    <option value="all">All Counties</option>
                    {counties.map(county => (
                      <option key={county} value={county}>{county}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedClub}
                      onChange={e => setSelectedClub(e.target.value)}
                      className="w-full p-2 rounded-lg bg-black border border-gray-700 text-gray-100"
                    >
                      <option value="all">All Clubs</option>
                      {uniqueClubs.map((club, index) => (
                        <option key={`club-${club.name}-${index}`} value={club.name}>
                          {club.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        setSelectedProvince('all');
                        setSelectedCounty('all');
                        setSelectedClub('all');
                        setSearch('');
                      }}
                      className="ml-2 p-2 rounded-full border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center justify-center"
                      type="button"
                      aria-label="Reset Filters"
                      title="Reset Filters"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Number of Clubs and Selected Filters Badges */}
            <div className="mb-2 flex flex-wrap gap-2 justify-center items-center rounded-lg bg-black/80 p-2 border border-gray-900 shadow-lg">
              <span className="bg-gray-800 text-gray-200 text-xs font-semibold px-3 py-1 rounded-full border border-gray-600">
                {filtered.length} clubs
              </span>
              {selectedProvince !== 'all' && (
                <span className="bg-gray-800 text-gray-200 text-xs font-semibold px-3 py-1 rounded-full border border-gray-700">
                  {selectedProvince}
                </span>
              )}
              {selectedCounty !== 'all' && (
                <span className="bg-gray-800 text-gray-200 text-xs font-semibold px-3 py-1 rounded-full border border-gray-700">
                  {selectedCounty}
                </span>
              )}
              {selectedClub !== 'all' && (
                <span className="bg-gray-800 text-gray-200 text-xs font-semibold px-3 py-1 rounded-full border border-gray-700">
                  {selectedClub}
                </span>
              )}
              {search.trim() !== '' && (
                <span className="bg-gray-800 text-gray-200 text-xs font-semibold px-3 py-1 rounded-full border border-gray-700">
                  Search: "{search}"
                </span>
              )}
            </div>
            {/* Results List - Responsive height */}
            <div className="dark bg-black text-gray-100 rounded-lg shadow-lg mt-2 overflow-hidden max-h-[250px] sm:max-h-[300px] lg:max-h-[420px]">
              <ul className="overflow-y-auto space-y-1 bg-black p-2 border border-gray-900 custom-scrollbar h-full">
                {filtered.slice(0, 50).map((p: Pitch, i: number) => {
                  // Find the original index of this pitch in the full dataset
                  const originalIndex = pitches.findIndex(pitch => 
                    pitch.Club === p.Club && 
                    pitch.County === p.County && 
                    pitch.Latitude === p.Latitude && 
                    pitch.Longitude === p.Longitude
                  );
                  return (
                    <li
                      key={`result-${originalIndex}`}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors
                        ${selectedClub !== 'all' && p.Club === selectedClub ? 'bg-gray-900 border border-gray-600 text-white' : 'bg-gray-900/50 hover:bg-gray-900 text-gray-100 border border-transparent'}`}
                      onClick={() => {
                        setSelectedClub(p.Club);
                        setSelectedClubData(p);
                        if (onClubSelect) {
                          onClubSelect(p);
                        }
                      }}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate max-w-[180px]">{p.Club}</span>
                        <span className="text-xs text-gray-400 truncate">{p.Province} &middot; {p.County}</span>
                      </div>
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="text-gray-400 text-center py-8">No clubs found</li>
                )}
              </ul>
              {filtered.length > 50 && (
                <div className="text-center mt-1 text-gray-400 text-xs">
                  Showing first 50 of {filtered.length} clubs
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Main Layout - Stacked on mobile, side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Map - Full height on mobile, proportional on desktop */}
        <div className="w-full h-[300px] sm:h-[400px] lg:h-[600px] rounded-lg overflow-hidden order-2 lg:order-1">
            <MapContainer 
              center={MAP_CENTER as [number, number]} 
              zoom={mapZoom} 
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
              zoomControl={false}
              attributionControl={false}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              boxZoom={false}
              keyboard={false}
              touchZoom={false}
              key={mapZoom}
            >
            <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            />
            {mapPitches.map((p, i) => {
              // Find the original index of this pitch in the full dataset
              const originalIndex = pitches.findIndex(pitch => 
                pitch.Club === p.Club && 
                pitch.County === p.County && 
                pitch.Latitude === p.Latitude && 
                pitch.Longitude === p.Longitude
              );
              return (
                <Marker
                  key={`marker-${originalIndex}`}
                  position={[p.Latitude!, p.Longitude!]}
                  icon={icon}
                  interactive={false}
                />
              );
            })}
          </MapContainer>
        </div>
        {/* Controls and Data - On top on mobile, right side on desktop */}
        <div className="flex flex-col space-y-2 text-gray-100 order-1 lg:order-2 lg:h-[600px]">
          {/* Search and Filters */}
          <div className="space-y-2 bg-black/80 rounded-lg p-3 border border-gray-900 shadow-lg">
            <h3 className="text-sm font-semibold text-gray-200">Filters & Search</h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search by club, pitch, or county..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  if (selectedClub !== 'all') setSelectedClub('all');
                }}
                className="w-full p-2 rounded-lg bg-black border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600"
              />
              <div className="grid grid-cols-3 gap-2 items-center">
                <select
                  value={selectedProvince}
                  onChange={e => setSelectedProvince(e.target.value)}
                  className="w-full p-2 rounded-lg bg-black border border-gray-700 text-gray-100"
                >
                  <option value="all">All Provinces</option>
                  {provinces.map(province => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
                <select
                  value={selectedCounty}
                  onChange={e => setSelectedCounty(e.target.value)}
                  className="w-full p-2 rounded-lg bg-black border border-gray-700 text-gray-100"
                >
                  <option value="all">All Counties</option>
                  {counties.map(county => (
                    <option key={county} value={county}>{county}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedClub}
                    onChange={e => {
                      const clubName = e.target.value;
                      setSelectedClub(clubName);
                      if (clubName !== 'all') {
                        const club = pitches.find(p => p.Club === clubName);
                        if (club) {
                          setSelectedClubData(club);
                          if (onClubSelect) {
                            onClubSelect(club);
                          }
                        }
                      } else {
                        setSelectedClubData(null);
                      }
                    }}
                    className="w-full p-2 rounded-lg bg-black border border-gray-700 text-gray-100"
                  >
                    <option value="all">All Clubs</option>
                    {uniqueClubs.map((club, index) => (
                      <option key={`club-${club.name}-${index}`} value={club.name}>
                        {club.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setSelectedProvince('all');
                      setSelectedCounty('all');
                      setSelectedClub('all');
                      setSearch('');
                    }}
                    className="ml-2 p-2 rounded-full border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center justify-center"
                    type="button"
                    aria-label="Reset Filters"
                    title="Reset Filters"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Number of Clubs and Selected Filters Badges */}
          <div className="mb-2 flex flex-wrap gap-2 justify-center items-center rounded-lg bg-black/80 p-2 border border-gray-900 shadow-lg">
            <span className="bg-gray-800 text-gray-200 text-xs font-semibold px-3 py-1 rounded-full border border-gray-600">
              {filtered.length} clubs
            </span>
            {selectedProvince !== 'all' && (
              <span className="bg-gray-800 text-gray-200 text-xs font-semibold px-3 py-1 rounded-full border border-gray-700">
                {selectedProvince}
              </span>
            )}
            {selectedCounty !== 'all' && (
              <span className="bg-gray-800 text-gray-200 text-xs font-semibold px-3 py-1 rounded-full border border-gray-700">
                {selectedCounty}
              </span>
            )}
            {selectedClub !== 'all' && (
              <span className="bg-gray-800 text-gray-200 text-xs font-semibold px-3 py-1 rounded-full border border-gray-700">
                {selectedClub}
              </span>
            )}
            {search.trim() !== '' && (
              <span className="bg-gray-800 text-gray-200 text-xs font-semibold px-3 py-1 rounded-full border border-gray-700">
                Search: "{search}"
              </span>
            )}
          </div>
          {/* Results List - Force Dark Mode Sidebar Style */}
          <div className="dark bg-black text-gray-100 rounded-lg shadow-lg mt-2 overflow-hidden" style={{ maxHeight: 'calc(600px - 180px)' }}>
            <ul className="overflow-y-auto space-y-1 bg-black p-2 border border-gray-900 custom-scrollbar" style={{ maxHeight: '100%' }}>
              {filtered.slice(0, 50).map((p: Pitch, i: number) => {
                // Find the original index of this pitch in the full dataset
                const originalIndex = pitches.findIndex(pitch => 
                  pitch.Club === p.Club && 
                  pitch.County === p.County && 
                  pitch.Latitude === p.Latitude && 
                  pitch.Longitude === p.Longitude
                );
                const isSelected = selectedClub !== 'all' && p.Club === selectedClub;
                return (
                  <li
                    key={`result-${originalIndex}`}
                    className={`rounded-lg transition-all ${
                      isSelected 
                        ? 'bg-gray-900 border-2 border-gray-600' 
                        : 'bg-gray-900/50 hover:bg-gray-900 border-2 border-transparent'
                    }`}
                  >
                    <div
                      className="flex items-center justify-between px-3 py-3 cursor-pointer"
                      onClick={() => {
                        setSelectedClub(p.Club);
                        setSelectedClubData(p);
                        if (onClubSelect) {
                          onClubSelect(p);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isSelected && (
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={`font-medium truncate ${isSelected ? 'text-white' : 'text-gray-100'}`}>
                            {p.Club}
                          </span>
                          <span className={`text-xs truncate ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                            {p.Province} &middot; {p.County}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isSelected && onCreateTeam && (
                      <div className="px-3 pb-3 pt-2 border-t border-gray-700">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateTeam(p);
                          }}
                          disabled={isCreatingTeam}
                          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          {isCreatingTeam ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Creating Team...
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4" />
                              This is my club - Create Team
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="text-gray-400 text-center py-8">No clubs found</li>
              )}
            </ul>
            {filtered.length > 50 && (
              <div className="text-center mt-1 text-gray-400 text-xs">
                Showing first 50 of {filtered.length} clubs
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 