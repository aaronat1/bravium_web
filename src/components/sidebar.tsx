"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LogOut, ShieldCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Certificates", href: "/certificates", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push("/login");
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r fixed h-full">
      <div className="flex items-center justify-center h-20 border-b">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
          <ShieldCheck className="h-7 w-7" />
          <span>Bravium</span>
        </Link>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <Link key={item.name} href={item.href} legacyBehavior passHref>
            <a
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
                (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))) && "bg-primary/10 text-primary font-semibold"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </a>
          </Link>
        ))}
      </nav>
      <div className="p-4 mt-auto border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="mr-2 h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
