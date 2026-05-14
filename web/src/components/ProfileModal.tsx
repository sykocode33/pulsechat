import { useState } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getInitials } from '@/lib/utils';
import api from '@/services/api';

interface ProfileModalProps {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [status, setStatus] = useState(user?.status || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const { data } = await api.put('/users/me', { username, bio, status });
      updateUser(data.user);
      setSuccess('Profile updated!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in glass"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '420px', borderRadius: 'var(--radius-xl)',
          padding: '2rem', margin: '1rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Profile</h2>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: 'var(--radius-full)',
              background: 'var(--color-bg-hover)', border: 'none',
              color: 'var(--color-text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '90px', height: '90px', borderRadius: 'var(--radius-full)',
              background: 'var(--color-accent-light)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-accent)',
              border: '3px solid var(--color-accent)',
            }}>
              {user?.avatar ? (
                <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-full)', objectFit: 'cover' }} />
              ) : getInitials(user?.username || 'U')}
            </div>
            <div style={{
              position: 'absolute', bottom: '0', right: '0',
              width: '28px', height: '28px', borderRadius: 'var(--radius-full)',
              background: 'var(--color-accent)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
              border: '2px solid var(--color-bg-secondary)',
            }}>
              <Camera size={12} color="white" />
            </div>
          </div>
        </div>

        {/* Email (read-only) */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Email
          </label>
          <input
            className="input-field"
            value={user?.email || ''}
            disabled
            style={{ opacity: 0.6, cursor: 'not-allowed' }}
          />
        </div>

        {/* Username */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Username
          </label>
          <input
            className="input-field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your username"
          />
        </div>

        {/* Bio */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Bio
          </label>
          <textarea
            className="input-field"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell others about yourself..."
            rows={3}
            style={{ resize: 'none' }}
            maxLength={200}
          />
          <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            {bio.length}/200
          </div>
        </div>

        {/* Status */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Status
          </label>
          <input
            className="input-field"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="What's on your mind?"
            maxLength={100}
          />
        </div>

        {/* Error / Success */}
        {error && (
          <div style={{
            padding: '0.6rem 0.75rem', background: 'rgba(255,71,87,0.1)',
            border: '1px solid rgba(255,71,87,0.3)', borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            padding: '0.6rem 0.75rem', background: 'rgba(0,214,143,0.1)',
            border: '1px solid rgba(0,214,143,0.3)', borderRadius: 'var(--radius-md)',
            color: 'var(--color-success)', fontSize: '0.8rem', marginBottom: '1rem',
          }}>
            {success}
          </div>
        )}

        {/* Save */}
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
