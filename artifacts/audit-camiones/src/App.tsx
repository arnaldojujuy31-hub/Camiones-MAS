import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Dashboard } from "./pages/Dashboard";
import { TruckAudit } from "./pages/TruckAudit";
import { Login } from "./pages/Login";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 0,
    },
  },
});

function Router({ onLogout }: { onLogout: () => void }) {
  return (
    <Switch>
      <Route path="/">
        <Dashboard onLogout={onLogout} />
      </Route>
      <Route path="/truck/:truckId">
        {(params) => <TruckAudit truckId={Number(params.truckId)} onLogout={onLogout} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("auth_token"));

  useEffect(() => {
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }, [token]);

  if (!token) {
    return <Login onLogin={setToken} />;
  }

  const handleLogout = () => setToken(null);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router onLogout={handleLogout} />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
