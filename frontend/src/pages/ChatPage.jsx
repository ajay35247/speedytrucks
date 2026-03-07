/**
 * ChatPage — Real-time messaging between shippers and drivers
 */
import { useState, useEffect, useRef } from "react";
import Layout from "../components/shared/Layout";
import { useAuth } from "../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

export default function ChatPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Connect socket
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const s = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });
    setSocket(s);

    s.on("chat:message", (msg) => {
      setMessages(prev => [...prev, msg]);
      qc.invalidateQueries(["conversations"]);
    });

    s.on("chat:read", () => qc.invalidateQueries(["conversations"]));

    return () => s.disconnect();
  }, []);

  const { data: convData } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get("/chat/conversations").then(r => r.data.data.conversations),
  });

  const loadMessages = async (conv) => {
    setSelectedConv(conv);
    if (socket) socket.emit("chat:join", { conversationId: conv._id });

    const res = await api.get(`/chat/conversations/${conv._id}/messages`);
    setMessages(res.data.data.messages);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendMessage = () => {
    if (!input.trim() || !selectedConv || !socket) return;
    socket.emit("chat:send", { conversationId: selectedConv._id, content: input.trim() });
    setInput("");
  };

  const other = (conv) => conv.participants?.find(p => p._id !== user?._id);
  const initials = (name) => name?.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2) || "?";

  return (
    <Layout>
      <div style={{ display: "flex", height: "calc(100vh - 100px)", gap: 0, borderRadius: 16, overflow: "hidden", border: "1px solid #E8EEFF", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>

        {/* Conversation list */}
        <div style={{ width: 320, background: "#fff", borderRight: "1px solid #F0F4FF", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "20px 16px", borderBottom: "1px solid #F0F4FF" }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>💬 Messages</h2>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {convData?.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", color: "#9DB2CE", fontSize: 13 }}>
                No conversations yet.<br />Book a load to start chatting.
              </div>
            )}
            {convData?.map(conv => {
              const otherUser = other(conv);
              const isSelected = selectedConv?._id === conv._id;
              return (
                <div key={conv._id} onClick={() => loadMessages(conv)}
                  style={{ padding: "14px 16px", cursor: "pointer", display: "flex", gap: 12, alignItems: "center", background: isSelected ? "#F0F4FF" : "transparent", borderLeft: isSelected ? "3px solid #1660F5" : "3px solid transparent", transition: "all 0.15s" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#1660F5,#FF5C00)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {initials(otherUser?.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>{otherUser?.name || "Unknown"}</div>
                    <div style={{ fontSize: 11, color: "#5B6B8A", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {conv.lastMessage?.content || conv.load?.title || "Start a conversation"}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#9DB2CE" }}>
                    {conv.lastActivity ? new Date(conv.lastActivity).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        {selectedConv ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#F8FAFF" }}>
            {/* Header */}
            <div style={{ padding: "16px 20px", background: "#fff", borderBottom: "1px solid #F0F4FF", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#1660F5,#FF5C00)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>
                {initials(other(selectedConv)?.name)}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>{other(selectedConv)?.name}</div>
                <div style={{ fontSize: 11, color: "#00C27A" }}>● Online</div>
              </div>
              {selectedConv.load && (
                <div style={{ marginLeft: "auto", background: "#F0F4FF", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#1660F5", fontWeight: 600 }}>
                  📦 {selectedConv.load?.title}
                </div>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map(msg => {
                const isMine = msg.sender?._id === user?._id || msg.sender === user?._id;
                return (
                  <div key={msg._id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "70%", padding: "10px 14px", borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: isMine ? "linear-gradient(135deg,#1660F5,#0A3D91)" : "#fff",
                      color: isMine ? "#fff" : "#050D1F", fontSize: 14,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontFamily: "DM Sans, sans-serif",
                    }}>
                      {msg.content}
                      <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6, textAlign: isMine ? "right" : "left" }}>
                        {new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "16px", background: "#fff", borderTop: "1px solid #F0F4FF", display: "flex", gap: 12 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                style={{ flex: 1, padding: "12px 16px", border: "1.5px solid #E2E8F0", borderRadius: 24, fontSize: 14, outline: "none", fontFamily: "DM Sans, sans-serif", background: "#F8FAFF" }}
              />
              <button onClick={sendMessage}
                style={{ padding: "12px 24px", background: "linear-gradient(135deg,#1660F5,#0A3D91)", border: "none", borderRadius: 24, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Send →
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFF", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 56 }}>💬</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>Select a Conversation</div>
            <div style={{ fontSize: 13, color: "#5B6B8A" }}>Choose a chat from the left to start messaging</div>
          </div>
        )}
      </div>
    </Layout>
  );
}
