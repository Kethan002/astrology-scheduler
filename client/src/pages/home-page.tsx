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
import { useBookingConfig, CONFIG_UPDATED_EVENT } from "@/hooks/use-booking-config";
import { useQueryClient } from "@tanstack/react-query";

type Tab = "book" | "appointments" | "profile";

export default function HomePage() {
  const [configVersion, setConfigVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("book");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [canBook, setCanBook] = useState<boolean>(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  
  
  // Get tab and section from URL params
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    
    if (tabParam && ['book', 'appointments', 'profile'].includes(tabParam as string)) {
      setActiveTab(tabParam as Tab);
    }
  }, []);

  // Use the booking configuration hook
  const bookingConfig = useBookingConfig();
  
  // Check if current time is within booking window
  const checkBookingWindow = () => {
    const isAdmin = user?.isAdmin || false;
    // Use the dynamic booking window configuration
    const withinWindow = bookingConfig.isWithinBookingWindow();
    setCanBook(withinWindow || isAdmin);
  };
  
  // Set up initial check and interval
  useEffect(() => {
    checkBookingWindow();
    
    // Check every minute
    const interval = setInterval(checkBookingWindow, 30000); // Reduce to 30 seconds
    
    // Listen for config updates
    const handleConfigUpdate = () => {
      console.log("Home page received config update");
      // Force refetch
      queryClient.invalidateQueries({ queryKey: ["/api/booking-configurations"] });
      // Increment config version to force re-render
      setConfigVersion(prev => prev + 1);
      // Recheck booking window with a delay to ensure query completes
      setTimeout(checkBookingWindow, 500);

      // Recheck booking window immediately
      checkBookingWindow();
    };
    
    window.addEventListener(CONFIG_UPDATED_EVENT, handleConfigUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener(CONFIG_UPDATED_EVENT, handleConfigUpdate);
    };
  }, [user, bookingConfig, queryClient, configVersion]);
  

  // Function to handle booking confirmation
  const handleConfirmBooking = () => {
    if (selectedDate && selectedTime) {
      // Navigate to confirmation page
      navigate("/confirmation");
    }
  };

  // Helper function to properly format time in Telugu
  const formatTo12HourTelugu = (hour: number) => {
    // Convert 24-hour format to 12-hour format
    const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    
    // Add appropriate Telugu time period suffix
    if (hour < 12) {
      return `ఉదయం ${hour12} గంటలు`; // Morning (AM)
    } else if (hour >= 12 && hour < 16) {
      return `మధ్యాహ్నం ${hour12} గంటలు`; // Afternoon (12-4 PM)
    } else if (hour >= 16 && hour < 19) {
      return `సాయంత్రం ${hour12} గంటలు`; // Evening (4-7 PM)
    } else {
      return `రాత్రి ${hour12} గంటలు`; // Night (7 PM onwards)
    }
  };

  // Helper function to properly format time in English
  const formatTo12Hour = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    return `${displayHour} ${period}`;
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
                  <AlertTitle className="text-yellow-700">Booking Window Closed / బుకింగ్ విండో మూసివేయబడింది</AlertTitle>
                  <AlertDescription className="text-sm text-gray-600">
                    <p className="mb-2">
                      <span className="font-medium">English: </span>
                      Booking is only available on {
                        bookingConfig.bookingWindowDay === 0 ? "Sundays" :
                        bookingConfig.bookingWindowDay === 1 ? "Mondays" :
                        bookingConfig.bookingWindowDay === 2 ? "Tuesdays" :
                        bookingConfig.bookingWindowDay === 3 ? "Wednesdays" :
                        bookingConfig.bookingWindowDay === 4 ? "Thursdays" :
                        bookingConfig.bookingWindowDay === 5 ? "Fridays" :
                        "Saturdays"
                      } between {formatTo12Hour(bookingConfig.bookingWindowStartHour)} and {formatTo12Hour(bookingConfig.bookingWindowEndHour)}. 
                      You can browse available slots but cannot make a reservation at this time.
                    </p>
                    <p>
                      <span className="font-medium">తెలుగు: </span>
                      {
                        bookingConfig.bookingWindowDay === 0 ? "ఆదివారాలు" :
                        bookingConfig.bookingWindowDay === 1 ? "సోమవారాలు" :
                        bookingConfig.bookingWindowDay === 2 ? "మంగళవారాలు" :
                        bookingConfig.bookingWindowDay === 3 ? "బుధవారాలు" :
                        bookingConfig.bookingWindowDay === 4 ? "గురువారాలు" :
                        bookingConfig.bookingWindowDay === 5 ? "శుక్రవారాలు" :
                        "శనివారాలు"
                      } మాత్రమే {formatTo12HourTelugu(bookingConfig.bookingWindowStartHour)} నుండి {formatTo12HourTelugu(bookingConfig.bookingWindowEndHour)} వరకు బుకింగ్ అందుబాటులో ఉంటుంది.
                      మీరు అందుబాటులో ఉన్న స్లాట్‌లను చూడవచ్చు, కానీ ఈ సమయంలో రిజర్వేషన్ చేయలేరు.
                    </p>
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
                    <p>• Booking window: {
                      bookingConfig.bookingWindowDay === 0 ? "Sunday" :
                      bookingConfig.bookingWindowDay === 1 ? "Monday" :
                      bookingConfig.bookingWindowDay === 2 ? "Tuesday" :
                      bookingConfig.bookingWindowDay === 3 ? "Wednesday" :
                      bookingConfig.bookingWindowDay === 4 ? "Thursday" :
                      bookingConfig.bookingWindowDay === 5 ? "Friday" :
                      "Saturday"
                    } from {formatTo12Hour(bookingConfig.bookingWindowStartHour)} to {formatTo12Hour(bookingConfig.bookingWindowEndHour)}</p>
                    <p>• Appointments are not available on {
                      bookingConfig.disabledDays.map((day) => {
                        return day === 0 ? "Sunday" :
                          day === 1 ? "Monday" :
                          day === 2 ? "Tuesday" :
                          day === 3 ? "Wednesday" :
                          day === 4 ? "Thursday" :
                          day === 5 ? "Friday" :
                          "Saturday"
                      }).join(" and ")
                    }</p>
                    <p>• Time slots: {formatTo12Hour(bookingConfig.morningSlotStart)} - {formatTo12Hour(bookingConfig.morningSlotEnd)} and {formatTo12Hour(bookingConfig.afternoonSlotStart)} - {formatTo12Hour(bookingConfig.afternoonSlotEnd)}</p>
                    <p><strong>• If you fail to attend your scheduled appointment, you will not be able to book a new appointment for the next one month.</strong> </p>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-gray-200">
                    <p className="font-medium text-gray-700">తెలుగు:</p>
                    <p>• మీరు వారానికి ఒక అపాయింట్‌మెంట్ మాత్రమే బుక్ చేసుకోగలరు</p>
                    <p>• బుకింగ్ విండో: {
                      bookingConfig.bookingWindowDay === 0 ? "ఆదివారం" :
                      bookingConfig.bookingWindowDay === 1 ? "సోమవారం" :
                      bookingConfig.bookingWindowDay === 2 ? "మంగళవారం" :
                      bookingConfig.bookingWindowDay === 3 ? "బుధవారం" :
                      bookingConfig.bookingWindowDay === 4 ? "గురువారం" :
                      bookingConfig.bookingWindowDay === 5 ? "శుక్రవారం" :
                      "శనివారం"
                    } {
                      bookingConfig.bookingWindowStartHour < 12 ? 
                        `ఉదయం ${bookingConfig.bookingWindowStartHour} గంటల` : 
                      bookingConfig.bookingWindowStartHour >= 12 && bookingConfig.bookingWindowStartHour < 16 ? 
                        `మధ్యాహ్నం ${bookingConfig.bookingWindowStartHour % 12 || 12} గంటల` : 
                      bookingConfig.bookingWindowStartHour >= 16 && bookingConfig.bookingWindowStartHour < 19 ? 
                        `సాయంత్రం ${bookingConfig.bookingWindowStartHour % 12 || 12} గంటల` : 
                        `రాత్రి ${bookingConfig.bookingWindowStartHour % 12 || 12} గంటల`
                    } నుండి {
                      bookingConfig.bookingWindowEndHour < 12 ? 
                        `ఉదయం ${bookingConfig.bookingWindowEndHour} గంటల` : 
                      bookingConfig.bookingWindowEndHour >= 12 && bookingConfig.bookingWindowEndHour < 16 ? 
                        `మధ్యాహ్నం ${bookingConfig.bookingWindowEndHour % 12 || 12} గంటల` : 
                      bookingConfig.bookingWindowEndHour >= 16 && bookingConfig.bookingWindowEndHour < 19 ? 
                        `సాయంత్రం ${bookingConfig.bookingWindowEndHour % 12 || 12} గంటల` : 
                        `రాత్రి ${bookingConfig.bookingWindowEndHour % 12 || 12} గంటల`
                    } వరకు</p>
                    <p>• {
                      bookingConfig.disabledDays.map((day) => {
                        return day === 0 ? "ఆదివారం" :
                          day === 1 ? "సోమవారం" :
                          day === 2 ? "మంగళవారం" :
                          day === 3 ? "బుధవారం" :
                          day === 4 ? "గురువారం" :
                          day === 5 ? "శుక్రవారం" :
                          "శనివారం"
                      }).join(" మరియు ")
                    } అపాయింట్‌మెంట్‌లు అందుబాటులో లేవు</p>
                    <p>• సమయ స్లాట్‌లు: {
                      bookingConfig.morningSlotStart < 12 ? 
                        `ఉదయం ${bookingConfig.morningSlotStart}` : 
                        `మధ్యాహ్నం ${bookingConfig.morningSlotStart % 12 || 12}`
                    } - {
                      bookingConfig.morningSlotEnd < 12 ? 
                        `ఉదయం ${bookingConfig.morningSlotEnd}` : 
                        `మధ్యాహ్నం ${bookingConfig.morningSlotEnd % 12 || 12}`
                    } మరియు {
                      bookingConfig.afternoonSlotStart < 12 ? 
                        `ఉదయం ${bookingConfig.afternoonSlotStart}` : 
                      bookingConfig.afternoonSlotStart >= 12 && bookingConfig.afternoonSlotStart < 16 ? 
                        `మధ్యాహ్నం ${bookingConfig.afternoonSlotStart % 12 || 12}` : 
                        `సాయంత్రం ${bookingConfig.afternoonSlotStart % 12 || 12}`
                    } - {
                      bookingConfig.afternoonSlotEnd < 12 ? 
                        `ఉదయం ${bookingConfig.afternoonSlotEnd}` : 
                      bookingConfig.afternoonSlotEnd >= 12 && bookingConfig.afternoonSlotEnd < 16 ? 
                        `మధ్యాహ్నం ${bookingConfig.afternoonSlotEnd % 12 || 12}` : 
                      bookingConfig.afternoonSlotEnd >= 16 && bookingConfig.afternoonSlotEnd < 19 ? 
                        `సాయంత్రం ${bookingConfig.afternoonSlotEnd % 12 || 12}` : 
                        `రాత్రి ${bookingConfig.afternoonSlotEnd % 12 || 12}`
                    }</p>
                    <p><strong>•మీరు మీ అపాయింట్‌మెంట్ సమయానికి  హాజరు కాలేకపోతే, మీరు తదుపరి ఒక నెల పాటు కొత్త అపాయింట్‌మెంట్‌ను బుక్ చేసుకోలేరు.</strong></p>
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