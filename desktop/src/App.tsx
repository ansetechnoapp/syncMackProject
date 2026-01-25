import { useState } from "react";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";
import BookmarksList from "./components/BookmarksList";
import "./styles/global.css";

type Tab = "dashboard" | "bookmarks" | "settings";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>SyncMark</h1>
          <span className="version">v1.0.0</span>
        </div>
        <ul className="nav-links">
          <li>
            <button
              className={activeTab === "dashboard" ? "active" : ""}
              onClick={() => setActiveTab("dashboard")}
            >
              <span className="icon">📊</span>
              Tableau de bord
            </button>
          </li>
          <li>
            <button
              className={activeTab === "bookmarks" ? "active" : ""}
              onClick={() => setActiveTab("bookmarks")}
            >
              <span className="icon">🔖</span>
              Favoris
            </button>
          </li>
          <li>
            <button
              className={activeTab === "settings" ? "active" : ""}
              onClick={() => setActiveTab("settings")}
            >
              <span className="icon">⚙️</span>
              Paramètres
            </button>
          </li>
        </ul>
      </nav>
      <main className="content">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "bookmarks" && <BookmarksList />}
        {activeTab === "settings" && <Settings />}
      </main>
    </div>
  );
}

export default App;
