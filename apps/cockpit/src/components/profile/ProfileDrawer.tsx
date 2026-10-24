"use client";

import { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Shield,
  Key,
  Copy,
  Check,
  Wallet,
  ExternalLink,
  Eye,
  EyeOff,
  Server,
  Zap,
  Edit2,
  Save,
  CheckCircle2,
  Unlink,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getUserProfile,
  updateUserProfile,
  getAgentApiKey,
  UserProfileData,
} from "@/lib/actions/user";
import { disconnectWallet } from "@/lib/actions/paypal";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (name: string) => void;
}

export function ProfileDrawer({
  isOpen,
  onClose,
  onProfileUpdated,
}: ProfileDrawerProps) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("http://localhost:3000");
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedVault, setCopiedVault] = useState(false);

  // Fetch profile when opened
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function loadData() {
      setLoading(true);
      const [profRes, keyRes] = await Promise.all([
        getUserProfile(),
        getAgentApiKey(),
      ]);

      if (mounted) {
        if (profRes.success && profRes.user) {
          setProfile(profRes.user);
          setName(profRes.user.name);
          setEmail(profRes.user.email);
        }
        setApiKey(keyRes.key);
        setGatewayUrl(keyRes.gatewayUrl);
        setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateUserProfile({ name, email });
    setSaving(false);

    if (res.success && res.user) {
      setProfile(res.user);
      setEditing(false);
      toast.success("Profile updated successfully!");
      if (onProfileUpdated) onProfileUpdated(res.user.name);
    } else {
      toast.error(res.error ?? "Failed to update profile");
    }
  };

  const copyToClipboard = (text: string, type: "key" | "vault") => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      toast.success("API key copied to clipboard!");
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedVault(true);
      toast.success("Vault token copied to clipboard!");
      setTimeout(() => setCopiedVault(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect this PayPal Vault wallet?")) return;
    const res = await disconnectWallet();
    if (res.success) {
      if (profile) setProfile({ ...profile, vaultId: null });
      toast("Wallet disconnected.", { icon: "🔌" });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "flex-end",
        backgroundColor: "rgba(18, 18, 18, 0.45)",
        backdropFilter: "blur(4px)",
        transition: "opacity 0.2s ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          height: "100%",
          background: "#ffffff",
          borderLeft: "var(--border-thick)",
          boxShadow: "-8px 0px 0px #121212",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          animation: "slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="profile-drawer-container"
      >
        {/* Drawer Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "var(--border-thick)",
            background: "var(--neo-yellow)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#121212",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "2px 2px 0px rgba(0,0,0,0.2)",
              }}
            >
              <User size={20} color="#facc15" />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 900,
                  color: "#121212",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                OPERATOR PROFILE
              </h2>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#4338ca",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Agent Leash Identity & Keys
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close profile drawer"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#ffffff",
              border: "var(--border-medium)",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "transform 0.1s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(1px, 1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            <X size={18} color="#121212" strokeWidth={2.5} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px", flex: 1 }}>
          {/* Section 1: Operator Details Card */}
          <div
            style={{
              background: "#ffffff",
              border: "var(--border-thick)",
              borderRadius: "var(--radius-lg)",
              padding: "20px",
              boxShadow: "var(--shadow-base)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "var(--neo-purple)",
                    color: "#ffffff",
                    border: "var(--border-medium)",
                    boxShadow: "var(--shadow-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    fontWeight: 900,
                  }}
                >
                  {profile?.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#121212", margin: 0 }}>
                      {profile?.name ?? "Operator"}
                    </h3>
                    <span
                      style={{
                        background: "var(--neo-yellow)",
                        border: "1.5px solid #121212",
                        padding: "1px 8px",
                        borderRadius: "var(--radius-pill)",
                        fontSize: "10px",
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      {profile?.role ?? "OWNER"}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--color-ink-muted)", marginTop: "2px" }}>
                    {profile?.email ?? "operator@agentleash.dev"}
                  </div>
                </div>
              </div>

              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "var(--radius-pill)",
                    background: "#f4f6f0",
                    border: "var(--border-thin)",
                    boxShadow: "var(--shadow-sm)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Edit2 size={13} /> Edit
                </button>
              )}
            </div>

            {/* Editable Profile Form */}
            {editing && (
              <form
                onSubmit={handleSaveProfile}
                style={{
                  borderTop: "1.5px dashed #e2e8f0",
                  paddingTop: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 800, marginBottom: "4px" }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "var(--border-medium)",
                      fontSize: "13px",
                      fontWeight: 600,
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 800, marginBottom: "4px" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "var(--border-medium)",
                      fontSize: "13px",
                      fontWeight: 600,
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setName(profile?.name ?? "");
                      setEmail(profile?.email ?? "");
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--radius-sm)",
                      background: "#e2e8f0",
                      border: "1.5px solid #121212",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--neo-green)",
                      border: "1.5px solid #121212",
                      boxShadow: "var(--shadow-sm)",
                      fontSize: "12px",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Save size={13} /> {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Section 2: Connected PayPal Vault Wallet Card */}
          <div
            style={{
              background: "#ffffff",
              border: "var(--border-thick)",
              borderRadius: "var(--radius-lg)",
              padding: "20px",
              boxShadow: "var(--shadow-base)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: profile?.vaultId ? "var(--neo-green)" : "#e2e8f0",
                    border: "var(--border-medium)",
                    boxShadow: "2px 2px 0px #121212",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Wallet size={18} color="#121212" />
                </div>
                <div>
                  <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#121212", margin: 0 }}>
                    Autonomous PayPal Wallet
                  </h4>
                  <p style={{ fontSize: "12px", color: "var(--color-ink-muted)", margin: "1px 0 0 0" }}>
                    Linked via PayPal Vault Engine
                  </p>
                </div>
              </div>

              {profile?.vaultId ? (
                <span
                  style={{
                    background: "var(--neo-green-light)",
                    color: "#065f46",
                    border: "1.5px solid #121212",
                    padding: "3px 10px",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "11px",
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#059669",
                      display: "inline-block",
                    }}
                  />
                  ACTIVE
                </span>
              ) : (
                <span
                  style={{
                    background: "#fee2e2",
                    color: "#991b1b",
                    border: "1.5px solid #121212",
                    padding: "3px 10px",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  NOT LINKED
                </span>
              )}
            </div>

            {profile?.vaultId ? (
              <div
                style={{
                  background: "#f8faf5",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-ink-muted)" }}>
                    VAULT PAYMENT TOKEN
                  </span>
                  <button
                    onClick={() => copyToClipboard(profile.vaultId!, "vault")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#4f46e5",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {copiedVault ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    {copiedVault ? "Copied!" : "Copy Token"}
                  </button>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#1e293b",
                    background: "#ffffff",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    wordBreak: "break-all",
                  }}
                >
                  {profile.vaultId}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    Sandbox Buyer: <strong>Tanshuk shop</strong>
                  </span>
                  <button
                    onClick={handleDisconnect}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#dc2626",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Unlink size={12} /> Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <a
                href="/settings"
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  background: "var(--neo-yellow)",
                  color: "#121212",
                  border: "var(--border-medium)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px",
                  fontSize: "13px",
                  fontWeight: 800,
                  textDecoration: "none",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                Connect PayPal Wallet &rarr;
              </a>
            )}
          </div>

          {/* Section 2.5: Ed25519 Cryptographic Signing Key Card */}
          <div
            style={{
              background: "#ffffff",
              border: "var(--border-thick)",
              borderRadius: "var(--radius-lg)",
              padding: "20px",
              boxShadow: "var(--shadow-base)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "var(--neo-purple)",
                    border: "var(--border-medium)",
                    boxShadow: "2px 2px 0px #121212",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Key size={18} color="#ffffff" />
                </div>
                <div>
                  <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#121212", margin: 0 }}>
                    Ed25519 Public Key
                  </h4>
                  <p style={{ fontSize: "12px", color: "var(--color-ink-muted)", margin: "1px 0 0 0" }}>
                    Cryptographic mandate signing authority
                  </p>
                </div>
              </div>
              <span
                style={{
                  background: "var(--neo-cream)",
                  border: "1.5px solid #121212",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "10px",
                  fontWeight: 800,
                }}
              >
                ENFORCED
              </span>
            </div>

            <div
              style={{
                background: "#f8faf5",
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-ink-muted)" }}>
                  PUBLIC KEY (HEX DER)
                </span>
                <button
                  onClick={() => {
                    if (profile?.publicKey) {
                      navigator.clipboard.writeText(profile.publicKey);
                      toast.success("Public key copied!");
                    }
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#4f46e5",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#1e293b",
                  background: "#ffffff",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  wordBreak: "break-all",
                }}
              >
                {profile?.publicKey || "No key registered yet"}
              </div>
            </div>
          </div>

          {/* Section 3: Scoped Agent API Key Card */}
          <div
            style={{
              background: "#ffffff",
              border: "var(--border-thick)",
              borderRadius: "var(--radius-lg)",
              padding: "20px",
              boxShadow: "var(--shadow-base)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "var(--neo-blue)",
                    border: "var(--border-medium)",
                    boxShadow: "2px 2px 0px #121212",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Key size={18} color="#121212" />
                </div>
                <div>
                  <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#121212", margin: 0 }}>
                    Autonomous Agent API Key
                  </h4>
                  <p style={{ fontSize: "12px", color: "var(--color-ink-muted)", margin: "1px 0 0 0" }}>
                    Used by AI agents to request payments
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#f8faf5",
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-ink-muted)" }}>
                  BEARER CREDENTIAL
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#64748b",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showKey ? "Hide" : "Reveal"}
                  </button>
                  <button
                    onClick={() => copyToClipboard(apiKey, "key")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#4f46e5",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {copiedKey ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    {copiedKey ? "Copied!" : "Copy Key"}
                  </button>
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#1e293b",
                  background: "#ffffff",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                }}
              >
                {showKey ? apiKey : `leash_sk_live_${"•".repeat(24)}`}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.5" }}>
                Pass this key in the header: <code style={{ fontSize: "10px", background: "#f1f5f9", padding: "2px 4px", borderRadius: "4px" }}>Authorization: Bearer [KEY]</code>
              </div>
            </div>
          </div>

          {/* Section 4: System Guardrails & Health */}
          <div
            style={{
              background: "#f4f6f0",
              border: "1.5px solid #cbd5e1",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#121212", display: "flex", alignItems: "center", gap: "6px" }}>
              <Shield size={14} color="#059669" /> Gateway Guardrails Status
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px" }}>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 10px" }}>
                <span style={{ color: "#64748b" }}>2PC Authorize:</span>
                <div style={{ fontWeight: 800, color: "#059669" }}>Active (Holds funds)</div>
              </div>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 10px" }}>
                <span style={{ color: "#64748b" }}>Signing Standard:</span>
                <div style={{ fontWeight: 800, color: "#4f46e5" }}>Ed25519 Enforced</div>
              </div>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 10px" }}>
                <span style={{ color: "#64748b" }}>Leash Gateway:</span>
                <div style={{ fontWeight: 800, color: "#121212" }}>{gatewayUrl}</div>
              </div>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 10px" }}>
                <span style={{ color: "#64748b" }}>PostgreSQL:</span>
                <div style={{ fontWeight: 800, color: "#059669" }}>Connected (Docker)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "var(--border-thick)",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <a
            href="/settings"
            onClick={onClose}
            style={{
              fontSize: "12px",
              color: "#4f46e5",
              fontWeight: 800,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            Full Settings Page &rarr;
          </a>
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              background: "#121212",
              color: "#ffffff",
              border: "none",
              borderRadius: "var(--radius-pill)",
              fontSize: "12px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
