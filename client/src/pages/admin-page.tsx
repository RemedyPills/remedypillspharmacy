import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  Edit,
  FileText,
  Gift,
  LogOut,
  Mail,
  MessageCircle,
  Paperclip,
  Phone,
  Plus,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import remedyLogo from "@assets/Remedypills_logo_1_1771941028931.png";

type AdminTab = "patients" | "messages" | "communications" | "offers";

interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  role: string;
}

interface Message {
  id: string;
  userId: string;
  sender: string;
  text: string;
  timestamp: string;
  category?: string | null;
}

export default function AdminPage() {
  const { user, logoutMutation } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>("patients");
  const [showReplyModal, setShowReplyModal] = useState<string | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<AdminUser | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<AdminUser | null>(null);
  const [replyText, setReplyText] = useState("");
  const [smsResult, setSmsResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);
  const [patientSearch, setPatientSearch] = useState("");

  if (!user) return <Redirect to="/auth" />;
  if (user.role !== "admin") return <Redirect to="/" />;

  const { data: users = [] } = useQuery<AdminUser[]>({ queryKey: ["/api/admin/users"], staleTime: 30_000 });
  const { data: allMessages = [] } = useQuery<Message[]>({ queryKey: ["/api/admin/messages"], enabled: activeTab === "messages", staleTime: 15_000 });

  const patients = users.filter((u) => u.role === "patient");
  const filteredPatients = patients.filter((p) => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase();
    return (
      (p.name || "").toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.phone || "").includes(q)
    );
  });

  const getUserName = (userId: string) => {
    const u = users.find((x) => x.id === userId);
    return u?.name || u?.username || userId.slice(0, 8);
  };

  const replyMutation = useMutation({
    mutationFn: async (data: { userId: string; text: string; category?: string }) => {
      await apiRequest("POST", "/api/admin/messages", {
        ...data,
        sender: "pharmacist",
        timestamp: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      setShowReplyModal(null);
      setReplyText("");
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: async (data: { type: string; title: string; body: string }) => {
      await apiRequest("POST", "/api/admin/notifications/broadcast", data);
    },
    onSuccess: () => {
      setShowBroadcastModal(false);
    },
  });

  const smsBroadcastMutation = useMutation({
    mutationFn: async (data: { message: string; mediaUrl?: string; patientIds?: string[] }) => {
      const res = await apiRequest("POST", "/api/admin/sms/broadcast", data);
      return res.json() as Promise<{ sent: number; failed: number; errors: string[] }>;
    },
    onSuccess: (data) => {
      setSmsResult(data);
    },
  });

  const addPatientMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; name: string; email?: string; phone?: string; dob?: string }) => {
      await apiRequest("POST", "/api/admin/users", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowAddPatientModal(false);
    },
  });

  const editPatientMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; email?: string | null; phone?: string | null; dob?: string | null }) => {
      await apiRequest("PATCH", `/api/admin/users/${id}`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingPatient(null);
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeletingPatient(null);
    },
  });

  interface PromoBanner { id: string; title: string; description: string; active: boolean; createdAt: string; }
  const { data: promoBanners = [] } = useQuery<PromoBanner[]>({ queryKey: ["/api/admin/promo-banners"], enabled: activeTab === "offers", staleTime: 30_000 });
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoBanner | null>(null);
  const [promoTitle, setPromoTitle] = useState("");
  const [promoDesc, setPromoDesc] = useState("");

  const createPromoMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      await apiRequest("POST", "/api/admin/promo-banners", data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/promo-banners"] }); setShowPromoModal(false); setPromoTitle(""); setPromoDesc(""); },
  });

  const updatePromoMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; description?: string; active?: boolean }) => {
      await apiRequest("PATCH", `/api/admin/promo-banners/${id}`, data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/promo-banners"] }); setEditingPromo(null); setPromoTitle(""); setPromoDesc(""); },
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/admin/promo-banners/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/promo-banners"] }),
  });

  const messagesByUser = allMessages.reduce<Record<string, Message[]>>((acc, m) => {
    if (!acc[m.userId]) acc[m.userId] = [];
    acc[m.userId].push(m);
    return acc;
  }, {});

  const unreadConversations = Object.keys(messagesByUser).length;

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "patients", label: "Patients", icon: <Users className="h-4 w-4" />, count: patients.length },
    { id: "messages", label: "Messages", icon: <MessageCircle className="h-4 w-4" />, count: unreadConversations },
    { id: "communications", label: "Communications", icon: <Send className="h-4 w-4" /> },
    { id: "offers", label: "Offers", icon: <Gift className="h-4 w-4" />, count: promoBanners.length },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_circle_at_20%_-10%,hsl(var(--primary)/0.22),transparent_55%),radial-gradient(900px_circle_at_90%_20%,hsl(var(--accent)/0.18),transparent_50%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--background)))]">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border">
              <img src={remedyLogo} alt="RemedyPills" className="h-full w-full object-contain p-1" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">ADMIN PORTAL</p>
              <h1 className="text-lg font-semibold tracking-tight" data-testid="text-admin-title">
                RemedyPills Pharmacy
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="rounded-full" data-testid="badge-admin-role">Admin</Badge>
            <Button
              variant="outline"
              size="sm"
              className="rounded-2xl"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-admin-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <Card className="rounded-2xl border-card-border bg-card/70 backdrop-blur-xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{patients.length}</p>
                <p className="text-xs text-muted-foreground">Registered Patients</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-card-border bg-card/70 backdrop-blur-xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadConversations}</p>
                <p className="text-xs text-muted-foreground">Conversations</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-card-border bg-card/70 backdrop-blur-xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{patients.filter(p => p.phone).length}</p>
                <p className="text-xs text-muted-foreground">SMS Reachable</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={activeTab === t.id ? "default" : "outline"}
              className="rounded-2xl"
              onClick={() => setActiveTab(t.id)}
              data-testid={`tab-admin-${t.id}`}
            >
              {t.icon}
              <span className="ml-2">{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <Badge variant={activeTab === t.id ? "secondary" : "outline"} className="ml-2 rounded-full text-[10px]">
                  {t.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {activeTab === "patients" && (
          <Card className="rounded-3xl border-card-border bg-card/70 shadow-sm backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="shrink-0 text-base">Registered Patients</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search patients..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="max-w-xs rounded-2xl"
                  data-testid="input-patient-search"
                />
                <Button size="sm" className="shrink-0 rounded-2xl" onClick={() => setShowAddPatientModal(true)} data-testid="button-add-patient">
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredPatients.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {patients.length === 0 ? "No patients registered yet." : "No patients match your search."}
                </p>
              ) : (
                filteredPatients.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-background/60 p-4" data-testid={`admin-patient-${p.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {(p.name || p.username).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{p.name || p.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.email || "No email"}
                          {p.phone && <> &middot; {p.phone}</>}
                          {p.dob && <> &middot; DOB: {p.dob}</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.phone && (
                        <Badge variant="outline" className="rounded-full text-[10px]">
                          <Phone className="mr-1 h-3 w-3" /> SMS
                        </Badge>
                      )}
                      {p.email && (
                        <Badge variant="outline" className="rounded-full text-[10px]">
                          <Mail className="mr-1 h-3 w-3" /> Email
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0" onClick={() => setEditingPatient(p)} data-testid={`button-edit-patient-${p.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0 text-destructive hover:text-destructive" onClick={() => setDeletingPatient(p)} data-testid={`button-delete-patient-${p.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        <AddPatientModal open={showAddPatientModal} onClose={() => setShowAddPatientModal(false)} onSubmit={(data) => addPatientMutation.mutate(data)} isPending={addPatientMutation.isPending} />
        <EditPatientModal patient={editingPatient} onClose={() => setEditingPatient(null)} onSubmit={(data) => editPatientMutation.mutate(data)} isPending={editPatientMutation.isPending} />
        <Dialog open={!!deletingPatient} onOpenChange={() => setDeletingPatient(null)}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Delete Patient</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{deletingPatient?.name || deletingPatient?.username}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-2xl" onClick={() => setDeletingPatient(null)} data-testid="button-cancel-delete">Cancel</Button>
              <Button variant="destructive" className="rounded-2xl" onClick={() => deletingPatient && deletePatientMutation.mutate(deletingPatient.id)} disabled={deletePatientMutation.isPending} data-testid="button-confirm-delete">
                {deletePatientMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {activeTab === "messages" && (
          <Card className="rounded-3xl border-card-border bg-card/70 shadow-sm backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-base">Patient Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys(messagesByUser).length === 0 ? (
                <div className="py-8 text-center">
                  <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Patient messages will appear here when they reach out.</p>
                </div>
              ) : (
                Object.entries(messagesByUser).map(([userId, msgs]) => (
                  <div key={userId} className="rounded-2xl border bg-background/60 p-4" data-testid={`admin-msgs-${userId}`}>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {getUserName(userId).charAt(0).toUpperCase()}
                        </div>
                        <p className="text-sm font-semibold">{getUserName(userId)}</p>
                        <Badge variant="secondary" className="rounded-full text-[10px]">{msgs.length} messages</Badge>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-2xl"
                        onClick={() => setShowReplyModal(userId)}
                        data-testid={`button-reply-${userId}`}
                      >
                        Reply
                      </Button>
                    </div>
                    <ScrollArea className="max-h-[200px]">
                      <div className="space-y-2">
                        {msgs.sort((a, b) => a.timestamp.localeCompare(b.timestamp)).map((m) => (
                          <div key={m.id} className={`rounded-xl px-3 py-2 text-xs ${m.sender === "pharmacist" ? "bg-primary/10 text-primary" : "bg-muted"}`}>
                            <span className="font-semibold">{m.sender === "pharmacist" ? "Pharmacist" : getUserName(m.userId)}:</span> {m.text}
                            <span className="ml-2 opacity-60">{new Date(m.timestamp).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "communications" && (
          <div className="space-y-4">
            <Card className="rounded-3xl border-card-border bg-card/70 shadow-sm backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Mass SMS / MMS</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Send text messages to all patients with phone numbers. Attach flyers or images.</p>
                </div>
                <Button className="rounded-2xl" size="sm" onClick={() => { setSmsResult(null); setShowSmsModal(true); }} data-testid="button-mass-sms">
                  <Phone className="mr-2 h-4 w-4" />
                  Send SMS
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 rounded-2xl border bg-background/60 p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{patients.filter(p => p.phone).length} patients reachable</p>
                    <p className="text-xs text-muted-foreground">Out of {patients.length} total registered patients</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-card-border bg-card/70 shadow-sm backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Push Notifications</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Broadcast in-app alerts for drug recalls, holiday hours, vaccine availability, and more.</p>
                </div>
                <Button className="rounded-2xl" size="sm" onClick={() => setShowBroadcastModal(true)} data-testid="button-broadcast-notification">
                  <Bell className="mr-2 h-4 w-4" />
                  Send Alert
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { type: "drug_recall", label: "Drug Recall Alert", desc: "Notify patients about medication recalls" },
                    { type: "vaccine_eligible", label: "Vaccine Availability", desc: "Inform about new vaccine availability" },
                    { type: "weather_hours", label: "Holiday / Weather Hours", desc: "Changes to pharmacy operating hours" },
                    { type: "insurance_renewal", label: "Insurance Reminder", desc: "Remind about insurance renewals" },
                  ].map(item => (
                    <div key={item.type} className="rounded-2xl border bg-background/60 p-4" data-testid={`alert-type-${item.type}`}>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "offers" && (
          <div className="space-y-4">
            <Card className="rounded-3xl border-card-border bg-card/70 shadow-sm backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Promotional Offers</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Manage the promotional banner shown to patients on the home screen.</p>
                </div>
                <Button className="rounded-2xl" size="sm" onClick={() => { setPromoTitle(""); setPromoDesc(""); setShowPromoModal(true); }} data-testid="button-add-promo">
                  <Plus className="mr-2 h-4 w-4" /> New Offer
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {promoBanners.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No promotional offers yet. Create one to display on the patient home screen.</p>
                ) : promoBanners.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-background/60 p-4" data-testid={`promo-item-${b.id}`}>
                    <div className="flex items-center gap-3">
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${b.active ? "bg-primary/10" : "bg-muted"}`}>
                        <Gift className={`h-5 w-5 ${b.active ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{b.title}</p>
                          <Badge variant={b.active ? "default" : "secondary"} className="rounded-full text-[10px]">
                            {b.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{b.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => updatePromoMutation.mutate({ id: b.id, active: !b.active })}
                        data-testid={`button-toggle-promo-${b.id}`}
                      >
                        {b.active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => { setEditingPromo(b); setPromoTitle(b.title); setPromoDesc(b.description); }}
                        data-testid={`button-edit-promo-${b.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-destructive hover:text-destructive"
                        onClick={() => deletePromoMutation.mutate(b.id)}
                        data-testid={`button-delete-promo-${b.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={showPromoModal} onOpenChange={setShowPromoModal}>
        <DialogContent className="max-w-lg rounded-3xl" data-testid="modal-new-promo">
          <DialogHeader><DialogTitle>New Promotional Offer</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (promoTitle.trim() && promoDesc.trim()) createPromoMutation.mutate({ title: promoTitle.trim(), description: promoDesc.trim() }); }}>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Offer Title</label>
              <Input value={promoTitle} onChange={(e) => setPromoTitle(e.target.value)} placeholder="e.g. Free Prescription Delivery" className="rounded-2xl" required data-testid="input-promo-title" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Textarea value={promoDesc} onChange={(e) => setPromoDesc(e.target.value)} placeholder="e.g. Get your prescriptions delivered to your door!" className="min-h-[80px] rounded-2xl" required data-testid="input-promo-desc" />
            </div>
            <Button type="submit" className="w-full rounded-2xl" disabled={createPromoMutation.isPending} data-testid="button-create-promo">
              Create Offer
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPromo} onOpenChange={() => setEditingPromo(null)}>
        <DialogContent className="max-w-lg rounded-3xl" data-testid="modal-edit-promo">
          <DialogHeader><DialogTitle>Edit Promotional Offer</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (editingPromo && promoTitle.trim() && promoDesc.trim()) updatePromoMutation.mutate({ id: editingPromo.id, title: promoTitle.trim(), description: promoDesc.trim() }); }}>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Offer Title</label>
              <Input value={promoTitle} onChange={(e) => setPromoTitle(e.target.value)} placeholder="Offer title" className="rounded-2xl" required data-testid="input-edit-promo-title" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Textarea value={promoDesc} onChange={(e) => setPromoDesc(e.target.value)} placeholder="Offer description" className="min-h-[80px] rounded-2xl" required data-testid="input-edit-promo-desc" />
            </div>
            <Button type="submit" className="w-full rounded-2xl" disabled={updatePromoMutation.isPending} data-testid="button-save-promo">
              Save Changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showReplyModal} onOpenChange={() => setShowReplyModal(null)}>
        <DialogContent className="max-w-lg rounded-3xl" data-testid="modal-reply">
          <DialogHeader>
            <DialogTitle>Reply to {showReplyModal ? getUserName(showReplyModal) : ""}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (showReplyModal && replyText.trim()) {
                replyMutation.mutate({ userId: showReplyModal, text: replyText.trim(), category: "General" });
              }
            }}
          >
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              className="rounded-2xl"
              data-testid="input-admin-reply"
            />
            <Button type="submit" className="w-full rounded-2xl" disabled={replyMutation.isPending} data-testid="button-send-reply">
              Send reply
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showBroadcastModal} onOpenChange={setShowBroadcastModal}>
        <DialogContent className="max-w-lg rounded-3xl" data-testid="modal-broadcast">
          <DialogHeader>
            <DialogTitle>Broadcast Notification</DialogTitle>
          </DialogHeader>
          <BroadcastForm onSubmit={(data) => broadcastMutation.mutate(data)} isPending={broadcastMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={showSmsModal} onOpenChange={setShowSmsModal}>
        <DialogContent className="max-w-lg rounded-3xl" data-testid="modal-mass-sms">
          <DialogHeader>
            <DialogTitle>Mass SMS to Patients</DialogTitle>
          </DialogHeader>
          {smsResult ? (
            <div className="space-y-4" data-testid="sms-result">
              <div className="rounded-2xl border bg-background/60 p-4 text-center">
                <p className="text-2xl font-bold text-primary">{smsResult.sent}</p>
                <p className="text-sm text-muted-foreground">Messages sent successfully</p>
              </div>
              {smsResult.failed > 0 && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm font-semibold text-destructive">{smsResult.failed} failed</p>
                  {smsResult.errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="mt-1 text-xs text-destructive/80">{e}</p>
                  ))}
                </div>
              )}
              <Button className="w-full rounded-2xl" onClick={() => { setSmsResult(null); setShowSmsModal(false); }} data-testid="button-sms-done">
                Done
              </Button>
            </div>
          ) : (
            <SmsForm
              onSubmit={(data) => smsBroadcastMutation.mutate(data)}
              isPending={smsBroadcastMutation.isPending}
              patients={patients}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BroadcastForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: { type: string; title: string; body: string }) => void;
  isPending: boolean;
}) {
  const [type, setType] = useState("general");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ type, title, body });
      }}
    >
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Notification Type</label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="rounded-2xl" data-testid="select-broadcast-type"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[
              { value: "refill_ready", label: "Refill Ready" },
              { value: "vaccine_eligible", label: "Vaccine Eligibility" },
              { value: "drug_recall", label: "Drug Recall / Safety" },
              { value: "weather_hours", label: "Weather / Holiday Hours" },
              { value: "insurance_renewal", label: "Insurance Renewal" },
              { value: "general", label: "General" },
            ].map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Alert title" className="rounded-2xl" required data-testid="input-broadcast-title" />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Message</label>
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Notification message..." className="rounded-2xl" required data-testid="input-broadcast-body" />
      </div>
      <Button type="submit" className="w-full rounded-2xl" disabled={isPending} data-testid="button-submit-broadcast">
        {isPending ? "Sending..." : "Send to all patients"}
      </Button>
    </form>
  );
}

function SmsForm({
  onSubmit,
  isPending,
  patients,
}: {
  onSubmit: (data: { message: string; mediaUrl?: string; patientIds?: string[] }) => void;
  isPending: boolean;
  patients: AdminUser[];
}) {
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<{ url: string; filename: string; size: number; mimetype: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [patientSearch, setSmsPatientSearch] = useState("");

  const patientsWithPhone = patients.filter((p) => p.phone && p.phone.trim().length > 0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(patientsWithPhone.map((p) => p.id)));

  const allSelected = patientsWithPhone.length > 0 && selectedIds.size === patientsWithPhone.length;
  const noneSelected = selectedIds.size === 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(patientsWithPhone.map((p) => p.id)));
    }
  };

  const togglePatient = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredSmsPatients = patientsWithPhone.filter((p) => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase();
    return (p.name || "").toLowerCase().includes(q) || p.username.toLowerCase().includes(q) || (p.phone || "").includes(q);
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/sms/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "Upload failed");
        return;
      }
      const data = await res.json();
      setAttachment(data);
    } catch {
      alert("Failed to upload file");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (message.trim() && selectedIds.size > 0) {
          const ids = allSelected ? undefined : Array.from(selectedIds);
          onSubmit({ message: message.trim(), mediaUrl: attachment?.url, patientIds: ids });
        }
      }}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground">Recipients ({selectedIds.size} of {patientsWithPhone.length})</label>
          <Button type="button" variant="ghost" size="sm" className="h-7 rounded-full px-3 text-xs" onClick={toggleAll} data-testid="button-toggle-all-sms">
            {allSelected ? "Deselect All" : "Select All"}
          </Button>
        </div>
        <Input
          placeholder="Search patients..."
          value={patientSearch}
          onChange={(e) => setSmsPatientSearch(e.target.value)}
          className="rounded-2xl text-xs"
          data-testid="input-sms-patient-search"
        />
        <ScrollArea className="max-h-40 rounded-2xl border bg-background/60">
          <div className="space-y-1 p-2">
            {filteredSmsPatients.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">No patients with phone numbers found.</p>
            ) : (
              filteredSmsPatients.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-xl p-2 hover:bg-muted/50" data-testid={`sms-patient-${p.id}`}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => togglePatient(p.id)}
                    className="h-4 w-4 rounded border-muted-foreground/30 accent-primary"
                  />
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {(p.name || p.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{p.name || p.username}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{p.phone}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Message</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your SMS message here..."
          className="min-h-[100px] rounded-2xl"
          maxLength={1600}
          required
          data-testid="input-sms-message"
        />
        <p className="text-right text-xs text-muted-foreground">{message.length}/1600</p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Attachment (optional)</label>
        {attachment ? (
          <div className="flex items-center gap-3 rounded-2xl border bg-background/60 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10">
              {attachment.mimetype.startsWith("image/") ? (
                <img src={attachment.url} alt="" className="h-10 w-10 rounded-xl object-cover" />
              ) : (
                <FileText className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{attachment.filename}</p>
              <p className="text-xs text-muted-foreground">{formatSize(attachment.size)}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 rounded-full p-0"
              onClick={() => setAttachment(null)}
              data-testid="button-remove-attachment"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="sms-file-input"
              data-testid="input-sms-file"
            />
            <label htmlFor="sms-file-input">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-2xl"
                disabled={uploading}
                onClick={() => document.getElementById("sms-file-input")?.click()}
                data-testid="button-attach-file"
              >
                <Paperclip className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Attach flyer, image, or PDF"}
              </Button>
            </label>
            <p className="mt-1 text-xs text-muted-foreground">Max 5 MB. Supported: JPEG, PNG, GIF, WebP, PDF</p>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full rounded-2xl" disabled={isPending || !message.trim() || noneSelected} data-testid="button-send-sms">
        {isPending ? "Sending..." : `Send ${attachment ? "MMS" : "SMS"} to ${selectedIds.size} patient${selectedIds.size !== 1 ? "s" : ""}`}
      </Button>
    </form>
  );
}

function AddPatientModal({ open, onClose, onSubmit, isPending }: { open: boolean; onClose: () => void; onSubmit: (data: { username: string; password: string; name: string; email?: string; phone?: string; dob?: string }) => void; isPending: boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ username, password, name, email: email || undefined, phone: phone || undefined, dob: dob || undefined });
  };

  useEffect(() => {
    if (!open) { setUsername(""); setPassword(""); setName(""); setEmail(""); setPhone(""); setDob(""); }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Username *</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username for login" className="rounded-2xl" required data-testid="input-add-username" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Password *</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Initial password" className="rounded-2xl" required data-testid="input-add-password" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient's full name" className="rounded-2xl" data-testid="input-add-name" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="patient@example.com" className="rounded-2xl" data-testid="input-add-email" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (403) 980-7003" className="rounded-2xl" data-testid="input-add-phone" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Date of Birth</label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="rounded-2xl" data-testid="input-add-dob" />
          </div>
          <Button type="submit" className="w-full rounded-2xl" disabled={isPending || !username.trim() || !password.trim()} data-testid="button-submit-add-patient">
            {isPending ? "Adding..." : "Add Patient"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPatientModal({ patient, onClose, onSubmit, isPending }: { patient: AdminUser | null; onClose: () => void; onSubmit: (data: { id: string; name: string; email?: string | null; phone?: string | null; dob?: string | null }) => void; isPending: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");

  useEffect(() => {
    if (patient) {
      setName(patient.name || "");
      setEmail(patient.email || "");
      setPhone(patient.phone || "");
      setDob(patient.dob || "");
    }
  }, [patient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    onSubmit({ id: patient.id, name, email: email || null, phone: phone || null, dob: dob || null });
  };

  return (
    <Dialog open={!!patient} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Edit Patient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient's full name" className="rounded-2xl" data-testid="input-edit-name" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="patient@example.com" className="rounded-2xl" data-testid="input-edit-email" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (403) 980-7003" className="rounded-2xl" data-testid="input-edit-phone" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Date of Birth</label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="rounded-2xl" data-testid="input-edit-dob" />
          </div>
          <Button type="submit" className="w-full rounded-2xl" disabled={isPending} data-testid="button-submit-edit-patient">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
