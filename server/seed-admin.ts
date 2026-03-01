import { db } from "./storage";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function seedAdminUser() {
  try {
    const existing = await db.select().from(users).where(eq(users.username, "admin"));

    if (existing.length > 0) {
      console.log("Admin user already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    await db.insert(users).values({
      fullName: "Administrator",
      username: "admin",
      password: hashedPassword,
      email: "admin@remedypills.com",
      phone: "",
      role: "admin",
    });

    console.log("Admin user created");
  } catch (err) {
    console.error("Admin seed error:", err);
  }
}
