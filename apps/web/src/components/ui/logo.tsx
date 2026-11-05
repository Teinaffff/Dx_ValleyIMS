import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  dark = false,
  showIms = true,
  className,
  href = "/",
}: {
  dark?: boolean;
  showIms?: boolean;
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        // next/image does not prepend basePath, and the optimizer fetches this path
        // verbatim from the server, so a subpath deployment needs the prefix here.
        src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/dxvalley-logo-cyan.png`}
        alt="DxValley"
        width={396}
        height={55}
        priority
        className="h-6 w-auto"
      />
      {showIms ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]",
            dark ? "bg-white/15 text-white" : "bg-primary-soft text-primary",
          )}
        >
          IMS
        </span>
      ) : null}
    </Link>
  );
}
