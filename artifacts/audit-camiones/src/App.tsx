import { Switch, Route, Router as WouterRouter } from "wouter";
import { AppProvider } from "./context/AppContext";
import { Dashboard } from "./pages/Dashboard";
import { TruckAudit } from "./pages/TruckAudit";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/truck/:id" component={TruckAudit} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AppProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </AppProvider>
  );
}

export default App;
