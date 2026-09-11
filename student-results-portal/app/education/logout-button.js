'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { educationAuthClient } from '../../lib/education-auth-client';

export default function EducationLogoutButton({ admin = false, menu = false, className }) {
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);

    try {
      if (admin) {
        await fetch('/api/admin/logout', { method: 'POST' });
        window.location.replace('/education/admin-login');
        return;
      }

      await educationAuthClient.signOut();
      window.location.replace('/education/login');
    } catch {
      setBusy(false);
    }
  }

  const button = (
      <button
      className={className}
      type="button"
      onClick={logout}
      disabled={busy}
      aria-label="Log out of Dropare Education"
      style={menu ? {
        width: '100%',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 11,
        border: 0,
        borderRadius: 12,
        padding: '12px 13px',
        background: 'transparent',
        color: '#acd2c4',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 650,
        textAlign: 'left',
        cursor: busy ? 'wait' : 'pointer',
        opacity: busy ? 0.7 : 1,
      } : {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        border: '1px solid rgba(255,255,255,.28)',
        borderRadius: 999,
        padding: '11px 16px',
        background: '#153f2e',
        color: '#fff',
        boxShadow: '0 12px 30px rgba(14,61,42,.24)',
        fontSize: 14,
        fontWeight: 800,
        cursor: busy ? 'wait' : 'pointer',
        opacity: busy ? 0.7 : 1,
      }}
    >
      <LogOut size={17} />
      {busy ? 'Logging out…' : 'Log out'}
      </button>
  );

  if (menu) return button;

  return (
    <div style={{display:'flex',justifyContent:'flex-end',padding:'12px 16px calc(16px + env(safe-area-inset-bottom))',background:'#f8fcfa'}}>
      {button}
    </div>
  );
}
