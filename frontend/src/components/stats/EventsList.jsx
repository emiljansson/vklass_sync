// Events list component for stats page
import { Badge } from "@/components/ui/badge";

export const EventsList = ({ events, calendarName }) => {
  if (!events || events.length === 0) {
    return (
      <p className="text-green-500/50 font-mono text-sm text-center py-4">
        Inga uppgifter denna vecka
      </p>
    );
  }
  
  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <div 
          key={index}
          className="p-3 bg-green-500/5 rounded border border-green-500/20 hover:border-green-500/40 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-green-400 font-mono text-sm font-medium truncate">
                {event.summary}
              </p>
              <p className="text-green-500/60 font-mono text-xs mt-1">
                {event.date}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {event.subject_name && (
                <Badge className="bg-green-500/20 text-green-300 border border-green-500/30 text-xs">
                  {event.subject_name}
                </Badge>
              )}
              {event.event_type && (
                <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs">
                  {event.event_type}
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
