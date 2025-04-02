import { useState, useEffect } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import TabNavigation from "@/components/tab-navigation";
import BookingCalendar from "@/components/booking-calendar";
import TimeSlots from "@/components/time-slots";
import BookingSummary from "@/components/booking-summary";
import MyAppointments from "@/components/my-appointments";
import ProfileSettings from "@/components/profile-settings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, AlertCircle, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { isWithinBookingWindow } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type Tab = "book" | "appointments" | "profile";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("book");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [canBook, setCanBook] = useState<boolean>(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // Get tab and section from URL params
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    
    if (tabParam && ['book', 'appointments', 'profile'].includes(tabParam as string)) {
      setActiveTab(tabParam as Tab);
    }
  }, []);

  // Check if current time is within booking window
  useEffect(() => {
    const checkBookingWindow = () => {
      const isAdmin = user?.isAdmin || false;
      const withinWindow = isWithinBookingWindow();
      setCanBook(withinWindow || isAdmin);
    };
    
    checkBookingWindow();
    
    // Check every minute
    const interval = setInterval(checkBookingWindow, 60000);
    return () => clearInterval(interval);
  }, [user]);

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
              
              {/* Booking window alert */}
              {!canBook && !user?.isAdmin && (
                <Alert className="bg-yellow-50 border-l-4 border-yellow-600 mb-8">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-700">Booking Window Closed</AlertTitle>
                  <AlertDescription className="text-sm text-gray-600">
                    <p>Booking is only available on Sundays between 8 AM and 9 AM. You can browse available slots but cannot make a reservation at this time.</p>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Booking instructions and rules */}
              <Alert className="bg-blue-50 border-l-4 border-blue-600 mb-8">
                <InfoIcon className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-600">Booking Rules / బుకింగ్ నియమాలు</AlertTitle>
                <AlertDescription className="text-sm text-gray-600 space-y-3">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-700">English:</p>
                    <p>• You can book only one appointment per week</p>
                    <p>• Booking window: Sunday from 8 AM to 9 AM</p>
                    <p>• Appointments are available daily except Tuesdays and Saturdays</p>
                    <p>• Time slots: 9 AM - 1 PM and 3 PM - 5 PM (15-minute intervals)</p>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-gray-200">
                    <p className="font-medium text-gray-700">తెలుగు:</p>
                    <p>• మీరు వారానికి ఒక అపాయింట్‌మెంట్ మాత్రమే బుక్ చేసుకోవచ్చు</p>
                    <p>• బుకింగ్ విండో: ఆదివారం ఉదయం 8 గంటల నుండి 9 గంటల వరకు</p>
                    <p>• మంగళవారం మరియు శనివారం తప్ప ప్రతి రోజూ అపాయింట్‌మెంట్‌లు అందుబాటులో ఉంటాయి</p>
                    <p>• టైమ్ స్లాట్‌లు: ఉదయం 9 గంటల నుండి మధ్యాహ్నం 1 గంట వరకు మరియు మధ్యాహ్నం 3 గంటల నుండి సాయంత్రం 5 గంటల వరకు (15-నిమిషాల విరామాలు)</p>
                  </div>
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
                      disabled={!canBook}
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
                      disabled={!canBook}
                    />
                  ) : (
                    <div className="bg-white rounded-lg shadow-md p-6 text-center">
                      <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
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
              <h2 className="font-heading text-2xl font-bold text-gray-800 mb-6">My Profile</h2>
              
              <ProfileSettings />
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
