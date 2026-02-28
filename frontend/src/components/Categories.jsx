import { useState, useEffect } from "react";
import { Tag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const Categories = ({ settings, onUpdateSettings }) => {
  const [categories, setCategories] = useState([]);
  const [enabledCategories, setEnabledCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API}/categories`);
        setCategories(response.data.categories || []);
      } catch (e) {
        console.error("Error fetching categories:", e);
        toast.error("Kunde inte hämta kategorier");
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Initialize enabled categories from settings
  useEffect(() => {
    if (settings?.enabled_categories) {
      setEnabledCategories(settings.enabled_categories);
    } else {
      // Default: all categories enabled
      setEnabledCategories(categories);
    }
  }, [settings, categories]);

  const handleToggleCategory = (category) => {
    setEnabledCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleSelectAll = () => {
    setEnabledCategories([...categories]);
  };

  const handleSelectNone = () => {
    setEnabledCategories([]);
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await onUpdateSettings({ enabled_categories: enabledCategories });
    if (success) {
      toast.success("Kategorier sparade");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Kategorier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Kategorier
        </CardTitle>
        <CardDescription>
          Välj vilka kategorier som ska visas på startsidan. Kategorier extraheras automatiskt från kalenderhändelser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            Inga kategorier hittades. Synka kalendern först.
          </p>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                data-testid="select-all-categories"
              >
                Markera alla
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectNone}
                data-testid="select-none-categories"
              >
                Avmarkera alla
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((category) => (
                <div
                  key={category}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    enabledCategories.includes(category)
                      ? 'bg-slate-50 border-slate-300'
                      : 'bg-white border-slate-200 opacity-60'
                  }`}
                  onClick={() => handleToggleCategory(category)}
                >
                  <Checkbox
                    id={`category-${category}`}
                    data-testid={`category-checkbox-${category}`}
                    checked={enabledCategories.includes(category)}
                    onCheckedChange={() => handleToggleCategory(category)}
                  />
                  <Label
                    htmlFor={`category-${category}`}
                    className="flex-1 cursor-pointer text-sm font-medium"
                  >
                    {category}
                  </Label>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving}
                data-testid="save-categories-button"
                className="gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Sparar...' : 'Spara kategorier'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
