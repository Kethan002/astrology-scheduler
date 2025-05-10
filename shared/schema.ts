import { pgTable, text, serial, integer, boolean, timestamp, unique, time } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";


export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  email: text("email").unique(), 
  mobile: text("mobile").unique(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  blockedUntil: timestamp("blocked_until").default(null),
});


export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  address: true,
  // Remove mobile from required fields entirely
}).extend({
  mobile: z.string()
    .min(10, "Mobile number must be at least 10 digits")
    .max(15, "Mobile number too long")
    .regex(/^[0-9]+$/, "Invalid mobile number format")
    .optional()
    .nullable() // Explicitly allow null
    .transform(val => val === "" ? null : val), // Convert empty string to null
  email: z.string().email() // Add email validation
});

export const loginUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull().default("confirmed"), // confirmed, cancelled, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    unique_user_week: unique().on(table.userId, table.date),
  };
});

export const insertAppointmentSchema = z.object({
  userId: z.number(),
  date: z.coerce.date(),
  endTime: z.coerce.date(),
  duration: z.number().optional()
});

export const availableSlots = pgTable("available_slots", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
});

export const insertAvailableSlotSchema = z.object({
  date: z.coerce.date(),
  isEnabled: z.boolean().optional(),
});

export const bookingConfigurations = pgTable("booking_configurations", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // e.g. 'booking_window_day', 'booking_window_start', etc.
  value: text("value").notNull(),
  description: text("description").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBookingConfigSchema = createInsertSchema(bookingConfigurations).pick({
  key: true,
  value: true,
  description: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type AvailableSlot = typeof availableSlots.$inferSelect;
export type InsertAvailableSlot = z.infer<typeof insertAvailableSlotSchema>;
export type BookingConfiguration = typeof bookingConfigurations.$inferSelect;
export type InsertBookingConfiguration = z.infer<typeof insertBookingConfigSchema>;
