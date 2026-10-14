/* ==========================================================================
   MossyWoss OS — Icon System (pure CSS tiles: no emoji, no SVG, no images)
   Creative monogram tiles with deterministic gradients + geometric accents.
   ========================================================================== */
(function(MWO) {
  'use strict';

  var CURATED = {
    // system
    'os':        { t: 'MW', g: ['#2e7d4f', '#1b4d33'], a: 'notch' },
    'files':     { t: 'FL', g: ['#4c8dff', '#2456b8'], a: 'bar' },
    'browser':   { t: 'BR', g: ['#38bdf8', '#1d6fa3'], a: 'chev' },
    'store':     { t: 'ST', g: ['#34d399', '#0f766e'], a: 'dot' },
    'settings':  { t: 'SE', g: ['#94a3b8', '#475569'], a: 'dot' },
    'terminal':  { t: 'TE', g: ['#1f2937', '#0b1220'], a: 'bar' },
    'recycle':   { t: 'RB', g: ['#a3a3a3', '#525252'], a: 'bar' },
    'mossy-ai':  { t: 'AI', g: ['#8b5cf6', '#5b21b6'], a: 'dot' },
    'publisher': { t: 'PB', g: ['#4ade80', '#166534'], a: 'chev' },
    'security':  { t: 'SG', g: ['#ef4444', '#7f1d1d'], a: 'notch' },
    'lock':      { t: 'LK', g: ['#64748b', '#1e293b'], a: 'notch' },
    'update':    { t: 'UP', g: ['#60a5fa', '#1e40af'], a: 'chev' },
    'info':      { t: 'IN', g: ['#7dd3fc', '#0369a1'], a: 'dot' },
    'clock':     { t: 'CL', g: ['#fbbf24', '#b45309'], a: 'dot' },
    'notepad':   { t: 'NP', g: ['#fde68a', '#a16207'], a: 'bar' },
    'calculator':{ t: 'CA', g: ['#d1d5db', '#374151'], a: 'bar' },
    'calendar':  { t: 'CD', g: ['#f472b6', '#9d174d'], a: 'bar' },
    'contacts':  { t: 'CT', g: ['#fb923c', '#9a3412'], a: 'dot' },
    // dev
    'code':      { t: 'CS', g: ['#818cf8', '#3730a3'], a: 'chev' },
    'c-code':    { t: 'C+', g: ['#60a5fa', '#1e3a8a'], a: 'chev' },
    'visual':    { t: 'VB', g: ['#f472b6', '#831843'], a: 'dot' },
    'animation': { t: 'AN', g: ['#22d3ee', '#0e7490'], a: 'chev' },
    'video':     { t: 'VM', g: ['#f87171', '#7f1d1d'], a: 'bar' },
    'maker':     { t: 'MK', g: ['#a78bfa', '#4c1d95'], a: 'notch' },
    // media
    'camera':    { t: 'CM', g: ['#6b7280', '#111827'], a: 'dot' },
    'recorder':  { t: 'RC', g: ['#f43f5e', '#881337'], a: 'dot' },
    'music':     { t: 'MU', g: ['#c084fc', '#6b21a8'], a: 'chev' },
    'paint':     { t: 'PA', g: ['#f0abfc', '#86198f'], a: 'dot' },
    'photos':    { t: 'PH', g: ['#fdba74', '#c2410c'], a: 'notch' },
    // games
    'games':     { t: 'GM', g: ['#fb7185', '#9f1239'], a: 'notch' },
    'arcade':    { t: 'AR', g: ['#facc15', '#854d0e'], a: 'chev' },
    'puzzle':    { t: 'PZ', g: ['#4ade80', '#14532d'], a: 'notch' },
    'racing':    { t: 'RA', g: ['#f97316', '#7c2d12'], a: 'bar' },
    'strategy':  { t: 'SR', g: ['#f59e0b', '#78350f'], a: 'dot' },
    'word':      { t: 'WD', g: ['#34d399', '#065f46'], a: 'bar' },
    'board':     { t: 'BD', g: ['#fca5a5', '#991b1b'], a: 'bar' },
    'voxel':     { t: 'VX', g: ['#65a30d', '#365314'], a: 'notch' },
    'vr':        { t: 'VR', g: ['#2dd4bf', '#134e4a'], a: 'chev' },
    'survival':  { t: 'SV', g: ['#a16207', '#451a03'], a: 'dot' },
    // social
    'aura':      { t: 'AU', g: ['#e879f9', '#701a75'], a: 'chev' },
    'chat':      { t: 'CH', g: ['#38bdf8', '#075985'], a: 'dot' },
    'roleplay':  { t: 'RP', g: ['#c026d3', '#4a044e'], a: 'notch' },
    'world':     { t: 'WL', g: ['#86efac', '#14532d'], a: 'bar' }
  };

  function hashKey(key) {
    var h = 0;
    for (var i = 0; i < key.length; i++) { h = (h * 31 + key.charCodeAt(i)) >>> 0; }
    return h;
  }

  function specFor(key) {
    var s = CURATED[key];
    if (s) return s;
    // deterministic fallback: derive gradient + accent from the key itself
    var h = hashKey(key);
    var h1 = h % 360, h2 = (h1 + 40 + (h % 80)) % 360;
    var letters = (key.replace(/[^a-zA-Z0-9]/g, '') || 'app').slice(0, 2).toUpperCase();
    var accents = ['bar', 'dot', 'notch', 'chev'];
    return {
      t: letters,
      g: ['hsl(' + h1 + ',62%,46%)', 'hsl(' + h2 + ',68%,26%)'],
      a: accents[h % accents.length]
    };
  }

  function injectStyles() {
    if (document.getElementById('mwi-styles')) return;
    var st = document.createElement('style');
    st.id = 'mwi-styles';
    st.textContent =
      '.mwi-tile{position:relative;display:inline-flex;align-items:center;justify-content:center;' +
      'border-radius:22%;font-weight:800;letter-spacing:0.02em;color:#fff;' +
      'background:linear-gradient(140deg,var(--mwi-g1),var(--mwi-g2));' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,0.28),0 1px 3px rgba(0,0,0,0.35);' +
      'text-shadow:0 1px 1px rgba(0,0,0,0.25);overflow:hidden;flex:none;user-select:none}' +
      '.mwi-tile::after{content:"";position:absolute;inset:0;' +
      'background:linear-gradient(115deg,rgba(255,255,255,0.22) 0 18%,transparent 40%)}' +
      '.mwi-acc-bar::before{content:"";position:absolute;left:0;right:0;bottom:0;height:22%;' +
      'background:rgba(255,255,255,0.30)}' +
      '.mwi-acc-dot::before{content:"";position:absolute;top:14%;right:14%;width:18%;height:18%;' +
      'border-radius:50%;background:rgba(255,255,255,0.38)}' +
      '.mwi-acc-notch::before{content:"";position:absolute;top:0;left:0;width:34%;height:34%;' +
      'background:rgba(255,255,255,0.20);' +
      'clip-path:polygon(0 0,100% 0,0 100%)}' +
      '.mwi-acc-chev::before{content:"";position:absolute;bottom:16%;left:16%;width:38%;height:20%;' +
      'background:rgba(255,255,255,0.32);' +
      'clip-path:polygon(0 0,33% 100%,66% 0,100% 100%);transform:scaleY(0.6)}';
    document.head.appendChild(st);
  }

  /** Create an icon tile DOM element for a key.
   *  key: any string (curated names get designed tiles, others get
   *  deterministic derived tiles). size: px (default 34). */
  MWO.Icon = {
    tile: function(key, size) {
      injectStyles();
      var spec = specFor(String(key || 'app'));
      var el = document.createElement('span');
      el.className = 'mwi-tile mwi-acc-' + spec.a;
      var s = (typeof size === 'number') ? size : 34;
      el.style.width = s + 'px';
      el.style.height = s + 'px';
      el.style.fontSize = Math.max(9, Math.round(s * 0.34)) + 'px';
      el.style.setProperty('--mwi-g1', spec.g[0]);
      el.style.setProperty('--mwi-g2', spec.g[1]);
      el.textContent = spec.t;
      el.setAttribute('data-icon-key', key);
      return el;
    },
    /** Same tile as an HTML string (for innerHTML contexts). */
    tileHTML: function(key, size) {
      injectStyles();
      var spec = specFor(String(key || 'app'));
      var s = (typeof size === 'number') ? size : 34;
      return '<span class="mwi-tile mwi-acc-' + spec.a + '" style="width:' + s + 'px;height:' + s +
        'px;font-size:' + Math.max(9, Math.round(s * 0.34)) + 'px;--mwi-g1:' + spec.g[0] +
        ';--mwi-g2:' + spec.g[1] + '">' + spec.t + '</span>';
    }
  };
})(MWO);
