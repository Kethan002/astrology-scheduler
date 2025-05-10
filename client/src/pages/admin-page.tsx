import { useState, useEffect } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import AppointmentTable from "@/components/admin/appointment-table";
import SlotManagement from "@/components/admin/slot-management";
import BookingConfigSettings from "@/components/admin/booking-config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

type AdminTab = "appointments" | "slots" | "users" | "settings";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("appointments");

  // Redirect from /admin to /admin?tab=appointments
  useEffect(() => {
    if (!window.location.search) {
      window.history.replaceState({}, '', '/admin?tab=appointments');
    } else {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as AdminTab;
      if (tab && ['appointments', 'slots', 'users', 'settings'].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);
  
  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery<any[]>({
    queryKey: ["/api/admin/appointments"],
  });
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-heading text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                className="h-6 w-6 text-blue-600 mr-2"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Admin Dashboard
            </h2>
            
            <Tabs 
              value={activeTab} 
              onValueChange={(value) => setActiveTab(value as AdminTab)}
              className="bg-white rounded-lg shadow-md"
            >
              <div className="px-4 pt-4">
                <TabsList className="grid grid-cols-4 w-full bg-gray-100">
                  <TabsTrigger value="appointments">Appointments</TabsTrigger>
                  <TabsTrigger value="slots">Available Slots</TabsTrigger>
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="appointments" className="p-6">
                {isLoadingAppointments ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <AppointmentTable appointments={appointments || []} />
                )}
              </TabsContent>
              
              <TabsContent value="slots" className="p-6">
                <SlotManagement />
              </TabsContent>
              
              <TabsContent value="users" className="p-6">
                <div className="text-center py-12 text-gray-500">
                  User management will be available in a future update.
                </div>
              </TabsContent>
              
              <TabsContent value="settings" className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-4">Booking System Settings</h3>
                  <p className="text-gray-600 mb-4">
                    Configure booking windows, appointment slots, and other system settings.
                  </p>
                  <BookingConfigSettings />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
