import { pgTable, text, serial, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  address: text("address").notNull(),
  mobile: text("mobile").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  address: true,
  mobile: true,
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

export const insertAppointmentSchema = createInsertSchema(appointments).pick({
  userId: true,
  date: true,
  endTime: true,
});

export const availableSlots = pgTable("available_slots", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
});

export const insertAvailableSlotSchema = createInsertSchema(availableSlots).pick({
  date: true,
  isEnabled: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type AvailableSlot = typeof availableSlots.$inferSelect;
export type InsertAvailableSlot = z.infer<typeof insertAvailableSlotSchema>;
