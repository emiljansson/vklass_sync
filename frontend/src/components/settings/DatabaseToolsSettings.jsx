/**
 * Database tools settings component
 */
import { useState } from "react";
import { Database, FileText, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { SettingsCard, API } from "./SettingsCard";
import axios from "axios";

export const DatabaseToolsSettings = () => {
  const [extractingTimes, setExtractingTimes] = useState(false);

  const handleExtractEventTimes = async () => {
    setExtractingTimes(true);
    try {
      const response = await axios.post(`${API}/migrate/extract-event-times`);
      if (response.data.success) {
        toast.success(`${response.data.message}`, { duration: 3000 });
      } else {
        toast.error("Extraktion misslyckades", { duration: 3000 });
      }
    } catch (e) {
      console.error("Error extracting event times:", e);
      toast.error("Fel vid extraktion av tider", { duration: 3000 });
    } finally {
      setExtractingTimes(false);
    }
  };

  const handleFixSwedishDates = async () => {
    try {
      const response = await axios.post(`${API}/migrate/fix-swedish-dates`);
      if (response.data.success) {
        toast.success(response.data.message, { duration: 3000 });
      }
    } catch (e) {
      toast.error("Fel vid konvertering", { duration: 3000 });
    }
  };

  const handleDeleteRemovedEvents = async () => {
    if (!window.confirm('Radera alla borttagna events permanent?')) return;
    try {
      const response = await axios.delete(`${API}/events/removed`);
      if (response.data.success) {
        toast.success(response.data.message, { duration: 3000 });
      }
    } catch (e) {
      toast.error("Fel vid radering", { duration: 3000 });
    }
  };

  return (
    <SettingsCard
      icon={Database}
      title="Databasverktyg"
      description="Underhåll och rensa databasen"
      variant="amber"
    >
      <Button
        type="button"
        variant="outline"
        onClick={handleFixSwedishDates}
        className="w-full justify-start gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
      >
        <FileText className="w-4 h-4" />
        Konvertera datum till svenska
      </Button>
      
      <Button
        type="button"
        variant="outline"
        onClick={handleExtractEventTimes}
        disabled={extractingTimes}
        className="w-full justify-start gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
      >
        <Clock className={`w-4 h-4 ${extractingTimes ? 'animate-pulse' : ''}`} />
        {extractingTimes ? 'Extraherar...' : 'Extrahera event-tider'}
      </Button>
      
      <Button
        type="button"
        variant="outline"
        onClick={handleDeleteRemovedEvents}
        className="w-full justify-start gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
      >
        <Trash2 className="w-4 h-4" />
        Radera borttagna events
      </Button>
    </SettingsCard>
  );
};
