import { Button } from "@/components/ui/button";
import { format, addMinutes } from "date-fns";
import { formatDate, formatTime } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface BookingSummaryProps {
  selectedDate: Date;
  selectedTime: Date;
  onConfirm: () => void;
  disabled?: boolean;
}

export default function BookingSummary({ selectedDate, selectedTime, onConfirm, disabled = false }: BookingSummaryProps) {
  const { toast } = useToast();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [, setLocation] = useLocation();
  const [mobileInput, setMobileInput] = useState("");
  const [mobileError, setMobileError] = useState<string | null>(null);

  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      const startDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        selectedTime.getHours(),
        selectedTime.getMinutes()
      );
      
      const endDate = addMinutes(startDate, 15);
  
      const appointmentData = {
        date: startDate.toISOString(),
        endTime: endDate.toISOString(),
        duration: 15
      };

      console.log('Attempting to book appointment with data:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        hours: startDate.getHours(),
        minutes: startDate.getMinutes(),
        day: startDate.getDay()
      });

      try {
        const response = await apiRequest('POST', '/api/appointments', appointmentData);
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Booking error details:', {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
          throw new Error(errorData.message || 'Failed to book appointment');
        }
        return await response.json();
      } catch (error) {
        console.error('Booking error:', error);
        throw error;
      }
    },
    onSuccess: (appointment) => {
      toast({
        title: "Appointment Booked!",
        description: "Your appointment has been successfully booked.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/available-slots"] });
      setShowConfirmation(true);
    },
    onError: (error: Error) => {
      console.error("Booking error details:", error);
      let errorMessage = error.message || "This time slot is no longer available. Please select another time.";
      if (errorMessage.toLowerCase().includes("blocked")) {
        errorMessage = `Your account is blocked. Please contact support. / మీ ఖాతా నిరోధించబడింది. సపోర్ట్‌ని సంప్రదించండి.`;
      }    
      toast({
        title: "Booking Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
  
  interface User {
    blockedUntil?: string;
    mobile?: string;
  }

  const [showMobileWarning, setShowMobileWarning] = useState(false);

  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });

  const handleConfirmBooking = () => {
    if (!user?.mobile) {
      setShowMobileWarning(true); 
      setMobileError(null); // Reset any previous errors
      return; 
    }
    if (user?.blockedUntil && new Date(user.blockedUntil) > new Date()) {
      toast({
        title: "Account Blocked / ఖాతా నిరోధించబడింది",
        description: 'Your account has been blocked until next month, due to missed appointment.Please contact support for resolution./హాజరు కాకపోవడం వలన మీ ఖాతా తదుపరి నెల చివరి వరకు నిరోధించబడింది. పరిష్కారం కోసం సపోర్ట్‌ని సంప్రదించండి.',
        variant: "destructive",
      });
      return;
    }
    
    createAppointmentMutation.mutate();
  }

  const handleViewBookings = () => {
    setShowConfirmation(false);
    window.location.href = "/?tab=appointments";
  };

  const mobileUpdateMutation = useMutation({
    mutationFn: async (mobile: string) => {
      try {
        // First check if the mobile number already exists
        const checkResponse = await apiRequest('POST', '/api/check-mobile', { mobile: mobile });
        const checkData = await checkResponse.json();
        
        if (checkData.exists) {
          throw new Error("This mobile number is already linked with another account");
        }
        
        // If mobile doesn't exist, proceed with the update
        const response = await apiRequest('PATCH', '/api/user', { phone: mobile });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update mobile number');
        }
        return await response.json();
      } catch (error) {
        console.error('Mobile update error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Mobile Number Updated",
        description: "Your mobile number has been successfully saved.",
      });
      setShowMobileWarning(false);
    },
    onError: (error: Error) => {
      setMobileError(error.message || "An error occurred while updating your mobile number");
    },
  });

  const handleMobileUpdate = () => {
    // Reset any previous error message
    setMobileError(null);

    if (!mobileInput || !/^\d{10}$/.test(mobileInput)) {
      setMobileError("Please enter a valid 10-digit mobile number.");
      return;
    }
    
    mobileUpdateMutation.mutate(mobileInput);
  };
  
  return (
    <>
      <div className="mt-6 bg-white rounded-lg shadow-md p-4">
        <h3 className="font-heading font-semibold mb-3">Booking Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Date:</span>
            <span className="font-medium">{formatDate(selectedDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Time:</span>
            <span className="font-medium">{formatTime(selectedTime)} - {formatTime(addMinutes(selectedTime, 15))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Duration:</span>
            <span className="font-medium">15 minutes</span>
          </div>
          <div className="pt-3 mt-3 border-t border-gray-200">
            <Button 
              className="w-full"
              onClick={handleConfirmBooking}
              disabled={createAppointmentMutation.isPending || disabled}
            >
              {createAppointmentMutation.isPending ? (
                "Processing..."
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {user?.mobile ? "Confirm Booking" : "Book Your Slot"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showMobileWarning} onOpenChange={setShowMobileWarning}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Information Required</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-red-500">
            Please provide a valid mobile number to contact you regarding your appointment.
            <br />
            దయచేసి మీ అపాయింట్‌మెంట్ గురించి మిమ్మల్ని సంప్రదించడానికి సరైన మొబైల్ నంబర్‌ని అందించండి.
          </p>
          <div className="space-y-2">
            <input
              type="tel"
              placeholder="Enter your mobile number"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-200"
              value={mobileInput}
              onChange={(e) => setMobileInput(e.target.value)}
            />
            {mobileError && (
              <p className="text-red-500 text-sm mt-1">{mobileError}</p>
            )}
          </div>
          <Button
            className="w-full mt-2"
            onClick={handleMobileUpdate}
            disabled={mobileUpdateMutation.isPending}
          >
            {mobileUpdateMutation.isPending ? "Saving..." : "Save Mobile Number"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Booking Confirmed!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Your appointment has been scheduled for</p>
              <p className="text-xl font-medium text-gray-800">{formatDate(selectedDate)}</p>
              <p className="text-lg font-medium text-primary">{formatTime(selectedTime)} - {formatTime(addMinutes(selectedTime, 15))}</p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-md">
              <p className="text-sm text-yellow-800 mb-2">Important Notice:</p>
              <p className="text-sm text-yellow-800">Please do not cancel your appointment. If you cancel, you will not be able to book another appointment in the same week.</p>
              <p className="text-sm text-yellow-800 mt-2">దయచేసి మీ అపాయింట్‌మెంట్‌ని రద్దు చేయవద్దు. మీరు రద్దు చేస్తే, మీరు అదే వారంలో మరో అపాయింట్‌మెంట్‌ని బుక్ చేయలేరు.</p>
            </div>

            <Button 
              className="w-full"
              onClick={handleViewBookings}
            >
              View My Bookings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}