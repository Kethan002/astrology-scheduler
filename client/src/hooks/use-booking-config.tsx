import { useQuery } from "@tanstack/react-query";

export interface BookingConfig {
  id: number;
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

export function useBookingConfig() {
  const { data: configs = [], isLoading, error } = useQuery<BookingConfig[]>({
    queryKey: ["/api/booking-configurations"],
    staleTime: 1000 * 60, // 1 minute
  });
  
  // Helper function to get configuration value by key
  const getConfig = (key: string, defaultValue: string): string => {
    const config = configs.find(c => c.key === key);
    return config ? config.value : defaultValue;
  };
  
  // Parse configuration values
  const bookingWindowDay = parseInt(getConfig("booking_window_day", "0")); // Default: Sunday (0)
  const bookingWindowStartHour = parseInt(getConfig("booking_window_start_hour", "8")); // Default: 8 AM
  const bookingWindowEndHour = parseInt(getConfig("booking_window_end_hour", "9")); // Default: 9 AM
  const disabledDays = getConfig("disabled_days", "2,6") // Default: Tuesday (2) and Saturday (6)
    .split(",")
    .map(d => parseInt(d.trim()));
  const morningSlotStart = parseInt(getConfig("morning_slot_start", "9")); // Default: 9 AM
  const morningSlotEnd = parseInt(getConfig("morning_slot_end", "13")); // Default: 1 PM
  const afternoonSlotStart = parseInt(getConfig("afternoon_slot_start", "15")); // Default: 3 PM
  const afternoonSlotEnd = parseInt(getConfig("afternoon_slot_end", "17")); // Default: 5 PM
  
  return {
    isLoading,
    error,
    configs,
    getConfig,
    bookingWindowDay,
    bookingWindowStartHour,
    bookingWindowEndHour,
    disabledDays,
    morningSlotStart,
    morningSlotEnd,
    afternoonSlotStart,
    afternoonSlotEnd,
    
    // Helper functions using configurations
    isWithinBookingWindow: () => {
      const now = new Date();
      const currentDay = now.getDay();
      const currentHour = now.getHours();
      
      return currentDay === bookingWindowDay && 
             (currentHour >= bookingWindowStartHour && currentHour < bookingWindowEndHour);
    },
    
    isDisabledDay: (date: Date) => {
      return disabledDays.includes(date.getDay());
    },
    
    isValidTimeSlot: (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      
      const isMorningSlot = (hours >= morningSlotStart && hours < morningSlotEnd) && minutes % 15 === 0;
      const isAfternoonSlot = (hours >= afternoonSlotStart && hours < afternoonSlotEnd) && minutes % 15 === 0;
      
      return isMorningSlot || isAfternoonSlot;
    },
    
    getTimeSlots: (date: Date) => {
      const slots: Date[] = [];
      const day = new Date(date);
      
      // Morning slots
      for (let h = morningSlotStart; h < morningSlotEnd; h++) {
        for (let m = 0; m < 60; m += 15) {
          const slotTime = new Date(day);
          slotTime.setHours(h, m, 0, 0);
          slots.push(slotTime);
        }
      }
      
      // Afternoon slots
      for (let h = afternoonSlotStart; h < afternoonSlotEnd; h++) {
        for (let m = 0; m < 60; m += 15) {
          const slotTime = new Date(day);
          slotTime.setHours(h, m, 0, 0);
          slots.push(slotTime);
        }
      }
      
      return slots;
    }
  };
}