import React, { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { AppLayout } from "./components/layout/AppLayout";
import { NavigationTab, AuthView, ProtectedRoute, PublicRoute } from "./routes";

// Auth Pages
import { Login } from "./pages/auth/Login";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { ResetPassword } from "./pages/auth/ResetPassword";

// Business Modules
import { Dashboard } from "./pages/Dashboard";
import { Customers } from "./pages/Customers";
import { CreateInvoice } from "./pages/CreateInvoice";
import { InvoiceHistory } from "./pages/InvoiceHistory";
import { InvoiceDetails } from "./pages/InvoiceDetails";
import { TaxRecords } from "./pages/TaxRecords";
import { ZatcaHub } from "./pages/ZatcaHub";
import { Services } from "./pages/Services";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";

export function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [authView, setAuthView] = useState<AuthView>("login");
  const [currentTab, setCurrentTab] = useState<NavigationTab>("dashboard");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  const handleViewInvoice = (id: string) => {
    setSelectedInvoiceId(id);
  };

  const handleEditInvoice = (id: string) => {
    setSelectedInvoiceId(null);
    setEditingInvoiceId(id);
    setCurrentTab("create_invoice");
  };

  const handleNavigate = (tab: NavigationTab) => {
    setSelectedInvoiceId(null);
    if (tab !== "create_invoice") {
      setEditingInvoiceId(null);
    }
    setCurrentTab(tab);
  };

  const handleInvoiceCreated = (id: string) => {
    setEditingInvoiceId(null);
    setSelectedInvoiceId(id);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-bold">جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, render Auth flow
  if (!isAuthenticated) {
    return (
      <PublicRoute>
        {authView === "login" && (
          <Login
            onNavigateToForgotPassword={() => setAuthView("forgot_password")}
            onLoginSuccess={() => setCurrentTab("dashboard")}
          />
        )}
        {authView === "forgot_password" && (
          <ForgotPassword
            onNavigateToLogin={() => setAuthView("login")}
          />
        )}
        {authView === "reset_password" && (
          <ResetPassword
            onSuccessNavigateToLogin={() => setAuthView("login")}
          />
        )}
      </PublicRoute>
    );
  }

  // Authenticated Dashboard Layout
  return (
    <AppLayout currentTab={currentTab} onSelectTab={handleNavigate}>
      {selectedInvoiceId ? (
        <InvoiceDetails
          invoiceId={selectedInvoiceId}
          onNavigate={handleNavigate}
          onEditInvoice={handleEditInvoice}
        />
      ) : (
        <>
          {currentTab === "dashboard" && (
            <Dashboard
              onNavigate={handleNavigate}
              onViewInvoice={handleViewInvoice}
            />
          )}
          {currentTab === "customers" && (
            <Customers
              onNavigate={handleNavigate}
              onViewInvoice={handleViewInvoice}
            />
          )}
          {currentTab === "create_invoice" && (
            <CreateInvoice
              onNavigate={handleNavigate}
              onInvoiceCreated={handleInvoiceCreated}
              editingInvoiceId={editingInvoiceId}
            />
          )}
          {currentTab === "invoice_history" && (
            <InvoiceHistory
              onNavigate={handleNavigate}
              onViewInvoice={handleViewInvoice}
              onEditInvoice={handleEditInvoice}
            />
          )}
          {currentTab === "tax_records" && (
            <ProtectedRoute
              allowedRoles={["admin", "accountant"]}
              onNavigateHome={() => handleNavigate("dashboard")}
            >
              <TaxRecords
                onNavigate={handleNavigate}
                onViewInvoice={handleViewInvoice}
              />
            </ProtectedRoute>
          )}
          {currentTab === "zatca" && (
            <ProtectedRoute
              allowedRoles={["admin", "accountant"]}
              onNavigateHome={() => handleNavigate("dashboard")}
            >
              <ZatcaHub />
            </ProtectedRoute>
          )}
          {currentTab === "services" && <Services />}
          {currentTab === "reports" && <Reports />}
          {currentTab === "settings" && (
            <ProtectedRoute
              allowedRoles={["admin"]}
              onNavigateHome={() => handleNavigate("dashboard")}
            >
              <Settings />
            </ProtectedRoute>
          )}
        </>
      )}
    </AppLayout>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
