"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-white",
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center bg-navy/90 text-[11px] font-bold text-white",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

const gradients = [
  "bg-[#2457F5]",
  "bg-[#0B1024]",
  "bg-[#7C5CFC]",
  "bg-[#0F9D74]",
  "bg-[#E47A3F]",
  "bg-[#2563EB]",
];

export function UserAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const index =
    Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    gradients.length;
  return (
    <Avatar
      className={cn("h-9 w-9 ring-2 ring-white", className)}
      title={name}
    >
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback className={cn("text-[11px]", gradients[index])}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function AvatarStack({
  people,
  max = 3,
  size = "h-8 w-8",
}: {
  people: { id: string; name: string; avatarUrl?: string | null }[];
  max?: number;
  size?: string;
}) {
  const visible = people.slice(0, max);
  const remaining = people.length - visible.length;
  return (
    <div className="flex items-center">
      {visible.map((person) => (
        <UserAvatar
          key={person.id}
          name={person.name}
          src={person.avatarUrl}
          className={cn("-ml-2 first:ml-0", size)}
        />
      ))}
      {remaining > 0 ? (
        <span
          className={cn(
            "-ml-2 flex items-center justify-center rounded-full bg-canvas text-[10px] font-bold text-ink/60 ring-2 ring-white",
            size,
          )}
        >
          +{remaining}
        </span>
      ) : null}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
