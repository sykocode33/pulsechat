import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search, Settings, LogOut, Plus, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { disconnectSocket } from '@/services/socket';
import api from '@/services/api';
import { getInitials } from '@/lib/utils';

export default function ChatSidebar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logoutStore = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch { /* ignore */ }
    disconnectSocket();
    logoutStore();
    navigate('/login');
  };

  return (
    <div
      style={{
        width: '72px',
        minWidth: '72px',
        background: 'var(--color-bg-tertiary)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1rem 0',
        gap: '0.5rem',
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          boxShadow: '0 0 20px var(--color-accent-glow)',
        }}
      >
        <MessageCircle size={22} color="white" />
      </div>

      {/* Nav Icons */}
      <NavButton icon={<MessageCircle size={20} />} active tooltip="Chats" />
      <NavButton icon={<Users size={20} />} tooltip="Groups" />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User Avatar */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-accent-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--color-accent)',
          cursor: 'pointer',
          border: '2px solid var(--color-border)',
          transition: 'all 0.2s',
        }}
        title={user?.username}
      >
        {user?.avatar ? (
          <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-full)', objectFit: 'cover' }} />
        ) : (
          getInitials(user?.username || 'U')
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-md)',
          background: 'transparent',
          border: 'none',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          marginTop: '0.5rem',
        }}
        title="Logout"
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}

function NavButton({ icon, active, tooltip }: { icon: React.ReactNode; active?: boolean; tooltip?: string }) {
  return (
    <button
      title={tooltip}
      style={{
        width: '44px',
        height: '44px',
        borderRadius: 'var(--radius-md)',
        background: active ? 'var(--color-accent-light)' : 'transparent',
        border: 'none',
        color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--color-bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon}
    </button>
  );
}
