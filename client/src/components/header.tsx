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
        <Link href="/">
          <a className="flex items-center space-x-2">
            <Moon className="h-6 w-6 text-yellow-300" />
            <h1 className="font-heading font-bold text-xl md:text-2xl">Astro Appointments</h1>
          </a>
        </Link>
        <nav>
          <ul className="flex space-x-6 items-center">
            <li className="md:block">
              <Link href="/">
                <a className={`hover:text-yellow-300 ${location === "/" ? "text-yellow-300" : ""}`}>
                  Home
                </a>
              </Link>
            </li>
            {isAdmin && (
              <li className="md:block">
                <Link href="/admin">
                  <a className={`hover:text-yellow-300 ${location.startsWith("/admin") ? "text-yellow-300" : ""}`}>
                    Admin
                  </a>
                </Link>
              </li>
            )}
            <li>
              <UserMenu />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
