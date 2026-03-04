import { useState, useEffect, useCallback } from "react";
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

export const Dashboard = ({ settings, events, syncing, onSync, onConfirmEvent, authEnabled, isAuthenticated, onLogout, onRefreshEvents }) => {
  const [countdown, setCountdown] = useState(null);
  const [nextSyncTime, setNextSyncTime] = useState(null);
  const [wasSyncing, setWasSyncing] = useState(false);
  const [triggerImpact, setTriggerImpact] = useState(false);
  const [impactInProgress, setImpactInProgress] = useState(false);
  const [hasTriggeredAtZero, setHasTriggeredAtZero] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockObj, setWakeLockObj] = useState(null);
  
  // TEMP: Fake test event for Vault Boy
  const fakeTestEvent = {
    id: 'test-vault-boy',
    summary: 'TEST: Dansande Vault Boy',
    start: '2025-01-01T10:00:00',
    status: 'normal',
    calendar_index: 1,
    subject_name: 'Test',
    location: 'Vault 111'
  };
  
  const calendar1Events = [fakeTestEvent, ...events.filter(e => e.calendar_index === 1)];
  const calendar2Events = events.filter(e => e.calendar_index === 2);
  
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
  
  // Fetch sync status from backend
  const fetchSyncStatus = async () => {
    try {
      const response = await axios.get(`${API}/sync-status`);
      setNextSyncTime(response.data.next_sync * 1000); // Convert to milliseconds
      return response.data;
    } catch (e) {
      console.error("Error fetching sync status:", e);
      return null;
    }
  };
  
  // Fetch sync status on mount
  useEffect(() => {
    fetchSyncStatus();
  }, []);
  
  // Countdown timer
  useEffect(() => {
    if (!nextSyncTime) return;
    
    let pollTimeout = null;
    let pollCount = 0;
    const MAX_POLLS = 30; // Max 30 attempts (60 seconds)
    
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((nextSyncTime - now) / 1000));
      
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      setCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      
      // Reset trigger flag when timer is above 0
      if (remaining > 0) {
        setHasTriggeredAtZero(false);
        pollCount = 0;
      }
      
      // If countdown reaches 0, trigger impact effect ONCE
      if (remaining === 0 && !hasTriggeredAtZero && !impactInProgress) {
        setHasTriggeredAtZero(true);
        
        // Trigger impact effect if enabled
        if (settings?.impact_effect_enabled) {
          setTriggerImpact(true);
          setImpactInProgress(true);
        }
        
        // Poll for new sync time
        const pollForNewSync = async () => {
          pollCount++;
          const currentTime = Date.now();
          const status = await fetchSyncStatus();
          
          if (status && status.next_sync * 1000 > currentTime) {
            // Got a new sync time in the future
            console.log('Got new sync time, refreshing events');
            if (onRefreshEvents) {
              onRefreshEvents();
            }
          } else if (pollCount < MAX_POLLS) {
            // Backend hasn't synced yet, try again
            console.log(`Polling for sync... attempt ${pollCount}`);
            pollTimeout = setTimeout(pollForNewSync, 2000);
          } else {
            // Give up and force refresh
            console.log('Max polls reached, forcing refresh');
            await fetchSyncStatus();
          }
        };
        
        // Start polling after 1 second
        pollTimeout = setTimeout(pollForNewSync, 1000);
      }
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    
    return () => {
      clearInterval(timer);
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, [nextSyncTime, onRefreshEvents, settings?.impact_effect_enabled, impactInProgress, hasTriggeredAtZero]);
  
  // Handle impact effect completion
  const handleImpactComplete = async () => {
    setTriggerImpact(false);
    setImpactInProgress(false);
    // Force fetch new sync status after effect completes
    await fetchSyncStatus();
  };
  
  // Refetch sync status when manual sync completes
  useEffect(() => {
    if (wasSyncing && !syncing) {
      fetchSyncStatus();
    }
    setWasSyncing(syncing);
  }, [syncing, wasSyncing]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      return new Intl.DateTimeFormat('sv-SE', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const isEventPast = (startDate) => {
    if (!startDate) return false;
    try {
      const eventDate = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDate < today;
    } catch {
      return false;
    }
  };

  // Check if event recently became "utfört" (within 8 hours of the event's end of day)
  const isRecentlyCompleted = (startDate) => {
    if (!startDate) return false;
    try {
      const eventDate = new Date(startDate);
      // Set to end of the event day (23:59:59)
      eventDate.setHours(23, 59, 59, 999);
      const now = Date.now();
      const eightHoursMs = 8 * 60 * 60 * 1000;
      // Show dancing Vault Boy for 8 hours after event day ended
      return now > eventDate.getTime() && now < eventDate.getTime() + eightHoursMs;
    } catch {
      return false;
    }
  };

  const getStatusStyles = (status, start) => {
    // Check if event is in the past (already occurred)
    if (isEventPast(start) && status !== 'removed') {
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

  const getStatusBadge = (status, start) => {
    if (isEventPast(start) && status !== 'removed') {
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

  const EventCard = ({ event }) => {
    // TEMP: Show on all past events for testing (change back to isRecentlyCompleted later)
    const showVaultBoy = isEventPast(event.start) && event.status !== 'removed';
    
    return (
    <Card 
      data-testid={`event-card-${event.id}`}
      className={`event-card relative transition-all duration-200 bg-[#0f1a0f] rounded-lg border-2 border-green-500/40 ${getStatusStyles(event.status, event.start)}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {getStatusBadge(event.status, event.start)}
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
              isEventPast(event.start) ? 'text-cyan-400' : 'text-green-400'
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
          
          {/* Dancing Vault Boy for recently completed events */}
          {showVaultBoy && (
            <div className="flex-shrink-0 vault-boy-dance">
              <img 
                src="https://static.prod-images.emergentagent.com/jobs/a7217622-ec5d-4df3-84c4-cbfaa9d1f7a7/images/b3a1cc10ee6cfdb88c557764b0bb283afd30e891f5ebc886d33fd4208571d926.png"
                alt="Vault Boy"
                className="w-14 h-14 object-contain"
              />
            </div>
          )}
          
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
  };

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
              <EventCard key={event.id} event={event} />
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
            <span className="text-lg font-bold text-green-400 pip-glow font-mono">{countdown || '--:--'}</span>
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
