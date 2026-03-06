/**
 * Dashboard - Refactored version
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon, RefreshCw, LogOut, Radio, Clock, Lightbulb, LightbulbOff, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ImpactEffect } from "./ImpactEffect";

// Import refactored dashboard components
import { EventCard, CountdownTimer, isEventPast } from "./dashboard";

export const Dashboard = ({ settings, events, syncing, onSync, onConfirmEvent, authEnabled, isAuthenticated, onLogout, onRefreshEvents }) => {
  const [triggerImpact, setTriggerImpact] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockObj, setWakeLockObj] = useState(null);
  const [sortTrigger, setSortTrigger] = useState(0);
  
  // Update sort trigger every minute to re-evaluate which events are "Utfört"
  useEffect(() => {
    const interval = setInterval(() => {
      setSortTrigger(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Sort events: active first (sorted by date), then completed at bottom
  const sortEvents = useCallback((eventsList) => {
    const active = [];
    const completed = [];
    
    eventsList.forEach(event => {
      const isPast = isEventPast(event.start, event.event_time) && event.status !== 'removed';
      if (isPast) {
        completed.push(event);
      } else {
        active.push(event);
      }
    });
    
    active.sort((a, b) => new Date(a.start) - new Date(b.start));
    completed.sort((a, b) => new Date(a.start) - new Date(b.start));
    
    return [...active, ...completed];
  }, []);
  
  const calendar1Events = useMemo(() => {
    return sortEvents(events.filter(e => e.calendar_index === 1));
  }, [events, sortTrigger, sortEvents]);
  
  const calendar2Events = useMemo(() => {
    return sortEvents(events.filter(e => e.calendar_index === 2));
  }, [events, sortTrigger, sortEvents]);
  
  const handleTriggerImpact = useCallback(() => {
    setTriggerImpact(true);
  }, []);
  
  const handleImpactComplete = useCallback(() => {
    setTriggerImpact(false);
  }, []);
  
  // Wake Lock functionality
  const toggleWakeLock = useCallback(async () => {
    if (wakeLockActive && wakeLockObj) {
      try {
        await wakeLockObj.release();
        setWakeLockObj(null);
        setWakeLockActive(false);
      } catch (e) {
        console.warn('Error releasing wake lock:', e);
      }
    } else {
      try {
        if ('wakeLock' in navigator) {
          const lock = await navigator.wakeLock.request('screen');
          setWakeLockObj(lock);
          setWakeLockActive(true);
          
          lock.addEventListener('release', () => {
            setWakeLockActive(false);
            setWakeLockObj(null);
          });
        } else {
          alert('Skärmlås stöds inte av denna webbläsare.');
        }
      } catch (e) {
        console.warn('Error requesting wake lock:', e);
        if (e.name === 'NotAllowedError') {
          alert('Skärmlås blockerades.');
        }
      }
    }
  }, [wakeLockActive, wakeLockObj]);

  // Re-acquire wake lock when page becomes visible
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

  // Calendar column component
  const CalendarColumn = ({ title, calendarEvents, isEmpty, calendarIndex }) => (
    <div className="flex flex-col gap-[5px]">
      <Link to={`/stats/${calendarIndex}`} className="block">
        <div className="bg-[#1a2a1a] rounded-lg border-2 border-green-500/50 border-t-4 border-t-green-400 px-4 py-4 hover:bg-[#1f3520] hover:border-green-400/70 transition-colors cursor-pointer">
          <h2 className="text-xl font-bold text-green-400 pip-glow tracking-tight hover:text-green-300">{title}</h2>
          <p className="text-sm text-green-500/60 mt-1">
            {calendarEvents.length} händelse{calendarEvents.length !== 1 ? 'r' : ''} • Tryck för statistik
          </p>
        </div>
      </Link>
      
      {calendarEvents.length === 0 ? (
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
          {calendarEvents.map(event => (
            <EventCard key={event.id} event={event} onConfirmEvent={onConfirmEvent} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f0a] fallout-scanlines">
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
                className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300 px-2"
                title={syncing ? 'Synkar...' : 'Synka'}
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
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
            calendarEvents={calendar1Events}
            isEmpty={!settings?.ical_url_1}
            calendarIndex={1}
          />
          <CalendarColumn
            title={settings?.calendar_name_2 || "TERMINAL 2"}
            calendarEvents={calendar2Events}
            isEmpty={!settings?.ical_url_2}
            calendarIndex={2}
          />
        </div>
      </main>
    </div>
  );
};
