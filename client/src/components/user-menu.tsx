import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getInitials } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User, Settings, HelpCircle, LogOut } from "lucide-react";

export default function UserMenu() {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  
  if (!user) return null;
  
  const handleLogout = () => {
    logoutMutation.mutate();
    navigate("/auth");
  };
  
  const handleNavigateToProfile = () => {
    navigate("/?tab=profile");
  };
  
  const handleNavigateToSettings = () => {
    navigate("/?tab=profile&section=settings");
  };
  
  const handleNavigateToHelp = () => {
    navigate("/?tab=profile&section=help");
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center space-x-2 focus:outline-none">
        <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-white">
          <span className="text-sm font-medium">{getInitials(user.name)}</span>
        </div>
        <span className="hidden md:inline-block">{user.name}</span>
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={handleNavigateToProfile}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={handleNavigateToSettings}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={handleNavigateToHelp}>
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Help</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-red-500" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
