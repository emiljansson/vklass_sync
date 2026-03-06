import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, BarChart3, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import axios from "axios";

import { 
  CalendarStats, 
  CalendarSummaryCard, 
  DailyBreakdown, 
  WeekNavigation, 
  formatMinutes 
} from "./stats";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export function Stats() {
  const { calendarIndex, weekParam } = useParams();
  const showBoth = !calendarIndex;
  const calIndex = parseInt(calendarIndex) || 1;
  const calKey = `calendar_${calIndex}`;
  
  // Read initial week offset from URL path parameter
  const initialOffset = parseInt(weekParam || '0');
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weekOffset, setWeekOffset] = useState(initialOffset);

  const fetchStats = useCallback(async (offset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/stats/weekly?week_offset=${offset}`);
      setStats(response.data);
    } catch (e) {
      console.error("Error fetching stats:", e);
      setError("Kunde inte hämta statistik");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(weekOffset);
  }, [weekOffset, fetchStats]);

  const goToPreviousWeek = () => setWeekOffset(prev => prev - 1);
  const goToNextWeek = () => stats?.has_next_week && setWeekOffset(prev => prev + 1);
  const goToCurrentWeek = () => setWeekOffset(0);

  const calendarData = stats?.calendars?.[calKey];
  const calendarName = calendarData?.name || `Kalender ${calIndex}`;
  const pageTitle = showBoth ? "VECKOSTATISTIK" : calendarName;

  return (
    <div className="min-h-screen bg-[#0a120a] fallout-scanlines p-4">
      <div className={`mx-auto ${showBoth ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button
                variant="ghost"
                size="icon"
                className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                data-testid="back-button"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-mono text-green-400 pip-glow flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                {pageTitle}
              </h1>
              {stats && (
                <p className="text-green-500/60 font-mono text-sm">
                  Vecka {stats.week_number}, {stats.year}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchStats(weekOffset)}
            disabled={loading}
            className="border-green-500/50 text-green-500 hover:bg-green-500/10"
            data-testid="refresh-stats-button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </header>

        {/* Week Navigation */}
        <WeekNavigation
          stats={stats}
          weekOffset={weekOffset}
          onPrevious={goToPreviousWeek}
          onNext={goToNextWeek}
          onGoToToday={goToCurrentWeek}
        />

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-green-500 animate-spin mx-auto mb-4" />
              <p className="text-green-500/60 font-mono">Laddar statistik...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="bg-[#0f1a0f] border-2 border-red-500/30">
            <CardContent className="py-8 text-center">
              <p className="text-red-400 font-mono">{error}</p>
              <Button
                onClick={() => fetchStats(weekOffset)}
                className="mt-4 bg-green-600 hover:bg-green-700 text-black"
              >
                Försök igen
              </Button>
            </CardContent>
          </Card>
        ) : showBoth && stats ? (
          // Show both calendars
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CalendarSummaryCard
                calendarData={stats.calendars.calendar_1}
                calendarName={stats.calendars.calendar_1?.name || "Kalender 1"}
                calendarIndex={1}
                linkable={true}
              />
              <CalendarSummaryCard
                calendarData={stats.calendars.calendar_2}
                calendarName={stats.calendars.calendar_2?.name || "Kalender 2"}
                calendarIndex={2}
                linkable={true}
              />
            </div>

            {/* Calendar Stats with Events - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CalendarStats
                name={stats.calendars.calendar_1?.name || "Kalender 1"}
                subjects={stats.calendars.calendar_1?.subjects || []}
                totalMinutes={stats.calendars.calendar_1?.total_minutes || 0}
                daily={stats.calendars.calendar_1?.daily || []}
                events={stats.calendars.calendar_1?.events || []}
                colorOffset={0}
              />
              <CalendarStats
                name={stats.calendars.calendar_2?.name || "Kalender 2"}
                subjects={stats.calendars.calendar_2?.subjects || []}
                totalMinutes={stats.calendars.calendar_2?.total_minutes || 0}
                daily={stats.calendars.calendar_2?.daily || []}
                events={stats.calendars.calendar_2?.events || []}
                colorOffset={3}
              />
            </div>
          </div>
        ) : calendarData ? (
          // Show single calendar
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="bg-[#0f1a0f] border-2 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Clock className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <p className="text-green-500/60 font-mono text-xs uppercase">
                        Lektionstid
                      </p>
                      <p className="text-green-500/60 font-mono text-xs uppercase">
                        Skoltid
                      </p>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <p className="text-green-400 font-mono text-2xl">
                        {formatMinutes(calendarData.total_minutes || 0)}
                      </p>
                      <p className="text-green-400 font-mono text-2xl">
                        {formatMinutes(calendarData.school_time_minutes || 0)}
                      </p>
                    </div>
                  </div>
                </div>
                <DailyBreakdown daily={calendarData.daily} showTimes={true} />
              </CardContent>
            </Card>

            {/* Calendar Stats with Events */}
            <CalendarStats
              name={calendarName}
              subjects={calendarData.subjects || []}
              totalMinutes={calendarData.total_minutes || 0}
              daily={calendarData.daily || []}
              events={calendarData.events || []}
              colorOffset={calIndex === 1 ? 0 : 3}
            />
          </div>
        ) : (
          <Card className="bg-[#0f1a0f] border-2 border-green-500/30">
            <CardContent className="py-8 text-center">
              <p className="text-green-500/60 font-mono">Ingen data för denna kalender</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default Stats;
