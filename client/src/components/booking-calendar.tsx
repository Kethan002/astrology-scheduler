import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addDays,
  startOfWeek,
  getDay,
  isAfter,
  isBefore
} from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useBookingConfig } from "@/hooks/use-booking-config";

interface BookingCalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

export default function BookingCalendar({ selectedDate, onSelectDate }: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Use booking configuration hook for dynamic settings
  const { isDisabledDay } = useBookingConfig();
  
  // Fetch available slots from the API
  const { data: availableSlots = [] } = useQuery<Array<{date: string, isEnabled: boolean}>>({
    queryKey: ["/api/available-slots"],
  });
  
  // Go to previous month
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  // Go to next month
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  // Check if a date is available for booking
  const isDateAvailable = (date: Date): boolean => {
    // Check if the day is disabled according to configuration
    if (isDisabledDay(date)) {
      return false;
    }
    
    // Only future dates are available
    if (isBefore(date, new Date())) {
      return false;
    }
    
    // Check if there's an available slot for this date
    return availableSlots.some((slot: {date: string, isEnabled: boolean}) => {
      const slotDate = new Date(slot.date);
      return isSameDay(date, slotDate) && slot.isEnabled;
    });
  };
  
  // Generate calendar days
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    
    // Get all days from start to end of month
    const monthDays = eachDayOfInterval({
      start: monthStart,
      end: monthEnd,
    });
    
    // Calculate days from previous month to fill first row
    const prevMonthDays: Date[] = [];
    let prevMonthFillDays = getDay(monthStart);
    let prevDay = startDate;
    
    for (let i = 0; i < prevMonthFillDays; i++) {
      prevMonthDays.push(prevDay);
      prevDay = addDays(prevDay, 1);
    }
    
    // Calculate days from next month to fill last row
    const totalDaysShown = Math.ceil((prevMonthFillDays + monthDays.length) / 7) * 7;
    const nextMonthDays: Date[] = [];
    let nextDay = addDays(monthEnd, 1);
    
    for (let i = 0; i < totalDaysShown - prevMonthFillDays - monthDays.length; i++) {
      nextMonthDays.push(nextDay);
      nextDay = addDays(nextDay, 1);
    }
    
    // Combine all days
    const calendarDays = [...prevMonthDays, ...monthDays, ...nextMonthDays];
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day: Date, index: number) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const available = isDateAvailable(day);
          
          return (
            <div key={index} className="relative text-center">
              <button
                className={cn(
                  "h-10 w-10 rounded-full mx-auto flex items-center justify-center",
                  isCurrentMonth ? "text-gray-800" : "text-gray-300",
                  isToday && "border border-gray-300",
                  isSelected && "bg-primary text-white",
                  !isCurrentMonth || !available
                    ? "bg-gray-50 cursor-not-allowed text-gray-300"
                    : "hover:bg-primary-light hover:text-white",
                )}
                disabled={!isCurrentMonth || !available}
                onClick={() => onSelectDate(day)}
              >
                {format(day, "d")}
              </button>
              {isCurrentMonth && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                  <span 
                    className={cn(
                      "block h-1 w-1 rounded-full",
                      isSelected 
                        ? "bg-white" 
                        : available
                          ? "bg-green-500"
                          : "bg-gray-300"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-heading font-semibold text-lg">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Days of the week */}
      <div className="grid grid-cols-7 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day: string, index: number) => (
          <div key={index} className="text-center text-gray-500 text-sm py-2">{day}</div>
        ))}
      </div>
      
      {/* Calendar */}
      {renderCalendar()}
      
      {/* Calendar legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-3">
        <div className="flex items-center">
          <span className="h-3 w-3 rounded-full bg-green-500 mr-2"></span>
          <span className="text-sm text-gray-500">Available</span>
        </div>
        <div className="flex items-center">
          <span className="h-3 w-3 rounded-full bg-gray-300 mr-2"></span>
          <span className="text-sm text-gray-500">Unavailable</span>
        </div>
        <div className="flex items-center">
          <span className="h-3 w-3 rounded-full bg-primary mr-2"></span>
          <span className="text-sm text-gray-500">Selected</span>
        </div>
      </div>
    </div>
  );
}
