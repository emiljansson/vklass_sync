// Summary card for calendar overview
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DailyBreakdown } from "./DailyBreakdown";
import { formatMinutes } from "./utils";

export const CalendarSummaryCard = ({ 
  calendarData, 
  calendarName, 
  calendarIndex, 
  linkable = false 
}) => {
  const content = (
    <Card className={`bg-[#0f1a0f] border-2 border-green-500/30 ${linkable ? 'hover:border-green-400/50 transition-colors cursor-pointer' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Clock className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline justify-between">
              <p className="text-green-500/60 font-mono text-xs uppercase">
                {calendarName} - Lektionstid
              </p>
              <p className="text-green-500/60 font-mono text-xs uppercase">
                Skoltid
              </p>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-green-400 font-mono text-xl">
                {formatMinutes(calendarData?.total_minutes || 0)}
              </p>
              <p className="text-green-400 font-mono text-xl">
                {formatMinutes(calendarData?.school_time_minutes || 0)}
              </p>
            </div>
          </div>
        </div>
        <DailyBreakdown daily={calendarData?.daily} showTimes={true} />
      </CardContent>
    </Card>
  );

  if (linkable && calendarIndex) {
    return (
      <Link to={`/stats/${calendarIndex}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
};
