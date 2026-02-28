import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { Dashboard } from "@/components/Dashboard";
import { Settings } from "@/components/Settings";
import { Login } from "@/components/Login";
import { AddToHomeScreen } from "@/components/AddToHomeScreen";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [events, setEvents] = useState([]);
  const [syncing, setSyncing] = useState(false);

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API}/auth/status`);
        setAuthEnabled(response.data.auth_enabled);
        
        // Check if user has logged in this session (for settings access)
        const sessionAuth = sessionStorage.getItem('ical_authenticated');
        setIsAuthenticated(sessionAuth === 'true');
      } catch (e) {
        console.error("Error checking auth status:", e);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
      setAuthEnabled(response.data.auth_enabled);
    } catch (e) {
      console.error("Error fetching settings:", e);
    }
  }, []);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/events`);
      setEvents(response.data);
    } catch (e) {
      console.error("Error fetching events:", e);
    }
  }, []);

  // Initial data fetch - always fetch for dashboard (public)
  useEffect(() => {
    fetchSettings();
    fetchEvents();
  }, [fetchSettings, fetchEvents]);

  // Auto-refresh events
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvents();
    }, 30000); // Refresh events every 30 seconds
    
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Handle login
  const handleLogin = async (password) => {
    try {
      await axios.post(`${API}/auth/login`, { password });
      setIsAuthenticated(true);
      sessionStorage.setItem('ical_authenticated', 'true');
      toast.success("Inloggad!");
      return true;
    } catch (e) {
      toast.error("Fel lösenord");
      return false;
    }
  };

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('ical_authenticated');
    toast.info("Utloggad", { duration: 3000 });
  };

  // Update settings
  const updateSettings = async (newSettings) => {
    try {
      const response = await axios.put(`${API}/settings`, newSettings);
      setSettings(response.data);
      setAuthEnabled(response.data.auth_enabled);
      toast.success("Inställningar sparade");
      return true;
    } catch (e) {
      console.error("Error updating settings:", e);
      toast.error("Kunde inte spara inställningar");
      return false;
    }
  };

  // Trigger sync
  const triggerSync = async () => {
    setSyncing(true);
    try {
      const response = await axios.post(`${API}/sync`);
      await fetchEvents();
      
      if (response.data.new_events > 0 || response.data.removed_events > 0) {
        toast.success(`Synkronisering klar: ${response.data.new_events} nya, ${response.data.removed_events} borttagna`, { duration: 3000 });
      } else {
        toast.info("Inga ändringar hittades", { duration: 3000 });
      }
    } catch (e) {
      console.error("Error syncing:", e);
      toast.error("Synkronisering misslyckades", { duration: 3000 });
    } finally {
      setSyncing(false);
    }
  };

  // Confirm event
  const confirmEvent = async (eventId) => {
    try {
      await axios.post(`${API}/events/${eventId}/confirm`);
      await fetchEvents();
      toast.success("Händelse bekräftad", { duration: 3000 });
    } catch (e) {
      console.error("Error confirming event:", e);
      toast.error("Kunde inte bekräfta händelse", { duration: 3000 });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-center" richColors duration={3000} />
      <AddToHomeScreen />
      <BrowserRouter>
        <Routes>
          {/* Dashboard is always public */}
          <Route
            path="/"
            element={
              <Dashboard
                settings={settings}
                events={events}
                syncing={syncing}
                onSync={triggerSync}
                onConfirmEvent={confirmEvent}
                authEnabled={authEnabled}
                isAuthenticated={isAuthenticated}
                onLogout={isAuthenticated ? handleLogout : null}
              />
            }
          />
          {/* Settings requires authentication if enabled */}
          <Route
            path="/settings"
            element={
              authEnabled && !isAuthenticated ? (
                <Navigate to="/login?redirect=/settings" replace />
              ) : (
                <Settings
                  settings={settings}
                  onUpdateSettings={updateSettings}
                />
              )
            }
          />
          <Route
            path="/login"
            element={
              <Login onLogin={handleLogin} />
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
