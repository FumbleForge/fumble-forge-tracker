import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css'; // <-- WICHTIG: Das muss hier stehen!

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "30px", color: "#f43f5e", background: "#09090b", minHeight: "100vh", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", borderBottom: "1px solid #27272a", paddingBottom: "10px", color: "#f59e0b" }}>⚠️ Ein Laufzeitfehler ist aufgetreten:</h2>
          <div style={{ margin: "10px 0", background: "#18181b", padding: "20px", borderRadius: "12px", border: "1px solid #3f3f46" }}>
            <strong style={{ display: "block", marginBottom: "8px", color: "#f43f5e" }}>Fehlermeldung:</strong>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#e4e4e7" }}>{this.state.error?.toString()}</pre>
          </div>
          {this.state.error?.stack && (
            <div style={{ background: "#18181b", padding: "20px", borderRadius: "12px", border: "1px solid #3f3f46" }}>
              <strong style={{ display: "block", marginBottom: "8px", color: "#a1a1aa" }}>Stack-Trace:</strong>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#71717a", fontSize: "0.85rem", maxHeight: "300px", overflow: "auto" }}>{this.state.error?.stack}</pre>
            </div>
          )}
          <div>
            <button 
              onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.href = window.location.origin + window.location.pathname; }} 
              style={{ background: "#f59e0b", color: "#09090b", border: "none", padding: "12px 24px", borderRadius: "8px", fontWeight: "bold", fontSize: "0.9rem", cursor: "pointer", transition: "all 0.2s" }}
            >
              Lokalen Speicher (LocalStorage) leeren & App zurücksetzen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);