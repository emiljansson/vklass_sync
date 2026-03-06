/**
 * Dashboard event utilities
 */

export const isEventPast = (startDate, eventTime) => {
  if (!startDate) return false;
  try {
    const eventDate = new Date(startDate);
    const now = new Date();
    
    // Use event_time field if available
    if (eventTime) {
      const [hours, minutes] = eventTime.split(':').map(Number);
      eventDate.setHours(hours, minutes, 0, 0);
      // Add 40 minutes
      const eventPlusFortyMin = new Date(eventDate.getTime() + 40 * 60 * 1000);
      return now >= eventPlusFortyMin;
    }
    
    // If event has time component in start field
    if (startDate.includes('T') || startDate.includes(':')) {
      const eventPlusFortyMin = new Date(eventDate.getTime() + 40 * 60 * 1000);
      return now >= eventPlusFortyMin;
    }
    
    // For date-only events, check if the day has passed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  } catch {
    return false;
  }
};

export const getStatusStyles = (status, start, eventTime) => {
  if (isEventPast(start, eventTime) && status !== 'removed') {
    return 'event-card-past';
  }
  switch (status) {
    case 'new':
      return 'event-card-new';
    case 'removed':
      return 'event-card-removed';
    default:
      return 'bg-[#141e14] border-green-900/50 hover:border-green-500/50';
  }
};
