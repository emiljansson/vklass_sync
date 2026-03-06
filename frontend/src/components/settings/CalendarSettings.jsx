/**
 * Calendar settings component (URL and name)
 */
import { Link as LinkIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SettingsCard, inputStyles } from "./SettingsCard";

export const CalendarSettings = ({ 
  calendarNumber, 
  nameValue, 
  urlValue, 
  onNameChange, 
  onUrlChange 
}) => {
  const nameId = `calendar_name_${calendarNumber}`;
  const urlId = `ical_url_${calendarNumber}`;
  
  return (
    <SettingsCard
      icon={LinkIcon}
      title={`Kalender ${calendarNumber}`}
      description={`Konfigurera kalender ${calendarNumber}s iCal-länk och namn`}
    >
      <div className="space-y-2">
        <Label htmlFor={nameId} className="text-green-400">Kalendernamn</Label>
        <Input
          id={nameId}
          data-testid={`calendar-name-${calendarNumber}-input`}
          value={nameValue}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={calendarNumber === 1 ? "T.ex. Arbete" : "T.ex. Privat"}
          className={inputStyles}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={urlId} className="text-green-400">iCal URL</Label>
        <Input
          id={urlId}
          data-testid={`ical-url-${calendarNumber}-input`}
          type="url"
          value={urlValue}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://calendar.google.com/calendar/ical/..."
          className={inputStyles}
        />
      </div>
    </SettingsCard>
  );
};
