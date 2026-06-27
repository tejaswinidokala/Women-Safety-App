/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Users, 
  MapPin, 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  PhoneCall, 
  Activity, 
  X, 
  Smartphone, 
  BellRing, 
  ChevronRight, 
  Check, 
  AlertTriangle,
  FileText,
  Clock,
  User,
  Asterisk,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Auth
import { useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';

// Subcomponents
import ContactManagement from './components/ContactManagement';
import LocationView from './components/LocationView';
import FakeCallModal from './components/FakeCallModal';

// Utilities
import { audioPlayer } from './utils/audio';
import { useShakeDetector } from './utils/shake';

// Types
import { Contact, LocationLog, ActiveTab } from './types';

// Pre-populated default contacts to match screenshot mockup
const DEFAULT_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Sarah Rogers', phone: '+1 (555) 012-3456', avatarColor: '#818CF8' }, // Indigo
  { id: 'c2', name: 'David Blackwell', phone: '+1 (555) 987-6543', avatarColor: '#F472B6' }, // Pink
  { id: 'c3', name: 'Elena Martinez', phone: '+1 (555) 444-2211', avatarColor: '#34D399' }, // Emerald
];

function AppContent() {
  const { session, logout } = useAuth();
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  // Core Data State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [locationLogs, setLocationLogs] = useState<LocationLog[]>([]);

  // Emergency SOS State
  const [sosActive, setSosActive] = useState<boolean>(false);
  const [sosTriggerType, setSosTriggerType] = useState<'button' | 'shake' | 'test' | null>(null);
  const [showCancelTimer, setShowCancelTimer] = useState<boolean>(false);
  const [cancelCountdown, setCancelCountdown] = useState<number>(5);

  // Scream Alarm State
  const [selectedAlarmType, setSelectedAlarmType] = useState<'siren' | 'scream'>('siren');
  const [isAlarmPlaying, setIsAlarmPlaying] = useState<boolean>(false);

  // Fake Call State
  const [fakeCallName, setFakeCallName] = useState<string>('Mom');
  const [fakeCallDelay, setFakeCallDelay] = useState<number>(10); // seconds
  const [fakeCallSecondsLeft, setFakeCallSecondsLeft] = useState<number | null>(null);
  const [isFakeCallModalOpen, setIsFakeCallModalOpen] = useState<boolean>(false);

  // Live Location Share State
  const [activeShare, setActiveShare] = useState<{
    active: boolean;
    contacts: string[];
    durationMinutes: number;
    startTime: number;
    endTime: number;
  } | null>(null);

  // Settings & Accelerometer Status
  const [shakeToAlertEnabled, setShakeToAlertEnabled] = useState<boolean>(true);

  // Toast System
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'alert' | 'info' }[]>([]);

  // 1. Initial State Load from LocalStorage
  useEffect(() => {
    if (!session) return;
    
    const userPrefix = `stay_safe_user_${session.userId}`;
    
    // Contacts - User-specific storage
    const savedContacts = localStorage.getItem(`${userPrefix}_contacts`);
    if (savedContacts) {
      try {
        setContacts(JSON.parse(savedContacts));
      } catch (e) {
        setContacts(DEFAULT_CONTACTS);
      }
    } else {
      setContacts(DEFAULT_CONTACTS);
      localStorage.setItem(`${userPrefix}_contacts`, JSON.stringify(DEFAULT_CONTACTS));
    }

    // Location Logs - User-specific storage
    const savedLogs = localStorage.getItem(`${userPrefix}_logs`);
    if (savedLogs) {
      try {
        setLocationLogs(JSON.parse(savedLogs));
      } catch (e) {}
    } else {
      const defaultLogs: LocationLog[] = [
        {
          id: 'log1',
          timestamp: new Date(Date.now() - 120000).toISOString(),
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'Central Park West, New York, NY',
          accuracy: 3,
          triggerType: 'test',
        },
      ];
      setLocationLogs(defaultLogs);
      localStorage.setItem(`${userPrefix}_logs`, JSON.stringify(defaultLogs));
    }

    // Live Location Share session recovery - User-specific
    const savedShare = localStorage.getItem(`${userPrefix}_active_share`);
    if (savedShare) {
      try {
        const shareObj = JSON.parse(savedShare);
        if (shareObj.active && shareObj.endTime > Date.now()) {
          setActiveShare(shareObj);
        } else {
          localStorage.removeItem(`${userPrefix}_active_share`);
        }
      } catch (e) {}
    }
  }, [session]);

  // 2. Shake Detector Hook Integration
  const handleShakeAlert = () => {
    if (shakeToAlertEnabled && !sosActive && !showCancelTimer) {
      // Open clean cancel countdown to prevent false alarms
      setCancelCountdown(5);
      setShowCancelTimer(true);
      setSosTriggerType('shake');
      addToast('SHAKE DETECTED! Preparing SOS Alert...', 'alert');
    }
  };

  const { isSupported } = useShakeDetector(handleShakeAlert, { threshold: 12 });

  // 3. Countdown timer for Shake cancellation
  useEffect(() => {
    let timer: any = null;
    if (showCancelTimer && cancelCountdown > 0) {
      timer = setInterval(() => {
        setCancelCountdown((prev) => prev - 1);
      }, 1000);
    } else if (showCancelTimer && cancelCountdown === 0) {
      setShowCancelTimer(false);
      triggerSOS('shake');
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showCancelTimer, cancelCountdown]);

  // 4. Countdown timer for Fake Call
  useEffect(() => {
    let timer: any = null;
    if (fakeCallSecondsLeft !== null) {
      if (fakeCallSecondsLeft > 0) {
        timer = setInterval(() => {
          setFakeCallSecondsLeft((prev) => (prev !== null ? prev - 1 : null));
        }, 1000);
      } else {
        setFakeCallSecondsLeft(null);
        setIsFakeCallModalOpen(true);
        addToast(`Simulated fake call from ${fakeCallName} incoming!`, 'info');
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [fakeCallSecondsLeft, fakeCallName]);

  // Helper: Toast Notifications
  const addToast = (message: string, type: 'success' | 'alert' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Helper: Generate Custom Color
  const getRandomColor = () => {
    const colors = ['#818CF8', '#F472B6', '#34D399', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const sanitizeSmsPhone = (phone: string) => phone.replace(/[^\d+]/g, '');

  const createMapsUrl = (lat: number, lng: number) =>
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  const openSmsComposer = (targetContacts: Contact[], message: string) => {
    const recipients = targetContacts
      .map((contact) => sanitizeSmsPhone(contact.phone))
      .filter(Boolean);

    if (recipients.length === 0) {
      addToast('No emergency phone numbers found. Please add a trusted contact first.', 'alert');
      return false;
    }

    const smsUrl = `sms:${recipients.join(',')}?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
    return true;
  };

  const getCurrentLocationSnapshot = () =>
    new Promise<{ latitude: number; longitude: number; accuracy: number } | null>((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
          });
        },
        () => {
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });

  // Contacts Management Handlers
  const handleAddContact = (newContact: Omit<Contact, 'id' | 'avatarColor'>) => {
    const userPrefix = `stay_safe_user_${session?.userId}`;
    const updated = [
      ...contacts,
      {
        ...newContact,
        id: Math.random().toString(36).substring(7),
        avatarColor: getRandomColor(),
      },
    ];
    setContacts(updated);
    localStorage.setItem(`${userPrefix}_contacts`, JSON.stringify(updated));
    addToast(`Successfully added ${newContact.name} as trusted contact.`, 'success');
  };

  const handleDeleteContact = (id: string) => {
    const userPrefix = `stay_safe_user_${session?.userId}`;
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    localStorage.setItem(`${userPrefix}_contacts`, JSON.stringify(updated));
    addToast('Trusted contact deleted.', 'info');
  };

  // SOS Execution triggers
  const triggerSOS = async (type: 'button' | 'shake' | 'test') => {
    setSosActive(true);
    setSosTriggerType(type);

    // Play configured alarm sound instantly
    if (selectedAlarmType === 'siren') {
      audioPlayer.playSiren();
    } else {
      audioPlayer.playScreamAlarm();
    }
    setIsAlarmPlaying(true);

    const location = await getCurrentLocationSnapshot();
    const mapsUrl = location ? createMapsUrl(location.latitude, location.longitude) : null;

    // Save Location Log
    const newLog: LocationLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      latitude: location?.latitude ?? 0,
      longitude: location?.longitude ?? 0,
      address: location
        ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
        : 'Location unavailable - GPS permission required',
      accuracy: location?.accuracy ?? 0,
      triggerType: type,
    };

    const updatedLogs = [newLog, ...locationLogs];
    setLocationLogs(updatedLogs);
    const userPrefix = `stay_safe_user_${session?.userId}`;
    localStorage.setItem(`${userPrefix}_logs`, JSON.stringify(updatedLogs));

    const contactNames = contacts.map(c => c.name).join(', ') || 'Trusted Contacts';
    const locationText = location
      ? `My current location is ${mapsUrl}. Accuracy: +/- ${location.accuracy}m.`
      : 'My location could not be detected. Please call me or check on me immediately.';
    const sent = openSmsComposer(
      contacts,
      `SOS EMERGENCY ALERT: I need help. ${locationText} Triggered by ${type}.`
    );

    addToast(
      sent
        ? `Emergency SMS ready for: ${contactNames}. Please tap send in your messaging app.`
        : 'Emergency alert could not open because no phone numbers are saved.',
      sent ? 'alert' : 'info'
    );
  };

  const cancelSOS = () => {
    setSosActive(false);
    setSosTriggerType(null);
    audioPlayer.stopAll();
    setIsAlarmPlaying(false);
    addToast('SOS Alert successfully cancelled. Alarm deactivated.', 'info');
  };

  // Scream alarm manual controls
  const toggleScreamAlarm = () => {
    if (isAlarmPlaying) {
      audioPlayer.stopAll();
      setIsAlarmPlaying(false);
      addToast('Scream alarm deactivated.', 'info');
    } else {
      if (selectedAlarmType === 'siren') {
        audioPlayer.playSiren();
      } else {
        audioPlayer.playScreamAlarm();
      }
      setIsAlarmPlaying(true);
      addToast(`Playing safety ${selectedAlarmType === 'siren' ? 'Police Siren' : 'Scream'} Alarm!`, 'alert');
    }
  };

  const handleAlarmTypeChange = (type: 'siren' | 'scream') => {
    setSelectedAlarmType(type);
    if (isAlarmPlaying) {
      audioPlayer.stopAll();
      if (type === 'siren') {
        audioPlayer.playSiren();
      } else {
        audioPlayer.playScreamAlarm();
      }
    }
    addToast(`Alarm type switched to: ${type === 'siren' ? 'Police Siren' : 'Jarring Screams'}`, 'info');
  };

  // Fake Call trigger logic
  const handleScheduleFakeCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fakeCallName.trim()) {
      addToast('Please enter a caller name', 'alert');
      return;
    }
    if (fakeCallDelay === 0) {
      setIsFakeCallModalOpen(true);
    } else {
      setFakeCallSecondsLeft(fakeCallDelay);
      addToast(`Fake call scheduled from "${fakeCallName}" in ${fakeCallDelay} seconds.`, 'success');
    }
  };

  const cancelFakeCall = () => {
    setFakeCallSecondsLeft(null);
    addToast('Scheduled fake call cancelled.', 'info');
  };

  // Live Location Share Handlers
  const handleStartLiveShare = (contactIds: string[], durationMinutes: number) => {
    const startTime = Date.now();
    const endTime = startTime + durationMinutes * 60 * 1000;
    
    const shareObj = {
      active: true,
      contacts: contactIds,
      durationMinutes,
      startTime,
      endTime
    };

    setActiveShare(shareObj);
    const userPrefix = `stay_safe_user_${session?.userId}`;
    localStorage.setItem(`${userPrefix}_active_share`, JSON.stringify(shareObj));

    const selectedNames = contacts.filter(c => contactIds.includes(c.id)).map(c => c.name).join(', ');
    addToast(`Live path share active with [${selectedNames}] for ${durationMinutes} mins!`, 'success');
  };

  const handleStopLiveShare = () => {
    setActiveShare(null);
    const userPrefix = `stay_safe_user_${session?.userId}`;
    localStorage.removeItem(`${userPrefix}_active_share`);
    addToast('Live location sharing session ended.', 'info');
  };

  const handleExtendLiveShare = (extraMinutes: number) => {
    if (!activeShare) return;

    const newEndTime = activeShare.endTime + extraMinutes * 60 * 1000;
    const newDuration = activeShare.durationMinutes + extraMinutes;

    const updated = {
      ...activeShare,
      endTime: newEndTime,
      durationMinutes: newDuration
    };

    setActiveShare(updated);
    const userPrefix = `stay_safe_user_${session?.userId}`;
    localStorage.setItem(`${userPrefix}_active_share`, JSON.stringify(updated));
    addToast(`Extended live share session by +${extraMinutes} minutes!`, 'success');
  };

  const triggerManualShareNotification = (lat: number, lng: number, accuracy: number, contactIds: string[]) => {
    const selectedContacts = contacts.filter(c => contactIds.includes(c.id));
    const names = selectedContacts.map(c => c.name).join(', ') || 'trusted contacts';
    const mapsUrl = createMapsUrl(lat, lng);
    const sent = openSmsComposer(
      selectedContacts,
      `Live location share: I am sharing my current location for safety. ${mapsUrl}. Accuracy: +/- ${accuracy}m.`
    );

    addToast(
      sent
        ? `Location SMS ready for [${names}]. Please tap send in your messaging app.`
        : 'Location was not shared because no selected contact has a phone number.',
      sent ? 'success' : 'alert'
    );
  };

  // Retrieve details for mini-map log card
  const latestLog = locationLogs[0];
  const latestLogAddress = latestLog ? latestLog.address : 'Central Park West, New York, NY';
  const latestLogTime = latestLog 
    ? `${new Date(latestLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
    : '2m ago';

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-0 md:p-6" id="app-viewport">
      {/* Mobile Frame Container - Warm off-white background matching photos */}
      <div className="w-full max-w-md bg-[#FCF5F5] min-h-screen md:min-h-[812px] md:rounded-[40px] md:shadow-2xl md:border-[10px] md:border-gray-950 overflow-hidden relative flex flex-col justify-between">
        
        {/* Custom Toast Alerts */}
        <div className="absolute top-4 left-4 right-4 z-50 pointer-events-none space-y-2">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className={`p-3.5 rounded-xl shadow-lg border text-xs font-bold pointer-events-auto flex items-center justify-between gap-2 leading-relaxed ${
                  toast.type === 'alert'
                    ? 'bg-red-600 border-red-700 text-white'
                    : toast.type === 'success'
                    ? 'bg-teal-600 border-teal-700 text-white'
                    : 'bg-gray-950 border-gray-900 text-white'
                }`}
              >
                <span>{toast.message}</span>
                <button
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="p-0.5 rounded-full hover:bg-black/20 text-white shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Shake-to-Alert Cancel Countdown Dialog Overlay */}
        <AnimatePresence>
          {showCancelTimer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-950/95 z-50 flex flex-col items-center justify-center p-8 text-center"
              id="shake-countdown-overlay"
            >
              <div className="w-20 h-20 rounded-full bg-red-800 flex items-center justify-center text-white mb-6 animate-bounce border-2 border-red-500">
                <AlertTriangle className="w-10 h-10 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                Shake Detected!
              </h2>
              <p className="text-red-200 text-sm font-medium mt-2 max-w-[240px]">
                An emergency SOS signal is about to be sent in:
              </p>
              
              <div className="text-6xl font-black text-white font-mono my-6 select-none">
                {cancelCountdown}
              </div>

              {/* Countdown Progress bar */}
              <div className="w-48 h-2 bg-red-900/60 rounded-full overflow-hidden mb-8">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  className="h-full bg-white" 
                />
              </div>

              <button
                onClick={() => {
                  setShowCancelTimer(false);
                  setSosTriggerType(null);
                  addToast('False alarm avoided. SOS Cancelled.', 'info');
                }}
                className="px-8 py-4 bg-white text-red-950 hover:bg-gray-100 font-bold tracking-wider rounded-2xl active:scale-[0.97] transition-all text-xs cursor-pointer"
                id="cancel-shake-sos-btn"
              >
                CANCEL ALERT
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ACTIVE SOS SCREEN OVERLAY */}
        <AnimatePresence>
          {sosActive && (
            <motion.div
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="absolute inset-0 bg-red-650 z-40 flex flex-col justify-between p-8 text-white text-center"
              id="sos-active-overlay"
            >
              {/* Flashing screen indicator effect */}
              <div className="absolute inset-0 bg-red-700/50 animate-pulse pointer-events-none" style={{ animationDuration: '0.8s' }} />

              <div className="mt-8 space-y-4 relative z-10">
                <div className="w-20 h-20 rounded-full bg-white text-red-600 flex items-center justify-center mx-auto shadow-xl">
                  <ShieldAlert className="w-10 h-10 animate-ping" />
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tight">
                  SOS ALERT ACTIVE
                </h1>
                <p className="text-sm font-bold tracking-wider uppercase bg-red-850 inline-block px-3 py-1 rounded-full">
                  Triggered via: {sosTriggerType === 'shake' ? 'Device Shake' : 'Touch Button'}
                </p>
                <p className="text-sm text-red-100 max-w-xs mx-auto pt-2 leading-relaxed font-semibold">
                  Siren/alarm is broadcasting at maximum volume. Your precise location tracking token has been shared via carrier SMS with your chosen contacts.
                </p>
              </div>

              {/* Pulse waves */}
              <div className="flex items-center justify-center py-4 relative z-10">
                <span className="relative flex h-28 w-28">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-30"></span>
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-red-350 opacity-40"></span>
                  <span className="relative inline-flex rounded-full h-28 w-28 bg-white text-red-600 items-center justify-center font-black text-2xl shadow-xl select-none">
                    BROADCASTING
                  </span>
                </span>
              </div>

              {/* Cancel Button */}
              <div className="mb-6 relative z-10">
                <button
                  onClick={cancelSOS}
                  className="w-full py-4.5 bg-gray-950 hover:bg-black text-white font-black tracking-widest rounded-2xl shadow-2xl active:scale-[0.98] transition-all text-xs cursor-pointer"
                  id="deactivate-sos-btn"
                >
                  DEACTIVATE SOS ALERTS
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fake Call Overlay Modal */}
        <FakeCallModal
          isOpen={isFakeCallModalOpen}
          callerName={fakeCallName}
          onClose={() => setIsFakeCallModalOpen(false)}
        />

        {/* VIEW ROUTER */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'home' ? (
            /* HOME VIEW */
            <div className="flex flex-col h-full overflow-y-auto pb-24" id="home-view-container">
              {/* Main Header - Shield outline icon + SAFETY CORE uppercase red text, user silhouette right */}
              <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-red-50 sticky top-0 z-30 shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 text-[#D32F2F] stroke-[2.5]" />
                  <h1 className="text-xl font-black tracking-tight text-red-950 font-sans uppercase">
                    SAFETY CORE
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-right mr-2">
                    <div className="flex flex-col text-xs text-gray-600">
                      <span className="font-semibold">{session?.email}</span>
                      <span className="text-[10px] text-gray-400">Connected</span>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={logout}
                    className="p-2 rounded-full border border-red-200 hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="px-6 py-6 space-y-6">
                
                {/* Status Indicator */}
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full animate-ping shrink-0" />
                    <h2 className="text-xs font-black tracking-wider text-emerald-700 uppercase font-sans">
                      SYSTEM ACTIVE
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500 font-semibold max-w-xs mx-auto leading-relaxed">
                    Your safety net is live. Live tracking and emergency triggers are on standby.
                  </p>
                </div>

                {/* Big SOS Emergency Button Card - Soft pink container styled exactly as photos */}
                <div className="bg-[#FCEAEA] border border-[#F5CACA] rounded-3xl p-6 flex flex-col items-center justify-center shadow-sm">
                  <button
                    onClick={() => triggerSOS('button')}
                    className="w-52 h-52 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-sans flex flex-col items-center justify-center p-6 shadow-lg shadow-red-700/10 active:scale-95 transition-all relative rounded-[44px] group cursor-pointer"
                    id="trigger-sos-btn"
                  >
                    <Asterisk className="w-16 h-16 text-white stroke-[2.5] mb-2 animate-pulse group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-black uppercase tracking-wider text-center leading-tight">
                      PRESS IN EMERGENCY
                    </span>
                  </button>
                </div>

                {/* Side-by-side action cards with custom background icons - styled exactly as photos */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Manage Contacts Card */}
                  <button
                    onClick={() => setActiveTab('contacts')}
                    className="p-4 bg-white hover:bg-gray-50 border border-[#F5CACA] rounded-2xl flex flex-col justify-between h-36 text-left shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#E0E7FF] text-[#4338CA] flex items-center justify-center mb-3 shrink-0">
                      <Users className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight leading-none">
                        Manage Contacts
                      </h4>
                      <p className="text-[10px] text-gray-500 font-semibold mt-1 leading-relaxed">
                        Update your {contacts.length} trusted emergency circles.
                      </p>
                    </div>
                  </button>

                  {/* Share Location Card */}
                  <button
                    onClick={() => setActiveTab('location')}
                    className="p-4 bg-white hover:bg-gray-50 border border-[#F5CACA] rounded-2xl flex flex-col justify-between h-36 text-left shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] text-[#047857] flex items-center justify-center mb-3 shrink-0">
                      <MapPin className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight leading-none">
                        Share Location
                      </h4>
                      <p className="text-[10px] text-gray-500 font-semibold mt-1 leading-relaxed">
                        Send live route to chosen guardians.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Last Location Log Full Width Card with Mini Black Map Preview */}
                <button
                  onClick={() => setActiveTab('location')}
                  className="w-full bg-white border border-[#F5CACA] rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all text-left active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {/* Mini black radar map preview */}
                    <div className="relative w-12 h-12 rounded-xl bg-[#1e232b] flex items-center justify-center border border-gray-800 overflow-hidden shrink-0">
                      <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
                        backgroundSize: '10px 10px',
                      }} />
                      <span className="absolute h-5 w-5 rounded-full border border-red-500/20 animate-ping" />
                      <div className="w-3 h-3 rounded-full bg-red-600 border border-white flex items-center justify-center z-10 shadow-sm">
                        <span className="w-1 h-1 bg-white rounded-full animate-ping" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">
                        Last Location Log
                      </h4>
                      <p className="text-[10px] text-gray-500 font-semibold truncate max-w-[200px] mt-0.5">
                        {latestLogAddress} • {latestLogTime}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
                </button>

                {/* Shake status indicator widget */}
                <div className="bg-white border border-[#F5CACA] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 text-[#D32F2F] rounded-xl shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 tracking-tight uppercase">
                        Shake-to-Alert
                      </h4>
                      <p className="text-[10px] text-gray-500 font-semibold">
                        {shakeToAlertEnabled ? 'Hands-free accelerometer alert active' : 'Alert by shake is disabled'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShakeToAlertEnabled(!shakeToAlertEnabled);
                      addToast(
                        `Shake-to-Alert ${!shakeToAlertEnabled ? 'Enabled' : 'Disabled'}`,
                        !shakeToAlertEnabled ? 'success' : 'info'
                      );
                    }}
                    className={`px-3 py-1.5 rounded-xl font-black text-[10px] tracking-wider transition-all cursor-pointer ${
                      shakeToAlertEnabled
                        ? 'bg-[#D32F2F] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}
                  >
                    {shakeToAlertEnabled ? 'ACTIVE' : 'OFF'}
                  </button>
                </div>

                {/* Companion Tools: Siren Alarm and Fake Call Scheduler */}
                <div className="bg-white border border-[#F5CACA] rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-red-50 pb-2.5">
                    <Volume2 className="w-5 h-5 text-[#D32F2F]" />
                    <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-wide">
                      Safety Companion Tools
                    </h3>
                  </div>

                  {/* 1. Scream Alarm Selector & Toggle */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-700 uppercase">
                        Scream Alarm Sounder
                      </span>
                      <span className="text-[10px] font-black uppercase text-red-500">
                        {isAlarmPlaying ? 'BROADCASTING' : 'READY'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                      <button
                        onClick={() => handleAlarmTypeChange('siren')}
                        className={`py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedAlarmType === 'siren'
                            ? 'bg-white text-red-900 border border-red-200/80 shadow-sm'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Police Siren
                      </button>
                      <button
                        onClick={() => handleAlarmTypeChange('scream')}
                        className={`py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedAlarmType === 'scream'
                            ? 'bg-white text-red-900 border border-red-200/80 shadow-sm'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Jarring Screams
                      </button>
                    </div>

                    <button
                      onClick={toggleScreamAlarm}
                      className={`w-full py-3.5 rounded-xl font-bold tracking-wide text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isAlarmPlaying
                          ? 'bg-gray-900 hover:bg-black text-white'
                          : 'bg-red-50 hover:bg-red-100/70 border border-red-100 text-red-800 shadow-sm shadow-red-700/5'
                      }`}
                    >
                      {isAlarmPlaying ? (
                        <>
                          <VolumeX className="w-4 h-4 text-white animate-spin" />
                          STOP ALARM SOUND
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 text-red-700 animate-pulse" />
                          TEST SCREAM ALARM
                        </>
                      )}
                    </button>
                  </div>

                  <div className="h-px bg-red-50" />

                  {/* 2. Fake Caller Planner Scheduler */}
                  <form onSubmit={handleScheduleFakeCall} className="space-y-3.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-700 uppercase">
                        Fake Caller Planner
                      </span>
                      {fakeCallSecondsLeft !== null && (
                        <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100 animate-pulse">
                          RINGING IN {fakeCallSecondsLeft}S
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                          Caller Name
                        </label>
                        <input
                          type="text"
                          value={fakeCallName}
                          onChange={(e) => setFakeCallName(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                          placeholder="e.g. Mom"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                          Delay Timer
                        </label>
                        <select
                          value={fakeCallDelay}
                          onChange={(e) => setFakeCallDelay(parseInt(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                        >
                          <option value="0">Immediate</option>
                          <option value="5">5 Seconds</option>
                          <option value="10">10 Seconds</option>
                          <option value="30">30 Seconds</option>
                        </select>
                      </div>
                    </div>

                    {fakeCallSecondsLeft !== null ? (
                      <button
                        type="button"
                        onClick={cancelFakeCall}
                        className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold tracking-wide rounded-xl active:scale-95 transition-all text-xs cursor-pointer"
                      >
                        CANCEL SCHEDULED CALL
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold tracking-wide rounded-xl active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <PhoneCall className="w-4 h-4" />
                        SCHEDULE FAKE CALL
                      </button>
                    )}
                  </form>
                </div>

                {/* Past Logs Activity List */}
                <div className="bg-white border border-[#F5CACA] rounded-2xl p-5 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between border-b border-red-50 pb-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#D32F2F]" />
                      <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-wide">
                        Incident & Location Log
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">
                      {locationLogs.length} Records
                    </span>
                  </div>

                  <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-none">
                    {locationLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start justify-between p-3 bg-gray-50 border border-gray-200/50 rounded-xl text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-gray-800">
                            <span className={`w-2 h-2 rounded-full ${log.triggerType === 'shake' ? 'bg-amber-500' : log.triggerType === 'button' ? 'bg-red-600' : 'bg-blue-500'}`} />
                            <span className="capitalize">
                              {log.triggerType === 'shake' ? 'Shake Alert' : log.triggerType === 'button' ? 'SOS Button' : 'System Test'}
                            </span>
                          </div>
                          <p className="text-gray-500 text-[10px] font-medium leading-relaxed">
                            {log.address}
                          </p>
                          <p className="text-[9px] text-gray-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 self-center" />
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ) : activeTab === 'contacts' ? (
            /* CONTACTS VIEW */
            <ContactManagement
              contacts={contacts}
              onAddContact={handleAddContact}
              onDeleteContact={handleDeleteContact}
            />
          ) : (
            /* LOCATION VIEW WITH INTEGRATED LIVE SHARING */
            <LocationView
              contacts={contacts}
              onShareLocation={triggerManualShareNotification}
              activeShare={activeShare}
              onStartLiveShare={handleStartLiveShare}
              onStopLiveShare={handleStopLiveShare}
              onExtendLiveShare={handleExtendLiveShare}
            />
          )}
        </div>

        {/* BOTTOM NAVIGATION TAB BAR WITH SOLID CAPSULE SHAPED PILL DESIGN AS SHOWN IN SCREENSHOTS */}
        <div className="h-20 bg-[#FCEAEA] border-t border-red-100 flex items-center justify-around px-3 pb-1 relative z-30 shrink-0" id="bottom-tab-bar">
          
          {/* Home Tab */}
          {activeTab === 'home' ? (
            <div className="bg-[#D32F2F] text-white px-4.5 py-2.5 rounded-2xl flex items-center gap-1.5 font-bold shadow-md">
              <Home className="w-4.5 h-4.5 text-white" />
              <span className="text-[10px] tracking-wider uppercase font-sans">Home</span>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('home')}
              className="flex flex-col items-center gap-1 py-2 px-3 text-[#B45252] font-extrabold hover:text-[#D32F2F] transition-all cursor-pointer"
              id="tab-home-btn"
            >
              <Home className="w-5 h-5 text-[#B45252]" />
              <span className="text-[9px] tracking-wider uppercase font-sans">Home</span>
            </button>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' ? (
            <div className="bg-[#D32F2F] text-white px-4.5 py-2.5 rounded-2xl flex items-center gap-1.5 font-bold shadow-md">
              <Users className="w-4.5 h-4.5 text-white" />
              <span className="text-[10px] tracking-wider uppercase font-sans">Contacts</span>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('contacts')}
              className="flex flex-col items-center gap-1 py-2 px-3 text-[#B45252] font-extrabold hover:text-[#D32F2F] transition-all relative cursor-pointer"
              id="tab-contacts-btn"
            >
              <Users className="w-5 h-5 text-[#B45252]" />
              {contacts.length > 0 && (
                <span className="absolute top-1 right-2.5 w-4 h-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-[#FCEAEA]">
                  {contacts.length}
                </span>
              )}
              <span className="text-[9px] tracking-wider uppercase font-sans">Contacts</span>
            </button>
          )}

          {/* Location Tab */}
          {activeTab === 'location' ? (
            <div className="bg-[#D32F2F] text-white px-4.5 py-2.5 rounded-2xl flex items-center gap-1.5 font-bold shadow-md">
              <MapPin className="w-4.5 h-4.5 text-white" />
              <span className="text-[10px] tracking-wider uppercase font-sans">Location</span>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('location')}
              className="flex flex-col items-center gap-1 py-2 px-3 text-[#B45252] font-extrabold hover:text-[#D32F2F] transition-all relative cursor-pointer"
              id="tab-location-btn"
            >
              <MapPin className="w-5 h-5 text-[#B45252]" />
              {activeShare?.active && (
                <span className="absolute top-1.5 right-3 w-2 h-2 bg-teal-500 rounded-full border border-[#FCEAEA] animate-pulse" />
              )}
              <span className="text-[9px] tracking-wider uppercase font-sans">Location</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// Main App Component with Auth Guard
export default function App() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-600 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-300 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return session ? <AppContent /> : <LoginPage />;
}
