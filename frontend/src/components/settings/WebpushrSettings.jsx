/**
 * Webpushr notification settings component
 */
import { useState } from "react";
import { Bell, Eye, EyeOff, Send, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { SettingsCard, inputStyles, API } from "./SettingsCard";
import axios from "axios";

export const WebpushrSettings = ({ formData, onChange, originalTestUserId, onSave, saving }) => {
  const [showWebpushrKey, setShowWebpushrKey] = useState(false);
  const [showWebpushrToken, setShowWebpushrToken] = useState(false);
  const [testingPush, setTestingPush] = useState(false);

  const handleTestPush = async () => {
    setTestingPush(true);
    try {
      const response = await axios.post(`${API}/test-push`);
      if (response.data.success) {
        toast.success("Test-notifikation skickad!", { duration: 3000 });
      } else {
        toast.error(response.data.message || "Kunde inte skicka notifikation", { duration: 3000 });
      }
    } catch (e) {
      console.error("Error testing push:", e);
      toast.error("Fel vid test av push-notifikation. Kontrollera API-nycklar.", { duration: 3000 });
    } finally {
      setTestingPush(false);
    }
  };

  return (
    <SettingsCard
      icon={Bell}
      title="Push-notifikationer (Webpushr)"
      description={
        <>
          Konfigurera Webpushr för att få push-notifikationer vid ändringar.{" "}
          <a 
            href="https://www.webpushr.com/docs/introduction-to-rest-api" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-green-400 hover:underline"
          >
            Hämta API-nycklar här
          </a>
        </>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="webpushr_key" className="text-green-400">Webpushr API Key</Label>
        <div className="relative">
          <Input
            id="webpushr_key"
            data-testid="webpushr-key-input"
            type={showWebpushrKey ? "text" : "password"}
            value={formData.webpushr_key}
            onChange={(e) => onChange('webpushr_key', e.target.value)}
            placeholder="Din webpushrKey"
            className={`pr-10 ${inputStyles}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full text-green-400 hover:bg-green-500/10"
            onClick={() => setShowWebpushrKey(!showWebpushrKey)}
          >
            {showWebpushrKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="webpushr_auth_token" className="text-green-400">Webpushr Auth Token</Label>
        <div className="relative">
          <Input
            id="webpushr_auth_token"
            data-testid="webpushr-token-input"
            type={showWebpushrToken ? "text" : "password"}
            value={formData.webpushr_auth_token}
            onChange={(e) => onChange('webpushr_auth_token', e.target.value)}
            placeholder="Din webpushrAuthToken"
            className={`pr-10 ${inputStyles}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full text-green-400 hover:bg-green-500/10"
            onClick={() => setShowWebpushrToken(!showWebpushrToken)}
          >
            {showWebpushrToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="webpushr_test_user_id" className="text-green-400">Test User ID (valfritt) 197920509</Label>
        <Input
          id="webpushr_test_user_id"
          value={formData.webpushr_test_user_id}
          onChange={(e) => onChange('webpushr_test_user_id', e.target.value)}
          placeholder="Lämna tomt för att skicka till alla"
          className={inputStyles}
        />
        <p className="text-xs text-green-500/60">Om satt skickas notiser bara till denna användare</p>
      </div>
      
      <Separator className="bg-green-500/20" />
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-green-400">Testa push-notifikation</Label>
          <p className="text-sm text-green-500/60">Skicka en testnotifikation för att verifiera inställningarna</p>
        </div>
        {formData.webpushr_test_user_id !== originalTestUserId ? (
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="gap-2 bg-amber-600 hover:bg-amber-500 text-black font-bold"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sparar...' : 'Spara först'}
          </Button>
        ) : (
          <Button
            type="button"
            data-testid="test-push-button"
            variant="outline"
            onClick={handleTestPush}
            disabled={testingPush || !formData.webpushr_key || !formData.webpushr_auth_token}
            className="gap-2 border-green-500/40 text-green-400 hover:bg-green-500/10 hover:text-green-300"
          >
            <Send className="w-4 h-4" />
            {testingPush ? 'Skickar...' : 'Testa'}
          </Button>
        )}
      </div>
    </SettingsCard>
  );
};
