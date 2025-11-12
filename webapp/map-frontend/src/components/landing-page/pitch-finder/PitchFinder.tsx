'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { RotateCcw } from 'lucide-react';

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

import rawPitches from './gaapitchfinder_data.json' assert { type: 'json' };

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
const MAP_ZOOM = 7;
const MAP_OPACITY_NORMALIZATION = 2500; // Max rainfall for opacity calculation

export function PitchFinder() {
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedCounty, setSelectedCounty] = useState('all');
  const [selectedClub, setSelectedClub] = useState('all');
  const [search, setSearch] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [leaflet, setLeaflet] = useState<any>(null);
  const mapRef = useRef<any>(null);
  
  // Ensure we're on the client side and load Leaflet
  useEffect(() => {
    setIsClient(true);
    // Import Leaflet on client side
    import('leaflet').then((L) => {
      setLeaflet(L.default);
    });
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

  // Create icon only on client side
  const icon = isClient && leaflet ? leaflet.divIcon({
    className: 'custom-dot',
    html: '<div style="background-color: gold; width: 8px; height: 8px; border-radius: 50%; border: 1px solid white;"></div>',
    iconSize: [8, 8],
    iconAnchor: [4, 4]
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start" style={{ minHeight: '600px', height: '600px' }}>
          {/* Left Side - Loading placeholder */}
          <div className="w-full h-[600px] rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
            <div className="text-gray-400">Loading map...</div>
          </div>
          {/* Right Side - Controls and Data */}
          <div className="flex flex-col h-[600px] space-y-2 text-gray-100">
            {/* Search and Filters */}
            <div className="space-y-2 bg-gray-800 rounded-lg p-3 border border-gray-800 shadow-lg">
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
                  className="w-full p-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <div className="grid grid-cols-3 gap-2 items-center">
                  <select
                    value={selectedProvince}
                    onChange={e => setSelectedProvince(e.target.value)}
                    className="w-full p-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100"
                  >
                    <option value="all">All Provinces</option>
                    {provinces.map(province => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                  <select
                    value={selectedCounty}
                    onChange={e => setSelectedCounty(e.target.value)}
                    className="w-full p-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100"
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
                      className="w-full p-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100"
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
            <div className="mb-2 flex flex-wrap gap-2 justify-center items-center rounded-lg bg-gray-800 p-2 border border-gray-800 shadow-lg">
              <span className="bg-blue-800/60 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full border border-blue-400">
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
            <div className="dark bg-gray-900 text-gray-100 rounded-lg shadow-lg mt-2 overflow-hidden" style={{ maxHeight: 'calc(600px - 180px)' }}>
              <ul className="overflow-y-auto space-y-1 bg-gray-900 p-2 border border-gray-800 custom-scrollbar" style={{ maxHeight: '100%' }}>
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
                        ${selectedClub !== 'all' && p.Club === selectedClub ? 'bg-blue-800/60 border border-blue-400 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-100 border border-transparent'}`}
                      onClick={() => setSelectedClub(p.Club)}
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
      {/* Main Layout - Map on Left, Controls on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start" style={{ minHeight: '600px', height: '600px' }}>
        {/* Left Side - Interactive Map */}
        <div className="w-full h-[600px] rounded-lg overflow-hidden">
          <MapContainer 
            center={MAP_CENTER as [number, number]} 
            zoom={MAP_ZOOM} 
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
          >
            <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
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
        {/* Right Side - Controls and Data */}
        <div className="flex flex-col h-[600px] space-y-2 text-gray-100">
          {/* Search and Filters */}
          <div className="space-y-2 bg-gray-800 rounded-lg p-3 border border-gray-800 shadow-lg">
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
                className="w-full p-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <div className="grid grid-cols-3 gap-2 items-center">
                <select
                  value={selectedProvince}
                  onChange={e => setSelectedProvince(e.target.value)}
                  className="w-full p-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100"
                >
                  <option value="all">All Provinces</option>
                  {provinces.map(province => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
                <select
                  value={selectedCounty}
                  onChange={e => setSelectedCounty(e.target.value)}
                  className="w-full p-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100"
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
                    className="w-full p-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100"
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
          <div className="mb-2 flex flex-wrap gap-2 justify-center items-center rounded-lg bg-gray-800 p-2 border border-gray-800 shadow-lg">
            <span className="bg-blue-800/60 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full border border-blue-400">
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
          <div className="dark bg-gray-900 text-gray-100 rounded-lg shadow-lg mt-2 overflow-hidden" style={{ maxHeight: 'calc(600px - 180px)' }}>
            <ul className="overflow-y-auto space-y-1 bg-gray-900 p-2 border border-gray-800 custom-scrollbar" style={{ maxHeight: '100%' }}>
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
                      ${selectedClub !== 'all' && p.Club === selectedClub ? 'bg-blue-800/60 border border-blue-400 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-100 border border-transparent'}`}
                    onClick={() => setSelectedClub(p.Club)}
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