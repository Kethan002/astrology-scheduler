import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { startOfWeek, endOfWeek, format, addDays, setHours, setMinutes, isSameDay, differenceInMinutes } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function formatAppointmentId(date: Date, time: string): string {
  return `AST-${format(date, 'yyyyMMdd')}-${time.replace(':', '')}`;
}

export function formatPhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
}

export function isValidTimeSlot(date: Date): boolean {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  // Check if time is in allowed ranges (9-13 or 15-17)
  const isMorningSlot = (hours >= 9 && hours < 13);
  const isAfternoonSlot = (hours >= 15 && hours < 17);
  
  // Check if minutes are in 15 minute intervals (0, 15, 30, 45)
  const isValidInterval = minutes % 15 === 0;
  
  // Check if day is not Tuesday (2) or Saturday (6)
  const day = date.getDay();
  const isValidDay = day !== 2 && day !== 6;
  
  return (isMorningSlot || isAfternoonSlot) && isValidInterval && isValidDay;
}

export function getTimeSlots(date: Date): Date[] {
  const slots: Date[] = [];
  
  // Morning slots (9 AM - 1 PM)
  for (let hour = 9; hour < 13; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const slot = new Date(date);
      slot.setHours(hour, minute, 0, 0);
      slots.push(slot);
    }
  }
  
  // Afternoon slots (3 PM - 5 PM)
  for (let hour = 15; hour < 17; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const slot = new Date(date);
      slot.setHours(hour, minute, 0, 0);
      slots.push(slot);
    }
  }
  
  return slots;
}

export function formatTime(date: Date): string {
  return format(date, "h:mm a");
}

export function formatDate(date: Date): string {
  return format(date, "EEEE, MMMM d, yyyy");
}

export function getWeekDates(date: Date): Date[] {
  const start = startOfWeek(date);
  const week: Date[] = [];
  
  for (let i = 0; i < 7; i++) {
    week.push(addDays(start, i));
  }
  
  return week;
}

export function getCurrentWeekRange(date: Date): { start: Date; end: Date } {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  return { start, end };
}

export function getSlotDuration(start: Date, end: Date): string {
  const minutes = differenceInMinutes(end, start);
  return `${minutes} minutes`;
}

export function getSlotStatus(date: Date, availableSlots: any[]): 'available' | 'unavailable' | 'selected' {
  // Replace with your logic to determine if a slot is available, unavailable, or selected
  return 'available';
}
