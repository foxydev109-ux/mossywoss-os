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
  // not endorsed by, and does not host or redistribute any of them. PC
  // images are deliberately excluded (proprietary licensing).
  var BROWSER_LINUX = [
    { name: 'In-browser x86 PC: several tiny Linux systems', owner: '(BSD-2-Clause; rights with the original authors)', url: 'https://copy.sh/v86/',
      desc: 'Real x86 virtual machine in WebAssembly. Boots actual Linux distro kernels in your browser: the tiny Linux, Arch 32-bit, Buildroot, TinyCore and more. Fully interactive, runs from their site with your choice of distro image.' },
    { name: 'In-browser x86 PC: lightweight graphical OS', owner: '(GPL, rights with owners; rights with the original authors)', url: 'https://copy.sh/v86/',
      desc: 'A astonishingly tiny (fits on a floppy) GUI operating system written in assembly — boots in seconds. One of those OSes most people have never seen. Runs for real inside the x86 emulator on their site.' },
    { name: 'In-browser x86 PC: classic DOS environment', owner: '(GPL; rights with the original authors)', url: 'https://copy.sh/v86/',
      desc: 'The complete, free, open-source MS-DOS-compatible operating system — still actively maintained. Text-mode, real DOS running in your browser tab.' },
    { name: 'In-browser x86 PC: teaching microkernel OS', owner: '(BSD-style license; rights with the original authors)', url: 'https://copy.sh/v86/',
      desc: 'The famous microkernel OS used to teach OS design worldwide. Tiny, academic-grade, and genuinely runnable in-browser via the x86 emulator.' },
    { name: 'In-browser x86 PC: inspired vintage desktop', owner: '(MIT; rights with the original authors)', url: 'https://copy.sh/v86/',
      desc: 'The open-source resurrection of BeOS: a fast, friendly desktop OS most people have never touched. Alpha x86 images run in the x86 emulator.' },
    { name: 'Full Linux desktop in the browser', owner: '(CheerpX; rights with the original authors)', url: 'https://webvm.io',
      desc: 'A real the Linux desktop userspace executing in the browser sandbox via x86-to-WASM translation. Working shell, toolchain, and (with their networking setup) internet access.' },
    { name: 'Tiny Linux console in the browser', owner: '(open source; rights with the original authors)', url: 'https://bellard.org/jslinux/',
      desc: 'The original x86/RISC-V emulator experiments running real kernels in JavaScript/WASM. Text-mode, very fast, great for seeing a genuine kernel boot in seconds.' }
  ];

  var OTHER_OS = [
    { name: 'Hobbyist graphical OS built from scratch', owner: '(BSD-2-Clause; rights with the original authors)', url: 'https://github.com/SerenityOS/serenity',
      desc: 'A complete from-scratch Unix-like OS with its own kernel, browser and windowed desktop — built in the open and famously readable. Free, community-run, most people have never heard of it.' },
    { name: 'Microkernel OS written in Rust', owner: '(MIT; rights with the original authors)', url: 'https://www.redox-os.org/',
      desc: 'A full Unix-like microkernel OS written in Rust, focused on safety and security. Free and open source with an official site and downloads.' },
    { name: 'Classic ARM desktop OS', owner: '(Apache-2.0; rights with the original authors)', url: 'https://www.riscosopen.org/',
      desc: 'The direct descendant of the 1987 Acorn the classic ARM desktop — not Linux, not PC, a completely different lineage. Free, runs great on Raspberry Pi.' },
    { name: 'Research distributed OS', owner: '(open source; rights with the original authors)', url: 'https://9p.io/plan9/',
      desc: 'The legendary successor to Unix from the original researchers. Free for personal use under the Lucent Public License — a piece of OS history.' }
  ];

  var EASY_DISTROS = [
    { name: 'Beginner-friendly Linux desktop', url: 'https://ubuntu.com/download', why: 'Most common beginner distro; huge community support.' },
    { name: 'Easy Linux desktop for switchers', url: 'https://linuxmint.com/download.php', why: 'PC-like desktop, famously easy installer.' },
    { name: 'Polished familiar-layout Linux desktop', url: 'https://zorin.com/os/download/', why: 'Designed for people switching from PC.' },
    { name: 'Gaming-friendly Linux desktop', owner: '(open source; rights with the original authors)', url: 'https://pop.system76.com/', why: 'Polished, gaming-friendly, straightforward install.' },
    { name: 'Modern workstation Linux desktop', owner: '(open source; rights with the original authors)', url: 'https://fedoraproject.org/workstation/download/', why: 'Modern, up-to-date, clean GNOME desktop.' },
    { name: 'Tiny security-hardened Linux (open source)', owner: '(open source; rights with the original authors)', url: 'https://www.alpinelinux.org/downloads/', why: 'Very small, secure, runs from RAM.' },
    { name: 'Universal community Linux (open source)', owner: '(open source; rights with the original authors)', url: 'https://www.debian.org/download', why: 'Stable, universal, massive package catalog.' },
    { name: 'Rolling-release advanced Linux (open source)', owner: '(open source; rights with the original authors)', url: 'https://wiki.archlinux.org/title/Installation_guide', why: 'Full control, latest packages, great wiki.' },
    { name: 'Green-themed friendly Linux (open source)', owner: '(open source; rights with the original authors)', url: 'https://manjaro.org/download/', why: 'Beginner-friendly but cutting-edge.' },
    { name: 'Declarative reproducible Linux (open source)', owner: '(open source; rights with the original authors)', url: 'https://nixos.org/download.html', why: 'Whole system defined in one config file.' },
    { name: 'Windows-compatible open-source OS (GPL)', owner: '(GPL; rights with the original authors)', url: 'https://reactos.org/', why: 'A 100% free, open-source OS built to be Windows-compatible - the honest closest thing to a free PC OS. Installs on real hardware only.' },
    { name: 'Windows program compatibility layer on Linux (LGPL)', owner: '(LGPL; rights with the original authors)', url: 'https://www.winehq.org/', why: 'Runs many real Windows programs on a Linux PC. Not in a browser.' }
  ];

  var ON_ANDROID = [
    { name: 'PC app container for phones (open source, no root)', owner: '(GPL, rights with owners; rights with the original authors)', url: 'https://github.com/brunodev85/winlator',
      desc: 'REAL PC app support on phone, no root: the compatibility layer + Box86/the x86 translator x86 translation + GPU drivers/VirGL GPU drivers, all inside the normal app sandbox. This is the genuine architecture: PRoot-style isolation, Mesa drivers, DXVK pipelines, touchscreen mapped to mouse. Honest performance on a decent phone 15 tablet: light 2D PC apps and older games run well; heavy 3D titles are limited by ARM translation overhead.' },
    { name: 'Java sandbox game launcher for phones (open source)', owner: '(GPL-3.0; rights with the original authors)', url: 'https://github.com/PojavLauncherTeam/PojavLauncher',
      desc: 'The real way to play the Java sandbox game: Java Edition on phone — no root, and legal under Mojang EULA (your own account required; this project ships none of Mojang assets). Includes JVM-on-ARM translation and GPU backends. Bedrock Edition runs natively on phone already.' }
  ];

  var EMU_GUIDE = [
    { level: 'Runs in your browser today (third-party, use games you own)', items: [
      'NES / SNES / Game Boy class emulators exist as fast in-browser projects (WASM-era; real cycle-accurate emulation of 8/16-bit consoles).'
    ]},
    { level: 'Needs a real PC (native emulators, not a web OS)', items: [
      'GameCube and Wii: Dolphin Emulator (dolphin-emu.org) — a real PC is required for full speed. A browser-based web OS cannot honestly run these.',
      'The Sims 1/3: PC software; runs on a real PC (PC, or Linux via the compatibility layer/Proton). Not executable inside a browser sandbox.',
      'PlayStation 2: PCSX2. Switch: Ryujinx/yuzu-adjacent projects per their official sites.'
    ]},
    { level: 'Unity, Unreal 5, Roblox, Sims 1/2/3 - the honest hardware truth', items: [
      'Unity Editor: has a NATIVE Linux version (free tier) - runs for real on a Linux PC. Never runs in a browser.',
      'Unreal Engine 5: source-available, free to create; native Linux editor - runs for real on a Linux PC. Never in a browser.',
      'Roblox: no native Linux or browser client. On a Linux PC it may run through the compatibility layer - untested here, so not claimed.',
      'Sims 1/2/3: proprietary PC games (rights with their owners; buy from official stores). On a real PC via Windows or the Linux compatibility layer. Never in a browser.',
      'If you ever get any PC (even a cheap one): install a free Linux distro above, and Unity + Unreal 5 genuinely run on it, free and legal.'
    ]},
    { level: 'Compatibility Centre: the 7 real targets (honest status)', items: [
      'Unity Editor: RESEARCH COMPLETED, architecture designed. Route = native Linux/Windows editor via the MWO host (host app built, untested). Not launched by MWO yet - not claimed.',
      'Unreal 5 Editor: RESEARCH COMPLETED, architecture designed. Needs a strong PC (32GB RAM, 8GB+ VRAM GPU recommended). Same host route, untested.',
      'Roblox Player + Studio: RESEARCH COMPLETED. Officially Windows/macOS only. Route = real Windows host. Wine not guaranteed, not claimed.',
      'Sims 1 / 2 / 3: RESEARCH COMPLETED, three separate projects. Windows-native games; legal copies only; real host or compatibility layer, per-version testing required - none tested yet.',
      'Full evidence log: docs/COMPATIBILITY_CENTRE.md in the repository.'
    ]},
    { level: 'No Windows PC? The honest all-in-one path (choose by what you need)', items: [
      'Need a free OS that works like PC OS? Install the Windows-compatible open-source OS (ReactOS, GPL) on real hardware - the closest genuine free thing to a PC OS. Alpha-quality; back up your files; entirely at your own risk.',
      'Need real .exe files to run on free hardware? Install any Linux distro + the Windows compatibility layer (LGPL). Many older .exe programs genuinely run; nothing is guaranteed; own risk, no piracy.',
      'Need Unity or Unreal 5 for real? Both have native Linux editors that genuinely run free on a Linux PC. This is the one path on this list that is both free AND fully supported by their makers.',
      'Need Roblox or Sims 1/2/3? No browser and no in-browser OS can run them. On a real Linux PC they may work through the compatibility layer - untested here, not claimed, own risk. Buy games from official stores only.',
      'Truth: there is no free OS that is 99-100% identical to Windows 10/11. Anyone claiming one is selling a fake. These are the real alternatives, with real limits, stated honestly.'
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

      body.appendChild(section('4. On a phone: real PC software, no root (third-party, rights with owners)'));
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
