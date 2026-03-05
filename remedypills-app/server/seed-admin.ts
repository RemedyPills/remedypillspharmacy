import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedAdminUser() {
  try {
    // Delete existing admin user to regenerate with correct password hashing
    const existing = await storage.getUserByUsername("admin");
    if (existing) {
      await storage.deleteUser(existing.id);
    }

    await storage.createUser({
      username: "admin",
      password: await hashPassword("admin123"),
      name: "Administrator",
      email: "admin@remedypills.ca",
      phone: null,
      dob: null,
      role: "admin",
      provider: "local",
      providerId: null,
      consentGiven: true,
      consentDate: new Date().toISOString(),
      lastLoginAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    console.log("Admin user created: admin / admin123");
  } catch (err) {
    console.error("Admin seed error:", err);
  }
}