import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Link as LinkIcon, Bell, Clock, Lock, Eye, EyeOff, Send, Volume2, VolumeX, Plus, BookOpen, Trash2, Database, RefreshCw, FileText, CalendarPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
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
    impact_effect_enabled: false,
    event_mappings: []
  });
  const [saving, setSaving] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showWebpushrKey, setShowWebpushrKey] = useState(false);
  const [showWebpushrToken, setShowWebpushrToken] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);
  const [loadingDbStatus, setLoadingDbStatus] = useState(false);
  const [migrating, setMigrating] = useState(false);

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
        impact_effect_enabled: settings.impact_effect_enabled || false,
        event_mappings: settings.event_mappings || []
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

  const fetchDbStatus = async () => {
    setLoadingDbStatus(true);
    try {
      const response = await axios.get(`${API}/debug/cid-status`);
      setDbStatus(response.data);
    } catch (e) {
      console.error("Error fetching db status:", e);
      toast.error("Kunde inte hämta databasstatus", { duration: 3000 });
    } finally {
      setLoadingDbStatus(false);
    }
  };

  const handleMigration = async () => {
    setMigrating(true);
    try {
      const response = await axios.post(`${API}/migrate/update-event-urls`);
      if (response.data.success) {
        toast.success(`${response.data.message}`, { duration: 3000 });
        // Refresh db status and settings after migration
        fetchDbStatus();
        // Reload settings to get new CID mappings
        window.location.reload();
      } else {
        toast.error("Migrering misslyckades", { duration: 3000 });
      }
    } catch (e) {
      console.error("Error during migration:", e);
      toast.error("Fel vid migrering", { duration: 3000 });
    } finally {
      setMigrating(false);
    }
  };

  const [extractingTimes, setExtractingTimes] = useState(false);
  
  const handleExtractEventTimes = async () => {
    setExtractingTimes(true);
    try {
      const response = await axios.post(`${API}/migrate/extract-event-times`);
      if (response.data.success) {
        toast.success(`${response.data.message}`, { duration: 3000 });
        fetchDbStatus();
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

  // Event mapping handlers (combined CID/Subject + ID/Type)
  const handleEventMappingChange = (index, field, value) => {
    const newMappings = [...formData.event_mappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setFormData({ ...formData, event_mappings: newMappings });
  };

  const addEventMapping = () => {
    setFormData({
      ...formData,
      event_mappings: [...formData.event_mappings, { cid: "", subject: "", event_id: "", event_type: "" }]
    });
  };

  const removeEventMapping = (index) => {
    const newMappings = formData.event_mappings.filter((_, i) => i !== index);
    setFormData({ ...formData, event_mappings: newMappings });
  };

  const intervalOptions = [
    { value: 3, label: "3 minuter" },
    { value: 15, label: "15 minuter" },
    { value: 30, label: "30 minuter" },
    { value: 60, label: "1 timme" }
  ];

  // Create Event Dialog state
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [newEvent, setNewEvent] = useState({
    calendar_index: 1,
    summary: "",
    description: "",
    location: "",
    start: "",
    event_time: "",
    subject_name: "",
    event_type: "",
    send_push: false
  });

  // Fetch subjects and event types when dialog opens
  const fetchSubjectsAndTypes = async () => {
    try {
      const [subjectsRes, typesRes] = await Promise.all([
        axios.get(`${API}/subjects`),
        axios.get(`${API}/event-types`)
      ]);
      setSubjects(subjectsRes.data.subjects || []);
      setEventTypes(typesRes.data.event_types || []);
    } catch (e) {
      console.error("Error fetching subjects/types:", e);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.summary || !newEvent.start) {
      toast.error("Fyll i titel och datum", { duration: 3000 });
      return;
    }
    
    setCreatingEvent(true);
    try {
      const response = await axios.post(`${API}/events/create`, newEvent);
      if (response.data.success) {
        toast.success(newEvent.send_push ? "Event skapat och push-notis skickad!" : "Event skapat!", { duration: 3000 });
        setShowCreateEvent(false);
        setNewEvent({
          calendar_index: 1,
          summary: "",
          description: "",
          location: "",
          start: "",
          event_time: "",
          subject_name: "",
          event_type: "",
          send_push: false
        });
        // Refresh to show new event
        window.location.reload();
      }
    } catch (e) {
      console.error("Error creating event:", e);
      toast.error("Fel vid skapande av event", { duration: 3000 });
    } finally {
      setCreatingEvent(false);
    }
  };

  // Edit/manage custom events
  const [showEditEvents, setShowEditEvents] = useState(false);
  const [customEvents, setCustomEvents] = useState([]);
  const [loadingCustomEvents, setLoadingCustomEvents] = useState(false);

  const fetchCustomEvents = async () => {
    setLoadingCustomEvents(true);
    try {
      const response = await axios.get(`${API}/events/custom`);
      setCustomEvents(response.data.events || []);
    } catch (e) {
      console.error("Error fetching custom events:", e);
      toast.error("Kunde inte hämta events", { duration: 3000 });
    } finally {
      setLoadingCustomEvents(false);
    }
  };

  const handleDeleteEvent = async (eventId, eventSummary) => {
    if (!window.confirm(`Radera "${eventSummary}"?`)) return;
    
    try {
      const response = await axios.delete(`${API}/events/${eventId}`);
      if (response.data.success) {
        toast.success("Event raderat!", { duration: 3000 });
        setCustomEvents(customEvents.filter(e => e.id !== eventId));
      }
    } catch (e) {
      console.error("Error deleting event:", e);
      toast.error("Fel vid radering", { duration: 3000 });
    }
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
            
            <div className="flex items-center gap-2">
              <Button
                data-testid="create-event-button"
                variant="outline"
                onClick={() => {
                  fetchSubjectsAndTypes();
                  setShowCreateEvent(true);
                }}
                className="gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                title="Nytt event"
              >
                <CalendarPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Nytt event</span>
              </Button>

              <Button
                data-testid="edit-events-button"
                variant="outline"
                onClick={() => {
                  fetchCustomEvents();
                  setShowEditEvents(true);
                }}
                className="gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                title="Editera"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Editera</span>
              </Button>
              
              <Button
                data-testid="save-settings-button"
                onClick={handleSubmit}
                disabled={saving}
                className="gap-2 bg-green-600 hover:bg-green-500 text-black font-bold"
                title="Spara"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">{saving ? 'SPARAR...' : 'SPARA'}</span>
              </Button>
            </div>
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

          {/* Impact Effect Settings */}
          <Card className="bg-[#141e14] border-2 border-green-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <Clock className="w-5 h-5" />
                Impact-effekt
              </CardTitle>
              <CardDescription className="text-green-500/60">Visuell effekt när nedräkningen når noll</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="impact_effect_enabled" className="text-green-400">Aktivera Impact-effekt</Label>
                  <p className="text-sm text-green-500/60">Störningar, förvrängning och blackout vid 00:00</p>
                </div>
                <Switch
                  id="impact_effect_enabled"
                  data-testid="impact-effect-switch"
                  checked={formData.impact_effect_enabled}
                  onCheckedChange={(checked) => handleChange('impact_effect_enabled', checked)}
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
                  key={formData.sync_interval}
                  defaultValue={String(formData.sync_interval)}
                  onValueChange={(value) => handleChange('sync_interval', parseInt(value))}
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
            </CardContent>
          </Card>

          {/* Combined Event Mappings (CID/Subject + ID/Type) */}
          <Card className="bg-[#141e14] border-2 border-green-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <BookOpen className="w-5 h-5" />
                Händelsekopplingar
              </CardTitle>
              <CardDescription className="text-green-500/60">
                Koppla kurs-ID (CID) till ämne och händelse-ID till typ (Läxa/Prov). Upptäcks automatiskt vid synkronisering.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_1.5fr_1fr_1.5fr_auto] gap-2 pb-2 border-b border-green-500/20">
                <Label className="text-green-400 text-sm">CID</Label>
                <Label className="text-green-400 text-sm">Ämne</Label>
                <Label className="text-green-400 text-sm">ID</Label>
                <Label className="text-green-400 text-sm">Läxa/Prov</Label>
                <div className="w-8"></div>
              </div>
              
              {/* Mapping rows */}
              {formData.event_mappings.map((mapping, index) => (
                <div key={index} className="grid grid-cols-[1fr_1.5fr_1fr_1.5fr_auto] gap-2 items-center">
                  <Input
                    value={mapping.cid || ""}
                    onChange={(e) => handleEventMappingChange(index, 'cid', e.target.value)}
                    placeholder="CID"
                    className="bg-[#0a0f0a] border-green-500/40 text-green-400 placeholder:text-green-500/40 font-mono text-xs"
                  />
                  <Input
                    value={mapping.subject || ""}
                    onChange={(e) => handleEventMappingChange(index, 'subject', e.target.value)}
                    placeholder="Ämne"
                    className="bg-[#0a0f0a] border-green-500/40 text-green-400 placeholder:text-green-500/40 text-sm"
                  />
                  <Input
                    value={mapping.event_id || ""}
                    onChange={(e) => handleEventMappingChange(index, 'event_id', e.target.value)}
                    placeholder="ID"
                    className="bg-[#0a0f0a] border-green-500/40 text-green-400 placeholder:text-green-500/40 font-mono text-xs"
                  />
                  <Input
                    value={mapping.event_type || ""}
                    onChange={(e) => handleEventMappingChange(index, 'event_type', e.target.value)}
                    placeholder="Läxa/Prov"
                    className="bg-[#0a0f0a] border-green-500/40 text-green-400 placeholder:text-green-500/40 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEventMapping(index)}
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
                onClick={addEventMapping}
                className="w-full border border-dashed border-green-500/30 text-green-500/70 hover:text-green-400 hover:bg-green-500/10 hover:border-green-500/50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Lägg till rad
              </Button>
              
              {formData.event_mappings.length === 0 && (
                <p className="text-sm text-green-500/50 text-center py-2">
                  Inga händelser hittade ännu. Synkronisera kalendrarna för att automatiskt upptäcka händelser.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Database Status & Migration */}
          <Card className="bg-[#141e14] border-2 border-amber-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <Database className="w-5 h-5" />
                Databasverktyg
              </CardTitle>
              <CardDescription className="text-amber-500/60">
                Underhåll och rensa databasen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Fix Swedish dates */}
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await axios.post(`${API}/migrate/fix-swedish-dates`);
                    if (response.data.success) {
                      toast.success(response.data.message, { duration: 3000 });
                    }
                  } catch (e) {
                    toast.error("Fel vid konvertering", { duration: 3000 });
                  }
                }}
                className="w-full justify-start gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <FileText className="w-4 h-4" />
                Konvertera datum till svenska
              </Button>
              
              {/* Extract event times */}
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
              
              {/* Delete removed events */}
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (!window.confirm('Radera alla borttagna events permanent?')) return;
                  try {
                    const response = await axios.delete(`${API}/events/removed`);
                    if (response.data.success) {
                      toast.success(response.data.message, { duration: 3000 });
                    }
                  } catch (e) {
                    toast.error("Fel vid radering", { duration: 3000 });
                  }
                }}
                className="w-full justify-start gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
                Radera borttagna events
              </Button>
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

      {/* Create Event Dialog */}
      <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
        <DialogContent className="bg-[#0a0f0a] border-green-500/30 text-green-400 w-[90vw] max-w-sm mx-auto p-4">
          <DialogHeader>
            <DialogTitle className="text-green-400 flex items-center gap-2">
              <CalendarPlus className="w-5 h-5" />
              Skapa nytt event
            </DialogTitle>
            <DialogDescription className="text-green-500/70">
              Lägg till ett eget event i kalendern
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-3">
            {/* Calendar selection */}
            <div className="space-y-2">
              <Label className="text-green-400">Kalender</Label>
              <Select 
                value={String(newEvent.calendar_index)} 
                onValueChange={(v) => setNewEvent({...newEvent, calendar_index: parseInt(v)})}
              >
                <SelectTrigger className="bg-[#141e14] border-green-500/30 text-green-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#141e14] border-green-500/30">
                  <SelectItem value="1" className="text-green-400">{formData.calendar_name_1 || 'Kalender 1'}</SelectItem>
                  <SelectItem value="2" className="text-green-400">{formData.calendar_name_2 || 'Kalender 2'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label className="text-green-400">Titel *</Label>
              <Input
                value={newEvent.summary}
                onChange={(e) => setNewEvent({...newEvent, summary: e.target.value})}
                placeholder="T.ex. Matteprov kapitel 5"
                className="bg-[#141e14] border-green-500/30 text-green-400 placeholder:text-green-600/50"
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-green-400">Datum *</Label>
                <Input
                  type="date"
                  value={newEvent.start}
                  onChange={(e) => setNewEvent({...newEvent, start: e.target.value})}
                  className="bg-[#141e14] border-green-500/30 text-green-400"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-green-400">Tid</Label>
                <Input
                  type="time"
                  value={newEvent.event_time}
                  onChange={(e) => setNewEvent({...newEvent, event_time: e.target.value})}
                  className="bg-[#141e14] border-green-500/30 text-green-400"
                />
              </div>
            </div>

            {/* Subject dropdown */}
            <div className="space-y-2">
              <Label className="text-green-400">Ämne</Label>
              <Select 
                value={newEvent.subject_name || "none"} 
                onValueChange={(v) => setNewEvent({...newEvent, subject_name: v === "none" ? "" : v})}
              >
                <SelectTrigger className="bg-[#141e14] border-green-500/30 text-green-400">
                  <SelectValue placeholder="Välj ämne..." />
                </SelectTrigger>
                <SelectContent className="bg-[#141e14] border-green-500/30">
                  <SelectItem value="none" className="text-green-500/50">Inget ämne</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject} className="text-green-400">
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event type radio buttons */}
            <div className="space-y-2">
              <Label className="text-green-400">Typ</Label>
              <RadioGroup
                value={newEvent.event_type || ""}
                onValueChange={(v) => setNewEvent({...newEvent, event_type: v})}
                className="flex flex-wrap gap-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="" id="type-none" className="border-green-500/50 text-green-400" />
                  <Label htmlFor="type-none" className="text-green-500/70 cursor-pointer">Ingen</Label>
                </div>
                {eventTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <RadioGroupItem value={type} id={`type-${type}`} className="border-green-500/50 text-green-400" />
                    <Label htmlFor={`type-${type}`} className="text-green-400 cursor-pointer">{type}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-green-400">Beskrivning</Label>
              <Input
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                placeholder="Valfri beskrivning..."
                className="bg-[#141e14] border-green-500/30 text-green-400 placeholder:text-green-600/50"
              />
            </div>

            {/* Send push notification checkbox */}
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="send_push"
                checked={newEvent.send_push}
                onCheckedChange={(checked) => setNewEvent({...newEvent, send_push: checked})}
                className="border-green-500/50 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
              <Label htmlFor="send_push" className="text-green-400 cursor-pointer text-sm">
                Skicka push-notis vid skapande
              </Label>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateEvent(false)}
                className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                Avbryt
              </Button>
              <Button
                type="button"
                onClick={handleCreateEvent}
                disabled={creatingEvent}
                className="flex-1 bg-green-600 hover:bg-green-500 text-black font-bold"
              >
                {creatingEvent ? 'Skapar...' : 'Skapa event'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Custom Events Dialog */}
      <Dialog open={showEditEvents} onOpenChange={setShowEditEvents}>
        <DialogContent className="bg-[#0a0f0a] border-green-500/30 text-green-400 w-[90vw] max-w-md mx-auto p-4 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-green-400 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Manuella events
            </DialogTitle>
            <DialogDescription className="text-green-500/70">
              Events du har lagt till manuellt
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-2">
            {loadingCustomEvents ? (
              <p className="text-green-500/50 text-center py-4">Laddar...</p>
            ) : customEvents.length === 0 ? (
              <p className="text-green-500/50 text-center py-4">Inga manuella events</p>
            ) : (
              customEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-3 bg-[#141e14] rounded border border-green-500/20"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-green-400 font-medium truncate">{event.summary}</p>
                    <p className="text-green-500/60 text-sm">
                      {event.start} {event.event_time && `kl ${event.event_time}`}
                    </p>
                    {(event.subject_name || event.event_type) && (
                      <p className="text-green-500/50 text-xs">
                        {[event.subject_name, event.event_type].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteEvent(event.id, event.summary)}
                    className="flex-shrink-0 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditEvents(false)}
              className="border-green-500/30 text-green-400 hover:bg-green-500/10"
            >
              Stäng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
