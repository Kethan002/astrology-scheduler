import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth, comparePasswords, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertAppointmentSchema, insertAvailableSlotSchema, User } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import nodemailer from "nodemailer";
import crypto from "crypto";

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

// OTP Storage (in-memory for simplicity, consider using Redis in production)
const otpStore: Record<string, { otp: string, createdAt: number }> = {};

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Send OTP for registration
  app.post("/api/send-otp", async (req, res) => {
    try {
      const { email } = req.body;
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Generate OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      
      // Store OTP with timestamp
      otpStore[email] = {
        otp,
        createdAt: Date.now()
      };

      // Send OTP via email
      await transporter.sendMail({
        from: 'veldandikethankumar@gmail.com',
        to: email,
        subject: 'Your OTP for Registration',
        text: `Your OTP is ${otp}. It will expire in 3 minutes.`
      });

      res.json({ message: "OTP sent successfully" });
    } catch (error) {
      console.error("OTP sending error:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  // Verify OTP for registration
  app.post("/api/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      
      const storedOtp = otpStore[email];
      
      if (!storedOtp) {
        return res.status(400).json({ valid: false, message: "No OTP found" });
      }

      // Check OTP expiry (3 minutes)
      const currentTime = Date.now();
      if (currentTime - storedOtp.createdAt > 3 * 60 * 1000) {
        delete otpStore[email];
        return res.status(400).json({ valid: false, message: "OTP expired" });
      }

      // Verify OTP
      const valid = storedOtp.otp === otp;
      if (valid) {
        delete otpStore[email]; // Clear OTP after successful verification
      }

      res.json({ valid });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ valid: false, message: "OTP verification failed" });
    }
  });

  // Send OTP for Forgot Password
  app.post("/api/send-forgot-password-otp", async (req, res) => {
    try {
      const { email } = req.body;
      
      // Check if email exists
      const existingUser = await storage.getUserByEmail(email);
      if (!existingUser) {
        return res.status(404).json({ exists: false, message: "Email not registered" });
      }

      // Generate OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      
      // Store OTP with timestamp
      otpStore[email] = {
        otp,
        createdAt: Date.now()
      };

      // Send OTP via email
      await transporter.sendMail({
        from: 'veldandikethankumar@gmail.com',
        to: email,
        subject: 'Your OTP for Password Reset',
        text: `Your OTP is ${otp}. It will expire in 3 minutes.`
      });

      res.json({ exists: true, message: "OTP sent successfully" });
    } catch (error) {
      console.error("Forgot Password OTP sending error:", error);
      res.status(500).json({ exists: false, message: "Failed to send OTP" });
    }
  });

  // Verify OTP for Forgot Password
  app.post("/api/verify-forgot-password-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      
      const storedOtp = otpStore[email];
      
      if (!storedOtp) {
        return res.status(400).json({ valid: false, message: "No OTP found" });
      }

      // Check OTP expiry (3 minutes)
      const currentTime = Date.now();
      if (currentTime - storedOtp.createdAt > 3 * 60 * 1000) {
        delete otpStore[email];
        return res.status(400).json({ valid: false, message: "OTP expired" });
      }

      // Verify OTP
      const valid = storedOtp.otp === otp;
      if (valid) {
        delete otpStore[email]; // Clear OTP after successful verification
      }

      res.json({ valid });
    } catch (error) {
      console.error("Forgot Password OTP verification error:", error);
      res.status(500).json({ valid: false, message: "OTP verification failed" });
    }
  });

  // Update Forgot Password
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashedPassword });
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Cancel an appointment
  app.delete("/api/appointments/:id", isAuthenticated, async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Only allow users to cancel their own appointments or admins to cancel any appointment
      if (appointment.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "You can only cancel your own appointments" });
      }
      
      // Delete the appointment
      await storage.deleteAppointment(appointmentId);
      
      res.json({ message: "Appointment cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      res.status(500).json({ message: "Failed to cancel appointment" });
    }
  });

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
        
        const appointmentsWithUsers = appointments.map(appointment => ({
          ...appointment,
          user: appointment.user ? {
            name: appointment.user.name,
            address: appointment.user.address,
            phone: appointment.user.mobile || 'N/A',
            blockedUntil: appointment.user.blockedUntil,
          } : null
        }));
        
        res.json(appointmentsWithUsers);
      } catch (error) {
        console.error("Error fetching appointments:", error);
        res.status(500).json({ message: "Failed to fetch appointments" });
      }
    });

    

    app.post("/api/check-email", async (req, res) => {
      try {
        const { email } = req.body;
        const user = await storage.getUserByEmail(email);
        res.json({ exists: !!user });
      } catch (error) {
        console.error("Email check error:", error);
        res.status(500).json({ message: "Error checking email address" });
      }
    });

    app.post("/api/check-mobile", async (req, res) => {
      try {
        const { mobile } = req.body;
        const user = await storage.getUserByMobile(mobile);
        res.json({ exists: !!user });
      } catch (error) {
        console.error("Mobile check error:", error);
        res.status(500).json({ message: "Error checking mobile number" });
      }
    });

    app.post("/api/forgot-password", async (req, res) => {
      try {
        const { mobile, newPassword } = req.body;
        
        // Find user by mobile
        const user = await storage.getUserByMobile(mobile);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
    
        // Update password
        const hashedPassword = await hashPassword(newPassword);
        await storage.updateUser(user.id, { password: hashedPassword });
        
        res.json({ message: "Password updated successfully" });
      } catch (error) {
        console.error("Password reset error:", error);
        res.status(500).json({ message: "Failed to reset password" });
      }
    });

    const morningStart = 9;  // 9 AM
    const morningEnd = 13;   // 1 PM
    const afternoonStart = 15; // 3 PM
    const afternoonEnd = 17;   // 5 PM

    // Create a new appointment
  // This is the updated code for the appointment creation endpoint in routes.ts
  // It includes sending email notifications to users after booking

  // Create a new appointment
  app.post("/api/appointments", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Add block check here ------------
      const user = await storage.getUser(userId);
      if (user?.blockedUntil && new Date(user.blockedUntil) > new Date()) {
        const blockedDate = new Date(user.blockedUntil).toLocaleDateString();
        return res.status(403).json({ 
          message: `Your account is blocked until ${blockedDate}. Please contact support. / మీ ఖాతా ${blockedDate} వరకు నిరోధించబడింది. దయచేసి సపోర్ట్‌ని సంప్రదించండి.`
        });
      }
      // End of block check --------------
      
      const appointmentData = insertAppointmentSchema.parse({
        ...req.body,
        userId,
        date: new Date(req.body.date),
        endTime: new Date(req.body.endTime),
      });

      // No booking window restriction - users can book anytime

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
      const appointmentTime = new Date(appointmentData.date);
      
      // Make sure the date is valid before extracting hours/minutes
      if (isNaN(appointmentTime.getTime())) {
        return res.status(400).json({ message: "Invalid appointment time format" });
      }
      
      const hours = appointmentTime.getHours();
      const minutes = appointmentTime.getMinutes();

      console.log("Appointment validation:", {
        appointmentTime: appointmentTime.toISOString(),
        hours,
        minutes,
        morningSlot: `${morningStart}:00 - ${morningEnd}:00`,
        afternoonSlot: `${afternoonStart}:00 - ${afternoonEnd}:00`
      });

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

      // Check if there's already an appointment at this time
      const existingAppointmentsAtTime = await storage.getAppointmentsByDate(appointmentDate);
      const hasConflict = existingAppointmentsAtTime.some(a => 
        a.status !== 'cancelled' && 
        new Date(a.date).getTime() === appointmentDate.getTime()
      );
      
      if (hasConflict) {
        return res.status(400).json({ message: "This slot is already booked" });
      }

      // All checks passed, create the appointment
      const appointment = await storage.createAppointment(appointmentData);
      
      // Send confirmation email to the user
      if (user && user.email) {
        try {
          // Format appointment date and time for email
          const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          
          const formattedStartTime = appointmentDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
          });
          
          const endTime = new Date(appointmentData.endTime);
          const formattedEndTime = endTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
          });

          // Create email content
          // Create email content
          const emailSubject = 'Your Appointment Confirmation';
          const emailBody = `
          Dear ${user.name || 'User'},

          Your appointment has been successfully booked.

          Appointment Details:
          - Date: ${formattedDate}
          - Time: ${formattedStartTime} - ${formattedEndTime}
          - Duration: 15 minutes

          Important Rules & Information:
          1. Time Slots: Appointments are available between 9:00 AM - 1:00 PM and 3:00 PM - 5:00 PM in 15-minute intervals
          2. Weekly Limit: Only one appointment per week is allowed
          3. Blocked Days: No appointments available on Tuesdays and Saturdays
          4. Cancellation Policy: 
            - If you cancel an appointment, you cannot book another in the same week
            - Repeated cancellations may lead to account suspension

          Please arrive 5 minutes before your scheduled time. Late arrivals may result in appointment cancellation.

          For any questions or changes, please contact our support team.

          Thank you,
          The Appointment Team

          --
          ప్రియమైన ${user.name || 'వినియోగదారు'},

          మీ అపాయింట్‌మెంట్ విజయవంతంగా బుక్ చేయబడింది.

          అపాయింట్‌మెంట్ వివరాలు:
          - తేదీ: ${formattedDate}
          - సమయం: ${formattedStartTime} - ${formattedEndTime}
          - వ్యవధి: 15 నిమిషాలు

          ముఖ్యమైన నియమాలు & సమాచారం:
          1. సమయ స్లాట్లు: అపాయింట్‌మెంట్లు 9:00 AM - 1:00 PM మరియు 3:00 PM - 5:00 PM మధ్య 15-నిమిష అంతరాల్లో లభ్యం
          2. వారపు పరిమితి: వారానికి ఒక అపాయింట్‌మెంట్ మాత్రమే బుక్ చేయగలరు
          3. నిషేధిత రోజులు: మంగళవారాలు మరియు శనివారాలు అపాయింట్‌మెంట్లు లభ్యం కావు
          4. రద్దు విధానం:
            - ఒకవేళ మీరు అపాయింట్‌మెంట్ రద్దు చేస్తే, అదే వారంలో మరోదాన్ని బుక్ చేయలేరు
            - పదేపదే రద్దులు ఖాతా నిలిపివేతకు దారి తీయవచ్చు

          దయచేసి మీ స్కెడ్యూల్ సమయానికి 5 నిమిషాల ముందు వెళ్లండి. ఆలస్యంగా వచ్చినట్లయితే అపాయింట్‌మెంట్ రద్దు కావచ్చు.

          ఏవైనా ప్రశ్నలు లేదా మార్పుల కోసం, దయచేసి మా సపోర్ట్ టీమ్‌ని సంప్రదించండి.

          ధన్యవాదాలు,
          అపాయింట్‌మెంట్ టీమ్
          `;
          // Send the email
          await transporter.sendMail({
            from: process.env.EMAIL_USER || 'veldandikethankumar@gmail.com',
            to: user.email,
            subject: emailSubject,
            text: emailBody
          });
          
          console.log(`Confirmation email sent to ${user.email}`);
        } catch (emailError) {
          // Just log the error but don't fail the appointment creation
          console.error("Failed to send confirmation email:", emailError);
        }
      }

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

  app.delete("/api/admin/appointments/:id", isAdmin, async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      await storage.deleteAppointment(appointmentId);
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete appointment" });
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
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const availableSlots = await storage.getAvailableSlotsByDate(date);
      res.json(availableSlots);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ message: "Failed to fetch available slots" });
    }
  });

  // Create available slots (admin only)
  app.post("/api/available-slots", isAdmin, async (req, res) => {
    try {
      const slotData = insertAvailableSlotSchema.parse({
        ...req.body,
        date: new Date(req.body.date), // Convert string to Date
      });
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

  // Block user endpoint
  app.patch("/api/users/:id/block", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { blockedUntil } = req.body;
      
      const updatedUser = await storage.updateUser(userId, { 
        blockedUntil: new Date(blockedUntil)
      });
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to block user" });
    }
  });
  
  // Update user profile
  app.patch("/api/user", isAuthenticated, async (req, res) => {
    try {
      const { name, phone } = req.body;
      
      // Update user profile (mobile field in database maps to phone in UI)
      const updatedUser = await storage.updateUser(req.user!.id, { 
        name, 
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
      // Add no-cache headers
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Expires', '-1');
      res.set('Pragma', 'no-cache');
      
      const configs = await storage.getBookingConfigurations();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking configurations" });
    }
  });

  // Update a booking configuration
  app.put("/api/booking-configurations/:id", isAdmin, async (req, res) => {
    try {
      const configId = parseInt(req.params.id);
      const { value } = req.body;
      
      if (value === undefined) {
        return res.status(400).json({ message: "Value is required" });
      }
      
      const updatedConfig = await storage.updateBookingConfiguration(configId, { value });
      
      if (!updatedConfig) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating booking configuration:", error);
      res.status(500).json({ message: "Failed to update booking configuration" });
    }
  });
  const httpServer = createServer(app);
  return httpServer;
}
