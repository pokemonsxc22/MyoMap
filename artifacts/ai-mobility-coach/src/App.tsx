import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabaseClient";
import Landing from "@/pages/Landing";
import Welcome from "@/pages/Welcome";
import SignIn from "@/pages/SignIn";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Intake from "@/pages/Intake";
import Results from "@/pages/Results";
import Retake from "@/pages/Retake";
import Progress from "@/pages/Progress";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import OnboardingPlan from "@/pages/OnboardingPlan";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const PENDING_EMAIL_KEY = "myomap_pending_email";
const PENDING_PW_KEY    = "myomap_pending_pw";

// Global auth handler mounted inside the wouter Router so it has access to
// the router context. Handles two jobs:
//   1. On mount: if the user stored pending sign-up credentials (because email
//      confirmation was required), attempt auto-sign-in now that they've
//      confirmed and returned to the app.
//   2. On SIGNED_IN event: clear any pending credentials and redirect to
//      /dashboard (skipped when on /reset-password so the recovery flow
//      is not interrupted).
function AuthRedirectHandler() {
  const [location, setLocation] = useLocation();

  // Job 1: attempt auto-sign-in with stashed credentials on first render.
  useEffect(() => {
    if (!supabase) return;
    const pendingEmail = sessionStorage.getItem(PENDING_EMAIL_KEY);
    const pendingPw    = sessionStorage.getItem(PENDING_PW_KEY);
    if (!pendingEmail || !pendingPw) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Supabase already created a session from the confirmation link.
        sessionStorage.removeItem(PENDING_EMAIL_KEY);
        sessionStorage.removeItem(PENDING_PW_KEY);
      } else {
        // No session yet — email was confirmed but no auto-session; sign in explicitly.
        supabase!.auth
          .signInWithPassword({ email: pendingEmail, password: pendingPw })
          .then(({ error }) => {
            if (!error) {
              sessionStorage.removeItem(PENDING_EMAIL_KEY);
              sessionStorage.removeItem(PENDING_PW_KEY);
              // SIGNED_IN event fires → job 2 below handles the /dashboard redirect.
            }
          });
      }
    });
  }, []); // run once on mount

  // Job 2: redirect to /dashboard on any SIGNED_IN event.
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        sessionStorage.removeItem(PENDING_EMAIL_KEY);
        sessionStorage.removeItem(PENDING_PW_KEY);
        if (location !== "/reset-password") {
          setLocation("/dashboard");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [location, setLocation]);

  return null;
}

// Route-level auth guard: redirects to /welcome when there is no active session.
// Works in tandem with per-page guards already in Dashboard and Intake.
// When `requireOnboarding` is true (the default), users who haven't completed
// the one-time plan-selection screen are redirected to /onboarding first.
function PrivateRoute({
  component: Component,
  requireOnboarding = true,
}: {
  component: React.ComponentType;
  requireOnboarding?: boolean;
}) {
  const { userId, loading, onboardingComplete } = useUser();
  if (loading) return null;
  if (!userId) return <Redirect to="/welcome" />;
  if (requireOnboarding && onboardingComplete === null) return null;
  if (requireOnboarding && onboardingComplete === false) return <Redirect to="/onboarding" />;
  return <Component />;
}

function Router() {
  return (
    <>
      <AuthRedirectHandler />
      <Switch>
        <Route path="/"                component={Landing} />
        <Route path="/welcome"         component={Welcome} />
        <Route path="/auth"            component={Welcome} />
        <Route path="/signin"          component={SignIn} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password"  component={ResetPassword} />
        <Route path="/onboarding"      component={() => <PrivateRoute component={OnboardingPlan} requireOnboarding={false} />} />
        <Route path="/dashboard"       component={() => <PrivateRoute component={Dashboard} />} />
        <Route path="/intake"          component={() => <PrivateRoute component={Intake} />} />
        <Route path="/results"         component={() => <PrivateRoute component={Results} />} />
        <Route path="/retake"          component={() => <PrivateRoute component={Retake} />} />
        <Route path="/progress"        component={() => <PrivateRoute component={Progress} />} />
        <Route path="/profile"         component={() => <PrivateRoute component={Profile} />} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </UserProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
