import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import StatusStrip from "../../components/layout/StatusStrip";
import Sidebar from "../../components/chat/Sidebar";
import GroupSidebar from "../../components/chat/GroupSidebar";
import ChatWindow from "../../components/chat/ChatWindow";
import GroupChatWindow from "../../components/chat/GroupChatWindow";
import UserProfileSidebar from "../../components/chat/UserProfileSidebar";
import GroupProfileSidebar from "../../components/chat/GroupProfileSidebar";
import CreateGroupModal from "../../components/chat/CreateGroupModal";
import useAuthStore from "../../store/authStore";
import useChatStore from "../../store/chatStore";
import useUiStore from "../../store/uiStore";
import useGroupStore from "../../store/groupStore";
import socketService from "../../services/socketService";
import { MessageSquare } from "lucide-react";

/* ─── Drag-to-resize handle ─── */
const ResizeHandle = ({ onResize, side = "right" }) => {
  const handleRef = useRef(null);
  const isDragging = useRef(false);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (ev) => {
      if (isDragging.current) onResize(ev.clientX);
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [onResize]);

  return (
    <div
      ref={handleRef}
      onMouseDown={onMouseDown}
      className="resize-handle-vertical shrink-0"
    />
  );
};

function Home() {
  const user = useAuthStore((s) => s.user);
  const selectedPrivateChat = useChatStore((s) => s.selectedChat);
  const selectedGroupChat = useGroupStore((s) => s.selectedGroup);
  const sidebarTab = useUiStore((s) => s.sidebarTab);
  
  const showProfilePanel = useUiStore((s) => s.showProfilePanel);
  const setShowProfilePanel = useUiStore((s) => s.setShowProfilePanel);
  const isMobileChatOpen = useUiStore((s) => s.isMobileChatOpen);
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  // Panel widths (px)
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const [profileWidth, setProfileWidth] = useState(300);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    socketService.connect(user._id);
    return () => socketService.disconnect();
  }, [user, navigate]);

  // Auto-show profile panel when a chat/group is selected (xl+ screens)
  useEffect(() => {
    if (sidebarTab === "private" && selectedPrivateChat) {
      const isXl = window.innerWidth >= 1280;
      if (isXl) setShowProfilePanel(true);
    } else if (sidebarTab === "group" && selectedGroupChat) {
      const isXl = window.innerWidth >= 1280;
      if (isXl) setShowProfilePanel(true);
    }
  }, [sidebarTab, selectedPrivateChat, selectedGroupChat, setShowProfilePanel]);

  // Sidebar resize handler
  const handleSidebarResize = useCallback((clientX) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newWidth = clientX - rect.left;
    const clamped = Math.max(260, Math.min(newWidth, rect.width * 0.4));
    setSidebarWidth(clamped);
  }, []);

  // Profile resize handler (dragging from left edge of profile panel)
  const handleProfileResize = useCallback((clientX) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newWidth = rect.right - clientX;
    const clamped = Math.max(240, Math.min(newWidth, rect.width * 0.35));
    setProfileWidth(clamped);
  }, []);

  // Listen for create group event
  useEffect(() => {
    const handleOpenCreateGroup = () => setIsCreateGroupOpen(true);
    window.addEventListener('open-create-group-modal', handleOpenCreateGroup);
    return () => window.removeEventListener('open-create-group-modal', handleOpenCreateGroup);
  }, []);

  if (!user) return null;

  const hasActiveChat = sidebarTab === "private" ? !!selectedPrivateChat : !!selectedGroupChat;
  const showProfile = showProfilePanel && hasActiveChat && window.innerWidth >= 1280;

  return (
    <div className="h-screen flex flex-col font-sans transition-colors duration-300"
         style={{ background: 'var(--bg-color)' }}>
      <Navbar />
      <StatusStrip />

      {/* 3-Panel Chat Area */}
      <main className="flex-1 min-h-0 p-2 md:p-3">

        {/* ── Mobile Layout ── */}
        <div className="h-full md:hidden">
          {!isMobileChatOpen ? (
            <div className="h-full panel-glass overflow-hidden">
              {sidebarTab === "private" ? <Sidebar /> : <GroupSidebar />}
            </div>
          ) : (
            <div className="h-full panel-glass overflow-hidden">
              {sidebarTab === "private" && selectedPrivateChat && <ChatWindow />}
              {sidebarTab === "group" && selectedGroupChat && <GroupChatWindow />}
            </div>
          )}
        </div>

        {/* ── Desktop Layout ── */}
        <div ref={containerRef} className="h-full hidden md:flex gap-1 max-w-[1920px] mx-auto">

          {/* Left: Sidebar */}
          <div
            className="shrink-0 panel-glass overflow-hidden flex flex-col"
            style={{ width: sidebarWidth }}
          >
            {sidebarTab === "private" ? <Sidebar /> : <GroupSidebar />}
          </div>

          {/* Resize Handle: Sidebar ↔ Chat */}
          <ResizeHandle onResize={handleSidebarResize} />

          {/* Center: Chat Window */}
          <div className="flex-1 min-w-0 panel-glass overflow-hidden flex flex-col">
            {(sidebarTab === "private" && selectedPrivateChat) || (sidebarTab === "group" && selectedGroupChat) ? (
              sidebarTab === "private" ? <ChatWindow /> : <GroupChatWindow />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
                   style={{ background: 'var(--panel-bg)' }}>
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                     style={{
                       backgroundImage: `url('data:image/svg+xml;utf8,<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="1" fill="%23666"/></svg>')`,
                       backgroundSize: '24px 24px'
                     }} />
                <div className="relative z-10 flex flex-col items-center animate-fade-in-up">
                  <div className="w-20 h-20 mb-5 rounded-2xl flex items-center justify-center shadow-sm"
                       style={{ background: '#f0f7f5' }}>
                    <MessageSquare size={36} strokeWidth={1.5} className="text-teal-500" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2 font-display">
                    NuraChat Web
                  </h2>
                  <p className="text-sm text-gray-400 max-w-xs text-center leading-relaxed">
                    Select a contact to open a conversation or search for someone new to start chatting.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Resize Handle: Chat ↔ Profile */}
          {showProfile && <ResizeHandle onResize={handleProfileResize} />}

          {/* Right: Profile Panel */}
          {showProfile && (
            <div
              className="shrink-0 panel-glass overflow-hidden flex flex-col animate-slide-in-right"
              style={{ width: profileWidth }}
            >
              {sidebarTab === "private" ? <UserProfileSidebar /> : <GroupProfileSidebar />}
            </div>
          )}
        </div>
      </main>

      {/* Global Modals */}
      <CreateGroupModal 
        isOpen={isCreateGroupOpen} 
        onClose={() => setIsCreateGroupOpen(false)} 
      />
    </div>
  );
}

export default Home;
