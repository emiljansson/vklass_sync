import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, BarChart3, BookOpen, ChevronLeft, ChevronRight, Calendar, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Fallout-themed colors for charts
const CHART_COLORS = [
  "#22c55e", // green-500
  "#4ade80", // green-400
  "#86efac", // green-300
  "#16a34a", // green-600
  "#15803d", // green-700
  "#a3e635", // lime-400
  "#84cc16", // lime-500
  "#65a30d", // lime-600
];

const formatMinutes = (minutes) => {
  if (!minutes || minutes === 0) return "0 min";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}min`;
  } else if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins}min`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#141e14] border-2 border-green-500/50 rounded p-3 shadow-lg">
        <p className="text-green-400 font-mono text-sm mb-1">{label}</p>
        <p className="text-green-300 font-mono text-lg">
          {formatMinutes(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

// Daily time breakdown component (shows school time: first start to last end)
const DailyBreakdown = ({ daily, showTimes = false }) => {
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

// Events list component
const EventsList = ({ events, calendarName }) => {
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

const CalendarStats = ({ name, subjects, totalMinutes, daily, events, colorOffset = 0 }) => {
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
                    <div key={index} className="flex items-center h-9 border-b border-green-500/10">
                      {/* Left half */}
                      <div className="w-1/2 flex items-center justify-end pr-1">
                        {entry.isLeft ? (
                          <>
                            <span className="font-mono text-[11px] text-green-400 mr-2 whitespace-nowrap">
                              {entry.label}
                            </span>
                            <div 
                              className="h-7 rounded-l"
                              style={{ 
                                width: `${barWidth}%`, 
                                backgroundColor: entry.fill,
                                minWidth: '8px'
                              }}
                            />
                            <span className="font-mono text-[11px] text-green-400 ml-2 whitespace-nowrap">
                              {entry.name}
                            </span>
                          </>
                        ) : null}
                      </div>
                      
                      {/* Right half */}
                      <div className="w-1/2 flex items-center justify-start pl-1">
                        {!entry.isLeft ? (
                          <>
                            <span className="font-mono text-[11px] text-green-400 mr-2 whitespace-nowrap">
                              {entry.name}
                            </span>
                            <div 
                              className="h-7 rounded-r"
                              style={{ 
                                width: `${barWidth}%`, 
                                backgroundColor: entry.fill,
                                minWidth: '8px'
                              }}
                            />
                            <span className="font-mono text-[11px] text-green-400 ml-2 whitespace-nowrap">
                              {entry.label}
                            </span>
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

export function Stats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

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

  const goToPreviousWeek = () => {
    setWeekOffset(prev => prev - 1);
  };

  const goToNextWeek = () => {
    if (stats?.has_next_week) {
      setWeekOffset(prev => prev + 1);
    }
  };

  const goToCurrentWeek = () => {
    setWeekOffset(0);
  };

  return (
    <div className="min-h-screen bg-[#0a120a] fallout-scanlines p-4">
      <div className="max-w-6xl mx-auto">
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
                VECKOSTATISTIK
              </h1>
              {stats && (
                <p className="text-green-500/60 font-mono text-sm">
                  Vecka {stats.week_number}, {stats.year} ({stats.period.start} - {stats.period.end})
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
        ) : stats ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Week Navigation */}
              <Card className="bg-[#0f1a0f] border-2 border-green-500/30">
                <CardContent className="p-4 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPreviousWeek}
                    className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                    data-testid="prev-week-button"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  
                  <div className="text-center flex-1">
                    <p className="text-green-500/60 font-mono text-xs uppercase">
                      {weekOffset === 0 ? "Denna vecka" : weekOffset > 0 ? `+${weekOffset} vecka` : `${weekOffset} vecka`}
                    </p>
                    <p className="text-green-400 font-mono text-lg">
                      V{stats.week_number}
                    </p>
                    {weekOffset !== 0 && (
                      <button
                        onClick={goToCurrentWeek}
                        className="text-green-500/50 hover:text-green-400 font-mono text-xs underline mt-1"
                      >
                        Tillbaka till idag
                      </button>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNextWeek}
                    disabled={!stats?.has_next_week}
                    className={`text-green-500 hover:text-green-400 hover:bg-green-500/10 ${!stats?.has_next_week ? 'opacity-30 cursor-not-allowed' : ''}`}
                    data-testid="next-week-button"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                </CardContent>
              </Card>
              
              {/* Calendar 1 Summary with daily breakdown */}
              <Card className="bg-[#0f1a0f] border-2 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Clock className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between">
                        <p className="text-green-500/60 font-mono text-xs uppercase">
                          {stats.calendars.calendar_1?.name || "Kalender 1"} - Lektionstid
                        </p>
                        <p className="text-green-500/60 font-mono text-xs uppercase">
                          Skoltid
                        </p>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <p className="text-green-400 font-mono text-xl">
                          {formatMinutes(stats.calendars.calendar_1?.total_minutes || 0)}
                        </p>
                        <p className="text-green-400 font-mono text-xl">
                          {formatMinutes(stats.calendars.calendar_1?.school_time_minutes || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <DailyBreakdown daily={stats.calendars.calendar_1?.daily} showTimes={true} />
                </CardContent>
              </Card>
              
              {/* Calendar 2 Summary with daily breakdown */}
              <Card className="bg-[#0f1a0f] border-2 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Clock className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between">
                        <p className="text-green-500/60 font-mono text-xs uppercase">
                          {stats.calendars.calendar_2?.name || "Kalender 2"} - Lektionstid
                        </p>
                        <p className="text-green-500/60 font-mono text-xs uppercase">
                          Skoltid
                        </p>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <p className="text-green-400 font-mono text-xl">
                          {formatMinutes(stats.calendars.calendar_2?.total_minutes || 0)}
                        </p>
                        <p className="text-green-400 font-mono text-xl">
                          {formatMinutes(stats.calendars.calendar_2?.school_time_minutes || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <DailyBreakdown daily={stats.calendars.calendar_2?.daily} showTimes={true} />
                </CardContent>
              </Card>
            </div>

            {/* Calendar Stats with Events */}
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
        ) : null}
      </div>
    </div>
  );
}

export default Stats;
