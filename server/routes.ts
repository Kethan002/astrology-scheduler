import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertAppointmentSchema, insertAvailableSlotSchema } from "@shared/schema";
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

      // Check if current time is within the booking window (Sunday 8-9 AM)
      const now = new Date();
      const currentDay = now.getDay();
      const currentHour = now.getHours();
      
      // Booking is only allowed on Sundays between 8-9 AM
      const isBookingWindow = currentDay === 0 && (currentHour >= 8 && currentHour < 9);
      
      if (!isBookingWindow && !req.user.isAdmin) {
        return res.status(400).json({ 
          message: "Booking is only available on Sunday between 8 AM and 9 AM" 
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

      // Check if the date is a Tuesday or Saturday
      const day = appointmentDate.getDay();
      if (day === 2 || day === 6) { // 2 is Tuesday, 6 is Saturday
        return res.status(400).json({ message: "Appointments are not available on Tuesdays and Saturdays" });
      }

      // Check if the time is in the allowed slots (9 AM - 1 PM or 3 PM - 5 PM)
      const hours = appointmentDate.getHours();
      const minutes = appointmentDate.getMinutes();
      
      const isMorningSlot = (hours >= 9 && hours < 13) && minutes % 15 === 0;
      const isAfternoonSlot = (hours >= 15 && hours < 17) && minutes % 15 === 0;
      
      if (!isMorningSlot && !isAfternoonSlot) {
        return res.status(400).json({ 
          message: "Appointments are only available from 9 AM - 1 PM and 3 PM - 5 PM in 15-minute intervals" 
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

  const httpServer = createServer(app);
  return httpServer;
}
