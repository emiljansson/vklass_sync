import { Link } from "react-router-dom";
import { Settings as SettingsIcon, RefreshCw, LogOut, Calendar, MapPin, Check, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Dashboard = ({ settings, events, syncing, onSync, onConfirmEvent, authEnabled, isAuthenticated, onLogout }) => {
  const calendar1Events = events.filter(e => e.calendar_index === 1);
  const calendar2Events = events.filter(e => e.calendar_index === 2);

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

  const getStatusStyles = (status) => {
    switch (status) {
      case 'new':
        return 'bg-rose-50 border-rose-200 hover:bg-rose-100';
      case 'removed':
        return 'bg-blue-50 border-blue-200 opacity-80';
      default:
        return 'bg-white border-slate-200 hover:bg-slate-50';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200">Ny</Badge>;
      case 'removed':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">Borttagen</Badge>;
      default:
        return null;
    }
  };

  const EventCard = ({ event }) => (
    <Card 
      data-testid={`event-card-${event.id}`}
      className={`event-card relative border transition-all duration-200 ${getStatusStyles(event.status)}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getStatusBadge(event.status)}
            </div>
            <h3 className={`font-semibold text-base truncate ${event.status === 'new' ? 'text-rose-900' : event.status === 'removed' ? 'text-blue-900' : 'text-slate-900'}`}>
              {event.summary}
            </h3>
            
            <div className={`flex items-center gap-1.5 mt-2 text-sm ${event.status === 'new' ? 'text-rose-700' : event.status === 'removed' ? 'text-blue-700' : 'text-slate-600'}`}>
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-mono text-xs">{formatDateTime(event.start)}</span>
            </div>
            
            {event.location && (
              <div className={`flex items-center gap-1.5 mt-1 text-sm ${event.status === 'new' ? 'text-rose-600' : event.status === 'removed' ? 'text-blue-600' : 'text-slate-500'}`}>
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            
            {event.description && (
              <p className={`mt-2 text-sm line-clamp-2 ${event.status === 'new' ? 'text-rose-600' : event.status === 'removed' ? 'text-blue-600' : 'text-slate-500'}`}>
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
                    className="flex-shrink-0 h-8 w-8 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700"
                    onClick={() => onConfirmEvent(event.id)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
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
    <div className="calendar-column">
      <div className="calendar-header">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        <p className="text-sm text-slate-500 mt-1">
          {events.length} händelse{events.length !== 1 ? 'r' : ''}
        </p>
      </div>
      
      <ScrollArea className="flex-1 pr-4">
        {events.length === 0 ? (
          <div className="empty-state">
            <Calendar className="empty-state-icon" />
            <p className="empty-state-title">Inga händelser</p>
            <p className="empty-state-description">
              {isEmpty ? "Konfigurera iCal-länk i inställningar" : "Kalendern är tom"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {events
              .sort((a, b) => {
                // Sort: new first, then normal, then removed
                const statusOrder = { new: 0, normal: 1, removed: 2 };
                const statusDiff = statusOrder[a.status] - statusOrder[b.status];
                if (statusDiff !== 0) return statusDiff;
                
                // Then by start date
                return new Date(a.start) - new Date(b.start);
              })
              .map(event => (
                <EventCard key={event.id} event={event} />
              ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-slate-900" />
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Vklass Sync</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                data-testid="sync-button"
                variant="outline"
                size="sm"
                onClick={onSync}
                disabled={syncing}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Synkar...' : 'Synka nu'}
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to={authEnabled && !isAuthenticated ? "/login?redirect=/settings" : "/settings"}>
                      <Button data-testid="settings-button" variant="ghost" size="icon" className="relative">
                        <SettingsIcon className="w-5 h-5" />
                        {authEnabled && !isAuthenticated && (
                          <Lock className="w-3 h-3 absolute -top-0.5 -right-0.5 text-amber-600" />
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    {authEnabled && !isAuthenticated ? "Inställningar (kräver inloggning)" : "Inställningar"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {onLogout && (
                <Button
                  data-testid="logout-button"
                  variant="ghost"
                  size="icon"
                  onClick={onLogout}
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
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-6 p-3 bg-white rounded-lg border border-slate-200">
          <span className="text-sm text-slate-600 font-medium">Förklaring:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-rose-200 border border-rose-300"></div>
            <span className="text-sm text-slate-600">Ny (bekräfta med <Check className="inline w-3 h-3" />)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-200 border border-blue-300"></div>
            <span className="text-sm text-slate-600">Borttagen (försvinner efter 6h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-white border border-slate-300"></div>
            <span className="text-sm text-slate-600">Normal</span>
          </div>
        </div>

        {/* Calendar Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <CalendarColumn
            title={settings?.calendar_name_1 || "Kalender 1"}
            events={calendar1Events}
            isEmpty={!settings?.ical_url_1}
          />
          <CalendarColumn
            title={settings?.calendar_name_2 || "Kalender 2"}
            events={calendar2Events}
            isEmpty={!settings?.ical_url_2}
          />
        </div>
      </main>
    </div>
  );
};
