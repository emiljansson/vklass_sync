import { useState, useEffect } from "react";
import { X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const AddToHomeScreen = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Check if already in standalone mode (added to home screen)
    const isStandalone = window.navigator.standalone === true;
    
    // Check if already dismissed
    const dismissed = localStorage.getItem('addToHomeScreenDismissed');
    
    // Show only on iOS, not in standalone, and not dismissed
    if (isIOS && !isStandalone && !dismissed) {
      // Delay showing the prompt
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('addToHomeScreenDismissed', 'true');
  };

  const handleLater = () => {
    setShow(false);
    // Will show again next visit
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-green-500 to-green-600 p-4 text-white">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white hover:bg-white/20"
            onClick={handleDismiss}
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <img 
              src="/apple-touch-icon.png" 
              alt="Vklass Sync" 
              className="w-14 h-14 rounded-xl shadow-lg"
            />
            <div>
              <h3 className="font-bold text-lg">Lägg till Vklass Sync</h3>
              <p className="text-green-100 text-sm">på din hemskärm</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 space-y-4">
          <p className="text-slate-600 text-sm">
            Installera appen för snabb åtkomst och push-notifikationer:
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-lg">
                <Share className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">1. Tryck på Dela-knappen</p>
                <p className="text-xs text-slate-500">Längst ner i Safari</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-slate-800 text-white rounded-lg">
                <Plus className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">2. Välj "Lägg till på hemskärmen"</p>
                <p className="text-xs text-slate-500">Scrolla ner i menyn om det behövs</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleLater}
            >
              Senare
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleDismiss}
            >
              Jag förstår
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
