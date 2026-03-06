/**
 * Event card component
 */
import { memo } from "react";
import { MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VaultBoyImage } from "./VaultBoyImage";
import { getStatusBadge } from "./StatusBadge";
import { isEventPast, getStatusStyles } from "./utils";

export const EventCard = memo(({ event, onConfirmEvent }) => {
  const showVaultBoy = isEventPast(event.start, event.event_time) && event.status !== 'removed';
  
  return (
    <Card 
      data-testid={`event-card-${event.id}`}
      className={`event-card relative transition-all duration-200 bg-[#0f1a0f] rounded-lg border-2 border-green-500/40 ${getStatusStyles(event.status, event.start, event.event_time)}`}
    >
      <CardContent className="p-4 relative">
        {showVaultBoy && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <VaultBoyImage />
          </div>
        )}
        <div className="flex items-start justify-between gap-2 relative z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {getStatusBadge(event.status, event.start, event.event_time)}
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
              isEventPast(event.start, event.event_time) ? 'text-cyan-400' : 'text-green-400'
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
              <p className={`mt-2 text-sm whitespace-pre-line ${
                event.status === 'new' ? 'text-amber-500/70' : 
                event.status === 'removed' ? 'text-gray-500/70' : 'text-green-500/70'
              }`}>
                {event.description.replace(/(\d{4}\s+kl[:\s]*\d{1,2}:\d{2})\.\s*/i, '$1.\n')}
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
});

EventCard.displayName = 'EventCard';
