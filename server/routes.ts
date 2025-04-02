import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth, comparePasswords, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertAppointmentSchema, insertAvailableSlotSchema, insertBookingConfigSchema, User } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user is an admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Get current user's appointments
  app.get("/api/appointments", isAuthenticated, async (req, res) => {
    try {
      const appointments = await storage.getAppointmentsByUser(req.user.id);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  // Get all appointments (admin only)
  app.get("/api/admin/appointments", isAdmin, async (req, res) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  // Create a new appointment
  app.post("/api/appointments", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const appointmentData = insertAppointmentSchema.parse({
        ...req.body,
        userId,
      });

      // Get booking configurations
      const bookingWindowDayConfig = await storage.getBookingConfigurationByKey('booking_window_day');
      const bookingWindowStartHourConfig = await storage.getBookingConfigurationByKey('booking_window_start_hour');
      const bookingWindowEndHourConfig = await storage.getBookingConfigurationByKey('booking_window_end_hour');
      
      // Default values if configurations don't exist
      const bookingWindowDay = bookingWindowDayConfig ? parseInt(bookingWindowDayConfig.value) : 0; // Default: Sunday
      const bookingWindowStartHour = bookingWindowStartHourConfig ? parseInt(bookingWindowStartHourConfig.value) : 8; // Default: 8 AM
      const bookingWindowEndHour = bookingWindowEndHourConfig ? parseInt(bookingWindowEndHourConfig.value) : 9; // Default: 9 AM
      
      // Check if current time is within the booking window
      const now = new Date();
      const currentDay = now.getDay();
      const currentHour = now.getHours();
      
      const isBookingWindow = currentDay === bookingWindowDay && 
                            (currentHour >= bookingWindowStartHour && currentHour < bookingWindowEndHour);
      
      if (!isBookingWindow && !req.user.isAdmin) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return res.status(400).json({ 
          message: `Booking is only available on ${dayNames[bookingWindowDay]} between ${bookingWindowStartHour} AM and ${bookingWindowEndHour} AM` 
        });
      }

      // Check if the user already has an appointment in the same week
      const appointmentDate = new Date(appointmentData.date);
      const startOfWeek = new Date(appointmentDate);
      startOfWeek.setDate(appointmentDate.getDate() - appointmentDate.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
      endOfWeek.setHours(23, 59, 59, 999);
      
      const existingAppointments = await storage.getAppointmentsByDateRange(startOfWeek, endOfWeek);
      const userAppointmentsInWeek = existingAppointments.filter(a => a.userId === userId);
      
      if (userAppointmentsInWeek.length > 0) {
        return res.status(400).json({ message: "You can only book one appointment per week" });
      }

      // Get disabled days configuration
      const disabledDaysConfig = await storage.getBookingConfigurationByKey('disabled_days');
      // Default: Tuesday (2) and Saturday (6)
      const disabledDays = disabledDaysConfig 
        ? disabledDaysConfig.value.split(',').map(d => parseInt(d.trim())) 
        : [2, 6];
      
      // Check if the date is on a disabled day
      const day = appointmentDate.getDay();
      if (disabledDays.includes(day)) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const disabledDayNames = disabledDays.map(d => dayNames[d]).join(' and ');
        return res.status(400).json({ message: `Appointments are not available on ${disabledDayNames}` });
      }

      // Get time slot configurations
      const morningStartConfig = await storage.getBookingConfigurationByKey('morning_slot_start');
      const morningEndConfig = await storage.getBookingConfigurationByKey('morning_slot_end');
      const afternoonStartConfig = await storage.getBookingConfigurationByKey('afternoon_slot_start');
      const afternoonEndConfig = await storage.getBookingConfigurationByKey('afternoon_slot_end');
      
      // Default values if configurations don't exist
      const morningStart = morningStartConfig ? parseInt(morningStartConfig.value) : 9; // Default: 9 AM
      const morningEnd = morningEndConfig ? parseInt(morningEndConfig.value) : 13; // Default: 1 PM
      const afternoonStart = afternoonStartConfig ? parseInt(afternoonStartConfig.value) : 15; // Default: 3 PM
      const afternoonEnd = afternoonEndConfig ? parseInt(afternoonEndConfig.value) : 17; // Default: 5 PM
      
      // Check if the time is in the allowed slots
      const hours = appointmentDate.getHours();
      const minutes = appointmentDate.getMinutes();
      
      const isMorningSlot = (hours >= morningStart && hours < morningEnd) && minutes % 15 === 0;
      const isAfternoonSlot = (hours >= afternoonStart && hours < afternoonEnd) && minutes % 15 === 0;
      
      if (!isMorningSlot && !isAfternoonSlot) {
        return res.status(400).json({ 
          message: `Appointments are only available from ${morningStart} AM - ${morningEnd > 12 ? (morningEnd-12) + ' PM' : morningEnd + ' AM'} and ${afternoonStart > 12 ? (afternoonStart-12) + ' PM' : afternoonStart + ' AM'} - ${afternoonEnd > 12 ? (afternoonEnd-12) + ' PM' : afternoonEnd + ' AM'} in 15-minute intervals` 
        });
      }

      // Check if the slot is available
      const availableSlots = await storage.getAvailableSlotsByDate(appointmentDate);
      const slotIsAvailable = availableSlots.some(
        slot => slot.isEnabled && 
        new Date(slot.date).getTime() === appointmentDate.getTime()
      );
      
      if (!slotIsAvailable) {
        return res.status(400).json({ message: "This slot is not available" });
      }

      // All checks passed, create the appointment
      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Error creating appointment:", error);
        res.status(500).json({ message: "Failed to create appointment" });
      }
    }
  });

  // Get a specific appointment
  app.get("/api/appointments/:id", isAuthenticated, async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Only the appointment owner or an admin can view it
      if (appointment.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointment" });
    }
  });

  // Update an appointment
  app.put("/api/appointments/:id", isAuthenticated, async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Only the appointment owner or an admin can update it
      if (appointment.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedAppointment = await storage.updateAppointment(appointmentId, req.body);
      res.json(updatedAppointment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  // Delete an appointment
  app.delete("/api/appointments/:id", isAuthenticated, async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Only the appointment owner or an admin can delete it
      if (appointment.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteAppointment(appointmentId);
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });

  // Get available slots
  app.get("/api/available-slots", async (req, res) => {
    try {
      const slots = await storage.getAvailableSlots();
      res.json(slots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch available slots" });
    }
  });

  // Create available slots (admin only)
  app.post("/api/available-slots", isAdmin, async (req, res) => {
    try {
      const slotData = insertAvailableSlotSchema.parse(req.body);
      const slot = await storage.createAvailableSlot(slotData);
      res.status(201).json(slot);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Failed to create available slot" });
      }
    }
  });

  // Update an available slot (admin only)
  app.put("/api/available-slots/:id", isAdmin, async (req, res) => {
    try {
      const slotId = parseInt(req.params.id);
      const slot = await storage.updateAvailableSlot(slotId, req.body);
      
      if (!slot) {
        return res.status(404).json({ message: "Slot not found" });
      }
      
      res.json(slot);
    } catch (error) {
      res.status(500).json({ message: "Failed to update slot" });
    }
  });

  // Delete an available slot (admin only)
  app.delete("/api/available-slots/:id", isAdmin, async (req, res) => {
    try {
      const slotId = parseInt(req.params.id);
      const success = await storage.deleteAvailableSlot(slotId);
      
      if (!success) {
        return res.status(404).json({ message: "Slot not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete slot" });
    }
  });

  // Get available slots for a date range
  app.get("/api/available-slots/range", async (req, res) => {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date range" });
      }
      
      const slots = await storage.getAvailableSlotsByDateRange(startDate, endDate);
      res.json(slots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch available slots" });
    }
  });
  
  // Get user profile
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Don't send password to client
    const { password, ...userWithoutPassword } = req.user as User;
    
    res.json(userWithoutPassword);
  });
  
  // Update user profile
  app.patch("/api/user", isAuthenticated, async (req, res) => {
    try {
      const { name, email, phone } = req.body;
      
      // Update user profile (mobile field in database maps to phone in UI)
      const updatedUser = await storage.updateUser(req.user!.id, { 
        name, 
        email,
        mobile: phone
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password to client
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  // Update user password
  app.patch("/api/user/password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Verify current password
      const user = await storage.getUser(req.user!.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password and update
      const hashedPassword = await hashPassword(newPassword);
      const updatedUser = await storage.updateUser(req.user!.id, { password: hashedPassword });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });
  
  // Delete user account
  app.delete("/api/user", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteUser(req.user!.id);
      
      if (!result) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log the user out
      req.logout((err) => {
        if (err) {
          console.error("Error logging out:", err);
          return res.status(500).json({ message: "Error during logout" });
        }
        
        res.json({ message: "User account deleted successfully" });
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user account" });
    }
  });
  
  // Get all booking configurations
  app.get("/api/booking-configurations", async (req, res) => {
    try {
      const configs = await storage.getBookingConfigurations();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking configurations" });
    }
  });
  
  // Get a booking configuration by key
  app.get("/api/booking-configurations/:key", async (req, res) => {
    try {
      const key = req.params.key;
      const config = await storage.getBookingConfigurationByKey(key);
      
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking configuration" });
    }
  });
  
  // Create a new booking configuration (admin only)
  app.post("/api/booking-configurations", isAdmin, async (req, res) => {
    try {
      const configData = insertBookingConfigSchema.parse(req.body);
      
      // Check if configuration with this key already exists
      const existingConfig = await storage.getBookingConfigurationByKey(configData.key);
      if (existingConfig) {
        return res.status(400).json({ message: "Configuration with this key already exists" });
      }
      
      const config = await storage.createBookingConfiguration(configData);
      res.status(201).json(config);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Failed to create booking configuration" });
      }
    }
  });
  
  // Update a booking configuration (admin only)
  app.put("/api/booking-configurations/:id", isAdmin, async (req, res) => {
    try {
      const configId = parseInt(req.params.id);
      const updatedConfig = await storage.updateBookingConfiguration(configId, req.body);
      
      if (!updatedConfig) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      
      res.json(updatedConfig);
    } catch (error) {
      res.status(500).json({ message: "Failed to update booking configuration" });
    }
  });
  
  // Delete a booking configuration (admin only)
  app.delete("/api/booking-configurations/:id", isAdmin, async (req, res) => {
    try {
      const configId = parseInt(req.params.id);
      const success = await storage.deleteBookingConfiguration(configId);
      
      if (!success) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete booking configuration" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
