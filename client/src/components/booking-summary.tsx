import { Button } from "@/components/ui/button";
import { format, addMinutes } from "date-fns";
import { formatDate, formatTime } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Check } from "lucide-react";

interface BookingSummaryProps {
  selectedDate: Date;
  selectedTime: Date;
  onConfirm: () => void;
  disabled?: boolean;
}

export default function BookingSummary({ selectedDate, selectedTime, onConfirm, disabled = false }: BookingSummaryProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      const endTime = addMinutes(selectedTime, 15);
      const appointmentData = {
        date: selectedTime.toISOString(),
        endTime: endTime.toISOString(),
      };
      
      const res = await apiRequest("POST", "/api/appointments", appointmentData);
      return await res.json();
    },
    onSuccess: (appointment) => {
      toast({
        title: "Appointment Booked!",
        description: "Your appointment has been successfully booked.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      navigate(`/confirmation?id=${appointment.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleConfirmBooking = () => {
    createAppointmentMutation.mutate();
  };
  
  return (
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
                Confirm Booking
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
