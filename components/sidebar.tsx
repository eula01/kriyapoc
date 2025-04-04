"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, LayoutDashboard, PuzzleIcon, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-48 flex-col border-r bg-background">
      <div className="flex justify-center items-center p-4">
        <Image src="/junetek.svg" alt="Logo" width={120} height={120} />
        {/* <span className="text-xl font-bold text-[#00ff]">
            June Technologies
          </span> */}
      </div>

      <Separator />

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {/* <li>
            <Link
              href="/accounts"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname.startsWith("/accounts")
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Accounts</span>
            </Link>
          </li>
          <li>
            <Link
              href="/integrations"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname.startsWith("/integrations")
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <PuzzleIcon className="h-4 w-4" />
              <span>Integrations</span>
            </Link>
          </li> */}
          <li>
            <Link
              href="/use-case-1"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname.startsWith("/use-case-1")
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Building className="h-4 w-4" />
              <span>Use case 1: Accounts</span>
            </Link>
          </li>
          <li>
            <Link
              href="/use-case-2"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname.startsWith("/use-case-2")
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <UserRound className="h-4 w-4" />
              <span>Use case 2: Contacts</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
