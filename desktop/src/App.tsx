import { useState } from "react";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";
import WorkspacesPanel from "./components/WorkspacesPanel";
import SearchPanel from "./components/SearchPanel";
import SmartFolders from "./components/SmartFolders";
import SyncHistory from "./components/SyncHistory";
import { ToastProvider } from "./components/Toast";
import "./styles/global.css";

import {
  LayoutDashboard,
  KanbanSquare,
  Search,
  Sparkles,
  History,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

type Tab = "dashboard" | "workspaces" | "search" | "smart-folders" | "sync-history" | "settings";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  return (
    <ToastProvider>
      <div className={`app ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <nav className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <div
            className="sidebar-header"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{ cursor: 'pointer' }}
            title={isSidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
          >
            {isSidebarCollapsed ? (
              <h1>SM</h1>
            ) : (
              <>
                <h1>SyncMark</h1>
                <span className="version">v1.0.0</span>
              </>
            )}
          </div>
          <ul className="nav-links">
            <li>
              <button
                className={activeTab === "dashboard" ? "active" : ""}
                onClick={() => setActiveTab("dashboard")}
                title="Tableau de bord"
              >
                <span className="icon"><LayoutDashboard size={20} /></span>
                {!isSidebarCollapsed && "Tableau de bord"}
              </button>
            </li>
            <li>
              <button
                className={activeTab === "workspaces" ? "active" : ""}
                onClick={() => setActiveTab("workspaces")}
                title="Workspaces"
              >
                <span className="icon"><KanbanSquare size={20} /></span>
                {!isSidebarCollapsed && "Workspaces"}
              </button>
            </li>
            <li>
              <button
                className={activeTab === "search" ? "active" : ""}
                onClick={() => setActiveTab("search")}
                title="Recherche"
              >
                <span className="icon"><Search size={20} /></span>
                {!isSidebarCollapsed && "Recherche"}
              </button>
            </li>
            <li>
              <button
                className={activeTab === "smart-folders" ? "active" : ""}
                onClick={() => setActiveTab("smart-folders")}
                title="Dossiers intelligents"
              >
                <span className="icon"><Sparkles size={20} /></span>
                {!isSidebarCollapsed && "Dossiers intelligents"}
              </button>
            </li>
            <li>
              <button
                className={activeTab === "sync-history" ? "active" : ""}
                onClick={() => setActiveTab("sync-history")}
                title="Historique de sync"
              >
                <span className="icon"><History size={20} /></span>
                {!isSidebarCollapsed && "Historique"}
              </button>
            </li>
            <li>
              <button
                className={activeTab === "settings" ? "active" : ""}
                onClick={() => setActiveTab("settings")}
                title="Paramètres"
              >
                <span className="icon"><SettingsIcon size={20} /></span>
                {!isSidebarCollapsed && "Paramètres"}
              </button>
            </li>
          </ul>

          <div className="sidebar-footer">
            <button
              className="toggle-sidebar"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Agrandir" : "Réduire"}
            >
              <span className="icon">
                {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </span>
            </button>
          </div>
        </nav>
        <main className="content">
          {activeTab === "dashboard" && <Dashboard />}
          {activeTab === "workspaces" && <WorkspacesPanel />}
          {activeTab === "search" && <SearchPanel />}
          {activeTab === "smart-folders" && <SmartFolders />}
          {activeTab === "sync-history" && <SyncHistory />}
          {activeTab === "settings" && <Settings />}
        </main>
      </div>
    </ToastProvider>
  );
}

export default App;
