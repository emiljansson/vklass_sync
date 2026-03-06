// Week navigation component for stats page
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const WeekNavigation = ({ 
  stats, 
  weekOffset, 
  onPrevious, 
  onNext, 
  onGoToToday 
}) => {
  return (
    <Card className="bg-[#0f1a0f] border-2 border-green-500/30 mb-6">
      <CardContent className="p-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevious}
          className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
          data-testid="prev-week-button"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        
        <div className="text-center flex-1">
          <p className="text-green-500/60 font-mono text-xs uppercase">
            {weekOffset === 0 ? "Denna vecka" : weekOffset > 0 ? `+${weekOffset} vecka` : `${weekOffset} vecka`}
          </p>
          <p className="text-green-400 font-mono text-2xl">
            V{stats?.week_number || '-'}
          </p>
          <p className="text-green-500/50 font-mono text-xs">
            {stats?.period?.start} - {stats?.period?.end}
          </p>
          {weekOffset !== 0 && (
            <button
              onClick={onGoToToday}
              className="text-green-500/50 hover:text-green-400 font-mono text-xs underline mt-1"
            >
              Tillbaka till idag
            </button>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          disabled={!stats?.has_next_week}
          className={`text-green-500 hover:text-green-400 hover:bg-green-500/10 ${!stats?.has_next_week ? 'opacity-30 cursor-not-allowed' : ''}`}
          data-testid="next-week-button"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </CardContent>
    </Card>
  );
};
