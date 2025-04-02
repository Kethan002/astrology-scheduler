import { useEffect, useState } from "react";
import { format, isSameDay, isBefore, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getTimeSlots } from "@/lib/utils";
import { Sun, Moon } from "lucide-react";

interface TimeSlotsProps {
  selectedDate: Date;
  selectedTime: Date | null;
  onSelectTime: (time: Date) => void;
}

export default function TimeSlots({ selectedDate, selectedTime, onSelectTime }: TimeSlotsProps) {
  // Get all possible time slots for the selected date
  const timeSlots = getTimeSlots(selectedDate);
  
  // Fetch available slots from the API
  const { data: availableSlots = [] } = useQuery({
    queryKey: ["/api/available-slots"],
  });
  
  // Check if a time slot is available
  const isSlotAvailable = (slot: Date) => {
    // Check if slot is in the past
    if (isBefore(slot, new Date())) {
      return false;
    }
    
    // Check if there's an available slot for this time
    return availableSlots.some((availableSlot: any) => {
      const slotDate = new Date(availableSlot.date);
      return isSameDay(slot, slotDate) && 
             slot.getHours() === slotDate.getHours() && 
             slot.getMinutes() === slotDate.getMinutes() &&
             availableSlot.isEnabled;
    });
  };
  
  // Separate slots into morning and afternoon
  const morningSlots = timeSlots.filter(slot => slot.getHours() < 12 || (slot.getHours() === 12 && slot.getMinutes() === 0));
  const afternoonSlots = timeSlots.filter(slot => slot.getHours() >= 12 && !(slot.getHours() === 12 && slot.getMinutes() === 0));
  
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
          <span className="text-sm ml-2">(9:00 AM - 1:00 PM)</span>
        </h4>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {morningSlots.map((slot, index) => {
            const isAvailable = isSlotAvailable(slot);
            const isSelected = selectedTime && isSameDay(slot, selectedTime) && 
                               slot.getHours() === selectedTime.getHours() && 
                               slot.getMinutes() === selectedTime.getMinutes();
            
            return (
              <button
                key={index}
                className={cn(
                  "text-center py-2 rounded-md border text-sm",
                  isSelected
                    ? "border-primary bg-blue-50 text-primary font-medium"
                    : isAvailable
                      ? "border-gray-200 hover:border-primary hover:bg-blue-50"
                      : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                )}
                disabled={!isAvailable}
                onClick={() => onSelectTime(slot)}
              >
                {format(slot, "h:mm a")}
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
          <span className="text-sm ml-2">(3:00 PM - 5:00 PM)</span>
        </h4>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {afternoonSlots.map((slot, index) => {
            const isAvailable = isSlotAvailable(slot);
            const isSelected = selectedTime && isSameDay(slot, selectedTime) && 
                               slot.getHours() === selectedTime.getHours() && 
                               slot.getMinutes() === selectedTime.getMinutes();
            
            return (
              <button
                key={index}
                className={cn(
                  "text-center py-2 rounded-md border text-sm",
                  isSelected
                    ? "border-primary bg-blue-50 text-primary font-medium"
                    : isAvailable
                      ? "border-gray-200 hover:border-primary hover:bg-blue-50"
                      : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                )}
                disabled={!isAvailable}
                onClick={() => onSelectTime(slot)}
              >
                {format(slot, "h:mm a")}
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
          <div className="w-4 h-4 rounded border border-gray-200 mr-2"></div>
          <span className="text-sm text-gray-500">Available</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded border border-gray-200 bg-gray-50 mr-2"></div>
          <span className="text-sm text-gray-500">Unavailable</span>
        </div>
      </div>
    </div>
  );
}
