"use client";

import { useState } from "react";
import {
  User,
  Mail,
  Shield,
  Key,
  Copy,
  Check,
  Edit2,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  UserProfileData,
  updateUserProfile,
  generateOperatorKeyPair,
} from "@/lib/actions/user";

interface OperatorProfileCardProps {
  initialProfile: UserProfileData;
}

export function OperatorProfileCard({ initialProfile }: OperatorProfileCardProps) {
  const [profile, setProfile] = useState<UserProfileData>(initialProfile);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialProfile.name);
  const [email, setEmail] = useState(initialProfile.email);
  const [saving, setSaving] = useState(false);

  // Ed25519 keypair modal / state
  const [copiedPub, setCopiedPub] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [newPrivateKey, setNewPrivateKey] = useState<string | null>(null);
  const [copiedPriv, setCopiedPriv] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateUserProfile({ name, email });
    setSaving(false);

    if (res.success && res.user) {
      setProfile(res.user);
      setEditing(false);
      toast.success("Operator profile updated successfully!");
    } else {
      toast.error(res.error ?? "Failed to update profile");
    }
  };

  const copyPublicKey = () => {
    if (!profile.publicKey) return;
    navigator.clipboard.writeText(profile.publicKey);
    setCopiedPub(true);
    toast.success("Public key copied to clipboard!");
    setTimeout(() => setCopiedPub(false), 2000);
  };

  const copyPrivateKey = () => {
    if (!newPrivateKey) return;
    navigator.clipboard.writeText(newPrivateKey);
    setCopiedPriv(true);
    toast.success("Private key copied to clipboard!");
    setTimeout(() => setCopiedPriv(false), 2000);
  };

  const downloadPrivateKey = () => {
    if (!newPrivateKey) return;
    const blob = new Blob([newPrivateKey], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `operator-ed25519-private-key-${Date.now()}.key`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Private key downloaded.");
  };

  const handleRegenerateKeypair = async () => {
    if (
      !confirm(
        "Generate a new Ed25519 keypair? Any previous mandates signed with the old key will need the new signature."
      )
    ) {
      return;
    }

    setGeneratingKey(true);
    const res = await generateOperatorKeyPair();
    setGeneratingKey(false);

    if (res.success && res.publicKey && res.privateKey) {
      setProfile({ ...profile, publicKey: res.publicKey });
      setNewPrivateKey(res.privateKey);
      toast.success("New Ed25519 Keypair generated!");
    } else {
      toast.error(res.error ?? "Failed to generate keypair");
    }
  };

  return (
    <div
      style={{
        background: "#ffffff",
        border: "var(--border-thick)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-base)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Card Header Banner */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "var(--border-thick)",
          background: "var(--neo-yellow)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#121212",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "2px 2px 0px rgba(0,0,0,0.15)",
            }}
          >
            <User size={22} color="#facc15" strokeWidth={2.5} />
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
              OPERATOR IDENTITY & PROFILE
            </h2>
            <p style={{ fontSize: "12px", color: "#374151", margin: "2px 0 0 0", fontWeight: 600 }}>
              Primary administrator identity and cryptographic signing authority
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              background: "#121212",
              color: "#ffffff",
              padding: "4px 12px",
              borderRadius: "var(--radius-pill)",
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {profile.role.toUpperCase()}
          </span>
          <span
            style={{
              background: "var(--neo-green)",
              border: "1.5px solid #121212",
              padding: "3px 10px",
              borderRadius: "var(--radius-pill)",
              fontSize: "11px",
              fontWeight: 800,
              boxShadow: "1.5px 1.5px 0px #121212",
            }}
          >
            ACTIVE
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Profile Info Row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                background: "var(--neo-purple)",
                color: "#ffffff",
                border: "var(--border-thick)",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: 900,
                flexShrink: 0,
              }}
            >
              {profile.name[0]?.toUpperCase() ?? "O"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#121212", margin: 0 }}>
                  {profile.name}
                </h3>
                <span
                  style={{
                    background: "var(--neo-cream)",
                    border: "1.5px solid #121212",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  Super Admin
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "var(--color-ink-muted)",
                  fontSize: "14px",
                  marginTop: "4px",
                }}
              >
                <Mail size={15} />
                <span>{profile.email}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "6px" }}>
                ID: <span style={{ fontFamily: "var(--font-mono)" }}>{profile.id}</span>
              </div>
            </div>
          </div>

          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "var(--radius-pill)",
                background: "#f4f6f0",
                border: "var(--border-medium)",
                boxShadow: "var(--shadow-sm)",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.1s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(1px, 1px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            >
              <Edit2 size={14} /> Edit Profile
            </button>
          )}
        </div>

        {/* Inline Edit Form */}
        {editing && (
          <form
            onSubmit={handleSaveProfile}
            style={{
              background: "#f8faf5",
              border: "1.5px solid #cbd5e1",
              borderRadius: "var(--radius-md)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 800, marginBottom: "6px" }}>
                  OPERATOR DISPLAY NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    border: "var(--border-medium)",
                    fontSize: "14px",
                    fontWeight: 600,
                    outline: "none",
                    background: "#ffffff",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 800, marginBottom: "6px" }}>
                  OPERATOR EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    border: "var(--border-medium)",
                    fontSize: "14px",
                    fontWeight: 600,
                    outline: "none",
                    background: "#ffffff",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(profile.name);
                  setEmail(profile.email);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-pill)",
                  background: "#e2e8f0",
                  border: "1.5px solid #121212",
                  fontSize: "13px",
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
                  padding: "8px 20px",
                  borderRadius: "var(--radius-pill)",
                  background: "var(--neo-green)",
                  border: "var(--border-medium)",
                  boxShadow: "var(--shadow-sm)",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {/* Cryptographic Signing Key Section */}
        <div
          style={{
            borderTop: "1.5px dashed #cbd5e1",
            paddingTop: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "var(--neo-blue)",
                  border: "var(--border-medium)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Key size={16} color="#121212" />
              </div>
              <div>
                <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#121212", margin: 0 }}>
                  Cryptographic Authority (Ed25519)
                </h4>
                <p style={{ fontSize: "12px", color: "var(--color-ink-muted)", margin: "1px 0 0 0" }}>
                  Used to verify digital signatures on agent spending mandates
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleRegenerateKeypair}
                disabled={generatingKey}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "var(--radius-pill)",
                  background: "#ffffff",
                  border: "var(--border-thin)",
                  boxShadow: "var(--shadow-sm)",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={13} className={generatingKey ? "animate-spin" : ""} />
                {generatingKey ? "Generating..." : "Generate New Keypair"}
              </button>
            </div>
          </div>

          {/* Public Key Display */}
          <div
            style={{
              background: "#f8faf5",
              border: "1.5px solid #cbd5e1",
              borderRadius: "8px",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-ink-muted)" }}>
                PUBLIC KEY (HEX-ENCODED DER)
              </span>
              <button
                onClick={copyPublicKey}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#4f46e5",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {copiedPub ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                {copiedPub ? "Copied!" : "Copy Public Key"}
              </button>
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 600,
                color: "#1e293b",
                background: "#ffffff",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                wordBreak: "break-all",
                lineHeight: "1.4",
              }}
            >
              {profile.publicKey || "Provisioning keypair..."}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              Stored in PostgreSQL database. The Leash Policy Engine uses this to verify mandate authenticity before issuing authorizations.
            </div>
          </div>

          {/* Newly Generated Private Key Alert */}
          {newPrivateKey && (
            <div
              style={{
                background: "#fef9c3",
                border: "2px solid #ca8a04",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#854d0e", fontWeight: 800, fontSize: "13px" }}>
                <AlertCircle size={18} />
                <span>NEW ED25519 PRIVATE KEY GENERATED — SAVE IMMEDIATELY</span>
              </div>
              <p style={{ fontSize: "12px", color: "#713f12", margin: 0 }}>
                This private key is <strong>never stored in the database</strong>. Use it to sign mandates locally using the Leash CLI or MCP client.
              </p>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  background: "#ffffff",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #fde047",
                  wordBreak: "break-all",
                }}
              >
                {newPrivateKey}
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={downloadPrivateKey}
                  style={{
                    padding: "6px 14px",
                    background: "#ffffff",
                    border: "1.5px solid #121212",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Download size={13} /> Download .key
                </button>
                <button
                  onClick={copyPrivateKey}
                  style={{
                    padding: "6px 14px",
                    background: "var(--neo-yellow)",
                    border: "1.5px solid #121212",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {copiedPriv ? <Check size={13} /> : <Copy size={13} />}
                  {copiedPriv ? "Copied!" : "Copy Key"}
                </button>
                <button
                  onClick={() => setNewPrivateKey(null)}
                  style={{
                    padding: "6px 12px",
                    background: "#e2e8f0",
                    border: "1.5px solid #121212",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
