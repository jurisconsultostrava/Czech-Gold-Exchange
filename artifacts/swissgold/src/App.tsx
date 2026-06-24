import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { CartProvider } from "@/lib/cart-context";
import { CurrencyProvider } from "@/lib/currency-context";
import { CustomerAuthProvider } from "@/lib/customer-auth";
import { initAdminAuth, isAdminAuthenticated } from "@/lib/admin-auth";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Katalog from "@/pages/katalog";
import Detail from "@/pages/detail";
import Kosik from "@/pages/kosik";
import Vykup from "@/pages/vykup";
import ONas from "@/pages/o-nas";
import Prihlaseni from "@/pages/prihlaseni";
import Registrace from "@/pages/registrace";
import Ucet from "@/pages/ucet";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";

initAdminAuth();

const queryClient = new QueryClient();

function RequireAdmin({ children }: { children: React.ReactNode }) {
  if (!isAdminAuthenticated()) {
    return <Redirect to="/admin/login" />;
  }
  return <>{children}</>;
}

function PublicRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/katalog" component={Katalog} />
        <Route path="/detail/:id" component={Detail} />
        <Route path="/kosik" component={Kosik} />
        <Route path="/vykup" component={Vykup} />
        <Route path="/o-nas" component={ONas} />
        <Route path="/prihlaseni" component={Prihlaseni} />
        <Route path="/registrace" component={Registrace} />
        <Route path="/ucet" component={Ucet} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/:rest*">
        <RequireAdmin>
          <AdminDashboard />
        </RequireAdmin>
      </Route>
      <Route>
        <PublicRouter />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CurrencyProvider>
          <CustomerAuthProvider>
            <CartProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
            </CartProvider>
          </CustomerAuthProvider>
        </CurrencyProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
