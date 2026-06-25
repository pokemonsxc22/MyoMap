import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
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
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// Listens for SIGNED_IN (email confirmation or sign-in) and drives the user
// to /dashboard. Skip on /reset-password so the password-update flow isn't
// interrupted when Supabase creates a recovery session.
function AuthRedirectHandler() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" && location !== "/reset-password") {
        setLocation("/dashboard");
      }
    });
    return () => subscription.unsubscribe();
  }, [location, setLocation]);
  return null;
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
        <Route path="/dashboard"       component={Dashboard} />
        <Route path="/intake"          component={Intake} />
        <Route path="/results"         component={Results} />
        <Route path="/retake"          component={Retake} />
        <Route path="/progress"        component={Progress} />
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
