import { useEffect, useMemo, useState, useCallback, useRef, type FormEvent, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast, toast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import {
  Activity,
  Apple,
  Bell,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Droplets,
  Edit,
  Heart,
  Home,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Nfc,
  Phone,
  Pill,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Share2,
  Shield,
  Smartphone,
  Stethoscope,
  Trash2,
  TrendingUp,
  UtensilsCrossed,
  User,
  Users,
  Wind,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import remedyLogo from "@assets/Remedypills_logo_1_1771941028931.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
const LazyChart = lazy(() => import("@/components/ui/charts.lazy"));

interface Prescription {
  id: string;
  userId: string;
  name: string;
  strength: string;
  directions: string;
  rxNumber: string;
  status: string;
  lastFillDate: string;
  refillable: boolean;
  refillCount: number;
  autoRefill: boolean;
  pickupTime?: string | null;
  familyMemberName?: string | null;
}

interface Reminder {
  id: string;
  userId: string;
  medicationName: string;
  time: string;
  frequency: string;
  taken: boolean;
  snoozed: boolean;
  category?: string | null;
}

interface Appointment {
  id: string;
  userId: string;
  service: string;
  date: string;
  time: string;
  status: string;
  notes?: string | null;
  patientNotes?: string | null;
}

interface Message {
  id: string;
  userId: string;
  sender: string;
  text: string;
  timestamp: string;
  category?: string | null;
}

interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  metadata?: string | null;
}

interface HealthLog {
  id: string;
  userId: string;
  type: string;
  value: number;
  secondaryValue?: number | null;
  unit: string;
  notes?: string | null;
  loggedAt: string;
}

interface CalorieLog {
  id: string;
  userId: string;
  mealType: string;
  foodItems: string;
  totalCalories: number;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  imageUrl?: string | null;
  notes?: string | null;
  loggedAt: string;
}

interface FoodAnalysisResult {
  foods: Array<{
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }>;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  healthTips: string;
}

interface Location {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  isOpen: boolean;
  distance?: string;
}

const PHARMACY_INFO = {
  name: "RemedyPills Pharmacy",
  addressLine1: "Unit # 135, 246 Nolanridge Crescent NW",
  addressLine2: "Calgary, AB",
  postalCode: "T3R 1W9",
  phone: "+1 (403) 980-7003",
  fax: "+1 (403) 518-7522",
  email: "remedypillspharmacy@gmail.com",
  website: "https://www.remedypills.ca",
  hoursSummary: "Mon\u2013Fri 9:00 AM\u20135:00 PM \u00b7 Sat 10:00 AM\u20132:00 PM \u00b7 Sun Closed",
};

const WHATSAPP_CONFIG = {
  phoneE164: "+15874431801",
  defaultMessage:
    "Hello Remedy Pills Pharmacy, I have a question about my prescriptions.",
};

const openBusinessWhatsApp = () => {
  if (typeof window === "undefined") return;
  const digits = WHATSAPP_CONFIG.phoneE164.replace(/\D/g, "");
  if (!digits) {
    alert(
      "WhatsApp Business number is not configured yet. Please contact the pharmacy directly.",
    );
    return;
  }
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(WHATSAPP_CONFIG.defaultMessage)}`;
  window.open(url, "_blank");
};

function isPharmacyOpenNow(): boolean {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Edmonton" }));
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const time = hours * 60 + minutes;
  if (day >= 1 && day <= 5) return time >= 540 && time < 1020;
  if (day === 6) return time >= 600 && time < 840;
  return false;
}

const STATIC_LOCATIONS: Location[] = [
  {
    id: "1",
    name: PHARMACY_INFO.name,
    address: `${PHARMACY_INFO.addressLine1}, ${PHARMACY_INFO.addressLine2} ${PHARMACY_INFO.postalCode}`,
    phone: PHARMACY_INFO.phone,
    hours: PHARMACY_INFO.hoursSummary,
    isOpen: isPharmacyOpenNow(),
    distance: "0.8 km",
  },
];

const ALBERTA_SERVICES = [
  { value: "Flu Shot", label: "Flu Vaccination", category: "Vaccinations" },
  { value: "COVID Vaccine", label: "COVID-19 Vaccine", category: "Vaccinations" },
  { value: "Travel Vaccines", label: "Travel Vaccines", category: "Vaccinations" },
  { value: "Minor Ailment Consultation", label: "Minor Ailment Prescribing", category: "Consultations", alberta: true },
  { value: "Medication Review", label: "Medication Review", category: "Consultations" },
  { value: "Blood Pressure Check", label: "Blood Pressure Check", category: "Health Checks" },
  { value: "Diabetes Check", label: "Diabetes Screening", category: "Health Checks" },
  { value: "Smoking Cessation", label: "Smoking Cessation Program", category: "Programs" },
  { value: "Travel Health Consultation", label: "Travel Health Consultation", category: "Consultations" },
];

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  refill_ready: <Pill className="h-4 w-4 text-emerald-600" />,
  vaccine_eligible: <Shield className="h-4 w-4 text-blue-600" />,
  drug_recall: <Shield className="h-4 w-4 text-red-600" />,
  weather_hours: <Clock className="h-4 w-4 text-amber-600" />,
  insurance_renewal: <Heart className="h-4 w-4 text-purple-600" />,
  general: <Bell className="h-4 w-4 text-primary" />,
};

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-emerald-500/15 text-emerald-700 border-emerald-200" },
    processing: { label: "Processing", className: "bg-amber-500/15 text-amber-800 border-amber-200" },
    ready: { label: "Ready for Pickup", className: "bg-sky-500/15 text-sky-800 border-sky-200" },
    completed: { label: "Completed", className: "bg-zinc-500/15 text-zinc-700 border-zinc-200" },
  };
  const entry = map[status] || map.active;
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", entry.className)}
      data-testid={`badge-rx-status-${status}`}
    >
      {entry.label}
    </span>
  );
}

function GlassShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(186,86%,96%)] to-[hsl(210,40%,98%)]">
      <div className="mx-auto max-w-lg">
        {children}
      </div>
    </div>
  );
}

type TabType = "home" | "prescriptions" | "reminders" | "appointments" | "health" | "account";

function TopBar({
  onEmergency,
  onChat,
  onLogout,
  onNotifications,
  userName,
  unreadCount,
}: {
  onEmergency: () => void;
  onChat: () => void;
  onLogout: () => void;
  onNotifications: () => void;
  userName: string;
  unreadCount: number;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const initials = userName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-[hsl(186,86%,30%)] via-[hsl(186,76%,40%)] to-[hsl(176,70%,48%)] px-5 pb-6 pt-10">
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/8" />

      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white/80" data-testid="text-greeting-label">{greeting}</p>
          <h1 className="text-xl font-bold text-white" data-testid="text-app-title">{userName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNotifications}
            className="relative grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            data-testid="button-notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[hsl(186,86%,30%)]" data-testid="badge-notification-count">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-white shadow-lg ring-2 ring-white/50"
            data-testid="button-logout"
          >
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/20 to-primary/5">
              <img src={remedyLogo} alt="RemedyPills" className="h-7 w-7 object-contain" data-testid="img-remedypills-logo" />
            </div>
          </button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-2xl text-white"
            onClick={onLogout}
            data-testid="button-user-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}

function BottomNav({ tab, setTab }: { tab: TabType; setTab: (t: TabType) => void }) {
  const items: Array<{ id: TabType; label: string; icon: React.ReactNode; activeIcon: React.ReactNode }> = [
    { id: "home", label: "Home", icon: <Home className="h-5 w-5" />, activeIcon: <Home className="h-5 w-5" /> },
    { id: "prescriptions", label: "Rx", icon: <Pill className="h-5 w-5" />, activeIcon: <Pill className="h-5 w-5" /> },
    { id: "reminders", label: "Reminders", icon: <Bell className="h-5 w-5" />, activeIcon: <Bell className="h-5 w-5" /> },
    { id: "appointments", label: "Care", icon: <Calendar className="h-5 w-5" />, activeIcon: <Calendar className="h-5 w-5" /> },
    { id: "health", label: "Health", icon: <Activity className="h-5 w-5" />, activeIcon: <Activity className="h-5 w-5" /> },
    { id: "account", label: "Account", icon: <User className="h-5 w-5" />, activeIcon: <User className="h-5 w-5" /> },
  ];

  return (
    <nav className="sticky bottom-0 z-20 border-t border-gray-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="mx-auto flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {items.map((it) => {
          const active = tab === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setTab(it.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-[hsl(186,86%,30%)]" : "text-gray-400 hover:text-gray-600",
              )}
              data-testid={`tab-${it.id}`}
            >
              {active ? it.activeIcon : it.icon}
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

interface TransferFormData {
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  email: string;
  pharmacyName: string;
  pharmacyPhone: string;
  pharmacyFax: string;
  medicationName: string;
  rxNumber: string;
  notes: string;
}

function TransferForm({ onSubmit, isPending }: { onSubmit: (data: TransferFormData) => void; isPending: boolean }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [pharmacyPhone, setPharmacyPhone] = useState("");
  const [pharmacyFax, setPharmacyFax] = useState("");
  const [medicationName, setMedicationName] = useState("");
  const [rxNumber, setRxNumber] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <ScrollArea className="max-h-[70vh]">
      <form
        className="space-y-4 pr-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ firstName, lastName, dob, phone, email, pharmacyName, pharmacyPhone, pharmacyFax, medicationName, rxNumber, notes });
        }}
      >
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">
            Fill out this form to transfer your prescription to RemedyPills Pharmacy. We'll contact your current pharmacy and handle everything for you.
          </p>
        </div>

        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Information</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">First Name *</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="rounded-2xl" required data-testid="input-transfer-firstname" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Last Name *</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="rounded-2xl" required data-testid="input-transfer-lastname" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Date of Birth *</label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="rounded-2xl" required data-testid="input-transfer-dob" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Phone *</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(403) 980-7003" className="rounded-2xl" required data-testid="input-transfer-phone" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="rounded-2xl" data-testid="input-transfer-email" />
        </div>

        <div className="my-2 border-t" />
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Pharmacy</p>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Pharmacy Name *</label>
          <Input value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} placeholder="e.g. Shoppers Drug Mart" className="rounded-2xl" required data-testid="input-transfer-pharmacy-name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Pharmacy Phone *</label>
            <Input value={pharmacyPhone} onChange={(e) => setPharmacyPhone(e.target.value)} placeholder="(403) 980-7003" className="rounded-2xl" required data-testid="input-transfer-pharmacy-phone" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Pharmacy Fax</label>
            <Input value={pharmacyFax} onChange={(e) => setPharmacyFax(e.target.value)} placeholder="(403) 518-7522" className="rounded-2xl" data-testid="input-transfer-pharmacy-fax" />
          </div>
        </div>

        <div className="my-2 border-t" />
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prescription Details</p>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Medication Name *</label>
          <Input value={medicationName} onChange={(e) => setMedicationName(e.target.value)} placeholder="e.g. Metformin 500mg" className="rounded-2xl" required data-testid="input-transfer-medication" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Rx Number (from label)</label>
          <Input value={rxNumber} onChange={(e) => setRxNumber(e.target.value)} placeholder="e.g. RX-123456" className="rounded-2xl" data-testid="input-transfer-rx-number" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Additional Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions or additional medications to transfer..." className="min-h-[60px] rounded-2xl" data-testid="input-transfer-notes" />
        </div>

        <Button type="submit" className="w-full rounded-2xl" disabled={isPending} data-testid="button-submit-transfer">
          {isPending ? "Submitting..." : "Submit Transfer Request"}
        </Button>
      </form>
    </ScrollArea>
  );
}

function PrescriptionForm({ initial, onSubmit, isPending }: { initial?: Prescription; onSubmit: (data: Record<string, any>) => void; isPending: boolean }) {
  const [rxNumber, setRxNumber] = useState(initial?.rxNumber || "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // only send rxNumber; other values are handled by parent defaults or patch logic
    onSubmit({ rxNumber });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-testid="form-prescription">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Rx Number *</label>
        <Input value={rxNumber} onChange={(e) => setRxNumber(e.target.value)} placeholder="e.g. RX-12345" className="rounded-2xl" required data-testid="input-med-rx" />
      </div>
      <Button type="submit" className="w-full rounded-2xl bg-[hsl(186,86%,30%)] hover:bg-[hsl(186,86%,25%)]" disabled={isPending} data-testid="button-save-medication">
        {isPending ? "Saving..." : initial ? "Update Medication" : "Add Medication"}
      </Button>
    </form>
  );
}

export default function PharmacyApp() {
  const { user, logoutMutation } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showHealthLogModal, setShowHealthLogModal] = useState(false);
  const [showTransferSuccess, setShowTransferSuccess] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [chatCategory, setChatCategory] = useState("General");
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SESSION_WARNING_TIME = 25 * 60 * 1000;
  const SESSION_LOGOUT_TIME = 30 * 60 * 1000;

  const resetSessionTimers = useCallback(() => {
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    setShowSessionWarning(false);
    warningTimerRef.current = setTimeout(() => setShowSessionWarning(true), SESSION_WARNING_TIME);
    sessionTimerRef.current = setTimeout(() => logoutMutation.mutate(), SESSION_LOGOUT_TIME);
  }, [logoutMutation]);

  useEffect(() => {
    if (!user) return;
    resetSessionTimers();
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const handler = () => {
      if (!showSessionWarning) resetSessionTimers();
    };
    events.forEach(e => window.addEventListener(e, handler));
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [user, resetSessionTimers, showSessionWarning]);

  if (!user) return <Redirect to="/auth" />;
  if (user.role === "admin") return <Redirect to="/admin" />;

  const needsRx = activeTab === "home" || activeTab === "prescriptions";
  const needsReminders = activeTab === "home" || activeTab === "reminders";
  const { data: prescriptions = [] } = useQuery<Prescription[]>({ queryKey: ["/api/prescriptions"], enabled: needsRx, staleTime: 30_000 });
  const { data: reminders = [] } = useQuery<Reminder[]>({ queryKey: ["/api/reminders"], enabled: needsReminders, staleTime: 30_000 });
  const { data: appointments = [] } = useQuery<Appointment[]>({ queryKey: ["/api/appointments"], enabled: activeTab === "home" || activeTab === "appointments", staleTime: 30_000 });
  const { data: messages = [] } = useQuery<Message[]>({ queryKey: ["/api/messages"], enabled: showChatModal, staleTime: 10_000 });
  const { data: appNotifications = [] } = useQuery<AppNotification[]>({ queryKey: ["/api/notifications"], staleTime: 30_000 });
  const { data: healthLogs = [] } = useQuery<HealthLog[]>({ queryKey: ["/api/health-logs"], enabled: activeTab === "health", staleTime: 30_000 });

  const unreadNotifications = useMemo(() => appNotifications.filter(n => !n.read), [appNotifications]);

  const refillMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("PATCH", `/api/prescriptions/${id}/status`, { status: "processing" }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/prescriptions"] }),
  });

  const addPrescriptionMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => { await apiRequest("POST", "/api/prescriptions", data); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/prescriptions"] }); toast({ title: "Medication added" }); },
  });

  const editPrescriptionMutation = useMutation({
    mutationFn: async ({ id, ...data }: Record<string, any>) => { await apiRequest("PATCH", `/api/prescriptions/${id}`, data); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/prescriptions"] }); toast({ title: "Medication updated" }); },
  });

  const deletePrescriptionMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/prescriptions/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/prescriptions"] }); toast({ title: "Medication deleted" }); },
  });

  const toggleAutoRefillMutation = useMutation({
    mutationFn: async ({ id, autoRefill }: { id: string; autoRefill: boolean }) => {
      await apiRequest("PATCH", `/api/prescriptions/${id}`, { autoRefill });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/prescriptions"] }),
  });

  const markTakenMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("PATCH", `/api/reminders/${id}`, { taken: true }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/reminders"] }),
  });

  const snoozeMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("PATCH", `/api/reminders/${id}`, { snoozed: true }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/reminders"] }),
  });

  const addReminderMutation = useMutation({
    mutationFn: async (data: { medicationName: string; time: string; frequency: string; category?: string }) => {
      await apiRequest("POST", "/api/reminders", data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/reminders"] }); setShowAddReminderModal(false); },
  });

  const updateReminderMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; medicationName: string; time: string; frequency: string; category?: string }) => {
      await apiRequest("PATCH", `/api/reminders/${id}`, data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/reminders"] }); setEditingReminder(null); },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/reminders/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/reminders"] }),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { sender: string; text: string; timestamp: string; category: string }) => {
      await apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/messages"] }),
  });

  const invalidateAppointments = () => {
    qc.invalidateQueries({ queryKey: ["/api/appointments"] });
    qc.invalidateQueries({ queryKey: ["/api/available-slots"] });
  };

  const bookAppointmentMutation = useMutation({
    mutationFn: async (data: { service: string; date: string; time: string; patientNotes?: string }) => {
      await apiRequest("POST", "/api/appointments", { ...data, status: "upcoming" });
    },
    onSuccess: invalidateAppointments,
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/appointments/${id}/status`, { status: "cancelled" });
    },
    onSuccess: invalidateAppointments,
  });

  const editAppointmentMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; service: string; date: string; time: string; patientNotes?: string }) => {
      await apiRequest("PATCH", `/api/appointments/${id}`, data);
    },
    onSuccess: invalidateAppointments,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; email?: string; phone?: string; dob?: string }) => {
      await apiRequest("PATCH", "/api/profile", data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/user"] }),
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("PATCH", `/api/notifications/${id}/read`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => { await apiRequest("POST", "/api/notifications/read-all"); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const addHealthLogMutation = useMutation({
    mutationFn: async (data: { type: string; value: number; secondaryValue?: number; unit: string; notes?: string }) => {
      await apiRequest("POST", "/api/health-logs", { ...data, loggedAt: new Date().toISOString() });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/health-logs"] }); setShowHealthLogModal(false); },
  });

  useEffect(() => {
    if (sessionStorage.getItem("emergencyDismissed")) return;
    const timer = window.setTimeout(() => setShowEmergencyModal(true), 500);
    return () => window.clearTimeout(timer);
  }, []);

  const todaysReminders = useMemo(() => reminders.filter((r) => !r.taken).slice(0, 3), [reminders]);
  const readyPrescriptions = useMemo(() => prescriptions.filter((p) => p.status === "ready" || p.status === "processing"), [prescriptions]);

  const adherenceRate = useMemo(() => {
    if (reminders.length === 0) return 0;
    const taken = reminders.filter(r => r.taken).length;
    return Math.round((taken / reminders.length) * 100);
  }, [reminders]);

  const handleRefillRequest = (prescriptionId: string) => {
    refillMutation.mutate(prescriptionId);
    setShowRefillModal(false);
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate({ sender: "user", text: newMessage.trim(), timestamp: new Date().toISOString(), category: chatCategory });
    setNewMessage("");
    window.setTimeout(() => {
      sendMessageMutation.mutate({ sender: "pharmacist", text: "Thanks \u2014 I've received your message. We'll reply as soon as possible.", timestamp: new Date().toISOString(), category: chatCategory });
    }, 700);
  };

  const handleBookAppointment = (service: string, date: string, time: string, patientNotes?: string) => {
    bookAppointmentMutation.mutate({ service, date, time, patientNotes });
    setShowBookingModal(false);
  };

  const displayName = user.name || user.username;

  return (
    <GlassShell>
      <TopBar
        onEmergency={() => setShowEmergencyModal(true)}
        onChat={() => setShowChatModal(true)}
        onLogout={() => logoutMutation.mutate()}
        onNotifications={() => setShowNotificationsModal(true)}
        userName={displayName}
        unreadCount={unreadNotifications.length}
      />

      <main className="px-4 pb-24 pt-5">
        {activeTab === "home" && (
          <HomeTab
            displayName={displayName}
            todaysReminders={todaysReminders}
            readyPrescriptions={readyPrescriptions}
            prescriptions={prescriptions}
            adherenceRate={adherenceRate}
            onRefill={() => setShowRefillModal(true)}
            onTransfer={() => setShowTransferModal(true)}
            onBook={() => setShowBookingModal(true)}
            onChat={() => setShowChatModal(true)}
            onMarkTaken={(id) => markTakenMutation.mutate(id)}
            onSnooze={(id) => snoozeMutation.mutate(id)}
            onViewAllRx={() => setActiveTab("prescriptions")}
            onViewHealth={() => setActiveTab("health")}
          />
        )}

        {activeTab === "prescriptions" && (
          <PrescriptionsTab
            prescriptions={prescriptions}
            onRefill={() => setShowRefillModal(true)}
            onChat={() => setShowChatModal(true)}
            onToggleAutoRefill={(id, val) => toggleAutoRefillMutation.mutate({ id, autoRefill: val })}
            onAdd={() => setShowAddMedModal(true)}
            onEdit={setEditingPrescription}
            onDelete={(id) => deletePrescriptionMutation.mutate(id)}
          />
        )}

        {activeTab === "reminders" && (
          <RemindersTab
            reminders={reminders}
            adherenceRate={adherenceRate}
            onMarkTaken={(id) => markTakenMutation.mutate(id)}
            onSnooze={(id) => snoozeMutation.mutate(id)}
            onAdd={() => setShowAddReminderModal(true)}
            onEdit={setEditingReminder}
            onDelete={(id) => deleteReminderMutation.mutate(id)}
          />
        )}

        {activeTab === "appointments" && (
          <AppointmentsTab
            appointments={appointments}
            onBook={() => setShowBookingModal(true)}
            onCancel={(id) => cancelAppointmentMutation.mutate(id)}
            onEdit={(id, data) => editAppointmentMutation.mutate({ id, ...data })}
          />
        )}

        {activeTab === "health" && (
          <HealthTab
            healthLogs={healthLogs}
            reminders={reminders}
            adherenceRate={adherenceRate}
            onAddLog={() => setShowHealthLogModal(true)}
          />
        )}

        {activeTab === "account" && (
          <AccountTab user={user} onUpdateProfile={(data) => updateProfileMutation.mutate(data)} isPending={updateProfileMutation.isPending} />
        )}
      </main>

      <BottomNav tab={activeTab} setTab={setActiveTab} />

      <Dialog open={showEmergencyModal} onOpenChange={setShowEmergencyModal}>
        <DialogContent className="max-w-md rounded-3xl" data-testid="modal-emergency">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" /> Emergency notice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p data-testid="text-emergency-disclaimer">If this is a medical emergency, call 911 immediately. For urgent medication issues after hours, contact Alberta Health Link at 811.</p>
            <div className="rounded-2xl border bg-muted/40 p-3 text-xs" data-testid="box-pharmacy-info">
              <p className="font-semibold text-foreground">{PHARMACY_INFO.name}</p>
              <p>{PHARMACY_INFO.addressLine1}</p>
              <p>{PHARMACY_INFO.addressLine2} {PHARMACY_INFO.postalCode}</p>
              <p className="mt-2">Phone: <a href={`tel:${PHARMACY_INFO.phone.replace(/[^0-9+]/g, "")}`} className="font-semibold text-primary underline">{PHARMACY_INFO.phone}</a></p>
              <p>Fax: {PHARMACY_INFO.fax}</p>
              <p>Email: <a href={`mailto:${PHARMACY_INFO.email}`} className="text-primary underline">{PHARMACY_INFO.email}</a></p>
              <p className="mt-2">{PHARMACY_INFO.hoursSummary}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="rounded-2xl" onClick={() => { sessionStorage.setItem("emergencyDismissed", "1"); setShowEmergencyModal(false); }} data-testid="button-close-emergency">I understand</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRefillModal} onOpenChange={setShowRefillModal}>
        <DialogContent className="max-w-lg rounded-3xl" data-testid="modal-refill">
          <DialogHeader><DialogTitle>Request refill</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {prescriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No prescriptions available.</p>
            ) : prescriptions.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3" data-testid={`row-refill-${p.id}`}>
                <div>
                  <p className="text-sm font-semibold">{p.name} {p.familyMemberName ? `(${p.familyMemberName})` : ""}</p>
                  <p className="text-xs text-muted-foreground">{p.strength} &middot; {p.rxNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={p.status} />
                  <Button size="sm" className="rounded-2xl" disabled={!p.refillable || p.status === "processing" || refillMutation.isPending} onClick={() => handleRefillRequest(p.id)} data-testid={`button-submit-refill-${p.id}`}>
                    <RefreshCw className="mr-1 h-3 w-3" /> Refill
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="max-w-lg rounded-3xl" data-testid="modal-transfer">
          <DialogHeader><DialogTitle>Transfer a Prescription</DialogTitle></DialogHeader>
          <TransferForm
            onSubmit={async (data) => {
              try {
                await apiRequest("POST", "/api/transfer-request", data);
                const lines = [
                  `📋 TRANSFER REQUEST (emailed to pharmacy)`,
                  `Patient: ${data.firstName} ${data.lastName}`,
                  `Medication: ${data.medicationName}`,
                  `From: ${data.pharmacyName}`,
                ].join("\n");
                sendMessageMutation.mutate({ sender: "user", text: lines, timestamp: new Date().toISOString(), category: "Transfer" });
                setShowTransferModal(false);
                setShowTransferSuccess(true);
              } catch {
                setShowTransferModal(false);
                setShowTransferSuccess(true);
              }
            }}
            isPending={sendMessageMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showTransferSuccess} onOpenChange={setShowTransferSuccess}>
        <DialogContent className="max-w-sm rounded-3xl text-center" data-testid="modal-transfer-success">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Transfer Request Submitted</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your prescription transfer request has been sent to our pharmacy team. We'll contact your current pharmacy and handle everything for you.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                You'll receive a notification once the transfer is complete. Typical processing time is 24–48 hours.
              </p>
            </div>
            <Button className="mt-2 w-full rounded-2xl" onClick={() => setShowTransferSuccess(false)} data-testid="button-transfer-success-done">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-lg rounded-3xl" data-testid="modal-booking">
          <DialogHeader><DialogTitle>Book a service</DialogTitle></DialogHeader>
          <div className="mb-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Stethoscope className="h-4 w-4" /> Alberta Expanded Prescribing Authority
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Alberta pharmacists can prescribe for over 30 minor ailments including UTIs, cold sores, allergies, pink eye, and more. No doctor visit needed!
            </p>
          </div>
          <BookingForm onBook={handleBookAppointment} />
        </DialogContent>
      </Dialog>

      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className="max-w-2xl rounded-3xl" data-testid="modal-chat">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span>Messages</span>
              <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => setShowChatModal(false)} data-testid="button-close-chat"><X className="h-4 w-4" /></Button>
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Category</label>
              <Select value={chatCategory} onValueChange={setChatCategory}>
                <SelectTrigger className="rounded-2xl" data-testid="select-chat-category"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {["General", "Refills", "Insurance", "Side effects", "Drug interactions", "Transfer"].map((c) => (
                    <SelectItem key={c} value={c} data-testid={`option-chat-category-${c}`}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded-2xl border bg-muted/30 p-3 text-xs text-muted-foreground" data-testid="box-chat-note">
                Get trusted guidance from your local pharmacist. Messages are saved and reviewed by our pharmacy team.
              </div>
            </div>
            <div className="flex min-h-[420px] flex-col rounded-2xl border bg-background/60">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3" data-testid="list-messages">
                  {messages.map((m) => {
                    const isUser = m.sender === "user";
                    return (
                      <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")} data-testid={`message-${m.id}`}>
                        <div className={cn("max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm", isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                          <p>{m.text}</p>
                          <p className="mt-1 text-[11px] opacity-80">{new Date(m.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t p-3">
                <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Write a message\u2026" className="rounded-2xl" data-testid="input-chat-message" />
                <Button type="submit" className="rounded-2xl" disabled={sendMessageMutation.isPending} data-testid="button-send-message">Send</Button>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddReminderModal} onOpenChange={setShowAddReminderModal}>
        <DialogContent className="max-w-md rounded-3xl" data-testid="modal-add-reminder">
          <DialogHeader><DialogTitle>Add Medication Reminder</DialogTitle></DialogHeader>
          <ReminderForm
            onSubmit={(data) => addReminderMutation.mutate(data)}
            isPending={addReminderMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingReminder} onOpenChange={() => setEditingReminder(null)}>
        <DialogContent className="max-w-md rounded-3xl" data-testid="modal-edit-reminder">
          <DialogHeader><DialogTitle>Edit Reminder</DialogTitle></DialogHeader>
          {editingReminder && (
            <ReminderForm
              initial={editingReminder}
              onSubmit={(data) => updateReminderMutation.mutate({ id: editingReminder.id, ...data })}
              isPending={updateReminderMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAddMedModal} onOpenChange={setShowAddMedModal}>
        <DialogContent className="max-w-md rounded-3xl" data-testid="modal-add-medication">
          <DialogHeader><DialogTitle>Add Medication</DialogTitle></DialogHeader>
          <PrescriptionForm
            onSubmit={(data) => {
              // supply defaults needed by backend
              addPrescriptionMutation.mutate({
                ...data,
                name: "",
                strength: "",
                directions: "",
                lastFillDate: new Date().toISOString().split("T")[0],
                refillCount: 0,
              });
              setShowAddMedModal(false);
            }}
            isPending={addPrescriptionMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPrescription} onOpenChange={() => setEditingPrescription(null)}>
        <DialogContent className="max-w-md rounded-3xl" data-testid="modal-edit-medication">
          <DialogHeader><DialogTitle>Edit Medication</DialogTitle></DialogHeader>
          {editingPrescription && (
            <PrescriptionForm
              initial={editingPrescription}
              onSubmit={(data) => { editPrescriptionMutation.mutate({ id: editingPrescription.id, ...data }); setEditingPrescription(null); }}
              isPending={editPrescriptionMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showNotificationsModal} onOpenChange={setShowNotificationsModal}>
        <DialogContent className="max-w-lg rounded-3xl" data-testid="modal-notifications">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadNotifications.length > 0 && (
                <Button variant="ghost" size="sm" className="rounded-2xl text-xs" onClick={() => markAllReadMutation.mutate()} data-testid="button-mark-all-read">
                  Mark all read
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {appNotifications.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
              ) : appNotifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={cn("w-full rounded-2xl border p-3 text-left transition hover:bg-muted/40", !n.read && "border-primary/20 bg-primary/5")}
                  onClick={() => !n.read && markNotificationReadMutation.mutate(n.id)}
                  data-testid={`notification-${n.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{NOTIFICATION_ICONS[n.type] || NOTIFICATION_ICONS.general}</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground/70">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    {!n.read && <span className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showHealthLogModal} onOpenChange={setShowHealthLogModal}>
        <DialogContent className="max-w-md rounded-3xl" data-testid="modal-add-health-log">
          <DialogHeader><DialogTitle>Log Health Reading</DialogTitle></DialogHeader>
          <HealthLogForm onSubmit={(data) => addHealthLogMutation.mutate(data)} isPending={addHealthLogMutation.isPending} />
        </DialogContent>
      </Dialog>

      {showSessionWarning && (
        <SessionTimeoutWarning
          onExtend={() => {
            resetSessionTimers();
            fetch("/api/user");
          }}
          onLogout={() => logoutMutation.mutate()}
        />
      )}
    </GlassShell>
  );
}

function HomeTab({
  displayName,
  todaysReminders,
  readyPrescriptions,
  prescriptions,
  adherenceRate,
  onRefill,
  onTransfer,
  onBook,
  onChat,
  onMarkTaken,
  onSnooze,
  onViewAllRx,
  onViewHealth,
}: {
  displayName: string;
  todaysReminders: Reminder[];
  readyPrescriptions: Prescription[];
  prescriptions: Prescription[];
  adherenceRate: number;
  onRefill: () => void;
  onTransfer: () => void;
  onBook: () => void;
  onChat: () => void;
  onMarkTaken: (id: string) => void;
  onSnooze: (id: string) => void;
  onViewAllRx: () => void;
  onViewHealth: () => void;
}) {
  const quickActions = [
    { label: "Prescription", icon: <Pill className="h-6 w-6" />, color: "bg-teal-100 text-teal-600", action: onViewAllRx },
    { label: "Refill", icon: <RefreshCw className="h-6 w-6" />, color: "bg-amber-100 text-amber-600", action: onRefill },
    { label: "Consult", icon: <MessageCircle className="h-6 w-6" />, color: "bg-blue-100 text-blue-600", action: onChat },
    { label: "Health", icon: <Activity className="h-6 w-6" />, color: "bg-pink-100 text-pink-600", action: onViewHealth },
  ];

  const serviceItems = [
    { label: "Prescription Management", desc: "Upload, track, and manage your prescriptions", icon: <Pill className="h-5 w-5" />, color: "bg-teal-50 text-teal-600", action: onViewAllRx },
    { label: "Book a Service", desc: "Vaccines, minor ailments, and health checks", icon: <Calendar className="h-5 w-5" />, color: "bg-purple-50 text-purple-600", action: onBook },
    { label: "Transfer Prescription", desc: "Easily move your Rx to RemedyPills", icon: <Share2 className="h-5 w-5" />, color: "bg-orange-50 text-orange-500", action: onTransfer },
    { label: "Ask a Pharmacist", desc: "Side effects, drug interactions & guidance", icon: <Stethoscope className="h-5 w-5" />, color: "bg-emerald-50 text-emerald-600", action: onChat },
  ];

  const { data: promoBanner } = useQuery<{ id: string; title: string; description: string; active: boolean } | null>({ queryKey: ["/api/promo-banner"], staleTime: 60_000 });

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-base font-bold text-gray-900" data-testid="text-greeting">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              type="button"
              onClick={qa.action}
              className="flex flex-col items-center gap-2 transition-transform active:scale-95"
              data-testid={`button-quick-${qa.label.toLowerCase()}`}
            >
              <div className={cn("grid h-14 w-14 place-items-center rounded-2xl", qa.color)}>
                {qa.icon}
              </div>
              <span className="text-xs font-medium text-gray-700">{qa.label}</span>
            </button>
          ))}
        </div>
      </section>

      {promoBanner && (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(186,86%,30%)] to-[hsl(176,70%,48%)] px-5 py-5" data-testid="promo-banner">
          <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative flex items-center justify-between">
            <div className="max-w-[65%]">
              <h3 className="text-base font-bold text-white">{promoBanner.title}</h3>
              <p className="mt-1 text-sm text-white/80">{promoBanner.description}</p>
            </div>
            <button
              onClick={() => {
                const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                if (isMobile) {
                  window.location.href = `tel:${PHARMACY_INFO.phone.replace(/[^0-9+]/g, "")}`;
                } else {
                  navigator.clipboard.writeText(PHARMACY_INFO.phone).then(() => {
                    toast({ title: "Phone number copied!", description: PHARMACY_INFO.phone });
                  });
                }
              }}
              className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-white/20 transition hover:bg-white/30 active:bg-white/40"
              data-testid="button-call-pharmacy-icon"
            >
              <Phone className="h-7 w-7 text-white" />
            </button>
          </div>
        </section>
      )}

      {todaysReminders.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Upcoming Reminders</h2>
            {adherenceRate > 0 && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700" data-testid="badge-adherence">
                {adherenceRate}% adherence
              </span>
            )}
          </div>
          <div className="space-y-2">
            {todaysReminders.map((r) => (
              <div key={r.id} className={cn("flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm", r.snoozed && "opacity-70")} data-testid={`row-reminder-${r.id}`}>
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900" data-testid={`text-reminder-med-${r.id}`}>{r.medicationName}</p>
                    <p className="text-xs text-gray-500" data-testid={`text-reminder-time-${r.id}`}>
                      {r.time}{r.snoozed ? " \u00b7 Snoozed" : ""}
                      {r.category && r.category !== "general" ? ` \u00b7 ${r.category}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs text-gray-500" onClick={() => onSnooze(r.id)} data-testid={`button-snooze-${r.id}`}>Snooze</Button>
                  <Button size="sm" className="h-8 rounded-xl bg-[hsl(186,86%,30%)] text-xs hover:bg-[hsl(186,86%,25%)]" onClick={() => onMarkTaken(r.id)} data-testid={`button-taken-${r.id}`}><Check className="mr-1 h-3.5 w-3.5" /> Taken</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {readyPrescriptions.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Prescription Status</h2>
            <button type="button" onClick={onViewAllRx} className="text-sm font-semibold text-[hsl(186,86%,30%)]" data-testid="button-view-all-rx">View all</button>
          </div>
          <div className="space-y-2">
            {readyPrescriptions.map((p) => (
              <div key={p.id} className="rounded-2xl bg-white p-4 shadow-sm" data-testid={`card-rx-summary-${p.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-600">
                      <Pill className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900" data-testid={`text-rx-name-${p.id}`}>
                        {p.name} {p.familyMemberName ? `(${p.familyMemberName})` : ""}
                      </p>
                      <p className="text-xs text-gray-500" data-testid={`text-rx-strength-${p.id}`}>{p.strength} &middot; {p.rxNumber}</p>
                      {p.pickupTime && (
                        <p className="mt-1 text-xs font-medium text-[hsl(186,86%,30%)]" data-testid={`text-pickup-time-${p.id}`}>
                          <Clock className="mr-1 inline h-3 w-3" /> Pickup: {p.pickupTime}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusPill status={p.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-base font-bold text-gray-900">Our Services</h2>
        <div className="space-y-2">
          {serviceItems.map((si) => (
            <button
              key={si.label}
              type="button"
              onClick={si.action}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
              data-testid={`card-service-${si.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <div className={cn("grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl", si.color)}>
                {si.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{si.label}</p>
                <p className="text-xs text-gray-500">{si.desc}</p>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-300" />
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-gray-900">Our Location</h2>
        {STATIC_LOCATIONS.map((loc) => (
          <div key={loc.id} className="rounded-2xl bg-white p-4 shadow-sm" data-testid={`card-location-${loc.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-red-50 text-red-500">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900" data-testid={`text-location-name-${loc.id}`}>{loc.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500" data-testid={`text-location-address-${loc.id}`}>{loc.address}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1" data-testid={`row-location-phone-${loc.id}`}><Phone className="h-3.5 w-3.5" />{loc.phone}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400" data-testid={`row-location-hours-${loc.id}`}>{loc.hours}</p>
                </div>
              </div>
              <Badge className={cn("rounded-full text-xs", loc.isOpen ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-gray-100 text-gray-500 hover:bg-gray-100")} data-testid={`badge-location-open-${loc.id}`}>{loc.isOpen ? "Open" : "Closed"}</Badge>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <a href="tel:911" className="flex w-full items-center gap-3 text-left" data-testid="button-emergency">
          <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-red-100 text-red-600">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Emergency? Call 911</p>
            <p className="text-xs text-red-600">For urgent medication issues, call Alberta Health Link at 811</p>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-red-300" />
        </a>
      </section>
    </div>
  );
}

function PrescriptionsTab({
  prescriptions,
  onRefill,
  onChat,
  onToggleAutoRefill,
  onAdd,
  onEdit,
  onDelete,
}: {
  prescriptions: Prescription[];
  onRefill: () => void;
  onChat: () => void;
  onToggleAutoRefill: (id: string, val: boolean) => void;
  onAdd: () => void;
  onEdit: (p: Prescription) => void;
  onDelete: (id: string) => void;
}) {
  const myRx = prescriptions.filter(p => !p.familyMemberName);
  const familyRx = prescriptions.filter(p => p.familyMemberName);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900"><Pill className="h-4 w-4 text-[hsl(186,86%,30%)]" /> My Prescriptions</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-2xl border-[hsl(186,86%,30%)] text-[hsl(186,86%,30%)]" size="sm" onClick={onAdd} data-testid="button-add-medication">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
            <Button className="rounded-2xl bg-[hsl(186,86%,30%)] hover:bg-[hsl(186,86%,25%)]" size="sm" onClick={onRefill} data-testid="button-rx-refill">
              <RefreshCw className="mr-1 h-4 w-4" /> Refill
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {myRx.length === 0 ? (
            <div className="py-6 text-center">
              <Pill className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No medications yet</p>
              <p className="text-xs text-gray-400">Tap "Add" to add your first medication</p>
            </div>
          ) : myRx.map((p) => (
            <RxCard key={p.id} p={p} onChat={onChat} onToggleAutoRefill={onToggleAutoRefill} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </div>

      {familyRx.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900"><Users className="h-4 w-4 text-[hsl(186,86%,30%)]" /> Family Prescriptions</h2>
          <div className="space-y-3">
            {familyRx.map((p) => (
              <RxCard key={p.id} p={p} onChat={onChat} onToggleAutoRefill={onToggleAutoRefill} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RxCard({ p, onChat, onToggleAutoRefill, onEdit, onDelete }: { p: Prescription; onChat: () => void; onToggleAutoRefill: (id: string, val: boolean) => void; onEdit: (p: Prescription) => void; onDelete: (id: string) => void }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4" data-testid={`card-rx-${p.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {p.name} {p.strength}
            {p.familyMemberName && <span className="ml-2 text-xs text-muted-foreground">({p.familyMemberName})</span>}
          </p>
          <p className="text-xs text-muted-foreground">{p.rxNumber} &middot; {p.directions}</p>
          <p className="mt-1 text-xs text-muted-foreground">Last filled: {p.lastFillDate} &middot; Refills: {p.refillCount}</p>
          {p.pickupTime && (
            <p className="mt-1 text-xs font-medium text-primary">
              <Clock className="mr-1 inline h-3 w-3" /> Pickup: {p.pickupTime}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusPill status={p.status} />
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(p)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600" data-testid={`button-edit-rx-${p.id}`}>
              <Edit className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onDelete(p.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-500" data-testid={`button-delete-rx-${p.id}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-xs" data-testid={`toggle-auto-refill-${p.id}`}>
          <input
            type="checkbox"
            checked={p.autoRefill}
            onChange={(e) => onToggleAutoRefill(p.id, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-muted-foreground">Auto-refill</span>
        </label>
        <Button variant="ghost" size="sm" className="rounded-2xl text-xs" onClick={onChat} data-testid={`button-ask-about-${p.id}`}>
          <MessageCircle className="mr-1 h-3 w-3" /> Ask pharmacist
        </Button>
      </div>
    </div>
  );
}

function RemindersTab({
  reminders,
  adherenceRate,
  onMarkTaken,
  onSnooze,
  onAdd,
  onEdit,
  onDelete,
}: {
  reminders: Reminder[];
  adherenceRate: number;
  onMarkTaken: (id: string) => void;
  onSnooze: (id: string) => void;
  onAdd: () => void;
  onEdit: (r: Reminder) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border-0 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">Adherence Rate</p>
          <p className="mt-1 text-2xl font-bold text-primary" data-testid="text-adherence-rate">{adherenceRate}%</p>
        </Card>
        <Card className="rounded-2xl border-0 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">Active Reminders</p>
          <p className="mt-1 text-2xl font-bold">{reminders.filter(r => !r.taken).length}</p>
        </Card>
        <Card className="rounded-2xl border-0 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">Taken Today</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{reminders.filter(r => r.taken).length}</p>
        </Card>
      </div>

      <Card className="rounded-2xl border-0 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-primary" /> Medication Reminders</CardTitle>
          <Button className="rounded-2xl" size="sm" onClick={onAdd} data-testid="button-add-reminder">
            <Plus className="mr-2 h-4 w-4" /> Add Reminder
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {reminders.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
              <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-semibold">No reminders set</p>
              <p className="mt-1 text-xs text-muted-foreground">Add a reminder to never miss a dose.</p>
            </div>
          ) : reminders.map((r) => (
            <div key={r.id} className={cn("flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4", r.taken && "opacity-50")} data-testid={`row-reminder-manage-${r.id}`}>
              <div>
                <p className="text-sm font-semibold">{r.medicationName}</p>
                <p className="text-xs text-muted-foreground">
                  {r.time} &middot; {r.frequency}
                  {r.taken && " \u00b7 Taken"}
                  {r.snoozed && " \u00b7 Snoozed"}
                  {r.category && r.category !== "general" ? ` \u00b7 ${r.category}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!r.taken && (
                  <>
                    <Button size="sm" variant="secondary" className="rounded-2xl" onClick={() => onSnooze(r.id)} data-testid={`button-snooze-manage-${r.id}`}>Snooze</Button>
                    <Button size="sm" className="rounded-2xl" onClick={() => onMarkTaken(r.id)} data-testid={`button-taken-manage-${r.id}`}><Check className="h-4 w-4" /></Button>
                  </>
                )}
                <Button size="sm" variant="ghost" className="rounded-2xl" onClick={() => onEdit(r)} data-testid={`button-edit-reminder-${r.id}`}><Edit className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="rounded-2xl text-destructive" onClick={() => onDelete(r.id)} data-testid={`button-delete-reminder-${r.id}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TimeSlotPicker({ date, selectedTime, onSelectTime }: { date: string; selectedTime: string; onSelectTime: (t: string) => void }) {
  const { data, isLoading } = useQuery<{ closed: boolean; slots: string[]; hours?: string; day?: string; message?: string }>({
    queryKey: ["/api/available-slots", date],
    queryFn: async () => {
      const res = await fetch(`/api/available-slots?date=${date}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!date,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-xs text-muted-foreground">Checking availability...</span>
      </div>
    );
  }

  if (!data) return null;

  if (data.closed) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-center">
        <X className="mx-auto h-6 w-6 text-destructive" />
        <p className="mt-2 text-sm font-semibold text-destructive">{data.message || "Pharmacy is closed on this day"}</p>
        <p className="mt-1 text-xs text-muted-foreground">Please select a different date.</p>
      </div>
    );
  }

  if (data.slots.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-center">
        <Clock className="mx-auto h-6 w-6 text-amber-600" />
        <p className="mt-2 text-sm font-semibold text-amber-700">No available slots</p>
        <p className="mt-1 text-xs text-muted-foreground">All time slots are booked for this date. Try another day.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">
          {data.day} &middot; {data.hours}
        </p>
        <Badge variant="outline" className="rounded-full text-[10px]">{data.slots.length} available</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {data.slots.map(slot => (
          <button
            key={slot}
            type="button"
            className={cn(
              "rounded-xl border px-2 py-2 text-xs font-medium transition-all",
              selectedTime === slot
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background/60 text-foreground hover:border-primary/50 hover:bg-primary/5"
            )}
            onClick={() => onSelectTime(slot)}
            data-testid={`slot-${slot.replace(/\s/g, "-")}`}
          >
            {slot}
          </button>
        ))}
      </div>
    </div>
  );
}

function EditAppointmentForm({
  appointment,
  onSave,
  onCancel,
}: {
  appointment: Appointment;
  onSave: (data: { service: string; date: string; time: string; patientNotes?: string }) => void;
  onCancel: () => void;
}) {
  const [service, setService] = useState(appointment.service);
  const [date, setDate] = useState(appointment.date);
  const [time, setTime] = useState(appointment.time);
  const [notes, setNotes] = useState(appointment.patientNotes || "");
  const todayStr = new Date().toISOString().split("T")[0];

  const grouped = ALBERTA_SERVICES.reduce<Record<string, typeof ALBERTA_SERVICES>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setTime("");
  };

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave({ service, date, time, patientNotes: notes || undefined }); }}>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Service</label>
        <Select value={service} onValueChange={setService}>
          <SelectTrigger className="rounded-2xl" data-testid="select-edit-service"><SelectValue placeholder="Service" /></SelectTrigger>
          <SelectContent>
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{cat}</p>
                {items.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Date</label>
        <Input type="date" value={date} min={todayStr} onChange={(e) => handleDateChange(e.target.value)} className="rounded-2xl" data-testid="input-edit-date" />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Available Time Slots</label>
        <TimeSlotPicker date={date} selectedTime={time} onSelectTime={setTime} />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Notes for the pharmacist</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know?" className="rounded-2xl" data-testid="input-edit-notes" />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1 rounded-2xl" onClick={onCancel} data-testid="button-edit-cancel">Cancel</Button>
        <Button type="submit" className="flex-1 rounded-2xl" disabled={!time} data-testid="button-edit-save">{time ? "Save Changes" : "Select a time"}</Button>
      </div>
    </form>
  );
}

function AppointmentsTab({
  appointments,
  onBook,
  onCancel,
  onEdit,
}: {
  appointments: Appointment[];
  onBook: () => void;
  onCancel: (id: string) => void;
  onEdit: (id: string, data: { service: string; date: string; time: string; patientNotes?: string }) => void;
}) {
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const statusBadgeStyle = (status: string) => {
    if (status === "upcoming") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "cancelled") return "bg-red-100 text-red-700 border-red-200";
    if (status === "completed") return "bg-blue-100 text-blue-700 border-blue-200";
    return "";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Stethoscope className="h-5 w-5" /> Alberta Pharmacist Services
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Alberta pharmacists have expanded prescribing authority and can help with over 30 minor ailments, vaccinations, medication reviews, and health screenings — no doctor visit needed.
        </p>
        <Button size="sm" className="mt-3 rounded-2xl" onClick={onBook} data-testid="button-book-alberta">
          Book a Service
        </Button>
      </div>

      <Card className="rounded-2xl border-0 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4 text-primary" /> My Appointments</CardTitle>
          <Button className="rounded-2xl" size="sm" onClick={onBook} data-testid="button-book-new">
            <Plus className="mr-2 h-4 w-4" /> Book Service
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments scheduled.</p>
          ) : appointments.map((a) => (
            <div key={a.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4" data-testid={`card-appt-${a.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{a.service}</p>
                  <p className="text-xs text-muted-foreground">{a.date} at {a.time}</p>
                  {a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}
                  {a.patientNotes && <p className="mt-1 text-xs italic text-muted-foreground">Note: {a.patientNotes}</p>}
                </div>
                <Badge variant="outline" className={cn("rounded-full", statusBadgeStyle(a.status))}>{a.status}</Badge>
              </div>
              {a.status === "upcoming" && (
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => setEditingAppt(a)} data-testid={`button-edit-appt-${a.id}`}>
                    <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setCancelConfirmId(a.id)} data-testid={`button-cancel-appt-${a.id}`}>
                    <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={cancelConfirmId !== null} onOpenChange={(open) => { if (!open) setCancelConfirmId(null); }}>
        <DialogContent className="max-w-sm rounded-3xl" data-testid="modal-cancel-confirm">
          <DialogHeader><DialogTitle>Cancel Appointment?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to cancel this appointment? A cancellation email will be sent to the pharmacy.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setCancelConfirmId(null)} data-testid="button-cancel-no">Keep It</Button>
            <Button variant="destructive" className="flex-1 rounded-2xl" onClick={() => { if (cancelConfirmId) onCancel(cancelConfirmId); setCancelConfirmId(null); }} data-testid="button-cancel-yes">Yes, Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editingAppt !== null} onOpenChange={(open) => { if (!open) setEditingAppt(null); }}>
        <DialogContent className="max-w-lg rounded-3xl" data-testid="modal-edit-appointment">
          <DialogHeader><DialogTitle>Edit Appointment</DialogTitle></DialogHeader>
          {editingAppt && (
            <EditAppointmentForm
              appointment={editingAppt}
              onSave={(data) => {
                onEdit(editingAppt.id, data);
                setEditingAppt(null);
              }}
              onCancel={() => setEditingAppt(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HealthTab({
  healthLogs,
  reminders,
  adherenceRate,
  onAddLog,
}: {
  healthLogs: HealthLog[];
  reminders: Reminder[];
  adherenceRate: number;
  onAddLog: () => void;
}) {
  const [selectedType, setSelectedType] = useState("blood_pressure");

  const bpLogs = healthLogs.filter(l => l.type === "blood_pressure").slice(0, 30).reverse();
  const sugarLogs = healthLogs.filter(l => l.type === "blood_sugar").slice(0, 30).reverse();
  const heartRateLogs = healthLogs.filter(l => l.type === "heart_rate").slice(0, 30).reverse();

  const bpChartData = bpLogs.map(l => ({
    date: new Date(l.loggedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
    systolic: l.value,
    diastolic: l.secondaryValue || 0,
  }));

  const sugarChartData = sugarLogs.map(l => ({
    date: new Date(l.loggedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
    value: l.value,
  }));

  const hrChartData = heartRateLogs.map(l => ({
    date: new Date(l.loggedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
    value: l.value,
  }));

  const conditionCategories = [
    { key: "blood_pressure", label: "Blood Pressure", icon: <Heart className="h-4 w-4" />, color: "text-red-500" },
    { key: "blood_sugar", label: "Blood Sugar", icon: <Droplets className="h-4 w-4" />, color: "text-blue-500" },
    { key: "heart_rate", label: "Heart Rate", icon: <Activity className="h-4 w-4" />, color: "text-rose-500" },
    { key: "inhaler", label: "Inhaler Usage", icon: <Wind className="h-4 w-4" />, color: "text-cyan-500" },
    { key: "calories", label: "Calories", icon: <UtensilsCrossed className="h-4 w-4" />, color: "text-orange-500" },
  ];

  const inhalerLogs = healthLogs.filter(l => l.type === "inhaler").slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-0 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground">Adherence Rate</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-primary" data-testid="text-health-adherence">{adherenceRate}%</p>
        </Card>
        <Card className="rounded-2xl border-0 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            <p className="text-xs font-semibold text-muted-foreground">Last BP</p>
          </div>
          <p className="mt-2 text-2xl font-bold" data-testid="text-last-bp">
            {bpLogs.length > 0 ? `${bpLogs[bpLogs.length - 1].value}/${bpLogs[bpLogs.length - 1].secondaryValue || "?"}` : "--/--"}
          </p>
        </Card>
        <Card className="rounded-2xl border-0 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            <p className="text-xs font-semibold text-muted-foreground">Last Blood Sugar</p>
          </div>
          <p className="mt-2 text-2xl font-bold" data-testid="text-last-sugar">
            {sugarLogs.length > 0 ? `${sugarLogs[sugarLogs.length - 1].value} ${sugarLogs[sugarLogs.length - 1].unit}` : "-- mmol/L"}
          </p>
        </Card>
        <Card className="rounded-2xl border-0 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-rose-500" />
            <p className="text-xs font-semibold text-muted-foreground">Total Logs</p>
          </div>
          <p className="mt-2 text-2xl font-bold">{healthLogs.length}</p>
        </Card>
      </div>

      <Card className="rounded-2xl border-0 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" /> Health Tracking</CardTitle>
          {selectedType !== "calories" && (
            <Button className="rounded-2xl" size="sm" onClick={onAddLog} data-testid="button-add-health-log">
              <Plus className="mr-2 h-4 w-4" /> Log Reading
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            {conditionCategories.map(cat => (
              <Button
                key={cat.key}
                variant={selectedType === cat.key ? "default" : "outline"}
                size="sm"
                className="rounded-2xl"
                onClick={() => setSelectedType(cat.key)}
                data-testid={`button-health-category-${cat.key}`}
              >
                <span className={cat.color}>{cat.icon}</span>
                <span className="ml-2">{cat.label}</span>
              </Button>
            ))}
          </div>

          {selectedType === "blood_pressure" && (
            <div className="space-y-4">
              {bpChartData.length > 1 ? (
                <div className="h-[250px] w-full" data-testid="chart-blood-pressure">
                  <Suspense fallback={<div className="h-full" />}>
                    <LazyChart type="bp" data={bpChartData} />
                  </Suspense>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">Log at least 2 blood pressure readings to see trends.</p>
              )}
              <div className="rounded-2xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Pharmacist coaching tip:</p>
                <p className="mt-1">Normal BP is below 120/80 mmHg. If your readings are consistently elevated, our pharmacist can help adjust your medication or lifestyle plan.</p>
              </div>
            </div>
          )}

          {selectedType === "blood_sugar" && (
            <div className="space-y-4">
              {sugarChartData.length > 1 ? (
                <div className="h-[250px] w-full" data-testid="chart-blood-sugar">
                  <Suspense fallback={<div className="h-full" />}>
                    <LazyChart type="sugar" data={sugarChartData} />
                  </Suspense>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">Log at least 2 blood sugar readings to see trends.</p>
              )}
              <div className="rounded-2xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Diabetes coaching:</p>
                <p className="mt-1">Target fasting blood sugar: 4.0–7.0 mmol/L. Our pharmacist can review your diabetes management plan and recommend adjustments.</p>
              </div>
            </div>
          )}

          {selectedType === "heart_rate" && (
            <div className="space-y-4">
              {hrChartData.length > 1 ? (
                <div className="h-[250px] w-full" data-testid="chart-heart-rate">
                  <Suspense fallback={<div className="h-full" />}>
                    <LazyChart type="hr" data={hrChartData} />
                  </Suspense>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">Log at least 2 heart rate readings to see trends.</p>
              )}
              <div className="rounded-2xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Heart medication adherence:</p>
                <p className="mt-1">A resting heart rate between 60–100 bpm is normal. If you're on heart medication, consistent adherence is critical. Talk to your pharmacist about any concerns.</p>
              </div>
            </div>
          )}

          {selectedType === "inhaler" && (
            <div className="space-y-4">
              {inhalerLogs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No inhaler usage logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {inhalerLogs.map(l => (
                    <div key={l.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3" data-testid={`log-inhaler-${l.id}`}>
                      <div>
                        <p className="text-sm font-semibold">{l.value} puffs</p>
                        <p className="text-xs text-muted-foreground">{new Date(l.loggedAt).toLocaleString()}</p>
                        {l.notes && <p className="mt-1 text-xs italic text-muted-foreground">{l.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-2xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Asthma management:</p>
                <p className="mt-1">Track your rescue inhaler usage. If you're using it more than 2–3 times per week, your asthma may not be well-controlled. Book a review with our pharmacist.</p>
              </div>
            </div>
          )}

          {selectedType === "calories" && <CalorieTracker />}
        </CardContent>
      </Card>
    </div>
  );
}

function CalorieTracker() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [textDescription, setTextDescription] = useState("");
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  const [mealType, setMealType] = useState("lunch");
  const [inputMode, setInputMode] = useState<"camera" | "text">("camera");

  const { data: calorieLogs = [] } = useQuery<CalorieLog[]>({ queryKey: ["/api/calorie-logs"] });

  const analyzeMutation = useMutation({
    mutationFn: async (data: { image?: string; description?: string }) => {
      const res = await apiRequest("POST", "/api/analyze-food", data);
      return await res.json() as FoodAnalysisResult;
    },
    onSuccess: (result) => setAnalysisResult(result),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/calorie-logs", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/calorie-logs"] });
      resetModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/calorie-logs/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/calorie-logs"] }),
  });

  const resetModal = () => {
    setShowAnalyzeModal(false);
    setImagePreview(null);
    setImageBase64(null);
    setTextDescription("");
    setAnalysisResult(null);
    setInputMode("camera");
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = () => {
    if (inputMode === "camera" && imageBase64) {
      analyzeMutation.mutate({ image: imageBase64 });
    } else if (inputMode === "text" && textDescription.trim()) {
      analyzeMutation.mutate({ description: textDescription.trim() });
    }
  };

  const handleSave = () => {
    if (!analysisResult) return;
    saveMutation.mutate({
      mealType,
      foodItems: analysisResult.foods.map(f => `${f.name} (${f.portion})`).join(", "),
      totalCalories: analysisResult.totalCalories,
      protein: analysisResult.totalProtein,
      carbs: analysisResult.totalCarbs,
      fat: analysisResult.totalFat,
      fiber: analysisResult.totalFiber,
      loggedAt: new Date().toISOString(),
    });
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayLogs = calorieLogs.filter(l => l.loggedAt.startsWith(todayStr));
  const todayTotal = todayLogs.reduce((sum, l) => sum + l.totalCalories, 0);
  const todayProtein = todayLogs.reduce((sum, l) => sum + (l.protein || 0), 0);
  const todayCarbs = todayLogs.reduce((sum, l) => sum + (l.carbs || 0), 0);
  const todayFat = todayLogs.reduce((sum, l) => sum + (l.fat || 0), 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayLogs = calorieLogs.filter(l => l.loggedAt.startsWith(dateStr));
    return {
      date: d.toLocaleDateString("en-CA", { weekday: "short" }),
      calories: dayLogs.reduce((s, l) => s + l.totalCalories, 0),
    };
  });

  const mealLabels: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase text-orange-600">Today's Calories</p>
          <p className="mt-1 text-2xl font-bold text-orange-600" data-testid="text-today-calories">{Math.round(todayTotal)}</p>
          <p className="text-[10px] text-muted-foreground">kcal</p>
        </div>
        <div className="rounded-2xl border bg-blue-50/50 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase text-blue-600">Protein</p>
          <p className="mt-1 text-lg font-bold text-blue-600">{Math.round(todayProtein)}g</p>
        </div>
        <div className="rounded-2xl border bg-amber-50/50 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase text-amber-600">Carbs</p>
          <p className="mt-1 text-lg font-bold text-amber-600">{Math.round(todayCarbs)}g</p>
        </div>
        <div className="rounded-2xl border bg-rose-50/50 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase text-rose-600">Fat</p>
          <p className="mt-1 text-lg font-bold text-rose-600">{Math.round(todayFat)}g</p>
        </div>
      </div>

      {last7Days.some(d => d.calories > 0) && (
        <div className="h-[180px] w-full">
          <Suspense fallback={<div className="h-full" />}>
            <LazyChart type="calories" data={last7Days} />
          </Suspense>
        </div>
      )}

      <div className="flex gap-2">
        <Button className="flex-1 rounded-2xl bg-orange-600 hover:bg-orange-700" onClick={() => { setInputMode("camera"); setShowAnalyzeModal(true); }} data-testid="button-scan-food">
          <Camera className="mr-2 h-4 w-4" /> Scan Food
        </Button>
        <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => { setInputMode("text"); setShowAnalyzeModal(true); }} data-testid="button-type-food">
          <Search className="mr-2 h-4 w-4" /> Type Food
        </Button>
      </div>

      {todayLogs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Today's Meals</p>
          {todayLogs.map(log => (
            <div key={log.id} className="flex items-start justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3" data-testid={`calorie-log-${log.id}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full text-[10px]">{mealLabels[log.mealType] || log.mealType}</Badge>
                  <span className="text-sm font-bold text-orange-600">{Math.round(log.totalCalories)} kcal</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{log.foodItems}</p>
                {(log.protein || log.carbs || log.fat) && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    P: {Math.round(log.protein || 0)}g | C: {Math.round(log.carbs || 0)}g | F: {Math.round(log.fat || 0)}g
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => deleteMutation.mutate(log.id)} data-testid={`button-delete-calorie-${log.id}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {calorieLogs.filter(l => !l.loggedAt.startsWith(todayStr)).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Previous Days</p>
          {calorieLogs.filter(l => !l.loggedAt.startsWith(todayStr)).slice(0, 10).map(log => (
            <div key={log.id} className="flex items-start justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3" data-testid={`calorie-log-${log.id}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full text-[10px]">{mealLabels[log.mealType] || log.mealType}</Badge>
                  <span className="text-sm font-bold text-orange-600">{Math.round(log.totalCalories)} kcal</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(log.loggedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{log.foodItems}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => deleteMutation.mutate(log.id)} data-testid={`button-delete-calorie-${log.id}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">Pharmacist nutrition tip:</p>
        <p className="mt-1">Tracking your diet helps manage conditions like diabetes and high blood pressure. Some medications work better with or without food. Ask your pharmacist about medication-food interactions.</p>
      </div>

      <Dialog open={showAnalyzeModal} onOpenChange={(open) => { if (!open) resetModal(); }}>
        <DialogContent className="max-w-md rounded-3xl" data-testid="modal-food-analyzer">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-orange-500" />
              {analysisResult ? "Analysis Results" : inputMode === "camera" ? "Scan Your Food" : "Describe Your Food"}
            </DialogTitle>
          </DialogHeader>

          {!analysisResult ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant={inputMode === "camera" ? "default" : "outline"} size="sm" className="flex-1 rounded-2xl" onClick={() => setInputMode("camera")} data-testid="button-mode-camera">
                  <Camera className="mr-2 h-4 w-4" /> Photo
                </Button>
                <Button variant={inputMode === "text" ? "default" : "outline"} size="sm" className="flex-1 rounded-2xl" onClick={() => setInputMode("text")} data-testid="button-mode-text">
                  <Search className="mr-2 h-4 w-4" /> Text
                </Button>
              </div>

              {inputMode === "camera" ? (
                <div className="space-y-3">
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Food preview" className="w-full rounded-2xl object-cover" style={{ maxHeight: "250px" }} />
                      <Button variant="secondary" size="sm" className="absolute right-2 top-2 rounded-full" onClick={() => { setImagePreview(null); setImageBase64(null); }} data-testid="button-retake-photo">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/30 p-8 transition-colors hover:border-orange-400 hover:bg-orange-50/50"
                      data-testid="button-capture-food"
                    >
                      <div className="grid h-16 w-16 place-items-center rounded-full bg-orange-100">
                        <Camera className="h-8 w-8 text-orange-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold">Take a photo of your food</p>
                        <p className="text-xs text-muted-foreground">or choose from gallery</p>
                      </div>
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageCapture} data-testid="input-food-image" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={textDescription}
                    onChange={(e) => setTextDescription(e.target.value)}
                    placeholder="e.g. 2 eggs scrambled, 2 slices whole wheat toast with butter, orange juice"
                    className="min-h-[100px] rounded-2xl"
                    data-testid="input-food-description"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Meal Type</label>
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger className="rounded-2xl" data-testid="select-meal-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full rounded-2xl bg-orange-600 hover:bg-orange-700"
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending || (inputMode === "camera" ? !imageBase64 : !textDescription.trim())}
                data-testid="button-analyze-food"
              >
                {analyzeMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><UtensilsCrossed className="mr-2 h-4 w-4" /> Analyze Food</>
                )}
              </Button>

              {analyzeMutation.isError && (
                <p className="text-xs text-destructive text-center">Failed to analyze food. Please try again.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-2xl bg-orange-50 p-2 text-center">
                  <p className="text-lg font-bold text-orange-600">{Math.round(analysisResult.totalCalories)}</p>
                  <p className="text-[10px] text-muted-foreground">kcal</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-2 text-center">
                  <p className="text-lg font-bold text-blue-600">{Math.round(analysisResult.totalProtein)}g</p>
                  <p className="text-[10px] text-muted-foreground">Protein</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-2 text-center">
                  <p className="text-lg font-bold text-amber-600">{Math.round(analysisResult.totalCarbs)}g</p>
                  <p className="text-[10px] text-muted-foreground">Carbs</p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-2 text-center">
                  <p className="text-lg font-bold text-rose-600">{Math.round(analysisResult.totalFat)}g</p>
                  <p className="text-[10px] text-muted-foreground">Fat</p>
                </div>
              </div>

              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2 pr-2">
                  {analysisResult.foods.map((food, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border bg-background/60 px-3 py-2" data-testid={`food-item-${i}`}>
                      <div>
                        <p className="text-sm font-semibold">{food.name}</p>
                        <p className="text-[10px] text-muted-foreground">{food.portion}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-600">{Math.round(food.calories)} kcal</p>
                        <p className="text-[10px] text-muted-foreground">P:{Math.round(food.protein)} C:{Math.round(food.carbs)} F:{Math.round(food.fat)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {analysisResult.healthTips && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs font-semibold text-primary">Health Tip</p>
                  <p className="mt-1 text-xs text-muted-foreground">{analysisResult.healthTips}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-2xl" onClick={resetModal} data-testid="button-discard-analysis">Discard</Button>
                <Button className="flex-1 rounded-2xl bg-orange-600 hover:bg-orange-700" onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-calories">
                  {saveMutation.isPending ? "Saving..." : "Save to Log"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const APP_SHARE_URL = typeof window !== "undefined" ? window.location.origin : "https://remedypills.replit.app";

function ShareAppCard() {
  const [mode, setMode] = useState<"share" | "qr" | "nfc">("share");
  const [nfcStatus, setNfcStatus] = useState<"idle" | "broadcasting" | "success" | "error">("idle");
  const [nfcMessage, setNfcMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const nfcAbortRef = useRef<AbortController | null>(null);

  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
  const hasShareApi = typeof navigator !== "undefined" && !!navigator.share;
  const hasNfc = typeof window !== "undefined" && "NDEFReader" in window;

  const handleShareSheet = useCallback(async () => {
    if (hasShareApi) {
      try {
        await navigator.share({
          title: "RemedyPills Pharmacy",
          text: "Manage your prescriptions, book appointments, and track your health with RemedyPills Pharmacy.",
          url: APP_SHARE_URL,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(APP_SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [hasShareApi]);

  const handleNfcBroadcast = useCallback(async () => {
    if (!hasNfc) {
      setNfcStatus("error");
      setNfcMessage("NFC is not available on this device.");
      return;
    }
    try {
      setNfcStatus("broadcasting");
      setNfcMessage("Hold your phones together...");
      const NDEFReader = (window as any).NDEFReader;
      const ndef = new NDEFReader();
      nfcAbortRef.current = new AbortController();
      await ndef.write(
        { records: [{ recordType: "url", data: APP_SHARE_URL }] },
        { signal: nfcAbortRef.current.signal },
      );
      setNfcStatus("success");
      setNfcMessage("Link shared successfully!");
      setTimeout(() => setNfcStatus("idle"), 3000);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setNfcStatus("error");
        setNfcMessage(err.message || "NFC write failed. Make sure NFC is enabled.");
      }
      setTimeout(() => setNfcStatus("idle"), 3000);
    }
  }, [hasNfc]);

  const stopNfc = useCallback(() => {
    nfcAbortRef.current?.abort();
    setNfcStatus("idle");
    setNfcMessage("");
  }, []);

  useEffect(() => {
    return () => { nfcAbortRef.current?.abort(); };
  }, []);

  const modes: Array<{ id: "share" | "qr" | "nfc"; label: string; icon: React.ReactNode; hidden?: boolean }> = [
    { id: "share", label: "Share", icon: <Share2 className="h-4 w-4" /> },
    { id: "qr", label: "QR Code", icon: <QrCode className="h-4 w-4" /> },
    { id: "nfc", label: "NFC Tap", icon: <Nfc className="h-4 w-4" />, hidden: !isAndroid },
  ];

  return (
    <Card className="rounded-2xl border-0 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="h-4 w-4 text-primary" /> Share App
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {modes
            .filter((m) => !m.hidden)
            .map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setMode(m.id); setNfcStatus("idle"); }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-xs font-semibold transition",
                  mode === m.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background/60 text-muted-foreground hover:bg-muted/60",
                )}
                data-testid={`button-share-mode-${m.id}`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
        </div>

        {mode === "share" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">App Link</p>
              <p className="mt-1 break-all text-sm font-medium" data-testid="text-share-url">{APP_SHARE_URL}</p>
            </div>
            <Button onClick={handleShareSheet} className="w-full rounded-2xl" data-testid="button-share-sheet">
              <Share2 className="mr-2 h-4 w-4" />
              {hasShareApi ? "Share via..." : copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        )}

        {mode === "qr" && (
          <div className="flex flex-col items-center space-y-3">
            <div className="rounded-3xl border bg-white p-4" data-testid="qr-code-container">
              <QRCodeSVG
                value={APP_SHARE_URL}
                size={200}
                bgColor="#ffffff"
                fgColor="#0e7490"
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Scan this QR code to open the RemedyPills app
            </p>
            <Button variant="outline" onClick={handleShareSheet} className="rounded-2xl" data-testid="button-qr-share">
              <Share2 className="mr-2 h-4 w-4" />
              {hasShareApi ? "Also share link" : "Copy Link"}
            </Button>
          </div>
        )}

        {mode === "nfc" && (
          <div className="space-y-3">
            <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <div
                className={cn(
                  "mb-4 flex h-20 w-20 items-center justify-center rounded-full transition-all",
                  nfcStatus === "broadcasting" && "animate-pulse bg-primary/20",
                  nfcStatus === "success" && "bg-green-100",
                  nfcStatus === "error" && "bg-red-100",
                  nfcStatus === "idle" && "bg-primary/10",
                )}
                data-testid="nfc-status-icon"
              >
                {nfcStatus === "success" ? (
                  <Check className="h-10 w-10 text-green-600" />
                ) : nfcStatus === "error" ? (
                  <X className="h-10 w-10 text-red-500" />
                ) : (
                  <Smartphone className="h-10 w-10 text-primary" />
                )}
              </div>
              <p className="text-center text-sm font-medium" data-testid="text-nfc-status">
                {nfcStatus === "idle" && "Tap to share the app link via NFC"}
                {nfcStatus === "broadcasting" && nfcMessage}
                {nfcStatus === "success" && nfcMessage}
                {nfcStatus === "error" && nfcMessage}
              </p>
              {!hasNfc && nfcStatus === "idle" && (
                <p className="mt-2 text-center text-xs text-amber-600">
                  NFC is not available on this device or browser. Try Chrome on Android.
                </p>
              )}
            </div>
            {nfcStatus === "broadcasting" ? (
              <Button variant="outline" onClick={stopNfc} className="w-full rounded-2xl" data-testid="button-nfc-stop">
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            ) : (
              <Button
                onClick={handleNfcBroadcast}
                className="w-full rounded-2xl"
                disabled={nfcStatus === "success"}
                data-testid="button-nfc-tap"
              >
                <Nfc className="mr-2 h-4 w-4" /> Tap to Share
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccountTab({
  user,
  onUpdateProfile,
  isPending,
}: {
  user: any;
  onUpdateProfile: (data: { name?: string; email?: string; phone?: string; dob?: string }) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [dob, setDob] = useState(user.dob || "");
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showWithdrawConsent, setShowWithdrawConsent] = useState(false);
  const queryClient = useQueryClient();

  const withdrawConsentMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/consent/withdraw"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setShowWithdrawConsent(false);
    },
  });

  const giveConsentMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/consent"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      {user.lastLoginAt && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">Last login: <span className="font-semibold text-foreground" data-testid="text-last-login">{formatDateTime(user.lastLoginAt)}</span></p>
        </div>
      )}

      <Card className="rounded-2xl border-0 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-primary" /> My Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              onUpdateProfile({ name, email, phone, dob });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-2xl" data-testid="input-profile-name" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Username</label>
                <Input value={user.username} disabled className="rounded-2xl bg-muted/50" data-testid="input-profile-username" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-2xl" data-testid="input-profile-email" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-2xl" data-testid="input-profile-phone" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Date of Birth</label>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="rounded-2xl" data-testid="input-profile-dob" />
              </div>
            </div>
            <Button type="submit" className="rounded-2xl" disabled={isPending} data-testid="button-save-profile">
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4 text-primary" /> Privacy & Consent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Digital Health Consent</p>
              <Badge variant={user.consentGiven ? "default" : "secondary"} className="rounded-full text-[10px]" data-testid="badge-consent-status">
                {user.consentGiven ? "Active" : "Not Given"}
              </Badge>
            </div>
            {user.consentGiven && user.consentDate && (
              <p className="text-xs text-muted-foreground">Consent given on {formatDateTime(user.consentDate)}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {user.consentGiven
                ? "You have consented to RemedyPills storing your health information and managing your prescriptions electronically."
                : "You have not given consent for digital health services. Some features may be limited."}
            </p>
            {user.consentGiven ? (
              <Button variant="outline" size="sm" className="rounded-2xl text-xs text-destructive hover:text-destructive" onClick={() => setShowWithdrawConsent(true)} data-testid="button-withdraw-consent">
                Withdraw Consent
              </Button>
            ) : (
              <Button size="sm" className="rounded-2xl text-xs" onClick={() => giveConsentMutation.mutate()} disabled={giveConsentMutation.isPending} data-testid="button-give-consent">
                {giveConsentMutation.isPending ? "Processing..." : "Give Consent"}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 rounded-2xl text-xs" onClick={() => setShowPrivacy(true)} data-testid="button-view-privacy">
              <Shield className="h-3 w-3 mr-1" /> Privacy Policy
            </Button>
            <Button variant="outline" size="sm" className="flex-1 rounded-2xl text-xs" onClick={() => setShowTerms(true)} data-testid="button-view-terms">
              <Shield className="h-3 w-3 mr-1" /> Terms of Use
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4 text-primary" /> Preferred Pharmacy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-semibold">{PHARMACY_INFO.name}</p>
            <p className="text-xs text-muted-foreground">{PHARMACY_INFO.addressLine1}, {PHARMACY_INFO.addressLine2} {PHARMACY_INFO.postalCode}</p>
            <p className="mt-2 text-xs text-muted-foreground">Phone: {PHARMACY_INFO.phone} &middot; Fax: {PHARMACY_INFO.fax}</p>
            <p className="text-xs text-muted-foreground">Email: {PHARMACY_INFO.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">{PHARMACY_INFO.hoursSummary}</p>
          </div>
        </CardContent>
      </Card>

      <ShareAppCard />

      <Dialog open={showWithdrawConsent} onOpenChange={setShowWithdrawConsent}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader><DialogTitle>Withdraw Consent</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Are you sure you want to withdraw your consent for digital health services? This may limit your ability to use some portal features such as electronic prescriptions and health tracking.</p>
            <p className="text-xs text-muted-foreground">Your existing prescription records will be retained as required by Alberta law. You can re-consent at any time.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setShowWithdrawConsent(false)} data-testid="button-cancel-withdraw">Cancel</Button>
              <Button variant="destructive" className="flex-1 rounded-2xl" onClick={() => withdrawConsentMutation.mutate()} disabled={withdrawConsentMutation.isPending} data-testid="button-confirm-withdraw">
                {withdrawConsentMutation.isPending ? "Processing..." : "Withdraw Consent"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PrivacyTermsDialogs showPrivacy={showPrivacy} setShowPrivacy={setShowPrivacy} showTerms={showTerms} setShowTerms={setShowTerms} />
    </div>
  );
}

function ReminderForm({
  initial,
  onSubmit,
  isPending,
}: {
  initial?: { medicationName: string; time: string; frequency: string; category?: string | null };
  onSubmit: (data: { medicationName: string; time: string; frequency: string; category?: string }) => void;
  isPending: boolean;
}) {
  const [medName, setMedName] = useState(initial?.medicationName || "");
  const [time, setTime] = useState(initial?.time || "08:00 AM");
  const [frequency, setFrequency] = useState(initial?.frequency || "daily");
  const [category, setCategory] = useState(initial?.category || "general");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ medicationName: medName, time, frequency, category });
      }}
    >
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Medication Name</label>
        <Input value={medName} onChange={(e) => setMedName(e.target.value)} placeholder="e.g. Amoxicillin" className="rounded-2xl" required data-testid="input-reminder-med" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Time</label>
          <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="08:00 AM" className="rounded-2xl" required data-testid="input-reminder-time" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Frequency</label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger className="rounded-2xl" data-testid="select-reminder-frequency"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["daily", "twice daily", "three times daily", "weekly", "as needed"].map((f) => (
                <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Category</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="rounded-2xl" data-testid="select-reminder-category"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[
              { value: "general", label: "General" },
              { value: "diabetes", label: "Diabetes" },
              { value: "blood_pressure", label: "Blood Pressure" },
              { value: "heart", label: "Heart Medication" },
              { value: "asthma", label: "Asthma / Inhaler" },
            ].map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full rounded-2xl" disabled={isPending} data-testid="button-submit-reminder">
        {isPending ? "Saving..." : initial ? "Update Reminder" : "Add Reminder"}
      </Button>
    </form>
  );
}

function BookingForm({ onBook }: { onBook: (service: string, date: string, time: string, notes?: string) => void }) {
  const [service, setService] = useState(ALBERTA_SERVICES[0].value);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];

  const grouped = ALBERTA_SERVICES.reduce<Record<string, typeof ALBERTA_SERVICES>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setTime("");
  };

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onBook(service, date, time, notes || undefined); }}>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Service</label>
        <Select value={service} onValueChange={setService}>
          <SelectTrigger className="rounded-2xl" data-testid="select-book-service"><SelectValue placeholder="Service" /></SelectTrigger>
          <SelectContent>
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{cat}</p>
                {items.map((s) => (
                  <SelectItem key={s.value} value={s.value} data-testid={`option-book-service-${s.value}`}>
                    {s.label} {s.alberta ? "(AB Pharmacist)" : ""}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Date</label>
        <Input type="date" value={date} min={todayStr} onChange={(e) => handleDateChange(e.target.value)} className="rounded-2xl" data-testid="input-book-date" />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Available Time Slots</label>
        <TimeSlotPicker date={date} selectedTime={time} onSelectTime={setTime} />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Notes for the pharmacist</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know?" className="rounded-2xl" data-testid="input-book-notes" />
      </div>
      <Button type="submit" className="w-full rounded-2xl" disabled={!time} data-testid="button-submit-booking">
        {time ? `Book at ${time}` : "Select a time slot"}
      </Button>
    </form>
  );
}

function HealthLogForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: { type: string; value: number; secondaryValue?: number; unit: string; notes?: string }) => void;
  isPending: boolean;
}) {
  const [type, setType] = useState("blood_pressure");
  const [value, setValue] = useState("");
  const [secondaryValue, setSecondaryValue] = useState("");
  const [notes, setNotes] = useState("");

  const typeConfig: Record<string, { label: string; unit: string; placeholder: string; hasSecondary?: boolean; secondaryLabel?: string }> = {
    blood_pressure: { label: "Blood Pressure", unit: "mmHg", placeholder: "Systolic (e.g. 120)", hasSecondary: true, secondaryLabel: "Diastolic (e.g. 80)" },
    blood_sugar: { label: "Blood Sugar", unit: "mmol/L", placeholder: "e.g. 5.5" },
    heart_rate: { label: "Heart Rate", unit: "bpm", placeholder: "e.g. 72" },
    inhaler: { label: "Inhaler Usage", unit: "puffs", placeholder: "Number of puffs" },
  };

  const config = typeConfig[type];

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data: any = { type, value: parseFloat(value), unit: config.unit };
        if (config.hasSecondary && secondaryValue) data.secondaryValue = parseFloat(secondaryValue);
        if (notes) data.notes = notes;
        onSubmit(data);
      }}
    >
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Type</label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="rounded-2xl" data-testid="select-health-type"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(typeConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={cn("grid gap-3", config.hasSecondary ? "sm:grid-cols-2" : "")}>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">{config.placeholder}</label>
          <Input
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={config.placeholder}
            className="rounded-2xl"
            required
            data-testid="input-health-value"
          />
        </div>
        {config.hasSecondary && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">{config.secondaryLabel}</label>
            <Input
              type="number"
              step="any"
              value={secondaryValue}
              onChange={(e) => setSecondaryValue(e.target.value)}
              placeholder={config.secondaryLabel}
              className="rounded-2xl"
              data-testid="input-health-secondary"
            />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Notes (optional)</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. After meal, before exercise" className="rounded-2xl" data-testid="input-health-notes" />
      </div>
      <Button type="submit" className="w-full rounded-2xl" disabled={isPending} data-testid="button-submit-health-log">
        {isPending ? "Saving..." : "Log Reading"}
      </Button>
    </form>
  );
}

function PrivacyTermsDialogs({
  showPrivacy,
  setShowPrivacy,
  showTerms,
  setShowTerms,
}: {
  showPrivacy: boolean;
  setShowPrivacy: (v: boolean) => void;
  showTerms: boolean;
  setShowTerms: (v: boolean) => void;
}) {
  return (
    <>
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader><DialogTitle>Privacy Policy</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">RemedyPills Pharmacy — Privacy Policy</p>
              <p><strong>Effective Date:</strong> February 2026</p>
              <p>RemedyPills Pharmacy is committed to protecting your personal health information in compliance with Alberta's <strong>Health Information Act (HIA)</strong> and Canada's <strong>PIPEDA</strong>.</p>
              <p className="font-semibold text-foreground">Information We Collect</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Name, date of birth, email, and phone number</li>
                <li>Prescription information and health monitoring data</li>
                <li>Appointment booking and pharmacist messages</li>
                <li>Login activity and device information for security</li>
              </ul>
              <p className="font-semibold text-foreground">Data Security</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>All data transmitted using TLS encryption (HTTPS)</li>
                <li>Sessions expire after 30 minutes of inactivity</li>
                <li>Accounts locked after 5 failed login attempts</li>
                <li>All access logged in our audit system</li>
              </ul>
              <p className="font-semibold text-foreground">Your Rights</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Request access to your personal health information</li>
                <li>Request corrections to inaccurate information</li>
                <li>Withdraw consent for digital services at any time</li>
                <li>File a complaint with Alberta's Privacy Commissioner</li>
              </ul>
              <p className="font-semibold text-foreground">Contact</p>
              <p className="text-xs">RemedyPills Pharmacy, Unit # 135, 246 Nolanridge Crescent NW, Calgary, AB T3R 1W9</p>
            </div>
          </ScrollArea>
          <Button className="w-full rounded-2xl" onClick={() => setShowPrivacy(false)}>Close</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader><DialogTitle>Terms of Use</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">RemedyPills Pharmacy — Terms of Use</p>
              <p><strong>Effective Date:</strong> February 2026</p>
              <p>By using the RemedyPills Patient Portal, you agree to these Terms of Use and our Privacy Policy.</p>
              <p className="font-semibold text-foreground">Services</p>
              <p className="text-xs">The portal allows you to manage prescriptions, book pharmacy services, communicate with pharmacists, and track health metrics electronically.</p>
              <p className="font-semibold text-foreground">Not Medical Advice</p>
              <p className="text-xs">This portal is a convenience tool and does not replace professional medical advice. In emergencies, call 911.</p>
              <p className="font-semibold text-foreground">Account Security</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>You are responsible for keeping credentials confidential</li>
                <li>Sessions expire after 30 minutes of inactivity</li>
                <li>Accounts locked after multiple failed login attempts</li>
              </ul>
              <p className="font-semibold text-foreground">Governing Law</p>
              <p className="text-xs">These Terms are governed by the laws of the Province of Alberta and the federal laws of Canada.</p>
              <p className="font-semibold text-foreground">Contact</p>
              <p className="text-xs">RemedyPills Pharmacy, Unit # 135, 246 Nolanridge Crescent NW, Calgary, AB T3R 1W9</p>
            </div>
          </ScrollArea>
          <Button className="w-full rounded-2xl" onClick={() => setShowTerms(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SessionTimeoutWarning({ onExtend, onLogout }: { onExtend: () => void; onLogout: () => void }) {
  return (
    <Dialog open={true}>
      <DialogContent className="max-w-sm rounded-3xl" data-testid="modal-session-timeout">
        <DialogHeader><DialogTitle>Session Expiring</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Your session will expire soon due to inactivity. For your security, you will be automatically logged out.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-2xl" onClick={onLogout} data-testid="button-session-logout">Log Out</Button>
            <Button className="flex-1 rounded-2xl" onClick={onExtend} data-testid="button-session-extend">Stay Logged In</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

