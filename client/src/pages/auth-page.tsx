import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from "lucide-react";
import remedyLogo from "@assets/Remedypills_logo_1_1771941028931.png";
import heroImage from "@assets/WhatsApp_Image_2026-02-24_at_23.04.48_1772000003452.jpeg";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

type AuthScreen = "landing" | "login" | "register";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [screen, setScreen] = useState<AuthScreen>("landing");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Check for OAuth errors in URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const message = params.get("message");
    
    if (error) {
      // Display the error message to the user
      const errorMessage = message || getDefaultErrorMessage(error);
      setOauthError(errorMessage);
      
      // Clear the error from URL to prevent showing it again on refresh
      window.history.replaceState({}, "", "/auth");
    }
  }, []);

  // Helper function to get default error messages
  const getDefaultErrorMessage = (error: string): string => {
    switch (error) {
      case "google_error":
        return "Google authentication failed. Please try again.";
      case "google_failed":
        return "Google sign-in was cancelled or failed.";
      case "google_login":
        return "Failed to create session after Google login.";
      case "facebook_error":
        return "Facebook authentication failed. Please try again.";
      case "facebook_failed":
        return "Facebook sign-in was cancelled or failed.";
      case "facebook_login":
        return "Failed to create session after Facebook login.";
      default:
        return "An authentication error occurred.";
    }
  };

  const { data: providers } = useQuery<{ google: boolean }>({
    queryKey: ["/api/auth/providers"],
  });

  if (user) {
    if (user.role === "admin") return <Redirect to="/admin" />;
    return <Redirect to="/" />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({
      username,
      password,
      name,
      email: email || null,
      phone: phone || null,
      dob: dob || null,
      role: "patient",
      consentGiven: true,
      consentDate: new Date().toISOString(),
    });
  };

  const handleSocialLogin = (provider: string) => {
    if (!providers) {
      alert("Social providers not loaded yet. Please try again.");
      return;
    }
    if (!providers[provider as "google" | "facebook"]) {
      alert(`${provider} login is not enabled on this server.`);
      return;
    }
    window.location.href = `/api/auth/${provider}`;
  };

  if (screen === "landing") {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-[hsl(186,86%,25%)] via-[hsl(186,76%,35%)] to-[hsl(176,70%,42%)]" data-testid="screen-landing">
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mx-auto w-full max-w-md space-y-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl bg-white shadow-xl">
                <img src={remedyLogo} alt="RemedyPills" className="h-full w-full object-contain p-1" />
              </div>
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl" data-testid="text-hero-title">
                  Your health, managed with care
                </h1>
                <p className="text-base leading-relaxed text-white/80">
                  Prescriptions, reminders, bookings, and health tracking — all in one place from your trusted Calgary pharmacist.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                className="h-14 w-full rounded-full bg-white text-base font-bold text-[hsl(186,86%,25%)] shadow-xl hover:bg-white/95"
                onClick={() => setScreen("register")}
                data-testid="button-get-started"
              >
                GET STARTED
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-white/90 hover:text-white"
                  onClick={() => setScreen("login")}
                  data-testid="button-go-login"
                >
                  Already have an account? <span className="font-bold underline">Log In</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-white/50">
            By proceeding, you agree to our{" "}
            <button type="button" className="font-semibold text-white/70 underline" onClick={() => setShowTerms(true)} data-testid="footer-terms">Terms</button>{" "}
            and that you have read our{" "}
            <button type="button" className="font-semibold text-white/70 underline" onClick={() => setShowPrivacy(true)} data-testid="footer-privacy">Privacy Policy</button>
          </p>
        </div>

        <PrivacyTermsModals showPrivacy={showPrivacy} setShowPrivacy={setShowPrivacy} showTerms={showTerms} setShowTerms={setShowTerms} />
      </div>
    );
  }

  if (screen === "login") {
    return (
      <div className="flex min-h-screen flex-col bg-[#0a0a0a]" data-testid="screen-login">
        <div className="flex items-center p-4">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
            onClick={() => setScreen("landing")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center px-6 pb-12 pt-4">
          <div className="mx-auto w-full max-w-md space-y-8">
            <div className="flex flex-col items-center space-y-3">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-white shadow-lg">
                <img src={remedyLogo} alt="RemedyPills" className="h-full w-full object-contain p-1" />
              </div>
              <h2 className="text-xl font-bold text-white" data-testid="text-login-title">Welcome back</h2>
              <p className="text-sm text-white/50">Sign in to your patient portal</p>
            </div>

            <div className="space-y-3">
              {oauthError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-xs text-red-400">{oauthError}</p>
                </div>
              )}
              <button
                type="button"
                className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white/5 text-sm font-medium text-white transition hover:bg-white/10"
                onClick={() => handleSocialLogin("google")}
                data-testid="button-google-login"
                disabled={providers ? !providers.google : false}
                title={providers && !providers.google ? "Google sign-in not configured" : undefined}
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-white/30">or sign in with username</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/50">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-primary"
                  required
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/50">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-primary"
                  required
                  data-testid="input-password"
                />
              </div>

              {loginMutation.isError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-xs text-red-400">
                    {(loginMutation.error as any)?.message || "Invalid username or password"}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="h-14 w-full rounded-full text-base font-bold"
                disabled={loginMutation.isPending}
                data-testid="button-auth-submit"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>

              <div className="space-y-2 text-center">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => setScreen("register")}
                  data-testid="button-toggle-auth"
                >
                  Don't have an account? <span className="font-semibold">Create one</span>
                </button>
                <p className="text-[10px] text-white/25" data-testid="text-admin-hint">
                  Admin: <span className="font-mono">admin</span> / <span className="font-mono">admin123</span>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]" data-testid="screen-register">
      <div className="flex items-center p-4">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          onClick={() => setScreen("landing")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center px-6 pb-12 pt-2">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="flex flex-col items-center space-y-2">
            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-white shadow-lg">
              <img src={remedyLogo} alt="RemedyPills" className="h-full w-full object-contain p-1" />
            </div>
            <h2 className="text-xl font-bold text-white" data-testid="text-register-title">Create your profile</h2>
            <p className="text-sm text-white/50">Set up your RemedyPills account</p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white/5 text-sm font-medium text-white transition hover:bg-white/10"
              onClick={() => handleSocialLogin("google")}
              data-testid="button-google-register"
              disabled={providers ? !providers.google : false}
              title={providers && !providers.google ? "Google sign-in not configured" : undefined}
            >
              <GoogleIcon />
              Sign up with Google
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/30">or create with username</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleRegister} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50">Full Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-primary"
                required
                data-testid="input-name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-primary"
                required
                data-testid="input-username"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-primary"
                required
                data-testid="input-password"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-primary"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50">Phone</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(403) 980-7003"
                  className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-primary"
                  data-testid="input-phone"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50">Date of Birth</label>
              <Input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-primary"
                data-testid="input-dob"
              />
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/30 accent-primary"
                  required
                  data-testid="input-consent"
                />
                <span className="text-xs text-white/50 leading-relaxed">
                  I consent to RemedyPills Pharmacy storing my health information and managing my prescriptions electronically. I agree to the{" "}
                  <button type="button" className="font-semibold text-primary underline" onClick={() => setShowPrivacy(true)} data-testid="link-privacy-policy">Privacy Policy</button>{" "}and{" "}
                  <button type="button" className="font-semibold text-primary underline" onClick={() => setShowTerms(true)} data-testid="link-terms">Terms of Use</button>.
                </span>
              </label>
            </div>

            {registerMutation.isError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-xs text-red-400">
                  {(registerMutation.error as any)?.message || "Registration failed. Please try again."}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="h-14 w-full rounded-full text-base font-bold"
              disabled={registerMutation.isPending || !consentGiven}
              data-testid="button-auth-submit"
            >
              {registerMutation.isPending ? "Creating account..." : "Create Account"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setScreen("login")}
                data-testid="button-toggle-auth"
              >
                Already have an account? <span className="font-semibold">Sign in</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <PrivacyTermsModals showPrivacy={showPrivacy} setShowPrivacy={setShowPrivacy} showTerms={showTerms} setShowTerms={setShowTerms} />
    </div>
  );
}

function PrivacyTermsModals({
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
            <PrivacyPolicyContent />
          </ScrollArea>
          <Button className="w-full rounded-2xl" onClick={() => setShowPrivacy(false)} data-testid="button-close-privacy">Close</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader><DialogTitle>Terms of Use</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <TermsOfUseContent />
          </ScrollArea>
          <Button className="w-full rounded-2xl" onClick={() => setShowTerms(false)} data-testid="button-close-terms">Close</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PrivacyPolicyContent() {
  return (
    <div className="space-y-4 pr-4 text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">RemedyPills Pharmacy — Privacy Policy</p>
      <p><strong>Effective Date:</strong> February 2026</p>
      <p>RemedyPills Pharmacy ("we", "us", "our") is committed to protecting your personal health information in compliance with Alberta's <strong>Health Information Act (HIA)</strong> and Canada's <strong>Personal Information Protection and Electronic Documents Act (PIPEDA)</strong>.</p>

      <p className="font-semibold text-foreground">1. Information We Collect</p>
      <p>We collect the following information through our Patient Portal:</p>
      <ul className="list-disc pl-5 space-y-1 text-xs">
        <li>Name, date of birth, email, and phone number</li>
        <li>Prescription information (medication names, dosages, refill status)</li>
        <li>Health monitoring data (blood pressure, blood sugar, heart rate)</li>
        <li>Appointment booking information</li>
        <li>Messages exchanged with our pharmacists</li>
        <li>Login activity and device information for security</li>
      </ul>

      <p className="font-semibold text-foreground">2. How We Use Your Information</p>
      <ul className="list-disc pl-5 space-y-1 text-xs">
        <li>To dispense medications and manage your prescriptions</li>
        <li>To provide pharmacy services including medication reviews and immunizations</li>
        <li>To send you medication reminders and refill notifications</li>
        <li>To communicate with you about your health care</li>
        <li>To maintain audit logs as required by law</li>
      </ul>

      <p className="font-semibold text-foreground">3. Data Security</p>
      <ul className="list-disc pl-5 space-y-1 text-xs">
        <li>All data is transmitted using TLS encryption (HTTPS)</li>
        <li>Sessions automatically expire after 30 minutes of inactivity</li>
        <li>Accounts are locked after 5 failed login attempts</li>
        <li>All access is logged in our audit system</li>
        <li>Role-based access control restricts data to authorized users only</li>
      </ul>

      <p className="font-semibold text-foreground">4. Data Sharing</p>
      <p>We do not sell or share your personal health information with third parties except as required for your pharmacy care (e.g., prescription transfers) or as required by law.</p>

      <p className="font-semibold text-foreground">5. Your Rights</p>
      <ul className="list-disc pl-5 space-y-1 text-xs">
        <li>You may request access to your personal health information</li>
        <li>You may request corrections to inaccurate information</li>
        <li>You may withdraw consent for digital services at any time</li>
        <li>You may file a complaint with the Office of the Information and Privacy Commissioner of Alberta</li>
      </ul>

      <p className="font-semibold text-foreground">6. Data Retention</p>
      <p>Prescription records are retained as required by the Alberta Pharmacy and Drug Act (minimum 2 years). Other health information is retained in accordance with HIA requirements.</p>

      <p className="font-semibold text-foreground">7. Contact Us</p>
      <p>RemedyPills Pharmacy<br/>Unit # 135, 246 Nolanridge Crescent NW<br/>Calgary, AB T3R 1W9<br/>Phone: +1 (403) 980-7003 &middot; Fax: +1 (403) 518-7522<br/>Email: remedypillspharmacy@gmail.com</p>
    </div>
  );
}

function TermsOfUseContent() {
  return (
    <div className="space-y-4 pr-4 text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">RemedyPills Pharmacy — Terms of Use</p>
      <p><strong>Effective Date:</strong> February 2026</p>

      <p className="font-semibold text-foreground">1. Acceptance</p>
      <p>By creating an account or using the RemedyPills Patient Portal, you agree to these Terms of Use and our Privacy Policy.</p>

      <p className="font-semibold text-foreground">2. Patient Portal Services</p>
      <p>The Patient Portal allows you to:</p>
      <ul className="list-disc pl-5 space-y-1 text-xs">
        <li>View and manage your prescriptions electronically</li>
        <li>Request prescription refills and transfers</li>
        <li>Book pharmacy services and appointments</li>
        <li>Communicate securely with our pharmacists</li>
        <li>Track health metrics (blood pressure, blood sugar, etc.)</li>
        <li>Receive medication reminders and notifications</li>
      </ul>

      <p className="font-semibold text-foreground">3. Not a Substitute for Medical Advice</p>
      <p>This portal is a convenience tool. It does not replace professional medical advice, diagnosis, or treatment. In case of a medical emergency, call 911 immediately.</p>

      <p className="font-semibold text-foreground">4. Account Security</p>
      <ul className="list-disc pl-5 space-y-1 text-xs">
        <li>You are responsible for keeping your login credentials confidential</li>
        <li>You must notify us immediately of any unauthorized account access</li>
        <li>Sessions expire after 30 minutes of inactivity for your protection</li>
        <li>Accounts are temporarily locked after multiple failed login attempts</li>
      </ul>

      <p className="font-semibold text-foreground">5. Consent and Data Use</p>
      <p>By using this portal, you consent to the electronic storage and management of your health information as described in our Privacy Policy. You may withdraw consent at any time through your Account settings, though this may limit your ability to use certain features.</p>

      <p className="font-semibold text-foreground">6. Acceptable Use</p>
      <p>You agree not to misuse the portal, submit false information, attempt unauthorized access, or interfere with the platform's security features.</p>

      <p className="font-semibold text-foreground">7. Limitation of Liability</p>
      <p>RemedyPills Pharmacy is not liable for delays, interruptions, or errors in the Patient Portal. Prescription availability and pharmacy services are subject to applicable laws and regulations.</p>

      <p className="font-semibold text-foreground">8. Governing Law</p>
      <p>These Terms are governed by the laws of the Province of Alberta and the federal laws of Canada applicable therein.</p>

      <p className="font-semibold text-foreground">9. Contact Us</p>
      <p>RemedyPills Pharmacy<br/>Unit # 135, 246 Nolanridge Crescent NW<br/>Calgary, AB T3R 1W9<br/>Phone: +1 (403) 980-7003 &middot; Fax: +1 (403) 518-7522<br/>Email: remedypillspharmacy@gmail.com</p>
    </div>
  );
}

export { PrivacyPolicyContent, TermsOfUseContent };
