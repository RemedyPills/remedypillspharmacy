import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const SESSION_MAX_AGE = 30 * 60 * 1000;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function getBaseUrl(): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, "");
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return `http://localhost:${process.env.PORT || 5000}`;
}

function getClientIp(req: any): string {
  // Render sets x-forwarded-for. It can be a comma-separated list.
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0].trim();
  }
  return req.ip || "unknown";
}

async function findOrCreateSocialUser(
  provider: string,
  providerId: string,
  profile: { name?: string; email?: string },
): Promise<SelectUser> {
  let user = await storage.getUserByProvider(provider, providerId);
  if (user) return user;

  const randomPassword = await hashPassword(randomBytes(32).toString("hex"));
  const uniqueUsername = `${provider}_${providerId}`;

  user = await storage.createUser({
    username: uniqueUsername,
    password: randomPassword,
    name: profile.name || "",
    email: profile.email || null,
    phone: null,
    dob: null,
    role: "patient",
    provider,
    providerId,
    consentGiven: true,
    consentDate: new Date().toISOString(),
  });
  return user;
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET is missing. Set SESSION_SECRET in Render Environment Variables (and .env locally).",
    );
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  };

  // Render uses a proxy; needed for secure cookies in production
  app.set("trust proxy", 1);

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        if (user.lockedUntil) {
          const lockExpiry = new Date(user.lockedUntil);
          if (lockExpiry > new Date()) {
            const minutesLeft = Math.ceil(
              (lockExpiry.getTime() - Date.now()) / 60000,
            );
            return done(null, false, {
              message: `Account locked. Try again in ${minutesLeft} minute${
                minutesLeft !== 1 ? "s" : ""
              }.`,
            });
          }
          await storage.updateUserLoginTracking(user.id, {
            failedLoginAttempts: 0,
            lockedUntil: null,
          });
        }

        if (!(await comparePasswords(password, user.password))) {
          const attempts = (user.failedLoginAttempts || 0) + 1;
          if (attempts >= MAX_FAILED_ATTEMPTS) {
            const lockUntil = new Date(
              Date.now() + LOCKOUT_MINUTES * 60000,
            ).toISOString();
            await storage.updateUserLoginTracking(user.id, {
              failedLoginAttempts: attempts,
              lockedUntil: lockUntil,
            });
            return done(null, false, {
              message: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
            });
          }
          await storage.updateUserLoginTracking(user.id, {
            failedLoginAttempts: attempts,
          });
          const remaining = MAX_FAILED_ATTEMPTS - attempts;
          return done(null, false, {
            message: `Invalid password. ${remaining} attempt${
              remaining !== 1 ? "s" : ""
            } remaining.`,
          });
        }

        await storage.updateUserLoginTracking(user.id, {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date().toISOString(),
        });

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }),
  );

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${getBaseUrl()}/api/auth/google/callback`,
          scope: ["profile", "email"],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const user = await findOrCreateSocialUser("google", profile.id, {
              name: profile.displayName,
              email: profile.emails?.[0]?.value,
            });
            await storage.updateUserLoginTracking(user.id, {
              lastLoginAt: new Date().toISOString(),
            });
            done(null, user);
          } catch (err) {
            console.error("Google OAuth error:", err);
            done(err as Error);
          }
        },
      ),
    );
  }

  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: `${getBaseUrl()}/api/auth/facebook/callback`,
          profileFields: ["id", "displayName", "emails"],
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
          try {
            const user = await findOrCreateSocialUser("facebook", profile.id, {
              name: profile.displayName,
              email: profile.emails?.[0]?.value,
            });
            await storage.updateUserLoginTracking(user.id, {
              lastLoginAt: new Date().toISOString(),
            });
            done(null, user);
          } catch (err) {
            done(err as Error);
          }
        },
      ),
    );
  }

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) return done(null, false);
      done(null, user);
    } catch (err) {
      done(err as Error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
        consentGiven: !!req.body.consentGiven,
        consentDate: req.body.consentGiven ? new Date().toISOString() : null,
      });

      await storage.createAuditLog({
        userId: user.id,
        action: "account_created",
        details: `Account created with consent: ${!!req.body.consentGiven}`,
        ipAddress: getClientIp(req),
        timestamp: new Date().toISOString(),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, async (loginErr) => {
        if (loginErr) return next(loginErr);
        await storage.createAuditLog({
          userId: user.id,
          action: "login",
          details: "Successful login",
          ipAddress: getClientIp(req),
          timestamp: new Date().toISOString(),
        });
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    req.logout(async (err) => {
      if (err) return next(err);
      if (userId) {
        await storage.createAuditLog({
          userId,
          action: "logout",
          details: "User logged out",
          ipAddress: getClientIp(req),
          timestamp: new Date().toISOString(),
        });
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  app.post("/api/consent", requireAuth, async (req, res) => {
    const updated = await storage.updateUserConsent(req.user!.id, true);
    await storage.createAuditLog({
      userId: req.user!.id,
      action: "consent_given",
      details: "Patient gave consent for digital health services",
      ipAddress: getClientIp(req),
      timestamp: new Date().toISOString(),
    });
    const { password: _, ...safe } = updated!;
    res.json(safe);
  });

  app.post("/api/consent/withdraw", requireAuth, async (req, res) => {
    const updated = await storage.updateUserConsent(req.user!.id, false);
    await storage.createAuditLog({
      userId: req.user!.id,
      action: "consent_withdrawn",
      details: "Patient withdrew consent for digital health services",
      ipAddress: getClientIp(req),
      timestamp: new Date().toISOString(),
    });
    const { password: _, ...safe } = updated!;
    res.json(safe);
  });

  const socialCallback = (req: any, res: any) => {
    if (req.user && (req.user as SelectUser).role === "admin") {
      res.redirect("/admin");
    } else {
      res.redirect("/");
    }
  };

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
    app.get("/api/auth/google/callback", (req, res, next) => {
      passport.authenticate("google", (err: any, user: any, info: any) => {
        if (err) {
          console.error("Google callback error:", err);
          return res.redirect("/auth?error=google_error");
        }
        if (!user) {
          console.warn("Google callback failed:", info);
          return res.redirect("/auth?error=google_failed");
        }
        req.login(user, (loginErr: any) => {
          if (loginErr) {
            console.error("Login after Google failed:", loginErr);
            return res.redirect("/auth?error=google_login");
          }
          socialCallback(req, res);
        });
      })(req, res, next);
    });
  } else {
    app.get("/api/auth/google", (_req, res) => res.redirect("/auth"));
    app.get("/api/auth/google/callback", (_req, res) => res.redirect("/auth"));
  }

  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    app.get("/api/auth/facebook", passport.authenticate("facebook", { scope: ["email"] }));
    app.get("/api/auth/facebook/callback", (req, res, next) => {
      passport.authenticate("facebook", (err: any, user: any, info: any) => {
        if (err) {
          console.error("Facebook callback error:", err);
          return res.redirect("/auth?error=facebook_error");
        }
        if (!user) {
          console.warn("Facebook callback failed:", info);
          return res.redirect("/auth?error=facebook_failed");
        }
        req.login(user, (loginErr: any) => {
          if (loginErr) {
            console.error("Login after Facebook failed:", loginErr);
            return res.redirect("/auth?error=facebook_login");
          }
          socialCallback(req, res);
        });
      })(req, res, next);
    });
  } else {
    app.get("/api/auth/facebook", (_req, res) => res.redirect("/auth"));
    app.get("/api/auth/facebook/callback", (_req, res) => res.redirect("/auth"));
  }

  app.get("/api/auth/providers", (_req, res) => {
    res.json({
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      facebook: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    });
  });
}

export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  next();
}

export function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
}
