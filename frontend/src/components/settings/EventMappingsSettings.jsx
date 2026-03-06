/**
 * Event mappings settings component (CID/Subject + ID/Type)
 */
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SettingsCard, inputStyles } from "./SettingsCard";

export const EventMappingsSettings = ({ mappings, onChange, onAdd, onRemove }) => {
  const handleMappingChange = (index, field, value) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    onChange(newMappings);
  };

  return (
    <SettingsCard
      icon={BookOpen}
      title="Händelsekopplingar"
      description="Koppla kurs-ID (CID) till ämne och händelse-ID till typ (Läxa/Prov). Upptäcks automatiskt vid synkronisering."
    >
      {/* Header row */}
      <div className="grid grid-cols-[1fr_1.5fr_1fr_1.5fr_auto] gap-2 pb-2 border-b border-green-500/20">
        <Label className="text-green-400 text-sm">CID</Label>
        <Label className="text-green-400 text-sm">Ämne</Label>
        <Label className="text-green-400 text-sm">ID</Label>
        <Label className="text-green-400 text-sm">Läxa/Prov</Label>
        <div className="w-8"></div>
      </div>
      
      {/* Mapping rows */}
      {mappings.map((mapping, index) => (
        <div key={index} className="grid grid-cols-[1fr_1.5fr_1fr_1.5fr_auto] gap-2 items-center">
          <Input
            value={mapping.cid || ""}
            onChange={(e) => handleMappingChange(index, 'cid', e.target.value)}
            placeholder="CID"
            className={`${inputStyles} font-mono text-xs`}
          />
          <Input
            value={mapping.subject || ""}
            onChange={(e) => handleMappingChange(index, 'subject', e.target.value)}
            placeholder="Ämne"
            className={`${inputStyles} text-sm`}
          />
          <Input
            value={mapping.event_id || ""}
            onChange={(e) => handleMappingChange(index, 'event_id', e.target.value)}
            placeholder="ID"
            className={`${inputStyles} font-mono text-xs`}
          />
          <Input
            value={mapping.event_type || ""}
            onChange={(e) => handleMappingChange(index, 'event_type', e.target.value)}
            placeholder="Läxa/Prov"
            className={`${inputStyles} text-sm`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      
      {/* Add row button */}
      <Button
        type="button"
        variant="ghost"
        onClick={onAdd}
        className="w-full border border-dashed border-green-500/30 text-green-500/70 hover:text-green-400 hover:bg-green-500/10 hover:border-green-500/50"
      >
        <Plus className="w-4 h-4 mr-2" />
        Lägg till rad
      </Button>
      
      {mappings.length === 0 && (
        <p className="text-sm text-green-500/50 text-center py-2">
          Inga händelser hittade ännu. Synkronisera kalendrarna för att automatiskt upptäcka händelser.
        </p>
      )}
    </SettingsCard>
  );
};
