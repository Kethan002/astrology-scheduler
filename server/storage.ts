import { users, type User, type InsertUser, appointments, type Appointment, type InsertAppointment, availableSlots, type AvailableSlot, type InsertAvailableSlot, bookingConfigurations, type BookingConfiguration, type InsertBookingConfiguration } from "@shared/schema";
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
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUserByEmail(email: string): Promise<User | undefined>;
  
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
  
  getBookingConfigurations(): Promise<BookingConfiguration[]>;
  getBookingConfigurationByKey(key: string): Promise<BookingConfiguration | undefined>;
  createBookingConfiguration(config: InsertBookingConfiguration): Promise<BookingConfiguration>;
  updateBookingConfiguration(id: number, config: Partial<BookingConfiguration>): Promise<BookingConfiguration | undefined>;
  deleteBookingConfiguration(id: number): Promise<boolean>;
  
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
    
    // Initialize default booking configurations if they don't exist
    this.initDefaultBookingConfigurations();
  }
  
  private async initDefaultBookingConfigurations() {
    try {
      // Define default booking configurations
      const defaultConfigs = [
        { key: 'booking_window_day', value: '0', description: 'Day of the week when bookings are allowed (0-6, where 0 is Sunday)' },
        { key: 'booking_window_start_hour', value: '8', description: 'Start hour of the booking window (0-23)' },
        { key: 'booking_window_end_hour', value: '9', description: 'End hour of the booking window (0-23)' },
        { key: 'disabled_days', value: '2,6', description: 'Days when appointments are not available (comma-separated, 0-6, where 0 is Sunday)' },
        { key: 'morning_slot_start', value: '9', description: 'Start hour for morning appointment slots (0-23)' },
        { key: 'morning_slot_end', value: '13', description: 'End hour for morning appointment slots (0-23)' },
        { key: 'afternoon_slot_start', value: '15', description: 'Start hour for afternoon appointment slots (0-23)' },
        { key: 'afternoon_slot_end', value: '17', description: 'End hour for afternoon appointment slots (0-23)' }
      ];
      
      // Check if any configurations exist
      const existingConfigs = await this.getBookingConfigurations();
      
      if (existingConfigs.length === 0) {
        // Insert all default configurations
        for (const config of defaultConfigs) {
          await this.createBookingConfiguration(config);
        }
        console.log('Initialized default booking configurations');
      }
    } catch (error) {
      console.error('Error initializing default booking configurations:', error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return undefined;
    }
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.mobile, mobile));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, isAdmin: false })
      .returning();
    return user;
  }
  
  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });
    return result.length > 0;
  }
  
  async getAppointments(): Promise<(Appointment & { user: User | null })[]> {
    return await db
      .select()
      .from(appointments)
      .leftJoin(users, eq(appointments.userId, users.id))
      .then((rows) => rows.map(row => ({
        ...row.appointments,
        user: row.users
      })));
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
  
  async updateAppointment(id: number, appointment: Partial<Appointment>): Promise<Appointment | undefined> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set(appointment)
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
    
    try {
      // Get all slots for the requested date and future dates
      const slots = await db.select().from(availableSlots).where(
        gte(availableSlots.date, startOfDay)
      );
      
      // Get all appointments for the requested date and future dates
      const existingAppointments = await db.select().from(appointments).where(
        gte(appointments.date, startOfDay)
      );
      
      // Mark slots as booked if they have an active appointment
      const slotsWithBookingStatus = slots.map(slot => {
        const isBooked = existingAppointments.some(appointment => 
          appointment.status !== 'cancelled' &&
          new Date(appointment.date).getTime() === new Date(slot.date).getTime()
        );
        
        return {
          ...slot,
          isEnabled: slot.isEnabled, // Keep slots enabled even if booked
          isBooked: isBooked, // Add explicit booked status
          status: isBooked ? 'booked' : slot.isEnabled ? 'available' : 'disabled' // Add status field
        };
      });
      
      return slotsWithBookingStatus;
    } catch (error) {
      console.error('Error in getAvailableSlotsByDate:', error);
      throw error;
    }
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
  
  async updateAvailableSlot(id: number, slot: Partial<AvailableSlot>): Promise<AvailableSlot | undefined> {
    const [updatedSlot] = await db
      .update(availableSlots)
      .set(slot)
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
  
  async getBookingConfigurations(): Promise<BookingConfiguration[]> {
    return await db.select().from(bookingConfigurations);
  }
  
  async getBookingConfigurationByKey(key: string): Promise<BookingConfiguration | undefined> {
    const [config] = await db.select().from(bookingConfigurations).where(eq(bookingConfigurations.key, key));
    return config;
  }
  
  async createBookingConfiguration(config: InsertBookingConfiguration): Promise<BookingConfiguration> {
    const [newConfig] = await db
      .insert(bookingConfigurations)
      .values(config)
      .returning();
    return newConfig;
  }
  
  async updateBookingConfiguration(id: number, config: Partial<BookingConfiguration>): Promise<BookingConfiguration | undefined> {
    const [updatedConfig] = await db
      .update(bookingConfigurations)
      .set({...config, updatedAt: new Date()})
      .where(eq(bookingConfigurations.id, id))
      .returning();
    return updatedConfig;
  }
  
  async deleteBookingConfiguration(id: number): Promise<boolean> {
    const result = await db
      .delete(bookingConfigurations)
      .where(eq(bookingConfigurations.id, id))
      .returning({ id: bookingConfigurations.id });
    return result.length > 0;
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private appointments: Map<number, Appointment>;
  private availableSlots: Map<number, AvailableSlot>;
  private bookingConfigurations: Map<number, BookingConfiguration>;
  
  currentId: { users: number; appointments: number; availableSlots: number; bookingConfigurations: number };
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.appointments = new Map();
    this.availableSlots = new Map();
    this.bookingConfigurations = new Map();
    
    this.currentId = {
      users: 1,
      appointments: 1,
      availableSlots: 1,
      bookingConfigurations: 1,
    };
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
    
    // Create default booking configurations
    const bookingConfigs = [
      {
        id: this.currentId.bookingConfigurations++,
        key: "booking_window_day",
        value: "0", // Sunday
        description: "Day of the week when bookings are allowed (0-6, where 0 is Sunday)",
        updatedAt: new Date()
      },
      {
        id: this.currentId.bookingConfigurations++,
        key: "booking_window_start_hour",
        value: "8", // 8 AM
        description: "Start hour of the booking window (0-23)",
        updatedAt: new Date()
      },
      {
        id: this.currentId.bookingConfigurations++,
        key: "booking_window_end_hour",
        value: "9", // 9 AM
        description: "End hour of the booking window (0-23)",
        updatedAt: new Date()
      },
      {
        id: this.currentId.bookingConfigurations++,
        key: "disabled_days",
        value: "2,6", // Tuesday and Saturday
        description: "Days when appointments are not available (comma-separated, 0-6, where 0 is Sunday)",
        updatedAt: new Date()
      },
      {
        id: this.currentId.bookingConfigurations++,
        key: "morning_slot_start",
        value: "9", // 9 AM
        description: "Start hour for morning appointment slots (0-23)",
        updatedAt: new Date()
      },
      {
        id: this.currentId.bookingConfigurations++,
        key: "morning_slot_end",
        value: "13", // 1 PM
        description: "End hour for morning appointment slots (0-23)",
        updatedAt: new Date()
      },
      {
        id: this.currentId.bookingConfigurations++,
        key: "afternoon_slot_start",
        value: "15", // 3 PM
        description: "Start hour for afternoon appointment slots (0-23)",
        updatedAt: new Date()
      },
      {
        id: this.currentId.bookingConfigurations++,
        key: "afternoon_slot_end",
        value: "17", // 5 PM
        description: "End hour for afternoon appointment slots (0-23)",
        updatedAt: new Date()
      }
    ];
    
    // Add each configuration to the map
    bookingConfigs.forEach(config => {
      this.bookingConfigurations.set(config.id, config);
    });

    
    
    // Create an admin user with hashed password
    // Create an initial admin user with pre-hashed password
    const hashedPassword = "09c5d962e5ae0c4f57b3d4e8d2b89fa1eb6e528e11902c31eb7f5bd5d7918fde1e3e23dee6ebd5c7ac6214f1a6b0c55c1fdfd8fbf0af1c8e1c86a2c44c5c95e0.acd0527ed5432e9e7be49df0f26f1177";
    // Create admin user with specific password
    const adminHashedPassword = "09c5d962e5ae0c4f57b3d4e8d2b89fa1eb6e528e11902c31eb7f5bd5d7918fde1e3e23dee6ebd5c7ac6214f1a6b0c55c1fdfd8fbf0af1c8e1c86a2c44c5c95e0.acd0527ed5432e9e7be49df0f26f1177"; // This is the hash for "omkaram@123"
    const adminUser: User = {
      id: this.currentId.users++,
      username: "admin",
      password: adminHashedPassword,
      name: "Admin User",
      address: "123 Admin St",
      mobile: "1234567890",
      isAdmin: true,
      createdAt: new Date(),
      blockedUntil: null,
    };
    this.users.set(adminUser.id, adminUser);
    
    // Also create a regular test user with pre-hashed password
    const testUserHashedPassword = "09c5d962e5ae0c4f57b3d4e8d2b89fa1eb6e528e11902c31eb7f5bd5d7918fde1e3e23dee6ebd5c7ac6214f1a6b0c55c1fdfd8fbf0af1c8e1c86a2c44c5c95e0.acd0527ed5432e9e7be49df0f26f1177";
    const testUser: User = {
      id: this.currentId.users++,
      username: "user",
      password: testUserHashedPassword,
      name: "Test User",
      address: "456 User St",
      mobile: "0987654321",
      isAdmin: false,
      createdAt: new Date(),
      blockedUntil: null,
    };
    this.users.set(testUser.id, testUser);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  // Add to MemStorage class
  async getUserByMobile(mobile: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.mobile === mobile
    );
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
  
  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = { ...user, ...userUpdate };
    this.users.set(id, updatedUser);
    
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
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
    const newAppointment: Appointment = {
      id,
      userId: appointment.userId,
      date: new Date(appointment.date),
      endTime: new Date(appointment.endTime),
      status: "confirmed",
      createdAt
    };
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
    
    try {
      // Get all slots for the requested date and future dates
      const slots = Array.from(this.availableSlots.values()).filter(
        slot => slot.date >= startOfDay
      );
      
      // Get all appointments for the requested date and future dates
      const existingAppointments = Array.from(this.appointments.values()).filter(
        appointment => appointment.date >= startOfDay
      );
      
      // Mark slots as booked if they have an active appointment
      const slotsWithBookingStatus = slots.map(slot => {
        const isBooked = existingAppointments.some(appointment => 
          appointment.status !== 'cancelled' &&
          new Date(appointment.date).getTime() === new Date(slot.date).getTime()
        );
        
        return {
          ...slot,
          isEnabled: slot.isEnabled, // Keep slots enabled even if booked
          isBooked: isBooked, // Add explicit booked status
          status: isBooked ? 'booked' : slot.isEnabled ? 'available' : 'disabled' // Add status field
        };
      });
      
      return slotsWithBookingStatus;
    } catch (error) {
      console.error('Error in getAvailableSlotsByDate:', error);
      throw error;
    }
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
  
  async getBookingConfigurations(): Promise<BookingConfiguration[]> {
    return Array.from(this.bookingConfigurations.values());
  }
  
  async getBookingConfigurationByKey(key: string): Promise<BookingConfiguration | undefined> {
    return Array.from(this.bookingConfigurations.values()).find(
      (config) => config.key === key
    );
  }
  
  async createBookingConfiguration(config: InsertBookingConfiguration): Promise<BookingConfiguration> {
    const id = this.currentId.bookingConfigurations++;
    const updatedAt = new Date();
    const newConfig: BookingConfiguration = { ...config, id, updatedAt };
    this.bookingConfigurations.set(id, newConfig);
    return newConfig;
  }
  
  async updateBookingConfiguration(id: number, configUpdate: Partial<BookingConfiguration>): Promise<BookingConfiguration | undefined> {
    const config = this.bookingConfigurations.get(id);
    
    if (!config) {
      return undefined;
    }
    
    const updatedConfig: BookingConfiguration = { 
      ...config, 
      ...configUpdate,
      updatedAt: new Date()
    };
    this.bookingConfigurations.set(id, updatedConfig);
    
    return updatedConfig;
  }
  
  async deleteBookingConfiguration(id: number): Promise<boolean> {
    return this.bookingConfigurations.delete(id);
  }
}

// Switch from MemStorage to DatabaseStorage
export const storage = new DatabaseStorage();
