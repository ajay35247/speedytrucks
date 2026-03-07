import { useState } from "react";
import Layout from "../components/shared/Layout";
import { useAuth } from "../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { kycAPI } from "../services/api";
import toast from "react-hot-toast";

const DOCS = [
  { key: "pan", label: "PAN Card", icon: "🪪", required: true, roles: ["shipper","owner","broker","admin"] },
  { key: "aadhaar", label: "Aadhaar Card", icon: "📋", required: true, roles: ["shipper","owner","broker","admin"] },
  { key: "drivingLicense", label: "Driving License", icon: "🚗", required: false, roles: ["owner"] },
  { key: "rc", label: "RC (Registration Certificate)", icon: "🚛", required: false, roles: ["owner"] },
  { key: "gst", label: "GST Certificate", icon: "📄", required: false, roles: ["shipper","broker","owner"] },
  { key: "selfie", label: "Live Selfie (Identity Proof)", icon: "🤳", required: true, roles: ["shipper","owner","broker","admin"] },
];

const STATUS_CONFIG = {
  approved: { color: "#00C27A", bg: "#E6FBF4", label: "Approved ✅" },
  pending: { color: "#F5A623", bg: "#FFFBEB", label: "Under Review ⏳" },
  rejected: { color: "#F03D3D", bg: "#FEF2F2", label: "Rejected ❌" },
};

export default function KYCPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState({});

  const { data: kyc, isLoading } = useQuery({
    queryKey: ["kyc"],
    queryFn: () => kycAPI.getStatus().then(r => r.data.data.kyc),
  });

  const handleUpload = async (docType, file) => {
    setUploading(p => ({ ...p, [docType]: true }));
    try {
      await kycAPI.uploadDocument(docType, file);
      toast.success(`${docType} uploaded successfully!`);
      qc.invalidateQueries(["kyc"]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally { setUploading(p => ({ ...p, [docType]: false })); }
  };

  const filteredDocs = DOCS.filter(d => d.roles.includes(user?.role));
  const overallStatus = kyc?.overallStatus;

  return (
    <Layout>
      <div style={{ maxWidth: 800, animation: "fadeUp 0.5s ease" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>📋 KYC Verification</h1>
          <p style={{ fontSize: 13, color: "#5B6B8A", marginTop: 4 }}>Upload your documents to unlock all platform features</p>
        </div>

        {/* Status banner */}
        {overallStatus && overallStatus !== "none" && (
          <div style={{ background: STATUS_CONFIG[overallStatus]?.bg || "#F8FAFF", border: `1px solid ${STATUS_CONFIG[overallStatus]?.color}30`, borderRadius: 14, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 24 }}>{overallStatus === "approved" ? "🎉" : overallStatus === "pending" ? "⏳" : "⚠️"}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: STATUS_CONFIG[overallStatus]?.color }}>{STATUS_CONFIG[overallStatus]?.label}</div>
              <div style={{ fontSize: 12, color: "#5B6B8A" }}>
                {overallStatus === "approved" && "Your KYC is verified. All features are unlocked."}
                {overallStatus === "pending" && "Documents submitted. Our team will review within 24 hours."}
                {overallStatus === "rejected" && (kyc?.adminNote || "Some documents were rejected. Please re-upload.")}
              </div>
            </div>
          </div>
        )}

        {/* Documents grid */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 60 }}><div style={{ width: 32, height: 32, border: "4px solid #1660F5", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} /></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {filteredDocs.map(doc => {
              const docData = kyc?.[doc.key];
              const status = docData?.status;
              const statusConf = STATUS_CONFIG[status];
              const isUploading = uploading[doc.key];

              return (
                <div key={doc.key} style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid ${status === "approved" ? "#00C27A30" : "#F0F4FF"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{doc.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#050D1F" }}>{doc.label}</div>
                        {doc.required && <div style={{ fontSize: 10, color: "#F03D3D", fontWeight: 600 }}>Required</div>}
                      </div>
                    </div>
                    {status && (
                      <div style={{ background: statusConf?.bg, color: statusConf?.color, padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                        {statusConf?.label}
                      </div>
                    )}
                  </div>

                  {status === "approved" ? (
                    <div style={{ background: "#E6FBF4", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#059669", fontWeight: 600 }}>
                      Document verified ✓
                    </div>
                  ) : (
                    <label style={{ display: "block", cursor: "pointer" }}>
                      <input type="file" accept="image/jpeg,image/png,application/pdf" style={{ display: "none" }}
                        onChange={e => { if (e.target.files[0]) handleUpload(doc.key, e.target.files[0]); }} />
                      <div style={{
                        border: "2px dashed #E2E8F0", borderRadius: 10, padding: "16px 20px",
                        textAlign: "center", color: "#5B6B8A", fontSize: 12, fontWeight: 600,
                        background: isUploading ? "#EEF4FF" : "#FAFBFF", transition: "all 0.2s",
                        cursor: "pointer",
                      }}>
                        {isUploading ? "⏳ Uploading..." : status === "pending" ? "📤 Re-upload" : "📤 Upload Document"}
                        {!isUploading && <div style={{ fontSize: 10, fontWeight: 400, marginTop: 4, color: "#8B9CB8" }}>JPEG, PNG or PDF • Max 5MB</div>}
                      </div>
                    </label>
                  )}

                  {status === "rejected" && docData?.rejectionReason && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "#F03D3D", background: "#FEF2F2", padding: "8px 12px", borderRadius: 8 }}>
                      Reason: {docData.rejectionReason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tips */}
        <div style={{ background: "#EEF4FF", borderRadius: 14, padding: 20, marginTop: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#1660F5", marginBottom: 10 }}>💡 Document Guidelines</div>
          <ul style={{ fontSize: 12, color: "#5B6B8A", paddingLeft: 18, lineHeight: 2 }}>
            <li>Upload clear, readable photos or scans of original documents</li>
            <li>Ensure all four corners of the document are visible</li>
            <li>File size must be under 5MB (JPEG, PNG, or PDF)</li>
            <li>Documents must be valid and not expired</li>
            <li>KYC review typically takes 24 hours on business days</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}