// Stats utility functions and constants

export const CHART_COLORS = [
  "#22c55e", // green-500
  "#4ade80", // green-400
  "#86efac", // green-300
  "#16a34a", // green-600
  "#15803d", // green-700
  "#a3e635", // lime-400
  "#84cc16", // lime-500
  "#65a30d", // lime-600
];

export const formatMinutes = (minutes) => {
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
