import { users, type User, type InsertUser, appointments, type Appointment, type InsertAppointment, availableSlots, type AvailableSlot, type InsertAvailableSlot } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private appointments: Map<number, Appointment>;
  private availableSlots: Map<number, AvailableSlot>;
  
  currentId: { users: number; appointments: number; availableSlots: number };
  sessionStore: session.SessionStore;

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
    
    // Create an admin user
    this.createUser({
      username: "admin",
      password: "password123",
      name: "Admin User",
      email: "admin@example.com",
      address: "123 Admin St",
      mobile: "1234567890",
    }).then(user => {
      // Make this user an admin
      const adminUser = { ...user, isAdmin: true };
      this.users.set(user.id, adminUser);
    });
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
    const newSlot: AvailableSlot = { ...slot, id };
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

export const storage = new MemStorage();
