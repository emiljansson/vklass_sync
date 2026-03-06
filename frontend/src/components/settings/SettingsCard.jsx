/**
 * Shared settings components and utilities
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const SettingsCard = ({ icon: Icon, title, description, variant = "green", children }) => {
  const borderColor = variant === "amber" ? "border-amber-500/40" : "border-green-500/40";
  const titleColor = variant === "amber" ? "text-amber-400" : "text-green-400";
  const descColor = variant === "amber" ? "text-amber-500/60" : "text-green-500/60";
  
  return (
    <Card className={`bg-[#141e14] border-2 ${borderColor}`}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${titleColor}`}>
          <Icon className="w-5 h-5" />
          {title}
        </CardTitle>
        {description && (
          <CardDescription className={descColor}>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
};

export const inputStyles = "bg-[#0a0f0a] border-green-500/40 text-green-400 placeholder:text-green-500/40 focus:border-green-400";
