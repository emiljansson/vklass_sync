/**
 * Auth/password settings component
 */
import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { SettingsCard, inputStyles } from "./SettingsCard";

export const AuthSettings = ({ formData, onChange }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SettingsCard
      icon={Lock}
      title="Lösenordsskydd"
      description="Aktivera för att kräva lösenord för att komma åt inställningar"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="auth_enabled" className="text-green-400">Aktivera lösenordsskydd</Label>
          <p className="text-sm text-green-500/60">Kräv lösenord för att ändra inställningar</p>
        </div>
        <Switch
          id="auth_enabled"
          data-testid="auth-enabled-switch"
          checked={formData.auth_enabled}
          onCheckedChange={(checked) => onChange('auth_enabled', checked)}
        />
      </div>
      
      {formData.auth_enabled && (
        <>
          <Separator className="bg-green-500/20" />
          <div className="space-y-2">
            <Label htmlFor="auth_password" className="text-green-400">Lösenord</Label>
            <div className="relative">
              <Input
                id="auth_password"
                data-testid="auth-password-input"
                type={showPassword ? "text" : "password"}
                value={formData.auth_password}
                onChange={(e) => onChange('auth_password', e.target.value)}
                placeholder="Ange lösenord"
                className={`pr-10 ${inputStyles}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full text-green-400 hover:bg-green-500/10"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </>
      )}
    </SettingsCard>
  );
};
