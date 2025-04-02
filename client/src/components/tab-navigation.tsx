import { CalendarDays, ListChecks, User } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

type Tab = "book" | "appointments" | "profile";

interface TabNavigationProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

export default function TabNavigation({ activeTab, onChange }: TabNavigationProps) {
  const [, setLocation] = useLocation();
  
  // Handle tab change with optional URL query param update
  const handleTabChange = (tab: Tab) => {
    onChange(tab);
    if (tab === "appointments") {
      setLocation("/?tab=appointments");
    } else if (tab === "profile") {
      setLocation("/?tab=profile");
    } else {
      setLocation("/");
    }
  };
  
  return (
    <div className="flex space-x-6 overflow-x-auto">
      <button 
        className={cn(
          "py-4 px-1 border-b-2 font-medium flex items-center space-x-2 transition-colors",
          activeTab === "book" 
            ? "border-primary text-primary" 
            : "border-transparent hover:border-primary-light text-gray-500 hover:text-primary-light"
        )}
        onClick={() => handleTabChange("book")}
      >
        <CalendarDays className="h-5 w-5" />
        <span>Book Appointment</span>
      </button>
      <button 
        className={cn(
          "py-4 px-1 border-b-2 font-medium flex items-center space-x-2 transition-colors",
          activeTab === "appointments" 
            ? "border-primary text-primary" 
            : "border-transparent hover:border-primary-light text-gray-500 hover:text-primary-light"
        )}
        onClick={() => handleTabChange("appointments")}
      >
        <ListChecks className="h-5 w-5" />
        <span>My Appointments</span>
      </button>
      <button 
        className={cn(
          "py-4 px-1 border-b-2 font-medium flex items-center space-x-2 transition-colors",
          activeTab === "profile" 
            ? "border-primary text-primary" 
            : "border-transparent hover:border-primary-light text-gray-500 hover:text-primary-light"
        )}
        onClick={() => handleTabChange("profile")}
      >
        <User className="h-5 w-5" />
        <span>Profile</span>
      </button>
    </div>
  );
}
