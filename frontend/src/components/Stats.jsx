import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, BarChart3, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  LabelList
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

const CalendarStats = ({ name, subjects, totalMinutes, colorOffset = 0 }) => {
  const chartData = subjects.map((s, index) => {
    const percent = totalMinutes > 0 ? Math.round((s.minutes / totalMinutes) * 100) : 0;
    const timeStr = formatMinutes(s.minutes);
    return {
      name: s.name || "Okänt ämne",
      minutes: s.minutes,
      percent: percent,
      label: `${timeStr} (${percent}%)`,
      fill: CHART_COLORS[(index + colorOffset) % CHART_COLORS.length]
    };
  });

  if (subjects.length === 0) {
    return (
      <Card className="bg-[#0f1a0f] border-2 border-green-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-green-400 font-mono text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-500/60 font-mono text-center py-8">
            Inga events denna vecka
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate dynamic height based on number of subjects (40px per bar minimum)
  const chartHeight = Math.max(300, chartData.length * 45);

  return (
    <Card className="bg-[#0f1a0f] border-2 border-green-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-green-400 font-mono text-lg flex items-center gap-2 justify-between">
          <span className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {name}, Ämnen: {subjects.length}st
          </span>
          <span className="text-green-300 text-base">
            Totalt: {formatMinutes(totalMinutes)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Bar Chart with labels on bars */}
        <div style={{ height: `${chartHeight}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(34, 197, 94, 0.2)"
                horizontal={true}
                vertical={false}
              />
              <XAxis 
                type="number" 
                stroke="#22c55e"
                tick={{ fill: "#22c55e", fontSize: 12 }}
                tickFormatter={(value) => `${Math.floor(value / 60)}h`}
                hide
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={180}
                stroke="#22c55e"
                tick={{ fill: "#4ade80", fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="minutes" 
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
                barSize={28}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList 
                  dataKey="label" 
                  position="right" 
                  fill="#4ade80" 
                  fontSize={12}
                  style={{ fontFamily: 'Share Tech Mono, monospace' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
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
                onClick={fetchStats}
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
              {/* Week Navigation - replaces Total Tid */}
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
              
              <Card className="bg-[#0f1a0f] border-2 border-green-500/30">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <BookOpen className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-green-500/60 font-mono text-xs uppercase">
                      {stats.calendars.calendar_1?.name || "Kalender 1"}
                    </p>
                    <p className="text-green-400 font-mono text-xl">
                      {formatMinutes(stats.calendars.calendar_1?.total_minutes || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-[#0f1a0f] border-2 border-green-500/30">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <BookOpen className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-green-500/60 font-mono text-xs uppercase">
                      {stats.calendars.calendar_2?.name || "Kalender 2"}
                    </p>
                    <p className="text-green-400 font-mono text-xl">
                      {formatMinutes(stats.calendars.calendar_2?.total_minutes || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calendar Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CalendarStats
                name={stats.calendars.calendar_1?.name || "Kalender 1"}
                subjects={stats.calendars.calendar_1?.subjects || []}
                totalMinutes={stats.calendars.calendar_1?.total_minutes || 0}
                colorOffset={0}
              />
              <CalendarStats
                name={stats.calendars.calendar_2?.name || "Kalender 2"}
                subjects={stats.calendars.calendar_2?.subjects || []}
                totalMinutes={stats.calendars.calendar_2?.total_minutes || 0}
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
