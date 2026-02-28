import { useState, useEffect } from "react";
import { ArrowLeft, Save, Link as LinkIcon, Bell, Clock, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export const Settings = ({ settings, onUpdateSettings, onBack }) => {
  const [formData, setFormData] = useState({
    ical_url_1: "",
    ical_url_2: "",
    calendar_name_1: "Kalender 1",
    calendar_name_2: "Kalender 2",
    sync_interval: 15,
    webpushr_key: "",
    webpushr_auth_token: "",
    auth_enabled: false,
    auth_password: ""
  });
  const [saving, setSaving] = useState(false);
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
        auth_password: settings.auth_password || ""
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

  const intervalOptions = [
    { value: 5, label: "5 minuter" },
    { value: 15, label: "15 minuter" },
    { value: 30, label: "30 minuter" },
    { value: 60, label: "1 timme" }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button
                data-testid="back-button"
                variant="ghost"
                size="icon"
                onClick={onBack}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Inställningar</h1>
            </div>
            
            <Button
              data-testid="save-settings-button"
              onClick={handleSubmit}
              disabled={saving}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sparar...' : 'Spara'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Calendar 1 Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Kalender 1
              </CardTitle>
              <CardDescription>Konfigurera första kalenderns iCal-länk och namn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="calendar_name_1">Kalendernamn</Label>
                <Input
                  id="calendar_name_1"
                  data-testid="calendar-name-1-input"
                  value={formData.calendar_name_1}
                  onChange={(e) => handleChange('calendar_name_1', e.target.value)}
                  placeholder="T.ex. Arbete"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ical_url_1">iCal URL</Label>
                <Input
                  id="ical_url_1"
                  data-testid="ical-url-1-input"
                  type="url"
                  value={formData.ical_url_1}
                  onChange={(e) => handleChange('ical_url_1', e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Calendar 2 Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Kalender 2
              </CardTitle>
              <CardDescription>Konfigurera andra kalenderns iCal-länk och namn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="calendar_name_2">Kalendernamn</Label>
                <Input
                  id="calendar_name_2"
                  data-testid="calendar-name-2-input"
                  value={formData.calendar_name_2}
                  onChange={(e) => handleChange('calendar_name_2', e.target.value)}
                  placeholder="T.ex. Privat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ical_url_2">iCal URL</Label>
                <Input
                  id="ical_url_2"
                  data-testid="ical-url-2-input"
                  type="url"
                  value={formData.ical_url_2}
                  onChange={(e) => handleChange('ical_url_2', e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Sync Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Synkronisering
              </CardTitle>
              <CardDescription>Hur ofta ska kalendrarna uppdateras</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="sync_interval">Uppdateringsintervall</Label>
                <Select
                  value={String(formData.sync_interval)}
                  onValueChange={(value) => handleChange('sync_interval', parseInt(value))}
                >
                  <SelectTrigger data-testid="sync-interval-select">
                    <SelectValue placeholder="Välj intervall" />
                  </SelectTrigger>
                  <SelectContent>
                    {intervalOptions.map(option => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Webpushr Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Push-notifikationer (Webpushr)
              </CardTitle>
              <CardDescription>
                Konfigurera Webpushr för att få push-notifikationer vid ändringar.{" "}
                <a 
                  href="https://www.webpushr.com/docs/introduction-to-rest-api" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Hämta API-nycklar här
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webpushr_key">Webpushr API Key</Label>
                <div className="relative">
                  <Input
                    id="webpushr_key"
                    data-testid="webpushr-key-input"
                    type={showWebpushrKey ? "text" : "password"}
                    value={formData.webpushr_key}
                    onChange={(e) => handleChange('webpushr_key', e.target.value)}
                    placeholder="Din webpushrKey"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowWebpushrKey(!showWebpushrKey)}
                  >
                    {showWebpushrKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="webpushr_auth_token">Webpushr Auth Token</Label>
                <div className="relative">
                  <Input
                    id="webpushr_auth_token"
                    data-testid="webpushr-token-input"
                    type={showWebpushrToken ? "text" : "password"}
                    value={formData.webpushr_auth_token}
                    onChange={(e) => handleChange('webpushr_auth_token', e.target.value)}
                    placeholder="Din webpushrAuthToken"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowWebpushrToken(!showWebpushrToken)}
                  >
                    {showWebpushrToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auth Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Lösenordsskydd
              </CardTitle>
              <CardDescription>Aktivera för att kräva lösenord för att komma åt appen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auth_enabled">Aktivera lösenordsskydd</Label>
                  <p className="text-sm text-slate-500">Kräv lösenord vid inloggning</p>
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
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="auth_password">Lösenord</Label>
                    <div className="relative">
                      <Input
                        id="auth_password"
                        data-testid="auth-password-input"
                        type={showPassword ? "text" : "password"}
                        value={formData.auth_password}
                        onChange={(e) => handleChange('auth_password', e.target.value)}
                        placeholder="Ange lösenord"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
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
