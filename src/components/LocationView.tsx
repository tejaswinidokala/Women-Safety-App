/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, 
  MapPin, 
  Share2, 
  AlertTriangle, 
  ExternalLink, 
  Clock, 
  Check, 
  Plus, 
  Play, 
  Square, 
  Activity,
  ShieldAlert,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Contact } from '../types';

interface LocationViewProps {
  contacts: Contact[];
  onShareLocation: (lat: number, lng: number, accuracy: number, contactIds: string[]) => void;
  activeShare: {
    active: boolean;
    contacts: string[]; // list of contact IDs
    durationMinutes: number;
    startTime: number;
    endTime: number;
  } | null;
  onStartLiveShare: (contactIds: string[], durationMinutes: number) => void;
  onStopLiveShare: () => void;
  onExtendLiveShare: (extraMinutes: number) => void;
}

export default function LocationView({
  contacts,
  onShareLocation,
  activeShare,
  onStartLiveShare,
  onStopLiveShare,
  onExtendLiveShare,
}: LocationViewProps) {
  const [lat, setLat] = useState<number>(40.7128); // default: New York
  const [lng, setLng] = useState<number>(-74.0060); // default: New York
  const [accuracy, setAccuracy] = useState<number>(3);
  const [isFetching, setIsFetching] = useState(false);
  const [hasLiveLocation, setHasLiveLocation] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  // Sharing configuration state
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<number>(30); // minutes
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDurationInput, setCustomDurationInput] = useState('45');

  // Timer state for active share
  const [timeLeftStr, setTimeLeftStr] = useState('00:00:00');
  const timerIntervalRef = useRef<any>(null);

  // Simulation status logs
  const [simLogs, setSimLogs] = useState<string[]>([]);

  // Check permission status
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((permission) => {
          setPermissionStatus(permission.state as any);
          permission.addEventListener('change', () => {
            setPermissionStatus(permission.state as any);
          });
        })
        .catch(() => setPermissionStatus('unknown'));
    }
  }, []);

  // Fetch coordinates
  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setIsFetching(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setAccuracy(Math.round(position.coords.accuracy));
        setHasLiveLocation(true);
        setErrorMsg(null);
        setIsFetching(false);
      },
      (error) => {
        console.warn('Geolocation error:', error.code, error.message);
        
        let errorMsg = 'Unable to access location. ';
        if (error.code === 1) {
          errorMsg += 'Location permission denied. ';
          const isChrome = /Chrome/.test(navigator.userAgent);
          const isFirefox = /Firefox/.test(navigator.userAgent);
          const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
          
          if (isChrome) {
            errorMsg += 'To enable: Click the lock icon in the address bar → Location → Allow';
          } else if (isFirefox) {
            errorMsg += 'To enable: Click the permission icon in the address bar → Allow location access';
          } else if (isSafari) {
            errorMsg += 'To enable: Safari → Preferences → Privacy → Allow location access for this site';
          } else {
            errorMsg += 'To enable: Look for the permission/lock icon in your address bar and allow location access.';
          }
        } else if (error.code === 2) {
          errorMsg += 'Position unavailable. Check your GPS/location services are enabled.';
        } else if (error.code === 3) {
          errorMsg += 'Request timeout. Try again or check your connection.';
        } else {
          errorMsg += 'Using simulator coordinates as fallback.';
        }
        
        setHasLiveLocation(false);
        setErrorMsg(errorMsg);
        setIsFetching(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (activeShare && activeShare.active) {
      const updateTimer = () => {
        const now = Date.now();
        const diff = activeShare.endTime - now;

        if (diff <= 0) {
          onStopLiveShare();
          setTimeLeftStr('00:00:00');
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          return;
        }

        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        setTimeLeftStr(
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        );
      };

      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);

      // Populate interactive simulator logs
      const sharedNames = contacts
        .filter(c => activeShare.contacts.includes(c.id))
        .map(c => c.name);
      
      const logs = [
        `Live tracking session initialized with encrypted token`,
        `Secure SMS dispatched to: ${sharedNames.join(', ') || 'Trusted Circles'}`,
        `Real-time GPS stream is active (Precision: +/- ${accuracy}m)`,
      ];
      setSimLogs(logs);

      // Periodically trigger a fake viewer event
      const viewerTimeout = setTimeout(() => {
        if (sharedNames.length > 0) {
          const randomContact = sharedNames[Math.floor(Math.random() * sharedNames.length)];
          setSimLogs(prev => [
            ...prev,
            `👁️ ${randomContact} is actively viewing your path (Map loaded)`,
          ]);
        }
      }, 5000);

      const requestTimeout = setTimeout(() => {
        setSimLogs(prev => [
          ...prev,
          `🔄 High-accuracy ping response received from carrier tower`,
        ]);
      }, 12000);

      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        clearTimeout(viewerTimeout);
        clearTimeout(requestTimeout);
      };
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [activeShare, contacts, accuracy]);

  // Pre-select all contacts when view loads if none selected
  useEffect(() => {
    if (contacts.length > 0 && selectedContactIds.length === 0) {
      setSelectedContactIds(contacts.map(c => c.id));
    }
  }, [contacts]);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`;

  const formatCoordinate = (coord: number, isLat: boolean) => {
    const absCoord = Math.abs(coord).toFixed(4);
    if (isLat) {
      return { value: absCoord, direction: coord >= 0 ? 'N' : 'S' };
    } else {
      return { value: absCoord, direction: coord >= 0 ? 'E' : 'W' };
    }
  };

  const formattedLat = formatCoordinate(lat, true);
  const formattedLng = formatCoordinate(lng, false);

  const toggleContactSelection = (id: string) => {
    if (selectedContactIds.includes(id)) {
      setSelectedContactIds(prev => prev.filter(cid => cid !== id));
    } else {
      setSelectedContactIds(prev => [...prev, id]);
    }
  };

  const handleStartShare = () => {
    if (!hasLiveLocation) {
      alert('Please allow location access and refresh before sharing your location.');
      return;
    }
    if (selectedContactIds.length === 0) {
      alert('Please select at least one contact to share your location with.');
      return;
    }
    const finalMinutes = isCustomDuration ? parseInt(customDurationInput) || 30 : selectedDuration;
    onStartLiveShare(selectedContactIds, finalMinutes);
    onShareLocation(lat, lng, accuracy, selectedContactIds);
  };

  const activeSharedContacts = contacts.filter(c => activeShare?.contacts.includes(c.id));

  return (
    <div className="flex flex-col h-full bg-[#FCF5F5] font-sans pb-24" id="location-view-container">
      {/* Header - Matches the other main tabs */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-red-50 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-[#D32F2F] stroke-[2.5]" />
          <h1 className="text-xl font-black text-red-900 tracking-tight uppercase">
            SAFETY CORE
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-500">
          <User className="w-5 h-5" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        
        {/* Title & Status Banner */}
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight font-sans">
            My Location
          </h2>
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-300 rounded-2xl shadow-sm shrink-0 text-emerald-800">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider font-sans">
              ACTIVE PROTECTION ENABLED
            </span>
          </div>
        </div>

        {/* Readouts Card */}
        <div className="bg-white border border-[#F5CACA] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Latitude */}
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-wider text-gray-400 uppercase font-sans">
                LATITUDE
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-[#D32F2F] font-sans tracking-tight">
                  {formattedLat.value}°
                </span>
                <span className="text-xl font-black text-[#D32F2F] font-sans">
                  {formattedLat.direction}
                </span>
              </div>
            </div>

            {/* Longitude */}
            <div className="space-y-1 pl-4 border-l border-red-100">
              <span className="text-[10px] font-black tracking-wider text-gray-400 uppercase font-sans">
                LONGITUDE
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-[#D32F2F] font-sans tracking-tight">
                  {formattedLng.value}°
                </span>
                <span className="text-xl font-black text-[#D32F2F] font-sans">
                  {formattedLng.direction}
                </span>
              </div>
            </div>
          </div>

          <div className="h-px bg-[#F5CACA]" />

          {/* Accuracy & Refresh */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 font-bold text-gray-500">
              <span className="text-xs">Accuracy:</span>
              <span className="text-gray-800 font-extrabold">+/- {accuracy} meters</span>
            </div>
            <button
              onClick={fetchLocation}
              disabled={isFetching}
              className="flex items-center gap-1.5 text-xs font-black text-[#D32F2F] hover:text-[#B71C1C] transition-all cursor-pointer uppercase"
              id="refresh-location-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              REFRESH
            </button>
          </div>
        </div>

        {/* Info Banner when location uses fallback or shows error */}
        {errorMsg && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-medium leading-relaxed flex flex-col gap-2 shadow-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
            {permissionStatus === 'denied' && (
              <button
                onClick={fetchLocation}
                className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
              >
                🔄 ENABLE LOCATION & RETRY
              </button>
            )}
          </div>
        )}

        {/* Live Map Display */}
        <div className="bg-white border border-[#F5CACA] rounded-2xl overflow-hidden shadow-sm">
          <div className="relative h-56 bg-gray-100 overflow-hidden">
            {hasLiveLocation ? (
              <>
                <iframe
                  key={`${lat.toFixed(5)}-${lng.toFixed(5)}`}
                  title="Current location map"
                  src={googleMapsEmbedUrl}
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#D32F2F] shadow-md">
                  <MapPin className="w-3.5 h-3.5" />
                  {activeShare?.active ? 'Live Tracking' : 'Current Position'}
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <AlertTriangle className="mb-3 h-8 w-8 text-amber-600" />
                <h3 className="text-sm font-black uppercase tracking-wide text-gray-900">
                  Location Access Needed
                </h3>
                <p className="mt-1 text-xs font-medium leading-relaxed text-gray-500">
                  Allow location access, then refresh to load your accurate map.
                </p>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50 border-t border-[#F5CACA] flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-500 bg-white border border-gray-200/60 p-2.5 rounded-xl shadow-inner">
              <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${activeShare?.active ? 'bg-teal-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="truncate">
                {hasLiveLocation ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'Waiting for GPS permission'}
              </span>
            </div>

            {hasLiveLocation ? (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-3.5 border border-gray-300 bg-white text-gray-850 hover:bg-gray-100 font-bold tracking-wide rounded-xl active:scale-[0.98] transition-all text-xs shadow-sm cursor-pointer"
                id="open-google-maps-btn"
              >
                <ExternalLink className="w-4 h-4" />
                OPEN IN GOOGLE MAPS
              </a>
            ) : (
              <button
                onClick={fetchLocation}
                disabled={isFetching}
                className="flex items-center justify-center gap-2 py-3.5 border border-amber-300 bg-amber-50 text-amber-800 font-bold tracking-wide rounded-xl active:scale-[0.98] transition-all text-xs shadow-sm cursor-pointer disabled:opacity-60"
                id="retry-location-map-btn"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                ENABLE LOCATION & RETRY
              </button>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* LIVE LOCATION SHARING COMPONENT - THE REQUESTED FEATURE */}
        {/* ========================================================= */}
        <div className="bg-white border border-[#F5CACA] rounded-2xl p-5 shadow-sm space-y-5" id="live-sharing-container">
          
          <div className="flex items-center justify-between border-b border-red-50 pb-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#D32F2F]" />
              <h2 className="font-bold text-gray-900 text-base tracking-tight uppercase">
                Live Path Sharing
              </h2>
            </div>
            {activeShare?.active ? (
              <span className="flex items-center gap-1 bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-teal-100 animate-pulse">
                <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                Live Now
              </span>
            ) : (
              <span className="bg-gray-150 text-gray-500 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-gray-200">
                Inactive
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!activeShare?.active ? (
              /* CONFIGURATION VIEW */
              <motion.div
                key="config-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* 1. Contact Selector */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800 tracking-wide uppercase">
                      Select Contacts to share with
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {selectedContactIds.length} of {contacts.length} Selected
                    </span>
                  </div>

                  {contacts.length === 0 ? (
                    <div className="p-4 bg-red-50/50 border border-dashed border-red-200 rounded-xl text-center">
                      <p className="text-xs text-red-800 font-medium">
                        No trusted contacts found! Please add contacts in the Contacts tab first.
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                      {contacts.map((contact) => {
                        const isSelected = selectedContactIds.includes(contact.id);
                        return (
                          <button
                            key={contact.id}
                            onClick={() => toggleContactSelection(contact.id)}
                            className={`flex flex-col items-center p-3 rounded-2xl border transition-all shrink-0 w-20 text-center relative cursor-pointer ${
                              isSelected
                                ? 'bg-red-50/70 border-red-400 text-red-900 shadow-sm'
                                : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-4 h-4 bg-[#D32F2F] text-white rounded-full flex items-center justify-center p-0.5">
                                <Check className="w-2.5 h-2.5 font-bold" />
                              </div>
                            )}
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black mb-1.5 shadow-sm"
                              style={{ backgroundColor: contact.avatarColor }}
                            >
                              {contact.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <span className="text-[10px] font-bold truncate w-full">
                              {contact.name.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Duration Selector */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-800 tracking-wide uppercase block">
                    Choose Sharing Duration
                  </span>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 30, 60, 120].map((mins) => {
                      const label = mins >= 60 ? `${mins / 60} hr` : `${mins} min`;
                      const isSelected = !isCustomDuration && selectedDuration === mins;
                      return (
                        <button
                          key={mins}
                          onClick={() => {
                            setIsCustomDuration(false);
                            setSelectedDuration(mins);
                          }}
                          className={`py-2 px-1.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#D32F2F] border-[#D32F2F] text-white shadow-sm'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom duration option */}
                  <div className="mt-2 pt-1">
                    <button
                      onClick={() => setIsCustomDuration(!isCustomDuration)}
                      className={`flex items-center gap-1.5 text-xs font-bold ${
                        isCustomDuration ? 'text-red-700' : 'text-gray-500'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isCustomDuration ? 'Use quick presets' : 'Enter custom duration (minutes)'}
                    </button>

                    {isCustomDuration && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 mt-2"
                      >
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={customDurationInput}
                          onChange={(e) => setCustomDurationInput(e.target.value)}
                          className="w-24 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-red-500"
                          placeholder="Minutes"
                        />
                        <span className="text-xs text-gray-500 font-semibold">minutes (up to 24 hours)</span>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* 3. Action trigger (Large Red Button matching mockup) */}
                <button
                  onClick={handleStartShare}
                  disabled={contacts.length === 0 || !hasLiveLocation}
                  className="w-full flex items-center justify-center gap-2 py-4.5 bg-[#D32F2F] hover:bg-[#B71C1C] disabled:opacity-50 text-white font-bold tracking-wider rounded-2xl shadow-lg active:scale-[0.98] transition-all text-sm cursor-pointer"
                  id="start-live-share-btn"
                >
                  <Share2 className="w-4 h-4 text-white" />
                  SHARE MY LOCATION
                </button>
              </motion.div>
            ) : (
              /* ACTIVE LIVE SHARING PANEL */
              <motion.div
                key="active-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-4"
              >
                {/* Live info / Countdown */}
                <div className="bg-red-50 border border-[#F5CACA] rounded-2xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-red-800 tracking-wider uppercase block">
                      Time Remaining
                    </span>
                    <span className="text-3xl font-mono font-black text-[#D32F2F] tracking-tight">
                      {timeLeftStr}
                    </span>
                  </div>
                  <div className="text-right">
                    <Clock className="w-8 h-8 text-red-500 stroke-[2.5] inline-block animate-pulse" />
                  </div>
                </div>

                {/* Shared with contact indicators */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Live link shared with
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {activeSharedContacts.length === 0 ? (
                      <span className="text-xs text-gray-600 font-bold">Trusted Contacts</span>
                    ) : (
                      activeSharedContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center gap-1.5 bg-white border border-[#F5CACA] px-2.5 py-1.5 rounded-full shadow-sm"
                        >
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-black"
                            style={{ backgroundColor: contact.avatarColor }}
                          >
                            {contact.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-gray-800">
                            {contact.name}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Live simulator activity feed */}
                <div className="bg-gray-900 text-gray-100 p-3.5 rounded-xl font-mono text-xs space-y-1.5 shadow-inner border border-gray-800">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-1.5 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5" /> Live Simulator
                    </span>
                    <span className="text-[9px] text-gray-500 font-bold">safe-session-23a4</span>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-none">
                    {simLogs.map((log, idx) => (
                      <p key={idx} className="leading-relaxed text-gray-300">
                        <span className="text-teal-500 font-bold">&gt;</span> {log}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Extend and Stop actions */}
                <div className="flex flex-col gap-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onExtendLiveShare(15)}
                      className="py-2.5 bg-gray-150 hover:bg-gray-200 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-gray-600" />
                      EXTEND +15 MIN
                    </button>
                    <button
                      onClick={() => onExtendLiveShare(30)}
                      className="py-2.5 bg-gray-150 hover:bg-gray-200 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-gray-600" />
                      EXTEND +30 MIN
                    </button>
                  </div>

                  <button
                    onClick={onStopLiveShare}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-700 hover:bg-red-800 text-white font-bold tracking-wider rounded-xl shadow-md active:scale-[0.98] transition-all text-xs cursor-pointer"
                    id="stop-live-share-btn"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    STOP LIVE SHARING
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Privacy Notice Card - exactly styled as Screenshot 3 */}
        <div className="flex gap-4 p-4.5 bg-[#FCEAEA] border border-[#F5CACA] rounded-2xl shadow-sm text-[#D32F2F]">
          <div className="p-2 bg-red-100/60 rounded-xl text-[#D32F2F] h-fit shrink-0">
            <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider">
              PRIVACY NOTICE
            </h4>
            <p className="text-xs leading-relaxed font-medium">
              Your precise location is currently visible to your designated emergency contacts. Disabling this will stop real-time tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
