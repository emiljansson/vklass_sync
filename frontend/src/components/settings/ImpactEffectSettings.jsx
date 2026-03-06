/**
 * Impact effect settings component
 */
import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsCard } from "./SettingsCard";

export const ImpactEffectSettings = ({ formData, onChange }) => {
  return (
    <SettingsCard
      icon={Clock}
      title="Impact-effekt"
      description="Visuell effekt när nedräkningen når noll"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="impact_effect_enabled" className="text-green-400">Aktivera Impact-effekt</Label>
          <p className="text-sm text-green-500/60">Störningar, förvrängning och blackout vid 00:00</p>
        </div>
        <Switch
          id="impact_effect_enabled"
          data-testid="impact-effect-switch"
          checked={formData.impact_effect_enabled}
          onCheckedChange={(checked) => onChange('impact_effect_enabled', checked)}
        />
      </div>
    </SettingsCard>
  );
};
