import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/Profile.css';

// Simple UK postcode validator (broad coverage, case-insensitive)
const isUkPostcode = (pc) =>
  !!String(pc || '')
    .trim()
    .toUpperCase()
    .match(
      /^(GIR\s?0AA|BFPO\s?\d{1,4}|(ASCN|STHL|TDCU|BBND|BIQQ|FIQQ|GX11|PCRN|SIQQ|TKCA)\s?1ZZ|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/
    );

const EditDrawer = ({ open, onClose, user, onSaved }) => {
  const [form, setForm] = useState({
    name: user?.name || user?.fullName || '',
    mobile: user?.mobile || user?.phone || '',
    dob: (user?.dob || user?.dateOfBirth || '').toString().substring(0, 10),

    addressLine1: user?.addressLine1 || '',
    addressLine2: user?.addressLine2 || '',
    city: user?.city || '',
    county: user?.county || '',
    postcode: user?.postcode || '',
    country: user?.country || 'United Kingdom',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        name: user?.name || user?.fullName || '',
        mobile: user?.mobile || user?.phone || '',
        dob: (user?.dob || user?.dateOfBirth || '').toString().substring(0, 10),

        addressLine1: user?.addressLine1 || '',
        addressLine2: user?.addressLine2 || '',
        city: user?.city || '',
        county: user?.county || '',
        postcode: user?.postcode || '',
        country: user?.country || 'United Kingdom',
      });
      setError('');
    }
  }, [open, user]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    if (!form.name.trim()) return 'Name is required';
    if (form.mobile && !/^\+?[0-9\-() ]{7,15}$/.test(form.mobile))
      return 'Mobile looks invalid';
    if (form.dob && isNaN(new Date(form.dob).getTime()))
      return 'DOB is not a valid date';

    // Address validation (light but useful)
    if (form.addressLine1 && !form.city)
      return 'Town/City is required when Address Line 1 is provided';
    if (form.addressLine1 && !form.postcode)
      return 'Postcode is required when Address Line 1 is provided';
    if (form.postcode && !isUkPostcode(form.postcode))
      return 'Please enter a valid UK postcode (e.g., SW1A 1AA)';
    return '';
  };

  const save = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        mobile: form.mobile || null,
        dob: form.dob || null,

        addressLine1: form.addressLine1 || null,
        addressLine2: form.addressLine2 || null,
        city: form.city || null,
        county: form.county || null,
        postcode: form.postcode ? form.postcode.toUpperCase().replace(/\s+/g, ' ').trim() : null,
        country: form.country || 'United Kingdom',
      };
      const res = await api.put('/api/auth/me', payload);
      const updated = res.data?.user || res.data;
      onSaved(updated);
      onClose();
    } catch (e) {
      setError('Save failed. Please try again.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="drawer-header">
          <h3>Edit Profile</h3>
          <button className="icon-btn" onClick={onClose} title="Close">✕</button>
        </div>
        <div className="drawer-body">
          {error && <div className="alert">{error}</div>}

          <label className="field">
            <span>Name</span>
            <input name="name" value={form.name} onChange={onChange} placeholder="Your full name" />
          </label>

          <div className="grid two">
            <label className="field">
              <span>Mobile</span>
              <input name="mobile" value={form.mobile} onChange={onChange} placeholder="+44 7700 900123" />
            </label>
            <label className="field">
              <span>Date of Birth</span>
              <input name="dob" type="date" value={form.dob || ''} onChange={onChange} />
            </label>
          </div>

          <h4 className="subhead">Address (UK)</h4>
          <label className="field">
            <span>Address Line 1</span>
            <input name="addressLine1" value={form.addressLine1} onChange={onChange} placeholder="Flat 4, 10 High Street" />
          </label>
          <label className="field">
            <span>Address Line 2 (optional)</span>
            <input name="addressLine2" value={form.addressLine2} onChange={onChange} placeholder="District / Locality" />
          </label>

          <div className="grid two">
            <label className="field">
              <span>Town / City</span>
              <input name="city" value={form.city} onChange={onChange} placeholder="London" />
            </label>
            <label className="field">
              <span>County (optional)</span>
              <input name="county" value={form.county} onChange={onChange} placeholder="Greater London" />
            </label>
          </div>

          <div className="grid two">
            <label className="field">
              <span>Postcode</span>
              <input name="postcode" value={form.postcode} onChange={onChange} placeholder="SW1A 1AA" />
            </label>
            <label className="field">
              <span>Country</span>
              <input name="country" value={form.country} onChange={onChange} placeholder="United Kingdom" />
            </label>
          </div>
        </div>

        <div className="drawer-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
      {open && <div className="backdrop" onClick={onClose} />}
    </>
  );
};

const Profile = () => {
  const [user, setUser] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const toDate = (v) => {
    if (!v) return '—';
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    (async () => {
      try {
        setFetching(true);
        const res = await api.get('/api/auth/me');
        const u = res.data?.user || res.data;
        setUser(u || null);
        setError(u ? '' : 'No user profile returned.');
      } catch (e) {
        console.error(e);
        setError('Unable to load profile. Please login again.');
      } finally {
        setFetching(false);
      }
    })();
  }, [navigate]);

  if (fetching) {
    return (
      <div className="profile-wrap">
        <div className="card skeleton">
          <div className="avatar skeleton-block" />
          <div className="skeleton-line lg" />
          <div className="skeleton-line" />
          <div className="grid two">
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-wrap">
        <div className="card error">
          <h2>Profile</h2>
          <p>{error}</p>
          <div className="btn-row">
            <Link to="/login" className="btn primary">Go to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const name = user.name || user.fullName || '—';
  const email = user.email || '—';
  const role = (user.role || localStorage.getItem('role') || '').toString().toLowerCase() || 'user';
  const mobile = user.mobile || user.phone || '—';
  const dob = (user.dob || user.dateOfBirth) ? toDate(user.dob || user.dateOfBirth).split(',')[0] : '—';
  const initials = name.split(' ').filter(Boolean).map(s => s[0]?.toUpperCase()).slice(0,2).join('') || 'U';

  const overview = [
    ['ID', user.id ?? user.userId ?? '—'],
    ['Name', name],
    ['Email', email],
    ['Mobile', mobile],
    ['Date of Birth', dob],
    ['Role', role],
    ['Created', toDate(user.createdAt)],
    ['Updated', toDate(user.updatedAt)],
  ];

  const address = [
    ['Address Line 1', user.addressLine1 || '—'],
    ['Address Line 2', user.addressLine2 || '—'],
    ['Town / City', user.city || '—'],
    ['County', user.county || '—'],
    ['Postcode', user.postcode || '—'],
    ['Country', user.country || 'United Kingdom'],
  ];

  const onSaved = (updated) => setUser(updated);

  return (
    <div className="profile-wrap">
      <div className="card">
        <div className="header">
          <div className="avatar">{initials}</div>
          <div className="head-txt">
            <h2>{name}</h2>
            <div className={`role ${role}`}>{role}</div>
            <div className="muted">{email}</div>
          </div>
          <div className="header-actions">
            <button className="btn" onClick={() => window.location.reload()}>Refresh</button>
            <button className="btn primary" onClick={() => setDrawerOpen(true)}>Edit Profile</button>
          </div>
        </div>

        <div className="section">
          <h3>Overview</h3>
          <div className="grid two">
            {overview.map(([k, v]) => (
              <div className="kv" key={k}>
                <div className="k">{k}</div>
                <div className="v">{String(v)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h3>Address (UK)</h3>
          <div className="grid two">
            {address.map(([k, v]) => (
              <div className="kv" key={k}>
                <div className="k">{k}</div>
                <div className="v">{String(v)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="section foot">
          <Link to="/orders" className="btn primary">View Order History</Link>
          <Link to="/menu" className="btn">Back to Menu</Link>
        </div>
      </div>

      <EditDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        onSaved={onSaved}
      />
    </div>
  );
};

export default Profile;
