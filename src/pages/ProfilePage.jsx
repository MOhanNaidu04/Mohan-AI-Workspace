import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { useApp } from '../context/AppContext';
import { useNotification } from '../context/NotificationContext';
import { apiUrl } from '../utils/api';

// ─── Validation Helpers ──────────────────────────────────────────────────────

function validateProfileName(name) {
  if (!name.trim()) return 'Full name cannot be empty.';
  if (name.trim().length < 2) return 'Full name must be at least 2 characters.';
  return null;
}

function validateProfileEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim()) return 'Email address cannot be empty.';
  if (!emailRegex.test(email.trim())) return 'Please enter a valid email address (e.g. you@example.com).';
  return null;
}

// ─── Normalizer ──────────────────────────────────────────────────────────────

function normalizeUser(user) {
  return {
    name: user?.fullName || user?.full_name || user?.name || user?.username || '',
    role: user?.role || '',
    email: user?.email || '',
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { analytics, favorites } = useApp();
  const { notify } = useNotification();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(() =>
    normalizeUser(JSON.parse(localStorage.getItem('user') || '{}'))
  );
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '' });

  // ── Load profile from API ──────────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      console.warn('[ProfilePage] No auth token found — skipping API profile load.');
      setLoadingProfile(false);
      return;
    }

    let cancelled = false;
    console.log('[ProfilePage] Fetching profile from API...');

    async function loadProfile() {
      try {
        const response = await fetch(apiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        console.log('[ProfilePage] Profile API response status:', response.status, '| ok:', response.ok);

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load profile. Please try again.');
        }

        if (!cancelled) {
          const nextProfile = normalizeUser(data.user);
          console.log('[ProfilePage] Profile loaded successfully:', nextProfile);
          setProfile(nextProfile);
          localStorage.setItem('user', JSON.stringify({
            id: data.user.id,
            username: data.user.username,
            email: data.user.email,
            fullName: data.user.full_name,
            role: data.user.role,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[ProfilePage] Error loading profile:', error.message);
          notify('Profile load failed', error.message, 'error');
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [notify]);

  // ── Validate fields before saving ─────────────────────────────────────────

  const handleFieldBlur = (field) => {
    if (field === 'name') {
      const err = validateProfileName(profile.name);
      setFieldErrors((prev) => ({ ...prev, name: err || '' }));
    }
    if (field === 'email') {
      const err = validateProfileEmail(profile.email);
      setFieldErrors((prev) => ({ ...prev, email: err || '' }));
    }
  };

  // ── Save profile ───────────────────────────────────────────────────────────

  const handleSave = async () => {
    // Validate before API call
    const nameErr = validateProfileName(profile.name);
    const emailErr = validateProfileEmail(profile.email);

    if (nameErr || emailErr) {
      setFieldErrors({ name: nameErr || '', email: emailErr || '' });
      console.warn('[ProfilePage] Save blocked — validation errors:', { nameErr, emailErr });
      notify(
        'Validation error',
        [nameErr, emailErr].filter(Boolean).join(' '),
        'error'
      );
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[ProfilePage] No auth token — cannot save profile. Redirecting to login.');
      notify('Not signed in', 'Please log in again before saving your profile.', 'error');
      navigate('/login', { replace: true });
      return;
    }

    setSaving(true);
    console.log('[ProfilePage] Saving profile:', { name: profile.name, email: profile.email, role: profile.role });

    try {
      const response = await fetch(apiUrl('/api/auth/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: profile.name.trim(),
          email: profile.email.trim(),
          role: profile.role.trim(),
        }),
      });

      const data = await response.json();
      console.log('[ProfilePage] Save API response status:', response.status, '| ok:', response.ok);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile. Please try again.');
      }

      const updatedUser = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        fullName: data.user.full_name,
        role: data.user.role,
      };

      console.log('[ProfilePage] Profile saved successfully:', updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('storage'));
      setProfile(normalizeUser(updatedUser));
      notify('Profile saved', 'Your registered profile was updated in the database.');
    } catch (error) {
      console.error('[ProfilePage] Error saving profile:', error.message);
      notify('Profile save failed', error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    console.log('[ProfilePage] User logging out, clearing local storage...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('storage'));
    notify('Logged out', 'You have been successfully logged out.');
    setTimeout(() => navigate('/login', { replace: true }), 500);
  };

  const initial = (profile.name || profile.email || 'U').charAt(0).toUpperCase();

  const FieldError = ({ name }) =>
    fieldErrors[name] ? (
      <p role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {fieldErrors[name]}
      </p>
    ) : null;

  const inputClass = (field) =>
    `mt-1 w-full rounded-2xl border px-4 py-3 text-sm disabled:opacity-60 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent-500 transition ${
      fieldErrors[field]
        ? 'border-red-400 bg-red-50 dark:border-red-600'
        : 'border-slate-200 bg-slate-50 dark:border-slate-800'
    }`;

  return (
    <div className="space-y-4 pb-6 sm:pb-0">
      {/* ── Profile Card ────────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-accent-500 text-2xl font-bold text-white">
            {initial}
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Account</p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">Profile</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage the registered user profile saved in your database.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Full Name */}
          <label className="block">
            <span className="text-xs font-medium text-slate-500">
              Full name <span className="text-red-500">*</span>
            </span>
            <input
              value={profile.name}
              onChange={(e) => {
                setProfile({ ...profile, name: e.target.value });
                setFieldErrors((p) => ({ ...p, name: '' }));
              }}
              onBlur={() => handleFieldBlur('name')}
              disabled={loadingProfile || saving}
              placeholder="Your full name"
              className={inputClass('name')}
            />
            <FieldError name="name" />
          </label>

          {/* Role */}
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Role</span>
            <input
              value={profile.role}
              onChange={(e) => setProfile({ ...profile, role: e.target.value })}
              disabled={loadingProfile || saving}
              placeholder="Product Manager"
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent-500 transition"
            />
          </label>

          {/* Email */}
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-slate-500">
              Email <span className="text-red-500">*</span>
            </span>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => {
                setProfile({ ...profile, email: e.target.value });
                setFieldErrors((p) => ({ ...p, email: '' }));
              }}
              onBlur={() => handleFieldBlur('email')}
              disabled={loadingProfile || saving}
              placeholder="you@example.com"
              className={inputClass('email')}
            />
            <FieldError name="email" />
          </label>
        </div>

        <Button onClick={handleSave} disabled={saving || loadingProfile} className="mt-6 w-full sm:w-auto">
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </Card>

      {/* ── Usage Summary ────────────────────────────────────────────────────── */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Usage summary</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-900">
            <p className="text-xs text-slate-500">Total chats</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{analytics.totalChats}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-900">
            <p className="text-xs text-slate-500">Messages sent</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{analytics.totalMessages}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-900">
            <p className="text-xs text-slate-500">Saved prompts</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{favorites.length}</p>
          </div>
        </div>
      </Card>

      {/* ── Account Management ───────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Account management</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Manage your account settings and security options.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 sm:w-auto"
            >
              Logout
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
