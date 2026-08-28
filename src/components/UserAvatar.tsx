import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  url,
  name,
  size = "md",
  className,
  style,
  onClick,
}: {
  url?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const sizes: Record<string, string> = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-24 w-24 text-2xl",
  };
  const initials =
    (name ?? "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]!.toUpperCase())
      .join("") || "?";
  return (
    <Avatar
      className={cn(
        sizes[size],
        "ring-2 ring-background shadow-sm",
        onClick && "cursor-pointer hover:opacity-90 transition",
        className,
      )}
      style={style}
      onClick={onClick}
    >
      {url && <AvatarImage src={url} alt={name ?? ""} />}
      <AvatarFallback className="bg-gradient-to-br from-ice to-summit text-primary-foreground font-display font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
