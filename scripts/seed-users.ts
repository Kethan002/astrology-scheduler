import { db } from "../server/db";
import { users } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedUsers() {
  console.log("Seeding users...");
  
  try {
    // Check if admin user already exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, "admin"));
    
    if (existingAdmin.length === 0) {
      // Create admin user
      const adminPassword = await hashPassword("password123");
      await db.insert(users).values({
        username: "admin",
        password: adminPassword,
        name: "Admin User",
        email: "admin@example.com",
        address: "123 Admin St",
        mobile: "1234567890",
        isAdmin: true,
      });
      console.log("Admin user created");
    } else {
      console.log("Admin user already exists");
    }

    // Check if regular user already exists
    const existingUser = await db.select().from(users).where(eq(users.username, "user"));
    
    if (existingUser.length === 0) {
      // Create regular user
      const userPassword = await hashPassword("password123");
      await db.insert(users).values({
        username: "user",
        password: userPassword,
        name: "Test User",
        email: "user@example.com",
        address: "456 User St",
        mobile: "0987654321",
        isAdmin: false,
      });
      console.log("Regular user created");
    } else {
      console.log("Regular user already exists");
    }
    
    console.log("Seeding completed successfully");
  } catch (error) {
    console.error("Error seeding users:", error);
  } finally {
    process.exit(0);
  }
}

seedUsers();