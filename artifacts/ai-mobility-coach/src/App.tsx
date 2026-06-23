import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/contexts/UserContext";
import Landing from "@/pages/Landing";
import Welcome from "@/pages/Welcome";
import Intake from "@/pages/Intake";
import Results from "@/pages/Results";
import Retake from "@/pages/Retake";
import Progress from "@/pages/Progress";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/"          component={Landing} />
      <Route path="/welcome"   component={Welcome} />
      <Route path="/auth"      component={Welcome} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/intake"    component={Intake} />
      <Route path="/results"   component={Results} />
      <Route path="/retake"    component={Retake} />
      <Route path="/progress"  component={Progress} />
      <Route component={NotFound} />
    </Switch>
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
