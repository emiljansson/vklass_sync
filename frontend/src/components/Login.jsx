import { useState } from "react";
import { Lock, Eye, EyeOff, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Login = ({ onLogin }) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    const success = await onLogin(password);
    
    if (!success) {
      setError("Fel lösenord");
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-slate-900" />
          </div>
          <CardTitle className="text-2xl font-bold">iCal Sync</CardTitle>
          <CardDescription>Ange lösenord för att fortsätta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Lösenord</Label>
              <div className="relative">
                <Input
                  id="password"
                  data-testid="login-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ange ditt lösenord"
                  className="pr-10"
                  autoFocus
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
              {error && (
                <p className="text-sm text-rose-600">{error}</p>
              )}
            </div>
            
            <Button
              type="submit"
              data-testid="login-submit-button"
              className="w-full gap-2"
              disabled={loading || !password}
            >
              <Lock className="w-4 h-4" />
              {loading ? 'Loggar in...' : 'Logga in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
