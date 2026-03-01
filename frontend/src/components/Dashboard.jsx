import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon, RefreshCw, LogOut, Calendar, MapPin, Check, Lock, Radio, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Dashboard = ({ settings, events, syncing, onSync, onConfirmEvent, authEnabled, isAuthenticated, onLogout }) => {
  const [countdown, setCountdown] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    // Try to get from localStorage or use current time
    const saved = localStorage.getItem('lastSyncTime');
    return saved ? parseInt(saved) : Date.now();
  });
  const [wasSyncing, setWasSyncing] = useState(false);
  
  const calendar1Events = events.filter(e => e.calendar_index === 1);
  const calendar2Events = events.filter(e => e.calendar_index === 2);
  
  // Countdown timer
  useEffect(() => {
    const syncInterval = (settings?.sync_interval || 15) * 60; // seconds
    
    const updateCountdown = () => {
      const elapsed = Math.floor((Date.now() - lastSyncTime) / 1000);
      const remaining = Math.max(0, syncInterval - elapsed);
      
      // If countdown reaches 0, reset it (backend synced automatically)
      if (remaining === 0) {
        const newTime = Date.now();
        setLastSyncTime(newTime);
        localStorage.setItem('lastSyncTime', newTime.toString());
      }
      
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      setCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(timer);
  }, [settings?.sync_interval, lastSyncTime]);
  
  // Reset countdown only when manual sync completes
  useEffect(() => {
    if (wasSyncing && !syncing) {
      const newTime = Date.now();
      setLastSyncTime(newTime);
      localStorage.setItem('lastSyncTime', newTime.toString());
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
        return <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 uppercase text-xs tracking-wider">Borttagen</Badge>;
      default:
        return null;
    }
  };

  const EventCard = ({ event }) => (
    <Card 
      data-testid={`event-card-${event.id}`}
      className={`event-card relative border transition-all duration-200 bg-[#141e14] border-green-500/30 ${getStatusStyles(event.status, event.start)}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getStatusBadge(event.status, event.start)}
            </div>
            <h3 className={`font-semibold text-base truncate ${
              event.status === 'new' ? 'text-amber-400' : 
              event.status === 'removed' ? 'text-red-400' : 
              isEventPast(event.start) ? 'text-cyan-400' : 'text-green-400'
            }`}>
              {event.summary}
            </h3>
            
            {event.location && (
              <div className={`flex items-center gap-1.5 mt-1 text-sm ${
                event.status === 'new' ? 'text-amber-500/70' : 
                event.status === 'removed' ? 'text-red-500/70' : 'text-green-500/70'
              }`}>
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            
            {event.description && (
              <p className={`mt-2 text-sm line-clamp-2 ${
                event.status === 'new' ? 'text-amber-500/70' : 
                event.status === 'removed' ? 'text-red-500/70' : 'text-green-500/70'
              }`}>
                {event.description}
              </p>
            )}
          </div>
          
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

  const CalendarColumn = ({ title, events, isEmpty }) => (
    <div className="calendar-column space-y-[5px]">
      {/* Header box */}
      <div className="bg-[#141e14] rounded border border-green-500/30 border-t-4 border-t-green-500 px-4 py-4">
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
        <div className="space-y-3">
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
    <div className="min-h-screen bg-[#0a0f0a] fallout-scanlines pip-screen">
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
            <span className="text-sm text-green-500/70 uppercase tracking-wider">Nästa koll:</span>
            <span className="text-lg font-bold text-green-400 pip-glow font-mono">{countdown || '--:--'}</span>
          </div>
          
          {/* Legend row */}
          <div className="flex items-center justify-center gap-4 overflow-x-auto whitespace-nowrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50"></div>
              <span className="text-sm text-green-500/70">Nytt <Check className="inline w-3 h-3 text-amber-400" /></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50"></div>
              <span className="text-sm text-green-500/70">Borttagen (6h)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-cyan-500/30 border border-cyan-500/50"></div>
              <span className="text-sm text-green-500/70">Utfört</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50"></div>
              <span className="text-sm text-green-500/70">Aktiv</span>
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
