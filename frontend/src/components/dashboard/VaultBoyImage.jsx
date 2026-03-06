/**
 * Vault Boy image component
 */
import { memo } from "react";

export const VaultBoyImage = memo(() => (
  <div className="flex-shrink-0 vault-boy-sway">
    <img 
      src="/vault-boy.png"
      alt="Vault Boy"
      className="w-16 h-16 object-contain"
    />
  </div>
));

VaultBoyImage.displayName = 'VaultBoyImage';
