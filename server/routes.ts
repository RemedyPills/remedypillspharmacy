import type { Express } from "express";
import { type Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin, hashPassword } from "./auth";
import { sendSmsToPatients } from "./twilio";
import { sendTransferEmail, sendAppointmentCancellation } from "./email";
import { insertCalorieLogSchema } from "@shared/schema";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed"));
    }
  },
});
import {
  insertPrescriptionSchema,
  insertReminderSchema,
  insertAppointmentSchema,
  insertMessageSchema,
  insertNotificationSchema,
  insertHealthLogSchema,
  insertPromoBannerSchema,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // ── Patient: Prescriptions ─────────────────────────────────
  app.get("/api/prescriptions", requireAuth, async (req, res) => {
    const data = await storage.getPrescriptionsByUser(req.user!.id);
    res.json(data);
  });

  app.get("/api/prescriptions/:id", requireAuth, async (req, res) => {
    const p = await storage.getPrescription(req.params.id);
    if (!p || p.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });
    res.json(p);
  });

  app.post("/api/prescriptions", requireAuth, async (req, res) => {
    const parsed = insertPrescriptionSchema.safeParse({ ...req.body, userId: req.user!.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createPrescription(parsed.data);
    res.status(201).json(created);
  });

  app.patch("/api/prescriptions/:id/status", requireAuth, async (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "status is required" });
    const p = await storage.getPrescription(req.params.id);
    if (!p || p.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updatePrescriptionStatus(req.params.id, status);
    res.json(updated);
  });

  app.patch("/api/prescriptions/:id", requireAuth, async (req, res) => {
    const p = await storage.getPrescription(req.params.id);
    if (!p || p.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });
    const { autoRefill, pickupTime, familyMemberName, status, name, strength, directions, rxNumber, lastFillDate, refillCount, refillable } = req.body;
    const data: Record<string, any> = {};
    if (autoRefill !== undefined) data.autoRefill = autoRefill;
    if (pickupTime !== undefined) data.pickupTime = pickupTime;
    if (familyMemberName !== undefined) data.familyMemberName = familyMemberName;
    if (status !== undefined) data.status = status;
    if (name !== undefined) data.name = name;
    if (strength !== undefined) data.strength = strength;
    if (directions !== undefined) data.directions = directions;
    if (rxNumber !== undefined) data.rxNumber = rxNumber;
    if (lastFillDate !== undefined) data.lastFillDate = lastFillDate;
    if (refillCount !== undefined) data.refillCount = refillCount;
    if (refillable !== undefined) data.refillable = refillable;
    const updated = await storage.updatePrescription(req.params.id, data);
    res.json(updated);
  });

  app.delete("/api/prescriptions/:id", requireAuth, async (req, res) => {
    const p = await storage.getPrescription(req.params.id);
    if (!p || p.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });
    await storage.deletePrescription(req.params.id);
    res.json({ message: "Deleted" });
  });

  // ── Patient: Reminders ─────────────────────────────────────
  app.get("/api/reminders", requireAuth, async (req, res) => {
    const data = await storage.getRemindersByUser(req.user!.id);
    res.json(data);
  });

  app.post("/api/reminders", requireAuth, async (req, res) => {
    const parsed = insertReminderSchema.safeParse({ ...req.body, userId: req.user!.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createReminder(parsed.data);
    res.status(201).json(created);
  });

  app.patch("/api/reminders/:id", requireAuth, async (req, res) => {
    const r = await storage.getReminder(req.params.id);
    if (!r || r.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });
    const { taken, snoozed, medicationName, time, frequency, category } = req.body;
    const data: Record<string, any> = {};
    if (taken !== undefined) data.taken = taken;
    if (snoozed !== undefined) data.snoozed = snoozed;
    if (medicationName !== undefined) data.medicationName = medicationName;
    if (time !== undefined) data.time = time;
    if (frequency !== undefined) data.frequency = frequency;
    if (category !== undefined) data.category = category;
    const updated = await storage.updateReminder(req.params.id, data);
    res.json(updated);
  });

  app.delete("/api/reminders/:id", requireAuth, async (req, res) => {
    const r = await storage.getReminder(req.params.id);
    if (!r || r.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });
    await storage.deleteReminder(req.params.id);
    res.sendStatus(204);
  });

  // ── Patient: Appointments ──────────────────────────────────
  const PHARMACY_HOURS: Record<number, { open: number; close: number } | null> = {
    0: null,
    1: { open: 9, close: 17 },
    2: { open: 9, close: 17 },
    3: { open: 9, close: 17 },
    4: { open: 9, close: 17 },
    5: { open: 9, close: 17 },
    6: { open: 10, close: 14 },
  };

  app.get("/api/available-slots", requireAuth, async (req, res) => {
    const { date } = req.query;
    if (!date || typeof date !== "string") return res.status(400).json({ message: "date query param required (YYYY-MM-DD)" });

    const d = new Date(date + "T00:00:00");
    const dayOfWeek = d.getDay();
    const hours = PHARMACY_HOURS[dayOfWeek];

    if (!hours) {
      return res.json({ closed: true, slots: [], message: "Pharmacy is closed on Sundays" });
    }

    const allSlots: string[] = [];
    for (let h = hours.open; h < hours.close; h++) {
      for (const m of [0, 30]) {
        const hr12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        const ampm = h >= 12 ? "PM" : "AM";
        const mm = m.toString().padStart(2, "0");
        allSlots.push(`${hr12}:${mm} ${ampm}`);
      }
    }

    const booked = await storage.getAppointmentsByDate(date);
    const bookedTimes = new Set(
      booked.filter(a => a.status !== "cancelled").map(a => a.time)
    );

    const now = new Date();
    const isToday = date === now.toISOString().split("T")[0];

    const available = allSlots.filter(slot => {
      if (bookedTimes.has(slot)) return false;
      if (isToday) {
        const [timePart, ampm] = slot.split(" ");
        const [hStr, mStr] = timePart.split(":");
        let h24 = parseInt(hStr);
        if (ampm === "PM" && h24 !== 12) h24 += 12;
        if (ampm === "AM" && h24 === 12) h24 = 0;
        const slotMinutes = h24 * 60 + parseInt(mStr);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        if (slotMinutes <= nowMinutes + 30) return false;
      }
      return true;
    });

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    res.json({
      closed: false,
      day: dayNames[dayOfWeek],
      hours: `${hours.open > 12 ? hours.open - 12 : hours.open}:00 ${hours.open >= 12 ? "PM" : "AM"} – ${hours.close > 12 ? hours.close - 12 : hours.close}:00 ${hours.close >= 12 ? "PM" : "AM"}`,
      slots: available,
      totalSlots: allSlots.length,
      bookedCount: bookedTimes.size,
    });
  });

  app.get("/api/appointments", requireAuth, async (req, res) => {
    const data = await storage.getAppointmentsByUser(req.user!.id);
    res.json(data);
  });

  app.post("/api/appointments", requireAuth, async (req, res) => {
    const parsed = insertAppointmentSchema.safeParse({ ...req.body, userId: req.user!.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createAppointment(parsed.data);
    res.status(201).json(created);
  });

  app.patch("/api/appointments/:id/status", requireAuth, async (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "status is required" });
    const a = await storage.getAppointment(req.params.id);
    if (!a || a.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateAppointmentStatus(req.params.id, status);
    res.json(updated);
  });

  app.patch("/api/appointments/:id", requireAuth, async (req, res) => {
    const a = await storage.getAppointment(req.params.id);
    if (!a || a.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });
    if (a.status === "cancelled" || a.status === "completed") return res.status(400).json({ message: "Cannot edit a " + a.status + " appointment" });
    const { service, date, time, patientNotes } = req.body;
    const updates: any = {};
    if (service) updates.service = service;
    if (date) updates.date = date;
    if (time) updates.time = time;
    if (patientNotes !== undefined) updates.patientNotes = patientNotes;
    const updated = await storage.updateAppointment(req.params.id, updates);
    res.json(updated);
  });

  // ── Patient: Messages ──────────────────────────────────────
  app.get("/api/messages", requireAuth, async (req, res) => {
    const data = await storage.getMessagesByUser(req.user!.id);
    res.json(data);
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    const parsed = insertMessageSchema.safeParse({ ...req.body, userId: req.user!.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createMessage(parsed.data);
    res.status(201).json(created);
  });

  app.post("/api/transfer-request", requireAuth, async (req, res) => {
    const { firstName, lastName, dob, phone, email, pharmacyName, pharmacyPhone, pharmacyFax, medicationName, rxNumber, notes } = req.body;
    if (!firstName || !lastName || !dob || !phone || !pharmacyName || !pharmacyPhone || !medicationName) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }
    try {
      await sendTransferEmail({ firstName, lastName, dob, phone, email, pharmacyName, pharmacyPhone, pharmacyFax, medicationName, rxNumber, notes });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Transfer email error:", err.message);
      res.status(500).json({ message: "Failed to send transfer request. Please try again or contact us directly." });
    }
  });

  // ── Patient: Notifications ─────────────────────────────────
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const data = await storage.getNotificationsByUser(req.user!.id);
    res.json(data);
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    const n = await storage.getNotification(req.params.id);
    if (!n || n.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });
    const updated = await storage.markNotificationRead(req.params.id);
    res.json(updated);
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    await storage.markAllNotificationsRead(req.user!.id);
    res.json({ success: true });
  });

  // ── Patient: Health Logs ───────────────────────────────────
  app.get("/api/health-logs", requireAuth, async (req, res) => {
    const type = req.query.type as string | undefined;
    const data = await storage.getHealthLogsByUser(req.user!.id, type);
    res.json(data);
  });

  app.post("/api/health-logs", requireAuth, async (req, res) => {
    const parsed = insertHealthLogSchema.safeParse({ ...req.body, userId: req.user!.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createHealthLog(parsed.data);
    res.status(201).json(created);
  });

  app.delete("/api/health-logs/:id", requireAuth, async (req, res) => {
    const log = await storage.getHealthLog(req.params.id);
    if (!log || log.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });
    await storage.deleteHealthLog(req.params.id);
    res.sendStatus(204);
  });

  // ── Patient: Profile ───────────────────────────────────────
  app.patch("/api/profile", requireAuth, async (req, res) => {
    const { name, email, phone, dob } = req.body;
    const data: Record<string, string> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (dob !== undefined) data.dob = dob;
    const updated = await storage.updateUser(req.user!.id, data);
    res.json(updated);
  });

  // ── Admin: All data ────────────────────────────────────────
  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    const data = await storage.getAllUsers();
    const safe = data.map(({ password, ...rest }) => rest);
    res.json(safe);
  });

  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    const { username, password, name, email, phone, dob } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password are required" });

    const existing = await storage.getUserByUsername(username);
    if (existing) return res.status(400).json({ message: "Username already exists" });

    const user = await storage.createUser({
      username,
      password: await hashPassword(password),
      name: name || "",
      email: email || null,
      phone: phone || null,
      dob: dob || null,
      role: "patient",
      provider: "local",
      providerId: null,
    });
    const { password: _, ...safe } = user;
    res.status(201).json(safe);
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const { name, email, phone, dob } = req.body;
    const updated = await storage.updateUser(req.params.id, { name, email, phone, dob });
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safe } = updated;
    res.json(safe);
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(403).json({ message: "Cannot delete admin users" });
    await storage.deleteUser(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/prescriptions", requireAdmin, async (_req, res) => {
    const data = await storage.getAllPrescriptions();
    res.json(data);
  });

  app.patch("/api/admin/prescriptions/:id/status", requireAdmin, async (req, res) => {
    const { status, pickupTime } = req.body;
    if (!status) return res.status(400).json({ message: "status is required" });
    const data: Record<string, any> = { status };
    if (pickupTime !== undefined) data.pickupTime = pickupTime;
    const updated = await storage.updatePrescription(req.params.id, data);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.post("/api/admin/prescriptions", requireAdmin, async (req, res) => {
    const parsed = insertPrescriptionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createPrescription(parsed.data);
    res.status(201).json(created);
  });

  app.get("/api/admin/appointments", requireAdmin, async (_req, res) => {
    const data = await storage.getAllAppointments();
    res.json(data);
  });

  app.patch("/api/admin/appointments/:id/status", requireAdmin, async (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "status is required" });
    const appt = await storage.getAppointment(req.params.id);
    if (!appt) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateAppointmentStatus(req.params.id, status);

    if (status === "cancelled" && updated) {
      const user = await storage.getUser(appt.userId);
      sendAppointmentCancellation({
        appointmentId: appt.id,
        patientName: user?.name || user?.username || "Patient",
        patientEmail: user?.email,
        service: appt.service,
        date: appt.date,
        time: appt.time,
      }).catch(err => console.error("Admin cancellation email error:", err));
    }

    res.json(updated);
  });

  app.get("/api/admin/messages", requireAdmin, async (_req, res) => {
    const data = await storage.getAllMessages();
    res.json(data);
  });

  app.post("/api/admin/messages", requireAdmin, async (req, res) => {
    const parsed = insertMessageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createMessage(parsed.data);
    res.status(201).json(created);
  });

  app.post("/api/admin/notifications/broadcast", requireAdmin, async (req, res) => {
    const { type, title, body, userIds } = req.body;
    if (!type || !title || !body) return res.status(400).json({ message: "type, title, and body are required" });

    let targetUsers: string[] = userIds;
    if (!targetUsers || targetUsers.length === 0) {
      const allUsers = await storage.getAllUsers();
      targetUsers = allUsers.filter(u => u.role === "patient").map(u => u.id);
    }

    const created = [];
    for (const userId of targetUsers) {
      const n = await storage.createNotification({
        userId,
        type,
        title,
        body,
        read: false,
        createdAt: new Date().toISOString(),
      });
      created.push(n);
    }
    res.status(201).json({ count: created.length });
  });

  app.get("/api/admin/health-logs", requireAdmin, async (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (userId) {
      const data = await storage.getHealthLogsByUser(userId);
      res.json(data);
    } else {
      const allUsers = await storage.getAllUsers();
      const patients = allUsers.filter(u => u.role === "patient");
      const allLogs = [];
      for (const p of patients) {
        const logs = await storage.getHealthLogsByUser(p.id);
        allLogs.push(...logs);
      }
      res.json(allLogs);
    }
  });

  // ── Calorie Tracking ──────────────────────────────────────
  app.get("/api/calorie-logs", requireAuth, async (req, res) => {
    const data = await storage.getCalorieLogsByUser(req.user!.id);
    res.json(data);
  });

  app.post("/api/calorie-logs", requireAuth, async (req, res) => {
    const parsed = insertCalorieLogSchema.safeParse({ ...req.body, userId: req.user!.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createCalorieLog(parsed.data);
    res.status(201).json(created);
  });

  app.delete("/api/calorie-logs/:id", requireAuth, async (req, res) => {
    const deleted = await storage.deleteCalorieLog(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  });

  // Food analysis (OpenAI) was removed to simplify deployment and avoid requiring an OPENAI_API_KEY.
  // Keep the endpoint to avoid breaking the UI; return a clear message instead.
  app.post("/api/analyze-food", requireAuth, async (_req, res) => {
    return res.status(501).json({
      message: "Food analysis has been removed from this app.",
    });
  });

  app.get("/api/admin/audit-logs", requireAdmin, async (_req, res) => {
    const logs = await storage.getAllAuditLogs();
    res.json(logs);
  });

  app.get("/api/promo-banner", async (_req, res) => {
    const banner = await storage.getActivePromoBanner();
    res.json(banner || null);
  });

  app.get("/api/admin/promo-banners", requireAdmin, async (_req, res) => {
    const banners = await storage.getAllPromoBanners();
    res.json(banners);
  });

  app.post("/api/admin/promo-banners", requireAdmin, async (req, res) => {
    const { title, description } = req.body;
    if (!title || !description) return res.status(400).json({ message: "Title and description are required" });
    const banner = await storage.createPromoBanner({ title, description, active: true, createdAt: new Date().toISOString() });
    res.json(banner);
  });

  app.patch("/api/admin/promo-banners/:id", requireAdmin, async (req, res) => {
    const { title, description, active } = req.body;
    const updated = await storage.updatePromoBanner(req.params.id, { title, description, active });
    if (!updated) return res.status(404).json({ message: "Banner not found" });
    res.json(updated);
  });

  app.delete("/api/admin/promo-banners/:id", requireAdmin, async (req, res) => {
    const deleted = await storage.deletePromoBanner(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Banner not found" });
    res.json({ success: true });
  });

  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadsDir, path.basename(req.path));
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  app.post("/api/admin/sms/upload", requireAdmin, upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });

  app.post("/api/admin/sms/broadcast", requireAdmin, async (req, res) => {
    const { message, mediaUrl, patientIds } = req.body;
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ message: "Message text is required" });
    }
    if (message.length > 1600) {
      return res.status(400).json({ message: "Message must be 1600 characters or fewer" });
    }

    const allUsers = await storage.getAllUsers();
    const patientsWithPhone = allUsers
      .filter((u) => {
        if (u.role !== "patient" || !u.phone || u.phone.trim().length === 0) return false;
        if (Array.isArray(patientIds) && patientIds.length > 0) return patientIds.includes(u.id);
        return true;
      })
      .map((u) => ({ userId: u.id, phone: u.phone! }));

    if (patientsWithPhone.length === 0) {
      return res.status(404).json({ message: "No patients with phone numbers found" });
    }

    let absoluteMediaUrl: string | undefined;
    if (mediaUrl) {
      const host = req.headers.host || "localhost:5000";
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      absoluteMediaUrl = `${protocol}://${host}${mediaUrl}`;
    }

    try {
      const result = await sendSmsToPatients(patientsWithPhone, message.trim(), absoluteMediaUrl);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to send SMS" });
    }
  });

  return httpServer;
}
