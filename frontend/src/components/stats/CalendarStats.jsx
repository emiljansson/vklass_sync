// Calendar statistics chart component with diverging bar chart
import { BookOpen, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventsList } from "./EventsList";
import { formatMinutes, CHART_COLORS } from "./utils";

export const CalendarStats = ({ name, subjects, totalMinutes, daily, events, colorOffset = 0 }) => {
  // Create diverging chart data - alternating left/right
  const maxMinutes = Math.max(...subjects.map(s => s.minutes), 1);
  
  const chartData = subjects.map((s, index) => {
    const percent = totalMinutes > 0 ? Math.round((s.minutes / totalMinutes) * 100) : 0;
    const timeStr = formatMinutes(s.minutes);
    const isLeft = index % 2 === 0; // Even indices go left, odd go right
    
    return {
      name: s.name || "Okänt ämne",
      minutes: s.minutes,
      percent: percent,
      label: `${timeStr} (${percent}%)`,
      fill: CHART_COLORS[(index + colorOffset) % CHART_COLORS.length],
      isLeft: isLeft
    };
  });

  return (
    <Card className="bg-[#0f1a0f] border-2 border-green-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-green-400 font-mono text-lg flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {name}, Ämnen: {subjects.length}st
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Events List - Moved to top */}
        <div className="mb-6 pb-4 border-b border-green-500/20">
          <h3 className="text-green-400 font-mono text-sm mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Uppgifter denna vecka
          </h3>
          <EventsList events={events} calendarName={name} />
        </div>
        
        {subjects.length === 0 ? (
          <p className="text-green-500/60 font-mono text-center py-8">
            Inga lektioner denna vecka
          </p>
        ) : (
          <>
            {/* Diverging Bar Chart */}
            <div className="relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex justify-between pointer-events-none">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div 
                    key={i} 
                    className={`h-full ${i === 4 ? 'w-0.5 bg-green-500' : 'w-px bg-green-500/20'}`}
                    style={{ borderStyle: i !== 4 ? 'dashed' : 'solid' }}
                  />
                ))}
              </div>
              
              <div className="space-y-1 relative">
                {chartData.map((entry, index) => {
                  const barWidth = Math.max((entry.minutes / maxMinutes) * 45, 2);
                  return (
                    <div key={index} className="flex items-center h-12 border-b border-green-500/10">
                      {/* Left half */}
                      <div className="w-1/2 flex items-center justify-end pr-1">
                        {entry.isLeft ? (
                          <>
                            <div className="text-right mr-2">
                              <div className="font-mono text-[11px] text-green-400 whitespace-nowrap">
                                {entry.name}
                              </div>
                              <div className="font-mono text-[10px] text-green-400/70 whitespace-nowrap">
                                {entry.label}
                              </div>
                            </div>
                            <div 
                              className="h-8 rounded-l"
                              style={{ 
                                width: `${barWidth}%`, 
                                backgroundColor: entry.fill,
                                minWidth: '8px'
                              }}
                            />
                          </>
                        ) : null}
                      </div>
                      
                      {/* Right half */}
                      <div className="w-1/2 flex items-center justify-start pl-1">
                        {!entry.isLeft ? (
                          <>
                            <div 
                              className="h-8 rounded-r"
                              style={{ 
                                width: `${barWidth}%`, 
                                backgroundColor: entry.fill,
                                minWidth: '8px'
                              }}
                            />
                            <div className="text-left ml-2">
                              <div className="font-mono text-[11px] text-green-400 whitespace-nowrap">
                                {entry.name}
                              </div>
                              <div className="font-mono text-[10px] text-green-400/70 whitespace-nowrap">
                                {entry.label}
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
