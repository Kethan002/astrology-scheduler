import { useEffect, useState } from "react";
import { format, isSameDay, isBefore, addMinutes, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Sun, Moon } from "lucide-react";
import { useBookingConfig } from "@/hooks/use-booking-config";

interface TimeSlotsProps {
  selectedDate: Date;
  selectedTime: Date | null;
  onSelectTime: (time: Date) => void;
  disabled?: boolean;
}

interface AvailableSlot {
  date: string;
  isEnabled: boolean;
  isBooked: boolean;
  status: 'booked' | 'available' | 'disabled';
}

interface Appointment {
  date: string;
  status: string;
  userId: number;
}

export default function TimeSlots({ selectedDate, selectedTime, onSelectTime, disabled = false }: TimeSlotsProps) {
  // Use the booking configuration hook
  const { 
    getTimeSlots, 
    morningSlotStart, 
    morningSlotEnd, 
    afternoonSlotStart, 
    afternoonSlotEnd,
    isValidTimeSlot
  } = useBookingConfig();
  
  // Get all possible time slots for the selected date based on configuration
  const timeSlots = getTimeSlots(selectedDate);
  
  // Fetch available slots and existing appointments from the API
  const { data: availableSlots = [], isLoading: isLoadingSlots } = useQuery({
    queryKey: ["/api/available-slots", selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/available-slots?date=${selectedDate.toISOString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch available slots");
      }
      return response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchIntervalInBackground: true, // Continue refetching even when tab is not active
    staleTime: 0, // Consider data stale immediately
    gcTime: 0, // Don't cache the data
  });
  
  // Fetch existing appointments
  const { data: existingAppointments = [] } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      const response = await fetch("/api/appointments");
      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }
      return response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchIntervalInBackground: true, // Continue refetching even when tab is not active
    staleTime: 0, // Consider data stale immediately
    gcTime: 0, // Don't cache the data
  });

  // Check if user has an appointment in the same week
  const hasAppointmentInWeek = (date: Date): boolean => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);
    
    return existingAppointments.some((appointment: Appointment) => {
      const appointmentDate = new Date(appointment.date);
      return appointment.status !== 'cancelled' &&
             appointmentDate >= startOfWeek &&
             appointmentDate <= endOfWeek;
    });
  };

  // Check if a slot is already booked
  const isSlotBooked = (slot: Date): boolean => {
    return availableSlots.some((availableSlot: AvailableSlot) => {
      const slotDate = new Date(availableSlot.date);
      return isSameDay(slotDate, slot) && 
             slotDate.getHours() === slot.getHours() && 
             slotDate.getMinutes() === slot.getMinutes() &&
             availableSlot.isBooked;
    });
  };

  // Get the reason why a slot is unavailable
  const getSlotUnavailabilityReason = (slot: Date): string | null => {
    if (isBefore(slot, new Date())) {
      return "This time slot is in the past";
    }
    
    if (!isValidTimeSlot(slot)) {
      return "This time slot is outside booking hours";
    }

    if (isSlotBooked(slot)) {
      return "This time slot is already booked";
    }

    if (hasAppointmentInWeek(slot)) {
      return "You can only book one appointment per week";
    }
    
    return null;
  };

  // Check if a time slot is available
  const isSlotAvailable = (slot: Date): boolean => {
    const now = new Date();
    
    // Only disable past slots for today's date
    if (isSameDay(slot, now) && isBefore(slot, now)) {
      return false;
    }
    
    // Check if the slot exists and is enabled in availableSlots
    const slotExists = availableSlots.some((availableSlot: AvailableSlot) => {
      const availableSlotDate = new Date(availableSlot.date);
      return isSameDay(availableSlotDate, slot) && 
             availableSlotDate.getHours() === slot.getHours() && 
             availableSlotDate.getMinutes() === slot.getMinutes() &&
             availableSlot.isEnabled &&
             !availableSlot.isBooked;
    });
    
    if (!slotExists) {
      return false;
    }
    
    // For future slots that exist and are enabled, they are available
    return true;
  };

  // Get slot status for UI display
  const getSlotStatus = (slot: Date): { isAvailable: boolean; reason?: string } => {
    const now = new Date();
    
    // Check if slot is today and in the past
    if (isSameDay(slot, now) && isBefore(slot, now)) {
      return { isAvailable: false, reason: "This time slot is in the past" };
    }
    
    // Check if the slot is valid according to booking configuration
    if (!isValidTimeSlot(slot)) {
      return { isAvailable: false, reason: "This time slot is outside booking hours" };
    }

    // Check if the slot is booked
    if (isSlotBooked(slot)) {
      return { isAvailable: false, reason: "This time slot is already booked" };
    }

    // Check if the slot exists and is enabled in availableSlots
    const slotExists = availableSlots.some((availableSlot: AvailableSlot) => {
      const availableSlotDate = new Date(availableSlot.date);
      return isSameDay(availableSlotDate, slot) && 
             availableSlotDate.getHours() === slot.getHours() && 
             availableSlotDate.getMinutes() === slot.getMinutes() &&
             availableSlot.isEnabled;
    });
    
    if (!slotExists) {
      return { isAvailable: false, reason: "This time slot is not available" };
    }

    // Check if user already has an appointment this week
    if (hasAppointmentInWeek(slot)) {
      return { isAvailable: false, reason: "You already have an appointment this week" };
    }
    
    // For future slots that exist and are enabled, they are available
    return { isAvailable: true };
  };
  
  // Separate slots into morning and afternoon based on configuration
  const morningSlots = timeSlots.filter((slot: Date) => {
    const hour = slot.getHours();
    return hour >= morningSlotStart && hour < morningSlotEnd;
  });
  
  const afternoonSlots = timeSlots.filter((slot: Date) => {
    const hour = slot.getHours();
    return hour >= afternoonSlotStart && hour < afternoonSlotEnd;
  });
  
  // Check if a slot is in the past
  const isPastSlot = (slot: Date): boolean => {
    const now = new Date();
    return isSameDay(slot, now) && isBefore(slot, now);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-heading font-semibold text-lg">Available Time Slots</h3>
        <div className="text-sm text-gray-500">{format(selectedDate, "EEEE, MMMM d")}</div>
      </div>
      
      {/* Morning slots */}
      <div className="mb-6">
        <h4 className="flex items-center text-gray-500 mb-3">
          <Sun className="h-4 w-4 text-yellow-500 mr-2" />
          <span>Morning</span>
          <span className="text-sm ml-2">
            ({morningSlotStart}:00 {morningSlotStart < 12 ? 'AM' : 'PM'} - {morningSlotEnd > 12 ? (morningSlotEnd-12) : morningSlotEnd}:00 {morningSlotEnd < 12 ? 'AM' : 'PM'})
          </span>
        </h4>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {morningSlots.map((slot: Date, index: number) => {
            const isAvailable = isSlotAvailable(slot);
            const isSelected = selectedTime && isSameDay(slot, selectedTime) && 
                               slot.getHours() === selectedTime.getHours() && 
                               slot.getMinutes() === selectedTime.getMinutes();
            
            const slotStatus = getSlotStatus(slot);
            const isBooked = isSlotBooked(slot);
            
            return (
              <button
                key={index}
                className={cn(
                  "text-center py-2 rounded-md border text-sm relative",
                  isSelected
                    ? "border-primary bg-blue-50 text-primary font-medium"
                    : isPastSlot(slot)
                      ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                      : isBooked
                        ? "border-red-200 bg-red-50 text-gray-400 cursor-not-allowed"
                        : !slotStatus.isAvailable
                          ? hasAppointmentInWeek(slot)
                            ? "border-yellow-200 bg-yellow-50 text-gray-400 cursor-not-allowed"
                            : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                          : !disabled
                            ? "border-gray-200 hover:border-primary hover:bg-blue-50"
                            : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                )}
                disabled={isBooked || !slotStatus.isAvailable || disabled}
                onClick={() => onSelectTime(slot)}
                title={slotStatus.reason || "Click to select this time"}
              >
                {format(slot, "h:mm a")}
                {isBooked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded">Booked</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Afternoon slots */}
      <div>
        <h4 className="flex items-center text-gray-500 mb-3">
          <Moon className="h-4 w-4 text-blue-600 mr-2" />
          <span>Afternoon</span>
          <span className="text-sm ml-2">
            ({afternoonSlotStart > 12 ? (afternoonSlotStart-12) : afternoonSlotStart}:00 {afternoonSlotStart < 12 ? 'AM' : 'PM'} - {afternoonSlotEnd > 12 ? (afternoonSlotEnd-12) : afternoonSlotEnd}:00 {afternoonSlotEnd < 12 ? 'AM' : 'PM'})
          </span>
        </h4>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {afternoonSlots.map((slot: Date, index: number) => {
            const isAvailable = isSlotAvailable(slot);
            const isSelected = selectedTime && isSameDay(slot, selectedTime) && 
                               slot.getHours() === selectedTime.getHours() && 
                               slot.getMinutes() === selectedTime.getMinutes();
            
            const slotStatus = getSlotStatus(slot);
            const isBooked = isSlotBooked(slot);
            
            return (
              <button
                key={index}
                className={cn(
                  "text-center py-2 rounded-md border text-sm relative",
                  isSelected
                    ? "border-primary bg-blue-50 text-primary font-medium"
                    : isPastSlot(slot)
                      ? "border-gray-300 bg-gray-200 text-gray-400 cursor-not-allowed"
                      : isBooked
                        ? "border-red-200 bg-red-50 text-gray-400 cursor-not-allowed"
                        : !slotStatus.isAvailable
                          ? hasAppointmentInWeek(slot)
                            ? "border-yellow-200 bg-yellow-50 text-gray-400 cursor-not-allowed"
                            : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                          : !disabled
                            ? "border-gray-200 hover:border-primary hover:bg-blue-50"
                            : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                )}
                disabled={isBooked || !slotStatus.isAvailable || disabled}
                onClick={() => onSelectTime(slot)}
                title={slotStatus.reason || "Click to select this time"}
              >
                {format(slot, "h:mm a")}
                {isBooked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded">Booked</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Time slots legend */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-4">
        <div className="flex items-center">
          <div className="w-4 h-4 rounded border border-primary bg-blue-50 mr-2"></div>
          <span className="text-sm text-gray-500">Selected</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded border border-red-200 bg-red-50 mr-2"></div>
          <span className="text-sm text-gray-500">Booked</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded border border-yellow-200 bg-yellow-50 mr-2"></div>
          <span className="text-sm text-gray-500">Weekly Limit</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded border border-gray-300 bg-gray-100 mr-2"></div>
          <span className="text-sm text-gray-500">Past</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded border border-gray-200 bg-gray-50 mr-2"></div>
          <span className="text-sm text-gray-500">Unavailable</span>
        </div>
      </div>
    </div>
  );
}
