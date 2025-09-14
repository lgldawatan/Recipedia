
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import "./index.css";
import { auth } from "./firebase";

import Home from "./Home";
import Recipes from "./Recipes";
import Favorites from "./Favorites";
import About from "./About";
import Signin from "./Signin";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <h2>App error</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error || "Unknown error")}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function Root() {
  // Firebase user (undefined while loading, null if signed out)
  const [user, setUser] = React.useState(undefined);

  // Favorites saved per user
  const [savedRecipes, setSavedRecipes] = React.useState([]);

  // Watch Firebase auth state
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null));
    return unsub;
  }, []);

  // Load favorites when user changes
  React.useEffect(() => {
    if (!user) {
      setSavedRecipes([]);
      return;
    }
    const key = `savedRecipes:${user.uid}`;
    try {
      const raw = localStorage.getItem(key);
      setSavedRecipes(raw ? JSON.parse(raw) : []);
    } catch {
      setSavedRecipes([]);
    }
  }, [user]);

  // Persist favorites per-user
  React.useEffect(() => {
    if (!user) return;
    localStorage.setItem(
      `savedRecipes:${user.uid}`,
      JSON.stringify(savedRecipes)
    );
  }, [user, savedRecipes]);

  if (user === undefined) {
    return <div style={{ padding: 24, textAlign: "center" }}>Loading…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Home
              user={user}
              savedRecipes={savedRecipes}
              setSavedRecipes={setSavedRecipes}
            />
          }
        />

        {/* Pass user so avatar shows in header */}
        <Route path="/about" element={<About user={user} />} />

        <Route
          path="/recipes"
          element={
            <Recipes
              user={user}
              savedRecipes={savedRecipes}
              setSavedRecipes={setSavedRecipes}
            />
          }
        />

        <Route
          path="/favorites"
          element={
            user ? (
              <Favorites
                user={user}
                savedRecipes={savedRecipes}
                setSavedRecipes={setSavedRecipes}
              />
            ) : (
              // If a user hits /favorites while logged out, send to sign in.
              <Navigate to="/signin" replace />
            )
          }
        />

        <Route
          path="/signin"
          element={user ? <Navigate to="/" replace /> : <Signin />}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>
);
