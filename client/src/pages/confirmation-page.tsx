import { useEffect } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import LocationMap from "@/components/location-map";
import { formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Calendar, Printer, Check, Bell, Info, MapPin } from "lucide-react";
import { Redirect, useLocation } from "wouter";

export default function ConfirmationPage() {
  const [, navigate] = useLocation();
  
  // Get appointment ID from query params
  const params = new URLSearchParams(window.location.search);
  const appointmentId = params.get("id");
  
  const { data: appointment, isLoading, error } = useQuery({
    queryKey: ["/api/appointments", appointmentId],
    enabled: !!appointmentId,
  });
  
  // If there's no appointment ID or error, redirect to home
  useEffect(() => {
    if ((!appointmentId && !isLoading) || error) {
      navigate("/");
    }
  }, [appointmentId, isLoading, error, navigate]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }
  
  if (!appointment) {
    return <Redirect to="/" />;
  }
  
  const appointmentDate = new Date(appointment.date);
  const endTime = new Date(appointment.endTime);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-primary p-6 text-white">
                <div className="flex items-center justify-center">
                  <Check className="h-8 w-8 mr-3 text-yellow-300" />
                  <h2 className="font-heading text-2xl font-bold">Booking Confirmed!</h2>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-center mb-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">Your appointment has been scheduled for</p>
                    <p className="text-xl font-medium text-gray-800">{formatDate(appointmentDate)}</p>
                    <p className="text-lg font-medium text-primary">{formatTime(appointmentDate)} - {formatTime(endTime)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-heading font-semibold mb-3 flex items-center">
                      <Info className="h-5 w-5 text-blue-600 mr-2" />
                      Appointment Details
                    </h3>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Appointment ID:</span>
                          <span className="font-medium">#{`AST-${appointmentDate.toISOString().slice(0, 10).replace(/-/g, '')}-${appointmentDate.getHours()}${appointmentDate.getMinutes()}`}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Type:</span>
                          <span className="font-medium">Astrology Consultation</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Duration:</span>
                          <span className="font-medium">15 minutes</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Astrologer:</span>
                          <span className="font-medium">Dr. Stella Cosmos</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="font-heading font-semibold mb-3 flex items-center">
                        <Bell className="h-5 w-5 text-blue-600 mr-2" />
                        Reminders
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-500">
                        <li className="flex">
                          <Check className="h-4 w-4 text-green-500 mt-1 mr-2" />
                          <span>Please arrive 5 minutes before your appointment time</span>
                        </li>
                        <li className="flex">
                          <Check className="h-4 w-4 text-green-500 mt-1 mr-2" />
                          <span>Bring any previous consultation notes if available</span>
                        </li>
                        <li className="flex">
                          <Check className="h-4 w-4 text-green-500 mt-1 mr-2" />
                          <span>Have your birth date, time, and place information ready</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-heading font-semibold mb-3 flex items-center">
                      <MapPin className="h-5 w-5 text-blue-600 mr-2" />
                      Location
                    </h3>
                    <div className="rounded-lg overflow-hidden shadow-md">
                      <LocationMap />
                      <div className="p-3 bg-white">
                        <h4 className="font-medium">Astro Consultation Center</h4>
                        <p className="text-sm text-gray-500">123 Celestial Avenue, Starlight City</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex flex-col space-y-3">
                      <Button className="w-full">
                        <Calendar className="mr-2 h-4 w-4" />
                        Add to Calendar
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Printer className="mr-2 h-4 w-4" />
                        Print Confirmation
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">Need to make changes?</p>
                  <Button variant="link" className="text-primary" onClick={() => navigate("/")}>
                    Reschedule or Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
