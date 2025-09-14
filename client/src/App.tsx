import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { PasswordProtection } from "@/components/password-protection";
import { AppLayout } from "@/components/app-layout";
import HomeSelector from "@/pages/home-selector";
import PurchaseOrder from "@/pages/purchase-order";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={HomeSelector} />
        <Route path="/proposal/:template" component={PurchaseOrder} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already authenticated from localStorage
  useEffect(() => {
    const authStatus = localStorage.getItem("proposal-generator-auth");
    if (authStatus === "authenticated") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
    localStorage.setItem("proposal-generator-auth", "authenticated");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          {isAuthenticated ? (
            <Router />
          ) : (
            <PasswordProtection onAuthenticated={handleAuthenticated} />
          )}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
