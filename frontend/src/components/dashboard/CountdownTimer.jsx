/**
 * Countdown timer component
 */
import { useState, useEffect, useCallback, useRef, memo } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const CountdownTimer = memo(({ settings, onRefreshEvents, onTriggerImpact, syncing }) => {
  const [countdown, setCountdown] = useState('--:--');
  const [nextSyncTime, setNextSyncTime] = useState(null);
  const [wasSyncing, setWasSyncing] = useState(false);
  const hasTriggeredRef = useRef(false);
  const pollTimeoutRef = useRef(null);
  const pollCountRef = useRef(0);
  
  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/sync-status`);
      const newSyncTime = response.data.next_sync * 1000;
      setNextSyncTime(newSyncTime);
      return response.data;
    } catch (e) {
      console.error("Error fetching sync status:", e);
      return null;
    }
  }, []);
  
  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);
  
  useEffect(() => {
    if (!nextSyncTime) return;
    
    const MAX_POLLS = 30;
    
    const pollForNewSync = async () => {
      pollCountRef.current++;
      const currentTime = Date.now();
      const status = await fetchSyncStatus();
      
      if (status && status.next_sync * 1000 > currentTime) {
        // Got new sync time, reset trigger flag
        hasTriggeredRef.current = false;
        pollCountRef.current = 0;
        if (onRefreshEvents) onRefreshEvents();
      } else if (pollCountRef.current < MAX_POLLS) {
        pollTimeoutRef.current = setTimeout(pollForNewSync, 2000);
      } else {
        // Max polls reached, force reset
        hasTriggeredRef.current = false;
        pollCountRef.current = 0;
        await fetchSyncStatus();
      }
    };
    
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((nextSyncTime - now) / 1000));
      
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      setCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      
      if (remaining > 0) {
        hasTriggeredRef.current = false;
        pollCountRef.current = 0;
      }
      
      if (remaining === 0 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        
        if (settings?.impact_effect_enabled && onTriggerImpact) {
          onTriggerImpact();
        }
        
        // Start polling after 1 second
        pollTimeoutRef.current = setTimeout(pollForNewSync, 1000);
      }
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    
    return () => {
      clearInterval(timer);
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [nextSyncTime, onRefreshEvents, settings?.impact_effect_enabled, onTriggerImpact, fetchSyncStatus]);
  
  useEffect(() => {
    if (wasSyncing && !syncing) {
      fetchSyncStatus();
    }
    setWasSyncing(syncing);
  }, [syncing, wasSyncing, fetchSyncStatus]);
  
  return (
    <span className="text-lg font-bold text-green-400 pip-glow font-mono">{countdown}</span>
  );
});

CountdownTimer.displayName = 'CountdownTimer';
