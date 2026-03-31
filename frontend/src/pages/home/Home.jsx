import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import StatusStrip from "../../components/layout/StatusStrip";
import Sidebar from "../../components/chat/Sidebar";
import ChatWindow from "../../components/chat/ChatWindow";
import UserProfileSidebar from "../../components/chat/UserProfileSidebar";
import useAuthStore from "../../store/authStore";
import useChatStore from "../../store/chatStore";
import useUiStore from "../../store/uiStore";
import socketService from "../../services/socketService";
import { MessageSquare } from "lucide-react";

function Home() {
  const user = useAuthStore((s) => s.user);
  const selectedChat = useChatStore((s) => s.selectedChat);
  const showProfilePanel = useUiStore((s) => s.showProfilePanel);
  const isMobileChatOpen = useUiStore((s) => s.isMobileChatOpen);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    socketService.connect(user._id);
    return () => socketService.disconnect();
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col font-sans transition-colors duration-300"
         style={{ background: 'var(--bg-color)' }}>
      <Navbar />
      <StatusStrip />

      {/* 3-Panel Chat Area */}
      <main className="flex-1 min-h-0 p-3 md:p-4 lg:p-5">
        <div className="h-full flex gap-3 max-w-[1920px] mx-auto">

          {/* Left Panel: Sidebar */}
          <div
            className={`${
              isMobileChatOpen ? 'hidden md:flex' : 'flex'
            } flex-col w-full md:w-[320px] lg:w-[340px] shrink-0 panel-glass overflow-hidden`}
          >
            <Sidebar />
          </div>

          {/* Center Panel: Chat Window */}
          <div
            className={`${
              !isMobileChatOpen ? 'hidden md:flex' : 'flex'
            } flex-col flex-1 min-w-0 panel-glass overflow-hidden relative`}
          >
            {selectedChat ? (
              <ChatWindow />
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

          {/* Right Panel: User Profile / Group Info */}
          {showProfilePanel && selectedChat && (
            <div className="hidden xl:flex flex-col w-[300px] shrink-0 panel-glass overflow-hidden animate-slide-in-right">
              <UserProfileSidebar />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default Home;
