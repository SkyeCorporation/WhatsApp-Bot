import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity, Bot, ChevronRight, CircleHelp, Clock3,
  Command, Database, KeyRound, LogOut, Menu, MessageCircle, Phone, QrCode,
  RefreshCw, Search, ShieldCheck, Users, X,
} from 'lucide-react';
import {
  getGetEsdeathDashboardQueryKey,
  getGetEsdeathSessionQueryKey,
  getListEsdeathCommandsQueryKey,
  getListEsdeathUsersQueryKey,
  useConnectEsdeathBot,
  useGetEsdeathDashboard,
  useGetEsdeathSession,
  useListEsdeathCommands,
  useListEsdeathUsers,
  useLoginEsdeath,
  useLogoutEsdeath,
} from '@workspace/api-client-react';
import type { EsdeathCommand, EsdeathDashboard, EsdeathUser } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import type { FormEvent, ReactNode } from 'react';
import './index.css';

const queryClient = new QueryClient();
type View = 'ringkasan' | 'pengguna' | 'perintah';

function formatDuration(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return days
    ? `${days}h ${hours}j ${minutes}m`
    : hours
      ? `${hours}j ${minutes}m`
      : minutes
        ? `${minutes}m ${remainingSeconds}d`
        : `${remainingSeconds} detik`;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('id-ID').format(amount);
}

function StatusPill({ status }: { status: EsdeathDashboard['status'] }) {
  const labels = {
    connecting: 'Menghubungkan',
    qr: 'Menunggu pemindaian',
    connected: 'Terhubung',
    disconnected: 'Terputus',
    error: 'Gangguan',
  };
  return (
    <span className={`status-pill status-${status}`} data-testid="status-bot">
      <span className="status-dot" />
      {labels[status]}
    </span>
  );
}

function LoginScreen() {
  const queryClientInstance = useQueryClient();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const login = useLoginEsdeath({
    mutation: {
      onSuccess: () => {
        setPassword('');
        setFormError('');
        void queryClientInstance.invalidateQueries({ queryKey: getGetEsdeathSessionQueryKey() });
      },
      onError: (error) => {
        setPassword('');
        setFormError(error instanceof Error ? error.message : 'Kata sandi tidak dapat diverifikasi. Coba lagi.');
      },
    },
  });
  useEffect(() => {
    if (login.isSuccess || login.isError) login.reset();
  }, [login.isSuccess, login.isError, login.reset]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const submittedPassword = password;
    setPassword('');
    if (!submittedPassword.trim()) {
      setFormError('Masukkan kata sandi administrator.');
      return;
    }
    login.mutate({ data: { password: submittedPassword } });
  }

  return (
    <main className="login-layout">
      <aside className="login-aside">
        <div className="brand-lockup">
          <span className="brand-mark"><Bot size={20} strokeWidth={1.8} /></span>
          <span>ESDEATH<span className="brand-light"> / OPS</span></span>
        </div>
        <div className="login-aside-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> RUANG KENDALI</div>
          <h1>Selalu dekat<br />dengan <em>kendali.</em></h1>
          <p>Panel operasi Esdeath untuk menjaga koneksi, pengguna, dan perintah tetap dalam jangkauan.</p>
        </div>
        <div className="aside-bottom">
          <div className="aside-orbit"><span /><span /><span /><div className="orbit-core"><Bot size={28} /></div></div>
          <div className="aside-meta"><span>ESDEATH BOT</span><span>VERSI OPERASIONAL · 01</span></div>
        </div>
      </aside>
      <section className="login-main">
        <div className="login-topline"><span>AKSES ADMINISTRATOR</span><span>01 / 01</span></div>
        <div className="login-form-wrap">
          <div className="login-icon"><KeyRound size={21} /></div>
          <div className="eyebrow">HALO, ADMINISTRATOR</div>
          <h2>Masuk ke<br />ruang kendali.</h2>
          <p className="login-intro">Gunakan kata sandi administrator untuk mengelola Esdeath.</p>
          <form onSubmit={submit} className="login-form">
            <input
              type="text"
              name="username"
              autoComplete="username"
              value="administrator"
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
            />
            <label htmlFor="admin-password">Kata sandi</label>
            <div className="password-field">
              <input
                id="admin-password"
                data-testid="input-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={login.isPending}
              />
              <button type="button" className="text-control" onClick={() => setShowPassword((value) => !value)} data-testid="button-toggle-password">
                {showPassword ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>
            {formError && <div className="form-error" role="alert" data-testid="text-login-error">{formError}</div>}
            <button className="button-primary login-submit" type="submit" disabled={login.isPending} data-testid="button-login">
              {login.isPending ? <><span className="button-spinner" /> Memeriksa akses...</> : <>Masuk ke dashboard <ChevronRight size={17} /></>}
            </button>
          </form>
          <div className="login-security"><ShieldCheck size={15} /> Sesi aman khusus administrator</div>
        </div>
        <footer className="login-footer"><span>ESDEATH CONTROL DECK</span><span>© 2026 · LUXION SKYE / DEMIAN</span></footer>
      </section>
    </main>
  );
}

function LoadingDashboard() {
  return (
    <div className="app-shell">
      <div className="sidebar skeleton-sidebar"><div className="skeleton-block" /><div className="skeleton-block short" /><div className="skeleton-block" /></div>
      <main className="main-area">
        <div className="skeleton-block skeleton-heading" /><div className="skeleton-block skeleton-wide" />
        <div className="skeleton-grid"><div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" /></div>
        <div className="skeleton-block skeleton-table" />
      </main>
    </div>
  );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="center-state" data-testid="state-dashboard-error">
      <div className="state-icon error-icon"><Activity size={22} /></div>
      <h2>Dashboard belum dapat dimuat</h2>
      <p>Periksa koneksi server, lalu coba muat ulang data.</p>
      <button className="button-primary" onClick={onRetry} data-testid="button-retry-dashboard"><RefreshCw size={15} /> Coba lagi</button>
    </div>
  );
}

function StatCard({ label, value, caption, icon: Icon, accent }: {
  label: string; value: string | number; caption: string; icon: typeof Users; accent?: string;
}) {
  return (
    <article className="stat-card" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="stat-top"><span>{label}</span><span className={`stat-icon ${accent ?? ''}`}><Icon size={17} /></span></div>
      <div className="stat-value">{value}</div>
      <div className="stat-caption">{caption}</div>
    </article>
  );
}

function QrPanel({ dashboard, onConnect, connecting }: {
  dashboard: EsdeathDashboard; onConnect: () => void; connecting: boolean;
}) {
  return (
    <section className="qr-panel">
      <div className="qr-copy">
        <div className="eyebrow">TAUTKAN PERANGKAT</div>
        <h2>{dashboard.status === 'qr' ? 'Satu pemindaian lagi.' : 'Hubungkan Esdeath.'}</h2>
        <p>Buka WhatsApp di ponsel, lalu pindai kode untuk mengaktifkan sesi bot.</p>
        {dashboard.status !== 'qr' && (
          <button onClick={onConnect} className="button-primary connect-button" disabled={connecting} data-testid="button-connect">
            {connecting ? <><span className="button-spinner" /> Memulai koneksi...</> : <><MessageCircle size={16} /> Mulai koneksi</>}
          </button>
        )}
        {dashboard.status === 'qr' && <div className="qr-instruction"><span className="instruction-number">01</span><span>WhatsApp → Perangkat tertaut → Tautkan perangkat</span></div>}
      </div>
      <div className="qr-visual">
        <div className="qr-frame">
          {dashboard.qrCodeDataUrl
            ? <img src={dashboard.qrCodeDataUrl} alt="Kode QR untuk menghubungkan WhatsApp" data-testid="img-qr-code" />
            : <div className="qr-placeholder"><QrCode size={54} strokeWidth={1.2} /><span>Kode QR akan muncul di sini</span></div>}
        </div>
        <span className="qr-caption">{dashboard.qrCodeDataUrl ? 'PINDAI DENGAN WHATSAPP' : 'MENUNGGU KODE QR'}</span>
      </div>
    </section>
  );
}

function UsersTable({ users, loading, error, retry }: {
  users: EsdeathUser[] | undefined; loading: boolean; error: boolean; retry: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = users?.filter((user) => `${user.name} ${user.nomor}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  if (loading) return <div className="table-loading"><span className="skeleton-block" /><span className="skeleton-block" /><span className="skeleton-block" /></div>;
  if (error) return <div className="inline-state"><p>Daftar pengguna gagal dimuat.</p><button className="text-control" onClick={retry}>Coba lagi</button></div>;
  return (
    <section className="data-panel">
      <div className="panel-heading">
        <div><div className="eyebrow">DIREKTORI</div><h2>Pengguna bot</h2><p>Pengguna WhatsApp yang tercatat oleh Esdeath.</p></div>
        <label className="search-box"><Search size={15} /><input aria-label="Cari pengguna" placeholder="Cari nama atau nomor" value={search} onChange={(event) => setSearch(event.target.value)} data-testid="input-search-users" />{search && <button onClick={() => setSearch('')} aria-label="Hapus pencarian"><X size={14} /></button>}</label>
      </div>
      {!users?.length ? (
        <div className="empty-state"><div className="state-icon"><Users size={20} /></div><h3>Belum ada pengguna</h3><p>Pengguna akan muncul di sini setelah berinteraksi dengan bot.</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state compact-empty"><p>Tidak ada pengguna yang cocok dengan “{search}”.</p></div>
      ) : (
        <div className="table-scroll"><table><thead><tr><th>PENGGUNA</th><th>NOMOR WHATSAPP</th><th>STATUS</th><th>SALDO</th></tr></thead>
          <tbody>{filtered.map((user) => <tr key={user.id} data-testid={`row-user-${user.id}`}>
            <td><div className="user-cell"><span className="user-avatar">{user.name.trim().charAt(0).toUpperCase() || '?'}</span><span>{user.name || 'Tanpa nama'}</span></div></td>
            <td className="mono-cell">{user.nomor}</td>
            <td><span className={`user-status ${user.status}`}>{user.status === 'banned' ? 'Diblokir' : 'Aktif'}</span>{user.status === 'banned' && user.bannedReason && <span className="ban-reason" title={user.bannedReason}>{user.bannedReason}</span>}</td>
            <td className="money-cell">{formatMoney(user.money)}</td>
          </tr>)}</tbody></table></div>
      )}
      <div className="panel-footnote"><span>{filtered.length} dari {users?.length ?? 0} pengguna</span><span>Data diperbarui otomatis</span></div>
    </section>
  );
}

function CommandsTable({ commands, loading, error, retry }: {
  commands: EsdeathCommand[] | undefined; loading: boolean; error: boolean; retry: () => void;
}) {
  const roles = ['Semua pengguna', 'Admin grup', 'Admin grup (level 2)', 'Moderator bot', 'Admin bot'];
  if (loading) return <div className="table-loading"><span className="skeleton-block" /><span className="skeleton-block" /><span className="skeleton-block" /></div>;
  if (error) return <div className="inline-state"><p>Daftar perintah gagal dimuat.</p><button className="text-control" onClick={retry}>Coba lagi</button></div>;
  return (
    <section className="data-panel">
      <div className="panel-heading">
        <div><div className="eyebrow">REFERENSI BOT</div><h2>Metadata perintah</h2><p>Daftar perintah dan aturan akses yang dikonfigurasi.</p></div>
        <span className="count-chip"><Command size={14} /> {commands?.length ?? 0} perintah</span>
      </div>
      {!commands?.length ? <div className="empty-state"><div className="state-icon"><Command size={20} /></div><h3>Belum ada perintah</h3><p>Metadata perintah akan tampil ketika tersedia dari server.</p></div> : (
        <div className="table-scroll"><table className="commands-table"><thead><tr><th>NAMA</th><th>DESKRIPSI</th><th>PENGGUNAAN</th><th>JEDA</th><th>AKSES</th></tr></thead>
          <tbody>{commands.map((command) => <tr key={command.name} data-testid={`row-command-${command.name}`}>
            <td><code className="command-name">/{command.name}</code></td><td className="description-cell">{command.description}</td>
            <td><code className="usage-code">{command.usage}</code></td><td className="mono-cell">{command.cooldown}s</td>
            <td><span className="role-chip">{roles[command.role] ?? `Level ${command.role}`}</span></td>
          </tr>)}</tbody></table></div>
      )}
      <div className="panel-footnote"><span>Konfigurasi server</span><span>Tanpa perubahan dari dashboard</span></div>
    </section>
  );
}

function Overview({ dashboard, users, commands, usersLoading, commandsLoading, usersError, commandsError, retryUsers, retryCommands, onConnect, connecting }: {
  dashboard: EsdeathDashboard; users?: EsdeathUser[]; commands?: EsdeathCommand[];
  usersLoading: boolean; commandsLoading: boolean; usersError: boolean; commandsError: boolean;
  retryUsers: () => void; retryCommands: () => void; onConnect: () => void; connecting: boolean;
}) {
  const isOnline = dashboard.status === 'connected';
  return (
    <>
      <section className="hero-status">
        <div className="hero-watermark"><Bot size={190} strokeWidth={0.45} /></div>
        <div className="hero-copy">
          <div className="eyebrow light-eyebrow">STATUS SISTEM <span className="live-indicator" /></div>
          <h2>{isOnline ? 'Esdeath sedang aktif.' : dashboard.status === 'error' ? 'Koneksi perlu perhatian.' : dashboard.status === 'connecting' ? 'Menyiapkan koneksi.' : 'Esdeath menunggu.'}</h2>
          <p>{isOnline ? 'Sesi WhatsApp tersambung dan bot siap menerima pesan.' : dashboard.status === 'error' ? dashboard.lastError || 'Terjadi kendala saat menjalankan koneksi bot.' : dashboard.status === 'connecting' ? 'Membangun sesi aman dengan WhatsApp.' : dashboard.status === 'qr' ? 'Pindai kode QR untuk menautkan perangkat WhatsApp.' : 'Hubungkan perangkat WhatsApp untuk memulai sesi bot.'}</p>
          <div className="hero-meta"><StatusPill status={dashboard.status} />{isOnline && dashboard.phoneNumber && <span className="phone-meta"><Phone size={14} /> {dashboard.phoneNumber}</span>}</div>
        </div>
        <div className="hero-side">
          <span className="hero-side-label">UPTIME SESI</span>
          <strong data-testid="text-uptime">{formatDuration(dashboard.uptimeSeconds)}</strong>
          <span className="hero-side-foot">{isOnline ? 'SESI BERJALAN' : 'SESI BELUM AKTIF'}</span>
        </div>
      </section>
      {(!isOnline || dashboard.status === 'qr') && <QrPanel dashboard={dashboard} onConnect={onConnect} connecting={connecting} />}
      {dashboard.status === 'error' && dashboard.lastError && <div className="error-banner"><Activity size={16} /><span>{dashboard.lastError}</span></div>}
      <div className="section-label"><span>GAMBARAN UMUM</span><span className="section-rule" /></div>
      <div className="stats-grid">
        <StatCard label="Total pengguna" value={dashboard.totalUsers.toLocaleString('id-ID')} caption="Terdaftar di Esdeath" icon={Users} />
        <StatCard label="Pengguna diblokir" value={dashboard.bannedUsers.toLocaleString('id-ID')} caption="Akses dibatasi" icon={ShieldCheck} accent="warning" />
        <StatCard label="Perintah tersedia" value={dashboard.totalCommands.toLocaleString('id-ID')} caption="Metadata terdaftar" icon={Command} accent="blue" />
      </div>
      <UsersTable users={users} loading={usersLoading} error={usersError} retry={retryUsers} />
      <CommandsTable commands={commands} loading={commandsLoading} error={commandsError} retry={retryCommands} />
    </>
  );
}

function AppDashboard() {
  const queryClientInstance = useQueryClient();
  const [view, setView] = useState<View>('ringkasan');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const dashboardQuery = useGetEsdeathDashboard({ query: { queryKey: getGetEsdeathDashboardQueryKey(), refetchInterval: 4000 } });
  const usersQuery = useListEsdeathUsers({ query: { queryKey: getListEsdeathUsersQueryKey(), refetchInterval: 15000 } });
  const commandsQuery = useListEsdeathCommands({ query: { queryKey: getListEsdeathCommandsQueryKey(), refetchInterval: 60000 } });
  const connect = useConnectEsdeathBot({
    mutation: {
      onMutate: () => setConnectError(''),
      onSuccess: () => {
        void queryClientInstance.invalidateQueries({ queryKey: getGetEsdeathDashboardQueryKey() });
      },
      onError: (error) => setConnectError(error instanceof Error ? error.message : 'Koneksi bot tidak dapat dimulai.'),
    },
  });
  const logout = useLogoutEsdeath({
    mutation: {
      onMutate: () => setLogoutError(''),
      onSuccess: () => {
        void queryClientInstance.invalidateQueries({ queryKey: getGetEsdeathSessionQueryKey() });
        void queryClientInstance.removeQueries({ queryKey: getGetEsdeathDashboardQueryKey() });
        void queryClientInstance.removeQueries({ queryKey: getListEsdeathUsersQueryKey() });
        void queryClientInstance.removeQueries({ queryKey: getListEsdeathCommandsQueryKey() });
      },
      onError: (error) => setLogoutError(error instanceof Error ? error.message : 'Sesi belum dapat diakhiri.'),
    },
  });
  const dashboard = dashboardQuery.data;
  const nav = [
    { id: 'ringkasan' as const, label: 'Ringkasan', icon: Activity },
    { id: 'pengguna' as const, label: 'Pengguna bot', icon: Users },
    { id: 'perintah' as const, label: 'Metadata perintah', icon: Command },
  ];

  if (dashboardQuery.isLoading && !dashboard) return <LoadingDashboard />;
  if (dashboardQuery.isError && !dashboard) return <DashboardError onRetry={() => void dashboardQuery.refetch()} />;
  if (!dashboard) return <DashboardError onRetry={() => void dashboardQuery.refetch()} />;

  function navigate(next: View) {
    setView(next);
    setMobileNavOpen(false);
  }
  function refreshAll() {
    void dashboardQuery.refetch();
    void usersQuery.refetch();
    void commandsQuery.refetch();
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand"><span className="brand-mark"><Bot size={19} /></span><span>ESDEATH<span className="brand-light"> / OPS</span></span></div>
        <div className="side-section-label">KENDALI</div>
        <nav className="side-nav" aria-label="Navigasi dashboard">
          {nav.map((item) => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)} data-testid={`nav-${item.id}`}>
            <item.icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{view === item.id && <span className="nav-active-mark" />}
          </button>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-connection"><span className="connection-glyph"><MessageCircle size={15} /></span><div><strong>WhatsApp</strong><span>{dashboard.status === 'connected' ? 'Sesi aktif' : 'Sesi tidak aktif'}</span></div><span className={`connection-dot ${dashboard.status === 'connected' ? 'on' : ''}`} /></div>
        <div className="sidebar-admin"><div className="admin-avatar">LS</div><div className="admin-copy"><strong>{dashboard.adminName || 'Luxion Skye/Demian'}</strong><span>Administrator</span></div><button className="logout-icon" onClick={() => logout.mutate()} disabled={logout.isPending} aria-label="Keluar dari dashboard" title="Keluar" data-testid="button-logout"><LogOut size={16} /></button></div>
        {mobileNavOpen && <button className="mobile-nav-dismiss" aria-label="Tutup navigasi" onClick={() => setMobileNavOpen(false)}><X size={18} /></button>}
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Buka navigasi" data-testid="button-mobile-menu"><Menu size={19} /></button>
          <div className="breadcrumb"><span>Esdeath</span><ChevronRight size={14} /><strong>{nav.find((item) => item.id === view)?.label}</strong></div>
          <div className="topbar-actions"><span className="updated-label"><span className="live-indicator" /> LIVE</span><button className="icon-button" onClick={refreshAll} aria-label="Segarkan data" title="Segarkan data" data-testid="button-refresh"><RefreshCw size={16} /></button><button className="icon-button help-button" title="Tentang dashboard" onClick={() => window.alert('Esdeath Ops — panel operasi bot WhatsApp.')} aria-label="Tentang dashboard"><CircleHelp size={16} /></button></div>
        </header>
        <div className="page-content">
          <div className="page-heading"><div><div className="eyebrow">PANEL OPERASI <span className="heading-divider">/</span> {dashboard.botName.toUpperCase()}</div><h1>{view === 'ringkasan' ? 'Ruang kendali' : view === 'pengguna' ? 'Pengguna bot' : 'Metadata perintah'}</h1><p>{view === 'ringkasan' ? 'Pantau kesehatan dan aktivitas bot WhatsApp Anda.' : view === 'pengguna' ? 'Telusuri pengguna yang tercatat oleh Esdeath.' : 'Lihat daftar perintah, jeda, dan aturan akses.'}</p></div><div className="page-time"><Clock3 size={14} /> PEMANTAUAN AKTIF</div></div>
          {dashboardQuery.isError && <div className="stale-warning"><Activity size={15} /> Data status belum berhasil diperbarui. Menampilkan data terakhir yang tersedia.</div>}
          {logoutError && <div className="error-banner"><Activity size={15} /><span>{logoutError}</span></div>}
          {connectError && <div className="error-banner"><Activity size={15} /><span>{connectError}</span></div>}
          {view === 'ringkasan' && <Overview dashboard={dashboard} users={usersQuery.data} commands={commandsQuery.data} usersLoading={usersQuery.isLoading} commandsLoading={commandsQuery.isLoading} usersError={usersQuery.isError} commandsError={commandsQuery.isError} retryUsers={() => void usersQuery.refetch()} retryCommands={() => void commandsQuery.refetch()} onConnect={() => connect.mutate()} connecting={connect.isPending} />}
          {view === 'pengguna' && <UsersTable users={usersQuery.data} loading={usersQuery.isLoading} error={usersQuery.isError} retry={() => void usersQuery.refetch()} />}
          {view === 'perintah' && <CommandsTable commands={commandsQuery.data} loading={commandsQuery.isLoading} error={commandsQuery.isError} retry={() => void commandsQuery.refetch()} />}
          <footer className="page-footer"><span>ESDEATH CONTROL DECK</span><span><Database size={12} /> SINKRONISASI OTOMATIS</span></footer>
        </div>
      </main>
    </div>
  );
}

function Home() {
  const sessionQuery = useGetEsdeathSession({ query: { queryKey: getGetEsdeathSessionQueryKey(), retry: false } });
  if (sessionQuery.isLoading) return <div className="auth-loading"><div className="loading-mark"><Bot size={20} /></div><span>Memeriksa sesi administrator</span><div className="loading-track"><span /></div></div>;
  if (sessionQuery.isError) return <main className="session-error"><div className="state-icon error-icon"><Activity size={20} /></div><h1>Sesi tidak dapat diperiksa</h1><p>Pastikan server dashboard tersedia, lalu periksa kembali.</p><button className="button-primary" onClick={() => void sessionQuery.refetch()} data-testid="button-retry-session"><RefreshCw size={15} /> Periksa lagi</button></main>;
  return sessionQuery.data?.authenticated ? <AppDashboard /> : <LoginScreen />;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
