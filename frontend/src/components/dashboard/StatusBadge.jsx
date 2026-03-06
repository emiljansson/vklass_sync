/**
 * Status badge component
 */
import { Badge } from "@/components/ui/badge";
import { isEventPast } from "./utils";

export const getStatusBadge = (status, start, eventTime) => {
  if (isEventPast(start, eventTime) && status !== 'removed') {
    return <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase text-xs tracking-wider">Utfört</Badge>;
  }
  switch (status) {
    case 'new':
      return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase text-xs tracking-wider">Nytt</Badge>;
    case 'removed':
      return <Badge className="bg-gray-500/20 text-gray-400 border border-gray-500/30 uppercase text-xs tracking-wider">Borttagen</Badge>;
    default:
      return null;
  }
};
