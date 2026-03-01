import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Link as LinkIcon, Bell, Clock, Lock, Eye, EyeOff, Send, Volume2, VolumeX, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const Settings = ({ settings, onUpdateSettings }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    ical_url_1: "",
    ical_url_2: "",
    calendar_name_1: "Kalender 1",
    calendar_name_2: "Kalender 2",
    sync_interval: 15,
    webpushr_key: "",
    webpushr_auth_token: "",
    auth_enabled: false,
    auth_password: "",
    sound_enabled: true,
    sound_volume: 50,
    screen_wake_lock: false
  });
  const [saving, setSaving] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showWebpushrKey, setShowWebpushrKey] = useState(false);
  const [showWebpushrToken, setShowWebpushrToken] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        ical_url_1: settings.ical_url_1 || "",
        ical_url_2: settings.ical_url_2 || "",
        calendar_name_1: settings.calendar_name_1 || "Kalender 1",
        calendar_name_2: settings.calendar_name_2 || "Kalender 2",
        sync_interval: settings.sync_interval || 15,
        webpushr_key: settings.webpushr_key || "",
        webpushr_auth_token: settings.webpushr_auth_token || "",
        auth_enabled: settings.auth_enabled || false,
        auth_password: settings.auth_password || "",
        sound_enabled: settings.sound_enabled !== undefined ? settings.sound_enabled : true,
        sound_volume: settings.sound_volume !== undefined ? settings.sound_volume : 50,
        screen_wake_lock: settings.screen_wake_lock || false
      });
    }
  }, [settings]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onUpdateSettings(formData);
    setSaving(false);
  };

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

  const intervalOptions = [
    { value: 5, label: "5 minuter" },
    { value: 15, label: "15 minuter" },
    { value: 30, label: "30 minuter" },
    { value: 60, label: "1 timme" }
  ];
  
  // Get interval label helper
  const getIntervalLabel = () => {
    const interval = formData.sync_interval;
    const option = intervalOptions.find(opt => opt.value === interval);
    return option ? option.label : "Välj intervall";
  };

  return (
    <div className="min-h-screen bg-[#0a0f0a] fallout-scanlines">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0f0a]/95 backdrop-blur-sm border-b border-green-500/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button
                data-testid="back-button"
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="text-green-400 hover:bg-green-500/10 hover:text-green-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-bold text-green-400 pip-glow tracking-tight">INSTÄLLNINGAR</h1>
            </div>
            
            <Button
              data-testid="save-settings-button"
              onClick={handleSubmit}
              disabled={saving}
              className="gap-2 bg-green-600 hover:bg-green-500 text-black font-bold"
            >
              <Save className="w-4 h-4" />
              {saving ? 'SPARAR...' : 'SPARA'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sound Settings */}
          <Card className="bg-[#141e14] border-2 border-green-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                {formData.sound_enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                Ljudeffekter
              </CardTitle>
              <CardDescription className="text-green-500/60">Kontrollera ljudeffekter för screen flicker</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound_enabled" className="text-green-400">Ljud på/av</Label>
                  <p className="text-sm text-green-500/60">Aktivera elektriska ljudeffekter</p>
                </div>
                <Switch
                  id="sound_enabled"
                  data-testid="sound-enabled-switch"
                  checked={formData.sound_enabled}
                  onCheckedChange={(checked) => handleChange('sound_enabled', checked)}
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
                      onValueChange={(value) => handleChange('sound_volume', value[0])}
                      max={100}
                      min={0}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Screen Wake Lock Settings */}
          <Card className="bg-[#141e14] border-2 border-green-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <Monitor className="w-5 h-5" />
                Skärm
              </CardTitle>
              <CardDescription className="text-green-500/60">Förhindra att skärmen släcks automatiskt</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="screen_wake_lock" className="text-green-400">Håll skärmen vaken</Label>
                  <p className="text-sm text-green-500/60">Förhindrar att skärmen går i viloläge</p>
                </div>
                <Switch
                  id="screen_wake_lock"
                  data-testid="screen-wake-lock-switch"
                  checked={formData.screen_wake_lock}
                  onCheckedChange={(checked) => handleChange('screen_wake_lock', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Calendar 1 Settings */}
          <Card className="bg-[#141e14] border-2 border-green-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <LinkIcon className="w-5 h-5" />
                Kalender 1
              </CardTitle>
              <CardDescription className="text-green-500/60">Konfigurera första kalenderns iCal-länk och namn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="calendar_name_1" className="text-green-400">Kalendernamn</Label>
                <Input
                  id="calendar_name_1"
                  data-testid="calendar-name-1-input"
                  value={formData.calendar_name_1}
                  onChange={(e) => handleChange('calendar_name_1', e.target.value)}
                  placeholder="T.ex. Arbete"
                  className="bg-[#0a0f0a] border-green-500/40 text-green-400 placeholder:text-green-500/40 focus:border-green-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ical_url_1" className="text-green-400">iCal URL</Label>
                <Input
                  id="ical_url_1"
                  data-testid="ical-url-1-input"
                  type="url"
                  value={formData.ical_url_1}
                  onChange={(e) => handleChange('ical_url_1', e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  className="bg-[#0a0f0a] border-green-500/40 text-green-400 placeholder:text-green-500/40 focus:border-green-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Calendar 2 Settings */}
          <Card className="bg-[#141e14] border-2 border-green-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <LinkIcon className="w-5 h-5" />
                Kalender 2
              </CardTitle>
              <CardDescription className="text-green-500/60">Konfigurera andra kalenderns iCal-länk och namn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="calendar_name_2" className="text-green-400">Kalendernamn</Label>
                <Input
                  id="calendar_name_2"
                  data-testid="calendar-name-2-input"
                  value={formData.calendar_name_2}
                  onChange={(e) => handleChange('calendar_name_2', e.target.value)}
                  placeholder="T.ex. Privat"
                  className="bg-[#0a0f0a] border-green-500/40 text-green-400 placeholder:text-green-500/40 focus:border-green-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ical_url_2" className="text-green-400">iCal URL</Label>
                <Input
                  id="ical_url_2"
                  data-testid="ical-url-2-input"
                  type="url"
                  value={formData.ical_url_2}
                  onChange={(e) => handleChange('ical_url_2', e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  className="bg-[#0a0f0a] border-green-500/40 text-green-400 placeholder:text-green-500/40 focus:border-green-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sync Settings */}
          <Card className="bg-[#141e14] border-2 border-green-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <Clock className="w-5 h-5" />
                Synkronisering
              </CardTitle>
              <CardDescription className="text-green-500/60">Hur ofta ska kalendrarna uppdateras</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="sync_interval" className="text-green-400">Uppdateringsintervall</Label>
                <Select
                  value={formData.sync_interval ? String(formData.sync_interval) : "15"}
                  onValueChange={(value) => handleChange('sync_interval', parseInt(value))}
                >
                  <SelectTrigger data-testid="sync-interval-select" className="bg-[#0a0f0a] border-green-500/40 text-green-400">
                    <SelectValue>
                      {getIntervalLabel()}
                    </SelectValue>
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
            </CardContent>
          </Card>

          {/* Webpushr Settings */}
          <Card className="bg-[#141e14] border-2 border-green-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <Bell className="w-5 h-5" />
                Push-notifikationer (Webpushr)
              </CardTitle>
              <CardDescription className="text-green-500/60">
                Konfigurera Webpushr för att få push-notifikationer vid ändringar.{" "}
                <a 
                  href="https://www.webpushr.com/docs/introduction-to-rest-api" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-green-400 hover:underline"
                >
                  Hämta API-nycklar här
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webpushr_key" className="text-green-400">Webpushr API Key</Label>
                <div className="relative">
                  <Input
                    id="webpushr_key"
                    data-testid="webpushr-key-input"
                    type={showWebpushrKey ? "text" : "password"}
                    value={formData.webpushr_key}
                    onChange={(e) => handleChange('webpushr_key', e.target.value)}
                    placeholder="Din webpushrKey"
                    className="pr-10 bg-[#0a0f0a] border-green-500/40 text-green-400 placeholder:text-green-500/40 focus:border-green-400"
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
                    onChange={(e) => handleChange('webpushr_auth_token', e.target.value)}
                    placeholder="Din webpushrAuthToken"
                    className="pr-10 bg-[#0a0f0a] border-green-500/40 text-green-400 placeholder:text-green-500/40 focus:border-green-400"
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
              <Separator className="bg-green-500/20" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-green-400">Testa push-notifikation</Label>
                  <p className="text-sm text-green-500/60">Skicka en testnotifikation för att verifiera inställningarna</p>
                </div>
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
              </div>
            </CardContent>
          </Card>

          {/* Auth Settings */}
          <Card className="bg-[#141e14] border-2 border-green-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <Lock className="w-5 h-5" />
                Lösenordsskydd
              </CardTitle>
              <CardDescription className="text-green-500/60">Aktivera för att kräva lösenord för att komma åt inställningar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auth_enabled" className="text-green-400">Aktivera lösenordsskydd</Label>
                  <p className="text-sm text-green-500/60">Kräv lösenord för att ändra inställningar</p>
                </div>
                <Switch
                  id="auth_enabled"
                  data-testid="auth-enabled-switch"
                  checked={formData.auth_enabled}
                  onCheckedChange={(checked) => handleChange('auth_enabled', checked)}
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
                        onChange={(e) => handleChange('auth_password', e.target.value)}
                        placeholder="Ange lösenord"
                        className="pr-10 bg-[#0a0f0a] border-green-500/40 text-green-400 placeholder:text-green-500/40 focus:border-green-400"
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
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
};
