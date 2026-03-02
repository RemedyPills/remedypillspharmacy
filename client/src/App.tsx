import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";

const PharmacyApp = lazy(() => import("@/pages/pharmacy-app"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const AdminPage = lazy(() => import("@/pages/admin-page"));
const PrivacyPage = lazy(() => import("@/pages/privacy-page"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[hsl(186,86%,96%)] to-white">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(186,86%,30%)] border-t-transparent" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <ProtectedRoute path="/" component={PharmacyApp} />
        <ProtectedRoute path="/admin" component={AdminPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
