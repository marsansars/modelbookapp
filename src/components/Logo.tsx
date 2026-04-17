import logoSignature from "@/assets/logo-signature-transparent.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Tailwind height class, e.g. "h-8". Width auto-scales. */
  heightClass?: string;
  alt?: string;
}

/**
 * ModelBook handwritten signature wordmark.
 * Use heightClass to control size; width scales to preserve the signature ratio.
 */
export function Logo({ className, heightClass = "h-8", alt = "ModelBook" }: LogoProps) {
  return (
    <img
      src={logoSignature}
      alt={alt}
      className={cn(heightClass, "w-auto select-none drop-shadow-[0_0_12px_hsl(var(--primary)/0.15)]")}
      draggable={false}
    />
  );
}
