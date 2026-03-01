import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedAdminUser() {
  const existing = await storage.getUserByUsername("admin");
  if (existing) return;

  await storage.createUser({
    username: "admin",
    password: await hashPassword("admin123"),
    name: "Pharmacy Admin",
    email: "admin@remedypills.ca",
    role: "admin",
    provider: "local",
  });
  console.log("Default admin account created (username: admin, password: admin123)");
}
