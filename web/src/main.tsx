import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { CartProvider } from "./context/CartContext";
import { ContentProvider } from "./context/ContentContext";
import { DriverAuthProvider } from "./context/DriverAuthContext";
import { OwnerAuthProvider } from "./context/OwnerAuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { UserAuthProvider } from "./context/UserAuthContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <ContentProvider>
          <AdminAuthProvider>
            <UserAuthProvider>
              <OwnerAuthProvider>
                <DriverAuthProvider>
                  <CartProvider>
                    <App />
                  </CartProvider>
                </DriverAuthProvider>
              </OwnerAuthProvider>
            </UserAuthProvider>
          </AdminAuthProvider>
        </ContentProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);
