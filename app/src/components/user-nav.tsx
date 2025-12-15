
"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";

export function UserNav() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();

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

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.photoURL ?? ""} alt={user.email ?? ""} />
            <AvatarFallback>
              <UserIcon className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.displayName || t.userNav.user}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
           <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/profile">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>{t.userNav.profile}</span>
              </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t.userNav.logout}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
