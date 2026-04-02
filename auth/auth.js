/* ═══════════════════════════════════════════════
   AUTH — Agência Doze
   Clerk v5 com data-clerk-publishable-key:
   window.Clerk já é uma instância, não uma classe.
   ═══════════════════════════════════════════════ */

window.addEventListener('load', async function () {
  const cfg = window.DOZE_CONFIG;
  if (!cfg) { console.error('[auth] config.js não carregou.'); return; }

  // ── 1. SUPABASE ────────────────────────────────
  let supabase = null;
  if (cfg.supabaseUrl.startsWith('https://') && window.supabase) {
    supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    window._supabase = supabase;
  }

  // ── 2. CLERK ───────────────────────────────────
  // Com data-clerk-publishable-key, window.Clerk é uma instância pronta.
  if (typeof window.Clerk === 'undefined') {
    console.error('[auth] Clerk não carregou.');
    return;
  }

  try {
    await window.Clerk.load();
  } catch (err) {
    console.error('[auth] Erro ao carregar Clerk:', err);
    return;
  }

  const clerk = window.Clerk;

  // ── 3. UI ──────────────────────────────────────
  function updateUI() {
    const user = clerk.user;
    const isSignedIn = !!user;

    document.body.classList.toggle('auth-signed-in', isSignedIn);
    document.body.classList.toggle('auth-signed-out', !isSignedIn);

    const loginBtn  = document.getElementById('auth-login-btn');
    const userMenu  = document.getElementById('auth-user-menu');
    const avatar    = document.getElementById('auth-avatar');
    const label     = document.getElementById('auth-user-label');
    const emailEl   = document.getElementById('auth-dropdown-email');
    const adminLink = document.getElementById('auth-admin-link');

    if (isSignedIn) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (userMenu) userMenu.style.display = 'flex';
      if (avatar && user.imageUrl) avatar.src = user.imageUrl;

      const email = user.emailAddresses?.[0]?.emailAddress || '';
      const nome  = user.firstName || email.split('@')[0] || 'Conta';
      if (label)   label.textContent  = nome;
      if (emailEl) emailEl.textContent = email;

      const isAdmin = cfg.adminEmails.includes(email);
      if (adminLink) adminLink.style.display = isAdmin ? 'flex' : 'none';

    } else {
      if (loginBtn) loginBtn.style.display = 'inline-flex';
      if (userMenu) userMenu.style.display = 'none';
    }
  }

  clerk.addListener(() => updateUI());
  updateUI();

  // ── 4. BOTÃO LOGIN ─────────────────────────────
  function openLogin() {
    clerk.openSignIn({
      afterSignInUrl: window.location.href,
      afterSignUpUrl: window.location.href,
    });
  }

  const loginBtn = document.getElementById('auth-login-btn');
  if (loginBtn) loginBtn.addEventListener('click', openLogin);

  const lockBtn = document.getElementById('budget-lock-btn');
  if (lockBtn) lockBtn.addEventListener('click', openLogin);

  // ── 5. SIGN OUT ────────────────────────────────
  const signoutBtn = document.getElementById('auth-signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', async () => {
      await clerk.signOut();
      document.getElementById('auth-dropdown')?.classList.remove('open');
    });
  }

  // ── 6. DROPDOWN ────────────────────────────────
  const userMenu = document.getElementById('auth-user-menu');
  if (userMenu) {
    userMenu.addEventListener('click', (e) => {
      if (e.target.closest('#auth-signout-btn')) return;
      document.getElementById('auth-dropdown')?.classList.toggle('open');
    });
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#auth-user-menu')) {
      document.getElementById('auth-dropdown')?.classList.remove('open');
    }
  });

  // ── 7. HOOK genQuote ───────────────────────────
  const _origGenQuote = window.genQuote;
  if (typeof _origGenQuote === 'function') {
    window.genQuote = function () {
      _origGenQuote();
      if (clerk.user && supabase) saveOrcamento();
    };
  }

  async function saveOrcamento() {
    const user  = clerk.user;
    const email = user.emailAddresses?.[0]?.emailAddress || '';

    const clientEl = document.getElementById('mClient');
    const itemEls  = [...document.querySelectorAll('#mItems .m-item')];
    const totalEl  = document.getElementById('mTotal');
    if (!clientEl || !itemEls.length || !totalEl) return;

    const items = itemEls.map(el => ({
      nome:  el.querySelector('.m-item-n')?.textContent || '',
      preco: el.querySelector('.m-item-p')?.textContent || '',
    }));
    const totalRaw = totalEl.textContent
      .replace('R$', '').replace(/\./g, '').replace(',', '.').trim();

    const { error } = await supabase.from('orcamentos').insert({
      user_id:     user.id,
      user_email:  email,
      user_name:   [user.firstName, user.lastName].filter(Boolean).join(' '),
      client_name: clientEl.textContent.replace('Para: ', '').trim(),
      items,
      total:       parseFloat(totalRaw) || 0,
      status:      'novo',
    });

    if (!error) {
      const toast = document.getElementById('orcamento-toast');
      if (toast) {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
      }
    } else {
      console.error('[auth] Erro ao salvar orçamento:', error);
    }
  }
});
