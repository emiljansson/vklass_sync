/**
 * Settings page - Refactored version
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, CalendarPlus, FileText, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import axios from "axios";

// Import refactored settings components
import {
  SoundSettings,
  ImpactEffectSettings,
  CalendarSettings,
  SyncSettings,
  EventMappingsSettings,
  AuthSettings,
  WebpushrSettings,
  DatabaseToolsSettings,
  API
} from "./settings";

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
    webpushr_test_user_id: "",
    auth_enabled: false,
    auth_password: "",
    sound_enabled: true,
    sound_volume: 50,
    impact_effect_enabled: false,
    event_mappings: []
  });
  const [saving, setSaving] = useState(false);
  const [originalTestUserId, setOriginalTestUserId] = useState("");

  // Dialog states
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showEditEvents, setShowEditEvents] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [customEvents, setCustomEvents] = useState([]);
  const [loadingCustomEvents, setLoadingCustomEvents] = useState(false);
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
        webpushr_test_user_id: settings.webpushr_test_user_id || "",
        auth_enabled: settings.auth_enabled || false,
        auth_password: settings.auth_password || "",
        sound_enabled: settings.sound_enabled !== undefined ? settings.sound_enabled : true,
        sound_volume: settings.sound_volume !== undefined ? settings.sound_volume : 50,
        impact_effect_enabled: settings.impact_effect_enabled || false,
        event_mappings: settings.event_mappings || []
      });
      setOriginalTestUserId(settings.webpushr_test_user_id || "");
    }
  }, [settings]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    await onUpdateSettings(formData);
    setOriginalTestUserId(formData.webpushr_test_user_id);
    setSaving(false);
  };

  // Event mappings handlers
  const handleEventMappingsChange = (newMappings) => {
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

  // Create Event handlers
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
        window.location.reload();
      }
    } catch (e) {
      console.error("Error creating event:", e);
      toast.error("Fel vid skapande av event", { duration: 3000 });
    } finally {
      setCreatingEvent(false);
    }
  };

  // Edit events handlers
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
          <SoundSettings formData={formData} onChange={handleChange} />
          <ImpactEffectSettings formData={formData} onChange={handleChange} />
          
          <CalendarSettings
            calendarNumber={1}
            nameValue={formData.calendar_name_1}
            urlValue={formData.ical_url_1}
            onNameChange={(value) => handleChange('calendar_name_1', value)}
            onUrlChange={(value) => handleChange('ical_url_1', value)}
          />
          
          <CalendarSettings
            calendarNumber={2}
            nameValue={formData.calendar_name_2}
            urlValue={formData.ical_url_2}
            onNameChange={(value) => handleChange('calendar_name_2', value)}
            onUrlChange={(value) => handleChange('ical_url_2', value)}
          />
          
          <SyncSettings formData={formData} onChange={handleChange} />
          
          <EventMappingsSettings
            mappings={formData.event_mappings}
            onChange={handleEventMappingsChange}
            onAdd={addEventMapping}
            onRemove={removeEventMapping}
          />
          
          <DatabaseToolsSettings />
          
          <WebpushrSettings
            formData={formData}
            onChange={handleChange}
            originalTestUserId={originalTestUserId}
            onSave={handleSubmit}
            saving={saving}
          />
          
          <AuthSettings formData={formData} onChange={handleChange} />
        </form>
      </main>

      {/* Create Event Dialog */}
      <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
        <DialogContent className="bg-[#0a0f0a] border-green-500/30 text-green-400 w-[92vw] max-w-md mx-auto p-4 overflow-hidden box-border">
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
            <div className="grid grid-cols-[40%_10%_45%] md:grid-cols-[43%_7%_45%] lg:grid-cols-[47.5%_5%_47.5%] w-full overflow-visible">
              <div className="space-y-2 overflow-visible">
                <Label className="text-green-400 block">Datum *</Label>
                <input
                  type="date"
                  value={newEvent.start}
                  onChange={(e) => setNewEvent({...newEvent, start: e.target.value})}
                  className="w-full max-w-full h-9 bg-[#141e14] border border-green-500/30 text-green-400 rounded-md px-2 text-sm box-border"
                />
              </div>
              <div></div>
              <div className="space-y-2 overflow-visible">
                <Label className="text-green-400 block">Tid</Label>
                <input
                  type="time"
                  value={newEvent.event_time}
                  onChange={(e) => setNewEvent({...newEvent, event_time: e.target.value})}
                  className="w-full max-w-full h-9 bg-[#141e14] border border-green-500/30 text-green-400 rounded-md px-2 text-sm box-border"
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
        <DialogContent className="bg-[#0a0f0a] border-green-500/30 text-green-400 w-[90vw] max-w-md mx-auto p-4 max-h-[80vh] overflow-y-auto z-[100]">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEvent(event.id, event.summary);
                    }}
                    className="flex-shrink-0 text-red-400 hover:bg-red-500/20 hover:text-red-300 relative z-10"
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
