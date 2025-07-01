
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Home, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();

  const navItems = [
    { name: t.sidebar.link_dashboard, href: "/dashboard", icon: Home },
    { name: t.sidebar.link_customers, href: "/customers", icon: Users },
  ];

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: t.sidebar.toast_logout_fail_title,
        description: error.message,
      });
    } else {
      toast({
        title: t.sidebar.toast_logout_success_title,
        description: t.sidebar.toast_logout_success_desc,
      });
      router.push("/login");
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r fixed h-full">
      <div className="flex items-center justify-center h-20 border-b px-4">
        <Link href="/dashboard">
          <Image src="/logo.png" alt="Bravium logo" width={120} height={30} />
        </Link>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
              (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))) && "bg-primary/10 text-primary font-semibold"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        ))}
      </nav>
      <div className="p-4 mt-auto border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="mr-2 h-5 w-5" />
          {t.sidebar.logout}
        </Button>
      </div>
    </aside>
  );
}
