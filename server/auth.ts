import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "astrology-booking-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      // Convert id to number if it's a string
      const userId = typeof id === 'string' ? parseInt(id, 10) : id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return done(null, false);
      }
      
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Ensure mobile is either provided or set to null
      const body = {
        ...req.body,
        mobile: req.body.mobile || null // Set to null if not provided
      };
  
      const validatedUser = insertUserSchema.parse(body);
    
      // Check username exists
      const existingUser = await storage.getUserByUsername(validatedUser.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
  
      const existingEmail = await storage.getUserByEmail(validatedUser.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
  
      const user = await storage.createUser({
        ...validatedUser,
        password: await hashPassword(validatedUser.password),
      });
  
      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error: any) {
      console.error('Registration Error:', error);
    
      // Prisma unique constraint error (in case you still have DB-level checks)
      if (error.code === 'P2002') {
        const fields = error.meta?.target || [];
    
        if (fields.includes('username')) {
          return res.status(400).json({ message: 'Username already exists' });
        }
        if (fields.includes('email')) {
          return res.status(400).json({ message: 'Email already exists' });
        }
        return res.status(400).json({ message: 'Username or Email already exists' });
      }
    
      // Generic fallback
      return res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
    
    
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        // Don't send the password back
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Don't send the password back
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}
