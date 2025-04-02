import { useState } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import TabNavigation from "@/components/tab-navigation";
import BookingCalendar from "@/components/booking-calendar";
import TimeSlots from "@/components/time-slots";
import BookingSummary from "@/components/booking-summary";
import MyAppointments from "@/components/my-appointments";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { Redirect, useLocation } from "wouter";

type Tab = "book" | "appointments" | "profile";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("book");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [, navigate] = useLocation();

  // Function to handle booking confirmation
  const handleConfirmBooking = () => {
    if (selectedDate && selectedTime) {
      // Navigate to confirmation page
      navigate("/confirmation");
    }
  };

  // Reset time when date changes
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <TabNavigation 
            activeTab={activeTab} 
            onChange={setActiveTab} 
          />
        </div>
      </div>
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          {activeTab === "book" && (
            <div className="max-w-5xl mx-auto">
              <h2 className="font-heading text-2xl font-bold text-gray-800 mb-6">Book Your Astrology Consultation</h2>
              
              {/* Booking instructions and rules */}
              <Alert className="bg-blue-50 border-l-4 border-blue-600 mb-8">
                <InfoIcon className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-600">Booking Rules</AlertTitle>
                <AlertDescription className="text-sm text-gray-600 space-y-1">
                  <p>• You can book only one appointment per week</p>
                  <p>• New slots open every Sunday from 5 AM to 6 AM</p>
                  <p>• Appointments are available daily except Tuesdays and Saturdays</p>
                  <p>• Time slots: 9 AM - 1 PM and 3 PM - 5 PM (15-minute intervals)</p>
                </AlertDescription>
              </Alert>
              
              {/* Booking calendar and time slots */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left column: Calendar and Summary */}
                <div className="md:col-span-5">
                  <BookingCalendar 
                    selectedDate={selectedDate}
                    onSelectDate={handleDateSelect}
                  />
                  
                  {selectedDate && selectedTime && (
                    <BookingSummary 
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                      onConfirm={handleConfirmBooking}
                    />
                  )}
                </div>
                
                {/* Right column: Time slots */}
                <div className="md:col-span-7">
                  {selectedDate ? (
                    <TimeSlots 
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                      onSelectTime={setSelectedTime}
                    />
                  ) : (
                    <div className="bg-white rounded-lg shadow-md p-6 text-center">
                      <p className="text-gray-500">Please select a date to view available time slots</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === "appointments" && (
            <MyAppointments />
          )}
          
          {activeTab === "profile" && (
            <div className="max-w-4xl mx-auto">
              <h2 className="font-heading text-2xl font-bold text-gray-800 mb-6">Profile</h2>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-500 text-center">Profile settings will be available in a future update.</p>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
