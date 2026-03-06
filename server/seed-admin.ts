import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedAdminUser() {
  try {
    // Check if admin already exists - skip seeding if already done
    const existing = await storage.getUserByUsername("admin");
    if (existing) {
      console.log("Admin user already exists, skipping seed");
      return;
    }

    // Only create admin if it doesn't exist
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
