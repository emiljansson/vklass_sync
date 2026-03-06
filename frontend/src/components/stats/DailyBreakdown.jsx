// Daily time breakdown component
import { formatMinutes } from "./utils";

export const DailyBreakdown = ({ daily, showTimes = false }) => {
  if (!daily || daily.length === 0) return null;
  
  return (
    <div className="grid grid-cols-5 gap-1 mt-2">
      {daily.map((day, index) => (
        <div key={index} className="text-center">
          <div className="text-green-500/60 text-[10px] font-mono">{day.name.substring(0, 3)}</div>
          <div className="text-green-400 text-xs font-mono">{formatMinutes(day.minutes)}</div>
          {showTimes && day.first_start && day.last_end && (
            <div className="text-green-500/40 text-[9px] font-mono">{day.first_start}-{day.last_end}</div>
          )}
        </div>
      ))}
    </div>
  );
};
