import { useAuth } from "@/hooks/use-auth";
import UserMenu from "@/components/user-menu";
import { Link, useLocation } from "wouter";
import { Moon } from "lucide-react";

export default function Header() {
  const { user } = useAuth();
  const [location] = useLocation();
  
  const isAdmin = user?.isAdmin;
  
  return (
    <header className="bg-primary text-white shadow-lg z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
      <div className="flex items-center space-x-2 cursor-pointer" onClick={() => window.location.href=isAdmin ? "/admin" : "/"}>
            <Moon className="h-6 w-6 text-yellow-300" />
            <h1 className="font-heading font-bold text-xl md:text-2xl">Astro Appointments</h1>
        </div>
        <nav>
          <ul className="flex space-x-6 items-center">
            <li className="md:block">
            <div 
                className={`hover:text-yellow-300 cursor-pointer ${location === "/" && !isAdmin || location.startsWith("/admin") && isAdmin ? "text-yellow-300" : ""}`}
                onClick={() => window.location.href=isAdmin ? "/admin" : "/"}
              >
                {isAdmin ? "Dashboard" : "Home"}
              </div>
            </li>
   
            <li>
              <UserMenu />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
