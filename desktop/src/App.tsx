import { useState } from "react";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";
import WorkspacesPanel from "./components/WorkspacesPanel";
import "./styles/global.css";

type Tab = "dashboard" | "workspaces" | "bookmarks" | "settings";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  return (
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
              <span className="icon">📊</span>
              {!isSidebarCollapsed && "Tableau de bord"}
            </button>
          </li>
          <li>
            <button
              className={activeTab === "workspaces" ? "active" : ""}
              onClick={() => setActiveTab("workspaces")}
              title="Workspaces"
            >
              <span className="icon">📁</span>
              {!isSidebarCollapsed && "Workspaces"}
            </button>
          </li>
          <li>
            <button
              className={activeTab === "settings" ? "active" : ""}
              onClick={() => setActiveTab("settings")}
              title="Paramètres"
            >
              <span className="icon">⚙️</span>
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
                <span className="icon">{isSidebarCollapsed ? "➡️" : "⬅️"}</span>
            </button>
        </div>
      </nav>
      <main className="content">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "workspaces" && <WorkspacesPanel />}
        {activeTab === "settings" && <Settings />}
      </main>
    </div>
  );
}

export default App;
