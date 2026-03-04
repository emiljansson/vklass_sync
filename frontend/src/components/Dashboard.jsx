import { useState, useEffect, useCallback, memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon, RefreshCw, LogOut, Calendar, MapPin, Check, Lock, Radio, Clock, Lightbulb, LightbulbOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ImpactEffect } from "./ImpactEffect";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Memoized Vault Boy image component to prevent re-renders
const VaultBoyImage = memo(() => (
  <div className="flex-shrink-0 vault-boy-sway">
    <img 
      src="/vault-boy.png"
      alt="Vault Boy"
      className="w-16 h-16 object-contain"
    />
  </div>
));

// Helper functions moved outside component
const extractTimeFromDescription = (description) => {
  if (!description) return null;
  // Match pattern like "kl: 09:25" or "kl 09:25"
  const match = description.match(/kl:?\s*(\d{1,2}):(\d{2})/i);
  if (match) {
    return { hours: parseInt(match[1]), minutes: parseInt(match[2]) };
  }
  return null;
};

const isEventPast = (startDate, description) => {
  if (!startDate) return false;
  try {
    const eventDate = new Date(startDate);
    const now = new Date();
    
    // Try to extract time from description
    const timeFromDesc = extractTimeFromDescription(description);
    
    if (timeFromDesc) {
      // Set the event time from description
      eventDate.setHours(timeFromDesc.hours, timeFromDesc.minutes, 0, 0);
      // Add 40 minutes
      const eventPlusFortyMin = new Date(eventDate.getTime() + 40 * 60 * 1000);
      return now >= eventPlusFortyMin;
    }
    
    // If event has time component in start field
    if (startDate.includes('T') || startDate.includes(':')) {
      const eventPlusFortyMin = new Date(eventDate.getTime() + 40 * 60 * 1000);
      return now >= eventPlusFortyMin;
    }
    
    // For date-only events without time in description, check if the day has passed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  } catch {
    return false;
  }
};

const getStatusStyles = (status, start, description) => {
  if (isEventPast(start, description) && status !== 'removed') {
    return 'event-card-past';
  }
  switch (status) {
    case 'new':
      return 'event-card-new';
    case 'removed':
      return 'event-card-removed';
    default:
      return 'bg-[#141e14] border-green-900/50 hover:border-green-500/50';
  }
};

const getStatusBadge = (status, start, description) => {
  if (isEventPast(start, description) && status !== 'removed') {
    return <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase text-xs tracking-wider">Utfört</Badge>;
  }
  switch (status) {
    case 'new':
      return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase text-xs tracking-wider">Nytt</Badge>;
    case 'removed':
      return <Badge className="bg-gray-500/20 text-gray-400 border border-gray-500/30 uppercase text-xs tracking-wider">Borttagen</Badge>;
    default:
      return null;
  }
};

// Memoized EventCard to prevent re-renders from countdown timer
const EventCard = memo(({ event, onConfirmEvent }) => {
  const showVaultBoy = isEventPast(event.start, event.description) && event.status !== 'removed';
  
  return (
    <Card 
      data-testid={`event-card-${event.id}`}
      className={`event-card relative transition-all duration-200 bg-[#0f1a0f] rounded-lg border-2 border-green-500/40 ${getStatusStyles(event.status, event.start, event.description)}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {getStatusBadge(event.status, event.start, event.description)}
              {event.subject_name && (
                <Badge className="bg-green-500/20 text-green-300 border border-green-500/30 uppercase text-xs tracking-wider">
                  {event.subject_name}
                </Badge>
              )}
              {event.event_type && (
                <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase text-xs tracking-wider">
                  {event.event_type}
                </Badge>
              )}
            </div>
            <h3 className={`font-semibold text-base truncate ${
              event.status === 'new' ? 'text-amber-400' : 
              event.status === 'removed' ? 'text-gray-400' : 
              isEventPast(event.start, event.description) ? 'text-cyan-400' : 'text-green-400'
            }`}>
              {event.summary}
            </h3>
            
            {event.location && (
              <div className={`flex items-center gap-1.5 mt-1 text-sm ${
                event.status === 'new' ? 'text-amber-500/70' : 
                event.status === 'removed' ? 'text-gray-500/70' : 'text-green-500/70'
              }`}>
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            
            {event.description && (
              <p className={`mt-2 text-sm line-clamp-2 ${
                event.status === 'new' ? 'text-amber-500/70' : 
                event.status === 'removed' ? 'text-gray-500/70' : 'text-green-500/70'
              }`}>
                {event.description}
              </p>
            )}
          </div>
          
          {showVaultBoy && <VaultBoyImage />}
          
          {event.status === 'new' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid={`confirm-event-${event.id}`}
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30"
                    onClick={() => onConfirmEvent(event.id)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#141e14] border-green-500/30 text-green-400">
                  <p>Bekräfta händelse</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

// TEMP: Test event starting at 00:05 today
const today = new Date().toISOString().split('T')[0];
const TEST_EVENT = {
  id: 'test-vault',
  summary: 'TEST: Event kl 00:05',
  start: today,
  description: `Testevent kl: 00:05. Detta är ett test.`,
  status: 'normal',
  calendar_index: 1,
  subject_name: 'Test'
};

// Separate countdown component to isolate re-renders
const CountdownTimer = memo(({ settings, onRefreshEvents, onTriggerImpact, syncing }) => {
  const [countdown, setCountdown] = useState('--:--');
  const [nextSyncTime, setNextSyncTime] = useState(null);
  const [hasTriggeredAtZero, setHasTriggeredAtZero] = useState(false);
  const [impactInProgress, setImpactInProgress] = useState(false);
  const [wasSyncing, setWasSyncing] = useState(false);
  
  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/sync-status`);
      setNextSyncTime(response.data.next_sync * 1000);
      return response.data;
    } catch (e) {
      console.error("Error fetching sync status:", e);
      return null;
    }
  }, []);
  
  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);
  
  useEffect(() => {
    if (!nextSyncTime) return;
    
    let pollTimeout = null;
    let pollCount = 0;
    const MAX_POLLS = 30;
    
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((nextSyncTime - now) / 1000));
      
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      setCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      
      if (remaining > 0) {
        setHasTriggeredAtZero(false);
        pollCount = 0;
      }
      
      if (remaining === 0 && !hasTriggeredAtZero && !impactInProgress) {
        setHasTriggeredAtZero(true);
        
        if (settings?.impact_effect_enabled && onTriggerImpact) {
          onTriggerImpact();
          setImpactInProgress(true);
        }
        
        const pollForNewSync = async () => {
          pollCount++;
          const currentTime = Date.now();
          const status = await fetchSyncStatus();
          
          if (status && status.next_sync * 1000 > currentTime) {
            if (onRefreshEvents) onRefreshEvents();
            setImpactInProgress(false);
          } else if (pollCount < MAX_POLLS) {
            pollTimeout = setTimeout(pollForNewSync, 2000);
          } else {
            await fetchSyncStatus();
            setImpactInProgress(false);
          }
        };
        
        pollTimeout = setTimeout(pollForNewSync, 1000);
      }
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    
    return () => {
      clearInterval(timer);
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [nextSyncTime, onRefreshEvents, settings?.impact_effect_enabled, impactInProgress, hasTriggeredAtZero, onTriggerImpact, fetchSyncStatus]);
  
  useEffect(() => {
    if (wasSyncing && !syncing) {
      fetchSyncStatus();
    }
    setWasSyncing(syncing);
  }, [syncing, wasSyncing, fetchSyncStatus]);
  
  return (
    <span className="text-lg font-bold text-green-400 pip-glow font-mono">{countdown}</span>
  );
});

export const Dashboard = ({ settings, events, syncing, onSync, onConfirmEvent, authEnabled, isAuthenticated, onLogout, onRefreshEvents }) => {
  const [triggerImpact, setTriggerImpact] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockObj, setWakeLockObj] = useState(null);
  
  const calendar1Events = useMemo(() => [TEST_EVENT, ...events.filter(e => e.calendar_index === 1)], [events]);
  const calendar2Events = useMemo(() => events.filter(e => e.calendar_index === 2), [events]);
  
  const handleTriggerImpact = useCallback(() => {
    setTriggerImpact(true);
  }, []);
  
  const handleImpactComplete = useCallback(() => {
    setTriggerImpact(false);
  }, []);
  
  // Wake Lock functionality
  const toggleWakeLock = useCallback(async () => {
    console.log('toggleWakeLock called, current state:', wakeLockActive);
    
    if (wakeLockActive && wakeLockObj) {
      // Release wake lock
      try {
        await wakeLockObj.release();
        setWakeLockObj(null);
        setWakeLockActive(false);
        console.log('Wake lock released');
      } catch (e) {
        console.warn('Error releasing wake lock:', e);
      }
    } else {
      // Request wake lock
      console.log('Checking wakeLock support:', 'wakeLock' in navigator);
      try {
        if ('wakeLock' in navigator) {
          console.log('Requesting wake lock...');
          const lock = await navigator.wakeLock.request('screen');
          setWakeLockObj(lock);
          setWakeLockActive(true);
          console.log('Wake lock activated successfully');
          
          // Handle visibility change (re-acquire lock when page becomes visible)
          lock.addEventListener('release', () => {
            console.log('Wake lock was released');
            setWakeLockActive(false);
            setWakeLockObj(null);
          });
        } else {
          console.warn('Wake Lock API not supported');
          alert('Skärmlås stöds inte av denna webbläsare. Prova Chrome, Edge eller Safari på iOS/macOS.');
        }
      } catch (e) {
        console.warn('Error requesting wake lock:', e.name, e.message);
        if (e.name === 'NotAllowedError') {
          alert('Skärmlås blockerades. Kontrollera webbläsarens inställningar.');
        } else {
          alert('Kunde inte aktivera skärmlås: ' + e.message);
        }
      }
    }
  }, [wakeLockActive, wakeLockObj]);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && wakeLockActive && !wakeLockObj) {
        try {
          if ('wakeLock' in navigator) {
            const lock = await navigator.wakeLock.request('screen');
            setWakeLockObj(lock);
          }
        } catch (e) {
          console.warn('Error re-acquiring wake lock:', e);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [wakeLockActive, wakeLockObj]);

  const CalendarColumn = ({ title, events, isEmpty }) => (
    <div className="flex flex-col gap-[5px]">
      {/* Header box */}
      <div className="bg-[#1a2a1a] rounded-lg border-2 border-green-500/50 border-t-4 border-t-green-400 px-4 py-4">
        <h2 className="text-xl font-bold text-green-400 pip-glow tracking-tight">{title}</h2>
        <p className="text-sm text-green-500/60 mt-1">
          {events.length} händelse{events.length !== 1 ? 'r' : ''}
        </p>
      </div>
      
      {/* Events */}
      {events.length === 0 ? (
        <div className="bg-[#141e14] rounded border border-green-500/30 p-4">
          <div className="empty-state">
            <Radio className="empty-state-icon radiation-icon" />
            <p className="empty-state-title">INGEN DATA</p>
            <p className="empty-state-description">
              {isEmpty ? "Konfigurera iCal-länk i terminal" : "Väntar på signal..."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-[5px]">
          {events
            .sort((a, b) => {
              const statusOrder = { new: 0, normal: 1, removed: 2 };
              const statusDiff = statusOrder[a.status] - statusOrder[b.status];
              if (statusDiff !== 0) return statusDiff;
              return new Date(a.start) - new Date(b.start);
            })
            .map(event => (
              <EventCard key={event.id} event={event} onConfirmEvent={onConfirmEvent} />
            ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f0a] fallout-scanlines">
      {/* Impact Effect */}
      <ImpactEffect trigger={triggerImpact} onComplete={handleImpactComplete} />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0f0a]/95 backdrop-blur-sm border-b border-green-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Radio className="w-6 h-6 text-green-400 radiation-icon" />
              <h1 className="text-lg font-bold text-green-400 pip-glow tracking-tight">VKLASS SYNC</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                data-testid="sync-button"
                variant="outline"
                size="sm"
                onClick={onSync}
                disabled={syncing}
                className="gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'SYNKAR...' : 'SYNKA'}
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-testid="wake-lock-button"
                      variant="outline"
                      size="sm"
                      onClick={toggleWakeLock}
                      className={`gap-2 border-green-500/30 hover:bg-green-500/10 ${wakeLockActive ? 'text-yellow-400 border-yellow-500' : 'text-green-400'}`}
                    >
                      {wakeLockActive ? (
                        <Lightbulb className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      ) : (
                        <LightbulbOff className="w-4 h-4 text-green-400 fill-green-400/30" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#141e14] border-green-500/30 text-green-400">
                    <p>{wakeLockActive ? 'Skärmlås aktivt - klicka för att stänga av' : 'Håll skärmen tänd'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to={authEnabled && !isAuthenticated ? "/login?redirect=/settings" : "/settings"}>
                      <Button data-testid="settings-button" variant="ghost" size="icon" className="relative text-green-400 hover:bg-green-500/10 hover:text-green-300">
                        <SettingsIcon className="w-5 h-5" />
                        {authEnabled && !isAuthenticated && (
                          <Lock className="w-3 h-3 absolute -top-0.5 -right-0.5 text-amber-400" />
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#141e14] border-green-500/30 text-green-400">
                    {authEnabled && !isAuthenticated ? "Terminal (kräver access)" : "Terminal"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {onLogout && (
                <Button
                  data-testid="logout-button"
                  variant="ghost"
                  size="icon"
                  onClick={onLogout}
                  className="text-green-400 hover:bg-green-500/10 hover:text-green-300"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Status & Legend */}
        <div className="mb-6 p-4 bg-[#141e14] rounded border border-green-500/30">
          {/* Countdown row */}
          <div className="flex items-center justify-center gap-3 mb-3 pb-3 border-b border-green-500/20 px-0.5">
            <Clock className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-500/70 uppercase tracking-wider">Time to Impact:</span>
            <CountdownTimer 
              settings={settings} 
              onRefreshEvents={onRefreshEvents} 
              onTriggerImpact={handleTriggerImpact}
              syncing={syncing}
            />
          </div>
          
          {/* Legend row */}
          <div className="flex items-center justify-center gap-3 overflow-x-auto whitespace-nowrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50"></div>
              <span className="text-sm text-green-500/70">Nytt <Check className="inline w-3 h-3 text-amber-400" /></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50"></div>
              <span className="text-sm text-green-500/70">Aktiv</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-cyan-500/30 border border-cyan-500/50"></div>
              <span className="text-sm text-green-500/70">Utfört</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-500/30 border border-gray-500/50"></div>
              <span className="text-sm text-green-500/70">Borttagen</span>
            </div>
          </div>
        </div>

        {/* Calendar Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CalendarColumn
            title={settings?.calendar_name_1 || "TERMINAL 1"}
            events={calendar1Events}
            isEmpty={!settings?.ical_url_1}
          />
          <CalendarColumn
            title={settings?.calendar_name_2 || "TERMINAL 2"}
            events={calendar2Events}
            isEmpty={!settings?.ical_url_2}
          />
        </div>
      </main>
    </div>
  );
};
