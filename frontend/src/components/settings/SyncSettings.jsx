/**
 * Sync interval settings component
 */
import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsCard } from "./SettingsCard";

const intervalOptions = [
  { value: 3, label: "3 minuter" },
  { value: 15, label: "15 minuter" },
  { value: 30, label: "30 minuter" },
  { value: 60, label: "1 timme" }
];

export const SyncSettings = ({ formData, onChange }) => {
  return (
    <SettingsCard
      icon={Clock}
      title="Synkronisering"
      description="Hur ofta ska kalendrarna uppdateras"
    >
      <div className="space-y-2">
        <Label htmlFor="sync_interval" className="text-green-400">Uppdateringsintervall</Label>
        <Select
          key={formData.sync_interval}
          defaultValue={String(formData.sync_interval)}
          onValueChange={(value) => onChange('sync_interval', parseInt(value))}
        >
          <SelectTrigger data-testid="sync-interval-select" className="bg-[#0a0f0a] border-green-500/40 text-green-400">
            <SelectValue placeholder="Välj intervall" />
          </SelectTrigger>
          <SelectContent className="bg-[#141e14] border-green-500/40">
            {intervalOptions.map(option => (
              <SelectItem key={option.value} value={String(option.value)} className="text-green-400 focus:bg-green-500/20 focus:text-green-300">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </SettingsCard>
  );
};
