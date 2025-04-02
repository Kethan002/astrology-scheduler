import { users, type User, type InsertUser, appointments, type Appointment, type InsertAppointment, availableSlots, type AvailableSlot, type InsertAvailableSlot } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";
import pg from "pg";
const { Pool } = pg;

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAppointments(): Promise<Appointment[]>;
  getAppointmentsByUser(userId: number): Promise<Appointment[]>;
  getAppointmentsByDate(date: Date): Promise<Appointment[]>;
  getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<Appointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;
  
  getAvailableSlots(): Promise<AvailableSlot[]>;
  getAvailableSlotsByDate(date: Date): Promise<AvailableSlot[]>;
  getAvailableSlotsByDateRange(startDate: Date, endDate: Date): Promise<AvailableSlot[]>;
  createAvailableSlot(slot: InsertAvailableSlot): Promise<AvailableSlot>;
  updateAvailableSlot(id: number, slot: Partial<AvailableSlot>): Promise<AvailableSlot | undefined>;
  deleteAvailableSlot(id: number): Promise<boolean>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, isAdmin: false })
      .returning();
    return user;
  }
  
  async getAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments);
  }
  
  async getAppointmentsByUser(userId: number): Promise<Appointment[]> {
    return await db.select().from(appointments).where(eq(appointments.userId, userId));
  }
  
  async getAppointmentsByDate(date: Date): Promise<Appointment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await db.select().from(appointments).where(
      and(
        gte(appointments.date, startOfDay),
        lte(appointments.date, endOfDay)
      )
    );
  }
  
  async getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]> {
    return await db.select().from(appointments).where(
      and(
        gte(appointments.date, startDate),
        lte(appointments.date, endDate)
      )
    );
  }
  
  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }
  
  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db
      .insert(appointments)
      .values({ ...appointment, status: "confirmed" })
      .returning();
    return newAppointment;
  }
  
  async updateAppointment(id: number, appointmentUpdate: Partial<Appointment>): Promise<Appointment | undefined> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set(appointmentUpdate)
      .where(eq(appointments.id, id))
      .returning();
    return updatedAppointment;
  }
  
  async deleteAppointment(id: number): Promise<boolean> {
    const result = await db
      .delete(appointments)
      .where(eq(appointments.id, id))
      .returning({ id: appointments.id });
    return result.length > 0;
  }
  
  async getAvailableSlots(): Promise<AvailableSlot[]> {
    return await db.select().from(availableSlots);
  }
  
  async getAvailableSlotsByDate(date: Date): Promise<AvailableSlot[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await db.select().from(availableSlots).where(
      and(
        gte(availableSlots.date, startOfDay),
        lte(availableSlots.date, endOfDay)
      )
    );
  }
  
  async getAvailableSlotsByDateRange(startDate: Date, endDate: Date): Promise<AvailableSlot[]> {
    return await db.select().from(availableSlots).where(
      and(
        gte(availableSlots.date, startDate),
        lte(availableSlots.date, endDate)
      )
    );
  }
  
  async createAvailableSlot(slot: InsertAvailableSlot): Promise<AvailableSlot> {
    const [newSlot] = await db
      .insert(availableSlots)
      .values({
        ...slot,
        isEnabled: slot.isEnabled === undefined ? true : slot.isEnabled
      })
      .returning();
    return newSlot;
  }
  
  async updateAvailableSlot(id: number, slotUpdate: Partial<AvailableSlot>): Promise<AvailableSlot | undefined> {
    const [updatedSlot] = await db
      .update(availableSlots)
      .set(slotUpdate)
      .where(eq(availableSlots.id, id))
      .returning();
    return updatedSlot;
  }
  
  async deleteAvailableSlot(id: number): Promise<boolean> {
    const result = await db
      .delete(availableSlots)
      .where(eq(availableSlots.id, id))
      .returning({ id: availableSlots.id });
    return result.length > 0;
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private appointments: Map<number, Appointment>;
  private availableSlots: Map<number, AvailableSlot>;
  
  currentId: { users: number; appointments: number; availableSlots: number };
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.appointments = new Map();
    this.availableSlots = new Map();
    
    this.currentId = {
      users: 1,
      appointments: 1,
      availableSlots: 1,
    };
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
    
    // Create an admin user with hashed password
    // Create an initial admin user with pre-hashed password
    const hashedPassword = "09c5d962e5ae0c4f57b3d4e8d2b89fa1eb6e528e11902c31eb7f5bd5d7918fde1e3e23dee6ebd5c7ac6214f1a6b0c55c1fdfd8fbf0af1c8e1c86a2c44c5c95e0.acd0527ed5432e9e7be49df0f26f1177";
    const adminUser: User = {
      id: this.currentId.users++,
      username: "admin",
      password: hashedPassword,
      name: "Admin User",
      email: "admin@example.com",
      address: "123 Admin St",
      mobile: "1234567890",
      isAdmin: true,
      createdAt: new Date()
    };
    this.users.set(adminUser.id, adminUser);
    
    // Also create a regular test user with pre-hashed password
    const testUserHashedPassword = "09c5d962e5ae0c4f57b3d4e8d2b89fa1eb6e528e11902c31eb7f5bd5d7918fde1e3e23dee6ebd5c7ac6214f1a6b0c55c1fdfd8fbf0af1c8e1c86a2c44c5c95e0.acd0527ed5432e9e7be49df0f26f1177";
    const testUser: User = {
      id: this.currentId.users++,
      username: "user",
      password: testUserHashedPassword,
      name: "Test User",
      email: "user@example.com",
      address: "456 User St",
      mobile: "0987654321",
      isAdmin: false,
      createdAt: new Date()
    };
    this.users.set(testUser.id, testUser);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, isAdmin: false, createdAt };
    this.users.set(id, user);
    return user;
  }
  
  async getAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values());
  }
  
  async getAppointmentsByUser(userId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      (appointment) => appointment.userId === userId,
    );
  }
  
  async getAppointmentsByDate(date: Date): Promise<Appointment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.appointments.values()).filter(
      (appointment) => appointment.date >= startOfDay && appointment.date <= endOfDay,
    );
  }
  
  async getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      (appointment) => appointment.date >= startDate && appointment.date <= endDate,
    );
  }
  
  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }
  
  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const id = this.currentId.appointments++;
    const createdAt = new Date();
    const status = "confirmed";
    const newAppointment: Appointment = { ...appointment, id, status, createdAt };
    this.appointments.set(id, newAppointment);
    return newAppointment;
  }
  
  async updateAppointment(id: number, appointmentUpdate: Partial<Appointment>): Promise<Appointment | undefined> {
    const appointment = this.appointments.get(id);
    
    if (!appointment) {
      return undefined;
    }
    
    const updatedAppointment: Appointment = { ...appointment, ...appointmentUpdate };
    this.appointments.set(id, updatedAppointment);
    
    return updatedAppointment;
  }
  
  async deleteAppointment(id: number): Promise<boolean> {
    return this.appointments.delete(id);
  }
  
  async getAvailableSlots(): Promise<AvailableSlot[]> {
    return Array.from(this.availableSlots.values());
  }
  
  async getAvailableSlotsByDate(date: Date): Promise<AvailableSlot[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.availableSlots.values()).filter(
      (slot) => slot.date >= startOfDay && slot.date <= endOfDay,
    );
  }
  
  async getAvailableSlotsByDateRange(startDate: Date, endDate: Date): Promise<AvailableSlot[]> {
    return Array.from(this.availableSlots.values()).filter(
      (slot) => slot.date >= startDate && slot.date <= endDate,
    );
  }
  
  async createAvailableSlot(slot: InsertAvailableSlot): Promise<AvailableSlot> {
    const id = this.currentId.availableSlots++;
    // Make sure isEnabled is always a boolean
    const newSlot: AvailableSlot = { 
      ...slot, 
      id,
      isEnabled: slot.isEnabled === undefined ? true : slot.isEnabled 
    };
    this.availableSlots.set(id, newSlot);
    return newSlot;
  }
  
  async updateAvailableSlot(id: number, slotUpdate: Partial<AvailableSlot>): Promise<AvailableSlot | undefined> {
    const slot = this.availableSlots.get(id);
    
    if (!slot) {
      return undefined;
    }
    
    const updatedSlot: AvailableSlot = { ...slot, ...slotUpdate };
    this.availableSlots.set(id, updatedSlot);
    
    return updatedSlot;
  }
  
  async deleteAvailableSlot(id: number): Promise<boolean> {
    return this.availableSlots.delete(id);
  }
}

// Switch from MemStorage to DatabaseStorage
export const storage = new DatabaseStorage();
