/* ==========================================================================
   MossyWoss OS — OS Lab
   Honest boot-alternative: MossyWoss OS is its own full OS (not Linux).
   This lab launches REAL third-party "Linux in a browser" projects and
   catalogs official, easier distro downloads for real PCs. All trademarks
   and rights belong to their respective owners; MWO is not affiliated
   with, endorsed by, or distributing any of them. Nothing here touches or
   modifies the user's device — every launch is a sandboxed browser tab.
   ========================================================================== */
(function(MWO) {
  'use strict';

  // Every entry is a REAL, free/open-source project that runs at its owner's
  // site in your browser. Rights belong to their owners; MWO is not affiliated,
  // not endorsed by, and does not host or redistribute any of them. Windows
  // images are deliberately excluded (proprietary licensing).
  var BROWSER_LINUX = [
    { name: 'v86 — Alpine, Arch, Buildroot, TinyCore, more', owner: 'Fabian Hemmer (BSD-2-Clause)', url: 'https://copy.sh/v86/',
      desc: 'Real x86 virtual machine in WebAssembly. Boots actual Linux distro kernels in your browser: Alpine, Arch 32-bit, Buildroot, TinyCore and more. Fully interactive, runs from their site with your choice of distro image.' },
    { name: 'v86 — KolibriOS', owner: 'KolibriOS project (GPL, rights with owners)', url: 'https://copy.sh/v86/',
      desc: 'A astonishingly tiny (fits on a floppy) GUI operating system written in assembly — boots in seconds. One of those OSes most people have never seen. Runs for real inside v86 on their site.' },
    { name: 'v86 — FreeDOS', owner: 'FreeDOS project (GPL)', url: 'https://copy.sh/v86/',
      desc: 'The complete, free, open-source MS-DOS-compatible operating system — still actively maintained. Text-mode, real DOS running in your browser tab.' },
    { name: 'v86 — Minix 3', owner: 'Minix 3 project (BSD-style license)', url: 'https://copy.sh/v86/',
      desc: 'The famous microkernel OS used to teach OS design worldwide. Tiny, academic-grade, and genuinely runnable in-browser via v86.' },
    { name: 'v86 — Haiku (BeOS-lineage)', owner: 'Haiku project (MIT)', url: 'https://copy.sh/v86/',
      desc: 'The open-source resurrection of BeOS: a fast, friendly desktop OS most people have never touched. Alpha x86 images run in v86.' },
    { name: 'WebVM — full Debian', owner: 'Leaning Technologies (CheerpX)', url: 'https://webvm.io',
      desc: 'A real Debian userspace executing in the browser sandbox via x86-to-WASM translation. Working shell, toolchain, and (with their networking setup) internet access.' },
    { name: 'JSLinux', owner: 'Fabian Hemmer', url: 'https://bellard.org/jslinux/',
      desc: 'The original x86/RISC-V emulator experiments running real kernels in JavaScript/WASM. Text-mode, very fast, great for seeing a genuine kernel boot in seconds.' }
  ];

  var OTHER_OS = [
    { name: 'SerenityOS', owner: 'SerenityOS project (BSD-2-Clause)', url: 'https://github.com/SerenityOS/serenity',
      desc: 'A complete from-scratch Unix-like OS with its own kernel, browser and windowed desktop — built in the open and famously readable. Free, community-run, most people have never heard of it.' },
    { name: 'Redox OS', owner: 'Redox OS project (MIT)', url: 'https://www.redox-os.org/',
      desc: 'A full Unix-like microkernel OS written in Rust, focused on safety and security. Free and open source with an official site and downloads.' },
    { name: 'RISC OS Open', owner: 'RISC OS Open (Apache-2.0)', url: 'https://www.riscosopen.org/',
      desc: 'The direct descendant of the 1987 Acorn RISC OS — not Linux, not Windows, a completely different lineage. Free, runs great on Raspberry Pi.' },
    { name: 'Plan 9 from Bell Labs', owner: 'Bell Labs / Lucent Public License', url: 'https://9p.io/plan9/',
      desc: 'The legendary successor to Unix from the original researchers. Free for personal use under the Lucent Public License — a piece of OS history.' }
  ];

  var EASY_DISTROS = [
    { name: 'Ubuntu', url: 'https://ubuntu.com/download', why: 'Most common beginner distro; huge community support.' },
    { name: 'Linux Mint', url: 'https://linuxmint.com/download.php', why: 'Windows-like desktop, famously easy installer.' },
    { name: 'Zorin OS', url: 'https://zorin.com/os/download/', why: 'Designed for people switching from Windows.' },
    { name: 'Pop!_OS', owner: 'System76', url: 'https://pop.system76.com/', why: 'Polished, gaming-friendly, straightforward install.' },
    { name: 'Fedora Workstation', owner: 'Red Hat sponsored project', url: 'https://fedoraproject.org/workstation/download/', why: 'Modern, up-to-date, clean GNOME desktop.' }
  ];

  var ON_ANDROID = [
    { name: 'Winlator', owner: 'Winlator project (GPL, rights with owners)', url: 'https://github.com/brunodev85/winlator',
      desc: 'REAL Windows app support on Android, no root: Wine + Box86/Box64 x86 translation + Turnip/Zink/VirGL GPU drivers, all inside the normal app sandbox. This is the genuine architecture: PRoot-style isolation, Mesa drivers, DXVK pipelines, touchscreen mapped to mouse. Honest performance on a decent Android 15 tablet: light 2D PC apps and older games run well; heavy 3D titles are limited by ARM translation overhead.' },
    { name: 'PojavLauncher', owner: 'PojavLauncherTeam (GPL-3.0)', url: 'https://github.com/PojavLauncherTeam/PojavLauncher',
      desc: 'The real way to play Minecraft: Java Edition on Android — no root, and legal under Mojang EULA (your own account required; this project ships none of Mojang assets). Includes JVM-on-ARM translation and GPU backends. Bedrock Edition runs natively on Android already.' }
  ];

  var EMU_GUIDE = [
    { level: 'Runs in your browser today (third-party, use games you own)', items: [
      'NES / SNES / Game Boy class emulators exist as fast in-browser projects (WASM-era; real cycle-accurate emulation of 8/16-bit consoles).'
    ]},
    { level: 'Needs a real PC (native emulators, not a web OS)', items: [
      'GameCube and Wii: Dolphin Emulator (dolphin-emu.org) — a real PC is required for full speed. A browser-based web OS cannot honestly run these.',
      'The Sims 1/3: Windows software; runs on a real PC (Windows, or Linux via Wine/Proton). Not executable inside a browser sandbox.',
      'PlayStation 2: PCSX2. Switch: Ryujinx/yuzu-adjacent projects per their official sites.'
    ]},
    { level: 'Rules that always apply', items: [
      'Only use emulators with games you legally own. Piracy is not supported, enabled or linked here.',
      'Every project named above belongs to its owners; MossyWoss OS is not affiliated with any of them.'
    ]}
  ];

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function section(title) {
    var h = el('div', 'll-h', title);
    return h;
  }

  function launchBtn(url) {
    var b = el('button', 'll-btn', 'Launch official site in new tab');
    b.onclick = function() {
      window.open(url, '_blank', 'noopener');
      MWO.notif && MWO.notif.show('Linux Lab', 'Opened ' + url + ' — it runs on their site, in your browser sandbox.');
    };
    return b;
  }

  MWO.registerApp({
    id: 'linux-lab',
    name: 'OS Lab',
    icon: 'linux',
    width: 640, height: 520,
    category: 'system',
    description: 'Boot real Linux & other open-source OSes in your browser (third-party), or pick an easy distro for a real PC',
    installed: true,
    launch: function() {
      const body = document.createElement('div');
      body.style.cssText = 'padding:16px;overflow:auto;color:var(--text,#e8e8e8);height:100%';
      const container = body;
      body.style.overflow = 'auto';
      body.style.color = 'var(--text, #e8e8e8)';

      var intro = el('div', 'll-intro');
      intro.style.cssText = 'background:var(--card,#1e2431);border:1px solid var(--border,#2c3346);border-radius:10px;padding:12px;margin-bottom:14px;font-size:0.92em;line-height:1.5';
      intro.textContent = 'MossyWoss OS is its own complete OS — it is not Linux and does not contain a Linux kernel. ' +
        'If you want real Linux, this lab launches genuine third-party Linux-in-a-browser projects (their rights, ' +
        'their sites, your browser sandbox — nothing installs to or touches your device), and lists easier official ' +
        'distro downloads for real PCs. Not affiliated with, endorsed by, or distributing any project below.';
      body.appendChild(intro);

      body.appendChild(section('1. Real Linux, right now, in your browser'));
      BROWSER_LINUX.forEach(function(d) {
        var card = el('div', 'll-card');
        card.style.cssText = 'background:var(--card,#1e2431);border:1px solid var(--border,#2c3346);border-radius:10px;padding:12px;margin:8px 0';
        var t = el('div', '', d.name); t.style.cssText = 'font-weight:700;font-size:1.02em';
        var o = el('div', '', 'Rights: ' + d.owner); o.style.cssText = 'opacity:0.65;font-size:0.8em;margin:2px 0 6px';
        var de = el('div', '', d.desc); de.style.cssText = 'font-size:0.88em;line-height:1.45;margin-bottom:8px';
        card.appendChild(t); card.appendChild(o); card.appendChild(de); card.appendChild(launchBtn(d.url));
        body.appendChild(card);
      });

      body.appendChild(section('2. More free open-source OSes you have probably never seen (official sites, rights with owners)'));
      OTHER_OS.forEach(function(d) {
        var card = el('div', 'll-card');
        card.style.cssText = 'background:var(--card,#1e2431);border:1px solid var(--border,#2c3346);border-radius:10px;padding:12px;margin:8px 0';
        var t = el('div', '', d.name); t.style.cssText = 'font-weight:700;font-size:1.02em';
        var o = el('div', '', 'Rights: ' + d.owner); o.style.cssText = 'opacity:0.65;font-size:0.8em;margin:2px 0 6px';
        var de = el('div', '', d.desc); de.style.cssText = 'font-size:0.88em;line-height:1.45;margin-bottom:8px';
        card.appendChild(t); card.appendChild(o); card.appendChild(de); card.appendChild(launchBtn(d.url));
        body.appendChild(card);
      });

      body.appendChild(section('3. Easier Linux for a real PC (official downloads, rights with owners)'));
      var list = el('div'); list.style.margin = '6px 0 14px';
      EASY_DISTROS.forEach(function(d) {
        var row = el('div', 'll-row');
        row.style.cssText = 'display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--border,#2c3346);border-radius:8px;margin:6px 0;align-items:center;background:var(--card,#1e2431)';
        var left = el('div');
        var n = el('div', '', d.name); n.style.fontWeight = '600';
        var w = el('div', '', d.why); w.style.cssText = 'font-size:0.8em;opacity:0.7';
        left.appendChild(n); left.appendChild(w);
        row.appendChild(left); row.appendChild(launchBtn(d.url));
        list.appendChild(row);
      });
      body.appendChild(list);

      body.appendChild(section('4. On Android: real PC software, no root (third-party, rights with owners)'));
      ON_ANDROID.forEach(function(d) {
        var card = el('div', 'll-card');
        card.style.cssText = 'background:var(--card,#1e2431);border:1px solid var(--border,#2c3346);border-radius:10px;padding:12px;margin:8px 0';
        var t = el('div', '', d.name); t.style.cssText = 'font-weight:700;font-size:1.02em';
        var o = el('div', '', 'Rights: ' + d.owner); o.style.cssText = 'opacity:0.65;font-size:0.8em;margin:2px 0 6px';
        var de = el('div', '', d.desc); de.style.cssText = 'font-size:0.88em;line-height:1.45;margin-bottom:8px';
        card.appendChild(t); card.appendChild(o); card.appendChild(de); card.appendChild(launchBtn(d.url));
        body.appendChild(card);
      });

      body.appendChild(section('5. Emulators, honestly'));
      EMU_GUIDE.forEach(function(g) {
        var h = el('div', '', g.level);
        h.style.cssText = 'font-weight:600;font-size:0.9em;margin:10px 0 4px';
        body.appendChild(h);
        g.items.forEach(function(it) {
          var p = el('div', '', '- ' + it);
          p.style.cssText = 'font-size:0.85em;line-height:1.45;opacity:0.85;margin:3px 0';
          body.appendChild(p);
        });
      });

      var disc = el('div', '',
        'Trademarks and rights for every project, distro and emulator named here belong to their respective owners. ' +
        'MossyWoss OS makes no claim of affiliation or endorsement and hosts none of their content. ' +
        'Emulate only what you own. Nothing here can brick or modify any device — all launches are ordinary browser tabs.');
      disc.style.cssText = 'margin-top:14px;padding:10px;border-radius:8px;background:var(--card,#1e2431);border:1px solid var(--border,#2c3346);font-size:0.78em;opacity:0.75;line-height:1.45';
      body.appendChild(disc);
      MWO.wm.create({ id: 'linux-lab', title: 'OS Lab', icon: 'linux', width: 640, height: 520, content: container });
    }
  });
})(MWO);
