/**
 * Sound settings component
 */
import { Volume2, VolumeX } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { SettingsCard } from "./SettingsCard";

export const SoundSettings = ({ formData, onChange }) => {
  return (
    <SettingsCard
      icon={formData.sound_enabled ? Volume2 : VolumeX}
      title="Ljudeffekter"
      description="Kontrollera ljudeffekter för screen flicker"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="sound_enabled" className="text-green-400">Ljud på/av</Label>
          <p className="text-sm text-green-500/60">Aktivera elektriska ljudeffekter</p>
        </div>
        <Switch
          id="sound_enabled"
          data-testid="sound-enabled-switch"
          checked={formData.sound_enabled}
          onCheckedChange={(checked) => onChange('sound_enabled', checked)}
        />
      </div>
      
      {formData.sound_enabled && (
        <>
          <Separator className="bg-green-500/20" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="sound_volume" className="text-green-400">Volym</Label>
              <span className="text-sm text-green-500/60">{formData.sound_volume}%</span>
            </div>
            <Slider
              id="sound_volume"
              data-testid="sound-volume-slider"
              value={[formData.sound_volume]}
              onValueChange={(value) => onChange('sound_volume', value[0])}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
          </div>
        </>
      )}
    </SettingsCard>
  );
};
