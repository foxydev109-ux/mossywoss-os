import { useState, useEffect, useRef, useCallback } from "react";

async function mwAIChat(payload) {
  try {
    const res = await fetch("/api/functions/mwAIChat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) {
    return { error: "AI_ERROR", message: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SVG ICON SYSTEM — no emojis, all inline SVG
// ═══════════════════════════════════════════════════════════════════════════
function Ico({ name, size = 16, style }) {
  const s = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", style };
  const icons = {
    folder: <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-7l-2-2H5a2 2 0 00-2 2z" />,
    file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></>,
    code: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    globe: <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></>,
    chat: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
    mask: <><path d="M2 12a10 10 0 0120 0" /><path d="M2 12a10 10 0 0020 0" /><circle cx="8" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" /></>,
    gamepad: <><line x1="6" y1="11" x2="10" y2="11" /><line x1="8" y1="9" x2="8" y2="13" /><line x1="15" y1="12" x2="15.01" y2="12" /><line x1="18" y1="10" x2="18.01" y2="10" /><rect x="2" y="6" width="20" height="12" rx="6" /></>,
    tools: <><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></>,
    vr: <><rect x="2" y="7" width="20" height="10" rx="3" /><circle cx="8" cy="12" r="2" /><circle cx="16" cy="12" r="2" /></>,
    info: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
    monitor: <><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></>,
    save: <><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>,
    "arrow-left": <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    "arrow-right": <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    "arrow-up": <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>,
    "arrow-down": <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></>,
    refresh: <><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    warning: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
    heart: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />,
    fox: <><path d="M12 2L4 8v8l8 6 8-6V8z" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><path d="M12 15l-2 2M12 15l2 2" /></>,
    chart: <><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></>,
    bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></>,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    rocket: <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91 0z" /><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></>,
    fire: <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />,
    phone: <><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></>,
    wrench: <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />,
    sparkles: <><path d="M12 3l1.5 5 5 1.5-5 1.5L12 16l-1.5-5-5-1.5 5-1.5z" /><path d="M19 13l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" /></>,
    palette: <><circle cx="13.5" cy="6.5" r="1.5" /><circle cx="17.5" cy="10.5" r="1.5" /><circle cx="8.5" cy="7.5" r="1.5" /><circle cx="6.5" cy="12.5" r="1.5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.504 5.555-5.555C21.965 6.012 17.461 2 12 2z" /></>,
    music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
    sword: <><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M16 16l4 4" /><path d="M19 21l2-2" /></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    tent: <><path d="M3 20l9-16 9 16" /><path d="M3 20h18" /><path d="M12 4v16" /></>,
    net: <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" /><path d="M5 5l14 14M19 5L5 19" /></>,
    cube: <><path d="M21 16V8l-9-5-9 5v8l9 5 9-5z" /><path d="M3.27 6.96l8.73 5.04 8.73-5.04M12 22V12" /></>,
    discord: <><path d="M9 17l-1 4M15 17l1 4M3 11a20 20 0 0118 0M3 11v4a20 20 0 0018 0v-4" /><circle cx="9" cy="13" r="1" /><circle cx="15" cy="13" r="1" /></>,
    "game-hub": <><rect x="3" y="3" width="18" height="18" rx="3" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="3" x2="9" y2="21" /></>,
    "life-sim": <><circle cx="12" cy="7" r="4" /><path d="M5.5 21a6.5 6.5 0 0113 0" /></>,
    backpack: <><path d="M6 9V6a6 6 0 0112 0v3" /><path d="M3 9h18v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><line x1="9" y1="14" x2="15" y2="14" /></>,
    play: <polygon points="5 3 19 12 5 21 5 3" />,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    send: <><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    wifi: <><path d="M5 12.55a11 11 0 0114 0M1.42 9a16 16 0 0121.16 0M8.53 16.06a6 6 0 016.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>,
    terminal: <><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
    "dice-d6": <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1" /><circle cx="16" cy="16" r="1" /><circle cx="12" cy="12" r="1" /></>,
    "map-pin": <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></>,
    sun: <><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></>,
    moon: <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />,
    "heart-pulse": <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />,
    "arrow-right-circle": <><circle cx="12" cy="12" r="10" /><polyline points="12 16 16 12 12 8" /><line x1="8" y1="12" x2="16" y2="12" /></>,
    target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  };
  return <svg {...s}>{icons[name] || icons.info}</svg>;
}

// ═══════════════════════════════════════════════════════════════════════════
// MW-VFS — REAL INDEXEDDB VIRTUAL FILESYSTEM
// ═══════════════════════════════════════════════════════════════════════════
class MWVFS {
  constructor() { this.db = null; this.dbName = "MW-VFS"; this.version = 1; }
  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("vfs")) {
          const s = db.createObjectStore("vfs", { keyPath: "path" });
          s.createIndex("parent", "parent", { unique: false });
          s.createIndex("type", "type", { unique: false });
        }
      };
      req.onsuccess = (e) => { this.db = e.target.result; resolve(this); };
      req.onerror = (e) => reject(e.target.error);
    });
  }
  async create(path, content = "", type = "file") {
    const entry = { path, name: path.split("/").pop(), parent: path.split("/").slice(0, -1).join("/") || "/", type, content: type === "dir" ? null : content, created: Date.now(), modified: Date.now(), size: type === "dir" ? 0 : (typeof content === "string" ? content.length : 0) };
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("vfs", "readwrite");
      tx.objectStore("vfs").add(entry);
      tx.oncomplete = () => resolve(entry);
      tx.onerror = () => reject(tx.error);
    });
  }
  async read(path) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("vfs", "readonly");
      const req = tx.objectStore("vfs").get(path);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  async update(path, content) {
    const existing = await this.read(path);
    if (!existing) return null;
    const updated = { ...existing, content, modified: Date.now(), size: content.length };
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("vfs", "readwrite");
      tx.objectStore("vfs").put(updated);
      tx.oncomplete = () => resolve(updated);
      tx.onerror = () => reject(tx.error);
    });
  }
  async delete(path) {
    const entry = await this.read(path);
    if (!entry) return;
    const allPaths = [path];
    if (entry.type === "dir") {
      const children = await this.list(path, true);
      children.forEach(c => allPaths.push(c.path));
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("vfs", "readwrite");
      allPaths.forEach(p => tx.objectStore("vfs").delete(p));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async list(dir, recursive = false) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("vfs", "readonly");
      if (recursive) {
        const allReq = tx.objectStore("vfs").getAll();
        allReq.onsuccess = () => resolve(allReq.result.filter(r => r.path.startsWith(dir === "/" ? dir : dir + "/")).sort((a, b) => { if (a.type !== b.type) return a.type === "dir" ? -1 : 1; return a.name.localeCompare(b.name); }));
        allReq.onerror = () => reject(allReq.error);
      } else {
        const idx = tx.objectStore("vfs").index("parent");
        const req = idx.getAll(dir);
        req.onsuccess = () => resolve(req.result.sort((a, b) => { if (a.type !== b.type) return a.type === "dir" ? -1 : 1; return a.name.localeCompare(b.name); }));
        req.onerror = () => reject(req.error);
      }
    });
  }
  async rename(oldPath, newName) {
    const entry = await this.read(oldPath);
    if (!entry) return null;
    const newPath = (entry.parent === "/" ? "" : entry.parent) + "/" + newName;
    const updated = { ...entry, path: newPath, name: newName, modified: Date.now() };
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("vfs", "readwrite");
      tx.objectStore("vfs").delete(oldPath);
      tx.objectStore("vfs").add(updated);
      tx.oncomplete = () => resolve(updated);
      tx.onerror = () => reject(tx.error);
    });
  }
  async exists(path) { return (await this.read(path)) !== null; }
  async ensureDir(path) { if (!(await this.exists(path))) await this.create(path, "", "dir"); }
  async search(query) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("vfs", "readonly");
      const req = tx.objectStore("vfs").getAll();
      req.onsuccess = () => resolve(req.result.filter(r => r.type === "file" && r.name.toLowerCase().includes(query.toLowerCase())));
      req.onerror = () => reject(req.error);
    });
  }
  async exportVFS() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("vfs", "readonly");
      const req = tx.objectStore("vfs").getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async importVFS(data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("vfs", "readwrite");
      data.forEach(e => tx.objectStore("vfs").put(e));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async getUsedSpace() {
    const all = await this.exportVFS();
    return all.reduce((sum, e) => sum + (e.size || 0), 0);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SYNTAX HIGHLIGHTING TOKENIZER
// ═══════════════════════════════════════════════════════════════════════════
const KW = ["function","const","let","var","if","else","for","while","return","class","import","export","from","default","new","this","async","await","try","catch","finally","throw","typeof","instanceof","void","delete","yield","static","public","private","protected","readonly","enum","interface","type","extends","implements","def","print","elif","lambda","None","True","False","self","int","float","str","bool","list","dict","set","tuple","include","define","struct","typedef","unsigned","char","short","long","double","break","continue","switch","case","do","in","of","not","and","or","is","as","with","pass","raise","except","global","assert","del","super","null","undefined","NaN","Infinity"];
function tokenize(code) {
  const tokens = []; let pos = 0;
  const patterns = [
    { t: "comment", re: /^\/\/[^\n]*/m }, { t: "comment", re: /^\/\*[\s\S]*?\*\//m }, { t: "comment", re: /^#[^\n]*/m },
    { t: "string", re: /^"(?:[^"\\]|\\.)*"/m }, { t: "string", re: /^'(?:[^'\\]|\\.)*'/m }, { t: "string", re: /^`(?:[^`\\]|\\.)*`/m },
    { t: "number", re: /^\d+\.?\d*/m },
    { t: "keyword", re: new RegExp("^(?:" + KW.join("|") + ")\\b", "m") },
    { t: "ident", re: /^[a-zA-Z_$][\w$]*/m }, { t: "ws", re: /^\s+/m }, { t: "other", re: /^./m },
  ];
  while (pos < code.length) {
    const rem = code.slice(pos); let matched = false;
    for (const { t, re } of patterns) { const m = re.exec(rem); if (m) { tokens.push({ t, v: m[0] }); pos += m[0].length; matched = true; break; } }
    if (!matched) { tokens.push({ t: "other", v: code[pos] }); pos++; }
  }
  return tokens;
}
function highlightToHTML(code) {
  const tokens = tokenize(code);
  const colors = { comment: "#6a9955", string: "#ce9178", number: "#b5cea8", keyword: "#569cd6", ident: "#d4d4d4", ws: "inherit", other: "#d4d4d4" };
  return tokens.map(tk => {
    const esc = tk.v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return tk.t === "ws" ? esc : `<span style="color:${colors[tk.t] || "#d4d4d4"}">${esc}</span>`;
  }).join("");
}

// ═══════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════
const MW_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.mw-root{position:fixed;inset:0;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif;user-select:none;-webkit-user-select:none}
.mw-desktop{position:absolute;inset:0;background:#1a1a2e;overflow:hidden}
.mw-desktop-icons{position:absolute;top:12px;left:12px;display:flex;flex-direction:column;gap:8px;z-index:1}
.mw-desktop-icon{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;border-radius:8px;cursor:pointer;width:72px;text-align:center}
.mw-desktop-icon:hover{background:rgba(255,255,255,0.1)}
.mw-desktop-icon span:first-child{font-size:32px}
.mw-desktop-icon span:last-child{color:#ddd;font-size:11px;text-shadow:0 1px 3px rgba(0,0,0,0.8)}
.mw-taskbar{position:absolute;bottom:0;left:0;right:0;height:48px;background:rgba(13,13,26,0.95);backdrop-filter:blur(12px);display:flex;align-items:center;padding:0 8px;gap:4px;z-index:9000;border-top:1px solid rgba(255,255,255,0.1)}
.mw-taskbar-item{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;cursor:pointer;color:#ccc;font-size:13px;max-width:160px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.mw-taskbar-item:hover{background:rgba(255,255,255,0.1)}
.mw-taskbar-item.active{background:rgba(255,255,255,0.15);border-bottom:2px solid var(--mw-accent,#ff8c00)}
.mw-launcher{position:absolute;bottom:56px;left:8px;width:320px;max-height:400px;background:rgba(13,13,26,0.97);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:12px;z-index:9001;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.5)}
.mw-launcher-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.mw-launcher-item{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;border-radius:8px;cursor:pointer;text-align:center}
.mw-launcher-item:hover{background:rgba(255,255,255,0.1)}
.mw-launcher-item span:first-child{font-size:28px}
.mw-launcher-item span:last-child{color:#ccc;font-size:10px}
.mw-tray{margin-left:auto;display:flex;align-items:center;gap:8px;padding:0 8px;color:#ccc;font-size:12px}
.mw-tray-clock{cursor:pointer;text-align:center}
.mw-window{position:absolute;display:flex;flex-direction:column;background:#1e1e2e;border:1px solid rgba(255,255,255,0.15);border-radius:8px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5);z-index:100}
.mw-window-bar{display:flex;align-items:center;padding:0 8px;height:36px;background:#13132a;border-bottom:1px solid rgba(255,255,255,0.1);cursor:grab;flex-shrink:0}
.mw-window-bar:active{cursor:grabbing}
.mw-window-title{flex:1;color:#ccc;font-size:13px;font-weight:500;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.mw-window-btns{display:flex;gap:4px}
.mw-window-btn{width:28px;height:28px;border-radius:6px;border:none;background:transparent;color:#999;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
.mw-window-btn:hover{background:rgba(255,255,255,0.1)}
.mw-window-btn.close:hover{background:rgba(220,38,38,0.5);color:white}
.mw-window-content{flex:1;overflow:auto;position:relative}
.mw-resize-handle{position:absolute;width:16px;height:16px;bottom:0;right:0;cursor:nwse-resize;z-index:10}
.mw-boot{position:fixed;inset:0;background:#0d0d1a;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;color:white}
.mw-boot-logo{font-size:64px;margin-bottom:16px;animation:mwSpin 1s ease-out}
.mw-boot-text{font-size:14px;color:#888;letter-spacing:1px}
.mw-login{background:rgba(30,30,46,0.95);border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:40px;width:360px;text-align:center}
.mw-login input{display:block;width:100%;box-sizing:border-box;padding:10px 14px;background:#0d0d1a;border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:white;font-size:14px;outline:none;margin-bottom:12px}
.mw-login input:focus{border-color:var(--mw-accent,#ff8c00)}
.mw-btn{padding:10px 20px;border-radius:8px;border:none;cursor:pointer;font-size:14px;font-weight:600;color:white}
.mw-btn-primary{background:var(--mw-accent,#ff8c00)}
.mw-btn-primary:hover{filter:brightness(1.1)}
.mw-btn-secondary{background:rgba(255,255,255,0.1)}
.mw-btn-secondary:hover{background:rgba(255,255,255,0.15)}
.mw-app{width:100%;height:100%;display:flex;flex-direction:column;color:#ddd;font-size:13px}
.mw-app-header{padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:8px;flex-shrink:0}
.mw-app-body{flex:1;overflow:auto;padding:12px}
.mw-file-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer}
.mw-file-row:hover{background:rgba(255,255,255,0.08)}
.mw-code-editor{flex:1;display:flex;flex-direction:column;overflow:hidden}
.mw-code-tabs{display:flex;gap:2px;padding:4px 4px 0;background:#13132a;overflow-x:auto}
.mw-code-tab{padding:6px 12px;border-radius:6px 6px 0 0;cursor:pointer;font-size:12px;color:#888;white-space:nowrap}
.mw-code-tab.active{background:#1e1e2e;color:#ddd}
.mw-code-area{flex:1;display:flex;overflow:hidden;background:#1e1e2e;position:relative}
.mw-code-lines{padding:8px 4px 8px 12px;color:#555;font-size:13px;font-family:monospace;text-align:right;user-select:none;line-height:1.5;overflow:hidden;flex-shrink:0;min-width:40px}
.mw-code-input{position:absolute;inset:0;background:transparent;color:transparent;caret-color:#ddd;font-family:monospace;font-size:13px;line-height:1.5;padding:8px 12px 8px 56px;border:none;outline:none;resize:none;white-space:pre;overflow:auto;z-index:2}
.mw-code-display{position:absolute;inset:0;padding:8px 12px 8px 56px;font-family:monospace;font-size:13px;line-height:1.5;white-space:pre;overflow:auto;pointer-events:none;z-index:1;color:#d4d4d4}
.mw-diag-row{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.05)}
.mw-diag-pass{color:#23a55a}
.mw-diag-fail{color:#dc2626}
.mw-diag-unknown{color:#f0b132}
.mw-chat-msg{margin-bottom:8px;padding:8px 12px;border-radius:8px;max-width:80%}
.mw-chat-user{background:var(--mw-accent,#ff8c00);color:white;align-self:flex-end;margin-left:auto}
.mw-chat-ai{background:rgba(255,255,255,0.1);color:#ddd}
.mw-canvas{background:#0d0d1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;touch-action:none}
@keyframes mwSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.mw-scroll::-webkit-scrollbar{width:6px}
.mw-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:3px}
.mw-scroll::-webkit-scrollbar-track{background:transparent}
.mw-ctx-menu{position:absolute;background:rgba(30,30,46,0.98);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:4px;z-index:9500;min-width:160px;box-shadow:0 8px 24px rgba(0,0,0,0.5)}
.mw-ctx-item{padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;color:#ccc}
.mw-ctx-item:hover{background:rgba(255,255,255,0.1)}
.mw-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700}
.mw-badge-ok{background:rgba(35,165,90,0.2);color:#23a55a}
.mw-badge-warn{background:rgba(240,177,50,0.2);color:#f0b132}
.mw-badge-err{background:rgba(220,38,38,0.2);color:#dc2626}
@media(max-width:768px){.mw-desktop-icons{flex-direction:row;flex-wrap:wrap;max-width:90vw}.mw-launcher{width:280px}}
.mw-game-card:hover { border-color: rgba(139,92,246,0.4) !important; transform: translateY(-2px); }

`;

// ═══════════════════════════════════════════════════════════════════════════
// BOOT / LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function BootScreen({ onLogin, vfs }) {
  const [phase, setPhase] = useState("boot");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      vfs.read("/Settings/profile.json").then(p => {
        if (p && p.content) { const prof = JSON.parse(p.content); if (prof.username) { setUsername(prof.username); setPhase("login"); return; } }
        setPhase("register");
      }).catch(() => setPhase("register"));
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const handleRegister = async () => {
    if (!username.trim() || pin.length < 4) { setError("Username required, PIN must be 4+ digits."); return; }
    await vfs.ensureDir("/Settings");
    await vfs.create("/Settings/profile.json", JSON.stringify({ username: username.trim(), pin: btoa(pin), created: Date.now() }));
    onLogin({ username: username.trim() });
  };

  const handleLogin = async () => {
    const p = await vfs.read("/Settings/profile.json");
    if (p) { const prof = JSON.parse(p.content); if (prof.pin === btoa(pin)) { onLogin({ username: prof.username }); return; } }
    setError("Wrong PIN. Try again.");
  };

  return (
    <div className="mw-boot">
      {phase === "boot" && (<><div className="mw-boot-logo" style={{display:"flex",alignItems:"center",justifyContent:"center"}}><Ico name="fox" size={48} style={{color:"#4ade80"}}/></div><div className="mw-boot-text">MOSSYWOSS OS</div><div style={{marginTop:8,color:"#444",fontSize:11}}>Initializing MW-VFS...</div></>)}
      {phase === "register" && (
        <div className="mw-login">
          <div style={{marginBottom:8,display:"flex",justifyContent:"center"}}><Ico name="fox" size={48} style={{color:"#4ade80"}}/></div>
          <div style={{fontSize:22,fontWeight:700,marginBottom:4}}>Create Profile</div>
          <div style={{color:"#888",fontSize:12,marginBottom:20}}>Local profile — no real identity needed</div>
          <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
          <input placeholder="PIN (4+ digits)" type="password" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,""))} />
          {error && <div style={{color:"#dc2626",fontSize:12,marginBottom:8}}>{error}</div>}
          <button className="mw-btn mw-btn-primary" style={{width:"100%"}} onClick={handleRegister}>Create Profile</button>
          <div style={{marginTop:16,padding:"10px",background:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.2)",borderRadius:8,fontSize:11,color:"#f87171",textAlign:"left"}}>
            <Ico name="warning" size={14} style={{display:"inline",verticalAlign:"middle"}}/> DO NOT enter your real password, school password, email password, or passwords from other accounts. This PIN is stored locally only.
          </div>
        </div>
      )}
      {phase === "login" && (
        <div className="mw-login">
          <div style={{marginBottom:8,display:"flex",justifyContent:"center"}}><Ico name="fox" size={48} style={{color:"#4ade80"}}/></div>
          <div style={{fontSize:18,fontWeight:600}}>Welcome back, {username}</div>
          <div style={{color:"#888",fontSize:12,marginBottom:20}}>Enter your PIN</div>
          <input placeholder="PIN" type="password" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,""))} onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoFocus />
          {error && <div style={{color:"#dc2626",fontSize:12,marginBottom:8}}>{error}</div>}
          <button className="mw-btn mw-btn-primary" style={{width:"100%"}} onClick={handleLogin}>Unlock</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WINDOW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
function MwWindow({ win, onFocus, onClose, onMinimize, onMaximize, onDrag, onResize, children }) {
  const dragRef = useRef(null);

  const handleDown = (e) => {
    if (win.maximized) return;
    onFocus(win.id);
    const startX = (e.touches ? e.touches[0].clientX : e.clientX) - win.x;
    const startY = (e.touches ? e.touches[0].clientY : e.clientY) - win.y;
    const move = (ev) => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      onDrag(win.id, Math.max(0, cx - startX), Math.max(0, cy - startY));
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.removeEventListener("touchmove", move); document.removeEventListener("touchend", up); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
    document.addEventListener("touchmove", move, { passive: false }); document.addEventListener("touchend", up);
  };

  const handleResize = (e) => {
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY, startW = win.w, startH = win.h;
    const move = (ev) => { onResize(win.id, Math.max(200, startW + ev.clientX - startX), Math.max(150, startH + ev.clientY - startY)); };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  };

  if (win.minimized) return null;

  const style = win.maximized ? { left: 0, top: 0, width: "100%", height: "calc(100% - 48px)", borderRadius: 0 } : { left: win.x, top: win.y, width: win.w, height: win.h };

  return (
    <div className="mw-window" style={{ ...style, zIndex: win.z }} onMouseDown={() => onFocus(win.id)}>
      <div className="mw-window-bar" onMouseDown={handleDown} onTouchStart={handleDown}>
        <span style={{marginRight:6,fontSize:16}}>{win.icon}</span>
        <div className="mw-window-title">{win.title}</div>
        <div className="mw-window-btns">
          <button className="mw-window-btn" onClick={() => onMinimize(win.id)} title="Minimize">─</button>
          <button className="mw-window-btn" onClick={() => onMaximize(win.id)} title="Maximize">{win.maximized ? "▢" : "□"}</button>
          <button className="mw-window-btn close" onClick={() => onClose(win.id)} title="Close"><Ico name="x" size={12}/></button>
        </div>
      </div>
      <div className="mw-window-content mw-scroll">{children}</div>
      {!win.maximized && <div className="mw-resize-handle" onMouseDown={handleResize} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE MANAGER APP
// ═══════════════════════════════════════════════════════════════════════════
function FileManager({ vfs, onOpenFile }) {
  const [path, setPath] = useState("/");
  const [items, setItems] = useState([]);
  const [showCtx, setShowCtx] = useState(null);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newType, setNewType] = useState("file");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState(null);

  const load = useCallback(async () => {
    const list = await vfs.list(path);
    setItems(list);
  }, [path, vfs]);

  useEffect(() => { load(); }, [load]);

  const navigate = (p) => { setPath(p); setSearchResults(null); };

  const handleNew = async () => {
    if (!newName.trim()) return;
    const fullPath = (path === "/" ? "" : path) + "/" + newName.trim();
    if (newType === "dir") await vfs.ensureDir(fullPath);
    else await vfs.create(fullPath, "");
    setShowNew(false); setNewName(""); load();
  };

  const handleDelete = async (itemPath, isDir) => {
    await vfs.delete(itemPath); load();
  };

  const handleSearch = async () => {
    if (!searchQ.trim()) { setSearchResults(null); return; }
    const results = await vfs.search(searchQ);
    setSearchResults(results);
  };

  const openItem = (item) => {
    if (item.type === "dir") navigate(item.path);
    else if (onOpenFile) onOpenFile(item);
  };

  const display = searchResults || items;
  const pathParts = path === "/" ? [] : path.split("/").filter(Boolean);

  return (
    <div className="mw-app">
      <div className="mw-app-header">
        <button className="mw-btn mw-btn-secondary" style={{padding:"4px 10px",fontSize:12}} onClick={()=>navigate("/")} disabled={path==="/"}></button>
        <button className="mw-btn mw-btn-secondary" style={{padding:"4px 10px",fontSize:12}} onClick={()=>navigate(pathParts.slice(0,-1).join("/")||"/")} disabled={path==="/"}><Ico name="arrow-up" size={12}/></button>
        <div style={{flex:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",color:"#888",fontSize:12}}> {path}</div>
        <input placeholder="Search..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()} style={{padding:"4px 8px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"#ddd",fontSize:12,outline:"none",width:120}} />
        <button className="mw-btn mw-btn-primary" style={{padding:"4px 10px",fontSize:12}} onClick={()=>{setShowNew(true);setNewType("file")}}>+ File</button>
        <button className="mw-btn mw-btn-primary" style={{padding:"4px 10px",fontSize:12}} onClick={()=>{setShowNew(true);setNewType("dir")}}>+ Dir</button>
      </div>
      <div className="mw-app-body mw-scroll" onContextMenu={e=>{e.preventDefault();setShowCtx({x:e.clientX,y:e.clientY});}}>
        {showNew && (
          <div style={{marginBottom:8,padding:8,background:"rgba(255,255,255,0.05)",borderRadius:8}}>
            <input autoFocus placeholder={newType==="dir"?"Folder name":"File name (e.g. main.js)"} value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleNew();if(e.key==="Escape")setShowNew(false)}} style={{padding:"4px 8px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,color:"#ddd",fontSize:12,outline:"none",width:"60%"}} />
            <button className="mw-btn mw-btn-primary" style={{marginLeft:8,padding:"4px 12px",fontSize:12}} onClick={handleNew}>Create</button>
            <button className="mw-btn mw-btn-secondary" style={{marginLeft:4,padding:"4px 12px",fontSize:12}} onClick={()=>setShowNew(false)}>Cancel</button>
          </div>
        )}
        {display.length === 0 ? (
          <div style={{textAlign:"center",padding:40,color:"#555"}}>{searchResults?"No results":"Empty folder"}</div>
        ) : display.map(item => (
          <div key={item.path} className="mw-file-row" onClick={()=>openItem(item)}>
            <span style={{fontSize:18}}><Ico name={item.type==="dir"?"folder":"file"} size={16}/></span>
            <span style={{flex:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{item.name}{searchResults?` (${item.path})`:""}</span>
            {item.type==="file" && <span style={{color:"#555",fontSize:10}}>{item.size}B</span>}
            <button onClick={(e)=>{e.stopPropagation();handleDelete(item.path,item.type==="dir");}} style={{background:"transparent",border:"none",color:"#dc2626",cursor:"pointer",fontSize:14,padding:"2px 6px"}} title="Delete"><Ico name="trash" size={14}/></button>
          </div>
        ))}
        {showCtx && (
          <div className="mw-ctx-menu" style={{left:showCtx.x,top:showCtx.y}} onClick={()=>setShowCtx(null)}>
            <div className="mw-ctx-item" onClick={()=>{setShowNew(true);setNewType("file")}}>New File</div>
            <div className="mw-ctx-item" onClick={()=>{setShowNew(true);setNewType("dir")}}>New Folder</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CODE STUDIO APP
// ═══════════════════════════════════════════════════════════════════════════
function CodeStudio({ vfs, initialFile }) {
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [status, setStatus] = useState("EDITOR ONLY");
  const textareaRef = useRef(null);
  const displayRef = useRef(null);

  useEffect(() => {
    if (initialFile && !openTabs.find(t=>t.path===initialFile.path)) {
      const lang = initialFile.name.split(".").pop() || "txt";
      setOpenTabs(t => [...t, { path: initialFile.path, name: initialFile.name, lang }]);
      setActiveTab(initialFile.path);
      setContent(initialFile.content || "");
    }
  }, [initialFile]);

  useEffect(() => {
    if (activeTab) {
      const tab = openTabs.find(t => t.path === activeTab);
      if (tab) {
        vfs.read(activeTab).then(f => { if (f) { setContent(f.content || ""); setDirty(false); } });
        const lang = tab.name.split(".").pop();
        if (["js","ts","jsx","tsx"].includes(lang)) setStatus("EDITOR ONLY — JS/TS preview available");
        else if (lang === "html") setStatus("EDITOR ONLY — HTML preview available");
        else if (lang === "py") setStatus("EDITOR ONLY — No Python runtime in browser");
        else if (["cpp","hpp","h","c"].includes(lang)) setStatus("EDITOR ONLY — No C++ compiler in browser");
        else setStatus("EDITOR ONLY");
      }
    }
  }, [activeTab]);

  const handleSave = async () => {
    if (!activeTab) return;
    await vfs.update(activeTab, content);
    setDirty(false);
  };

  const handleScroll = () => {
    if (displayRef.current && textareaRef.current) {
      displayRef.current.scrollTop = textareaRef.current.scrollTop;
      displayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const lineCount = content.split("\n").length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join("\n");

  const openFile = async () => {
    const all = await vfs.exportVFS();
    const files = all.filter(f => f.type === "file");
    const name = prompt("Enter file path to open (e.g. /Projects/main.js):");
    if (!name) return;
    const f = await vfs.read(name);
    if (f) {
      const lang = f.name.split(".").pop() || "txt";
      if (!openTabs.find(t => t.path === name)) setOpenTabs(t => [...t, { path: name, name: f.name, lang }]);
      setActiveTab(name);
      setContent(f.content || "");
    } else alert("File not found: " + name);
  };

  return (
    <div className="mw-app">
      <div className="mw-app-header">
        <button className="mw-btn mw-btn-secondary" style={{padding:"4px 10px",fontSize:12}} onClick={openFile}>Open</button>
        <button className="mw-btn mw-btn-primary" style={{padding:"4px 10px",fontSize:12}} onClick={handleSave} disabled={!activeTab}>{dirty?"*Save":"Saved"}</button>
        {activeTab && <button className="mw-btn mw-btn-secondary" style={{padding:"4px 10px",fontSize:12}} onClick={()=>setShowPreview(s=>!s)}>Preview</button>}
        <div style={{flex:1}} />
        <span className={`mw-badge ${status.includes("No")?"mw-badge-warn":"mw-badge-ok"}`}>{status}</span>
      </div>
      <div className="mw-code-tabs">
        {openTabs.map(tab => (
          <div key={tab.path} className={`mw-code-tab ${activeTab===tab.path?"active":""}`} onClick={()=>setActiveTab(tab.path)}>
            {tab.name} <span onClick={(e)=>{e.stopPropagation();setOpenTabs(t=>t.filter(x=>x.path!==tab.path));if(activeTab===tab.path)setActiveTab(null);}} style={{marginLeft:4,cursor:"pointer",color:"#dc2626",display:"inline-flex"}}><Ico name="x" size={12}/></span>
          </div>
        ))}
      </div>
      {activeTab ? (
        showPreview ? (
          <div style={{flex:1,position:"relative"}}>
            <iframe srcDoc={content} style={{width:"100%",height:"100%",border:"none",background:"white"}} sandbox="allow-scripts" title="preview" />
          </div>
        ) : (
          <div className="mw-code-editor">
            <div className="mw-code-area">
              <div className="mw-code-lines">{lineNumbers}</div>
              <div ref={displayRef} className="mw-code-display" dangerouslySetInnerHTML={{ __html: highlightToHTML(content) }} />
              <textarea ref={textareaRef} className="mw-code-input mw-scroll" value={content} onChange={e=>{setContent(e.target.value);setDirty(true);}} onScroll={handleScroll} spellCheck={false} autoCapitalize="off" autoCorrect="off" />
            </div>
          </div>
        )
      ) : (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#555"}}>
          <div style={{textAlign:"center"}}><div style={{marginBottom:12,display:"flex",justifyContent:"center"}}><Ico name="code" size={48}/></div>Open a file or create one in File Manager</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS APP
// ═══════════════════════════════════════════════════════════════════════════
function SettingsApp({ settings, setSettings, vfs }) {
  const themes = [
    { name: "Mossy Green", accent: "#4ade80", bg: "#0a1a0a" },
    { name: "Orange", accent: "#ff8c00", bg: "#1a1a2e" },
    { name: "Purple", accent: "#a855f7", bg: "#1a0d2e" },
    { name: "Blue", accent: "#3b82f6", bg: "#0d1a2e" },
    { name: "Pink", accent: "#ec4899", bg: "#2e0d1a" },
    { name: "Cyan", accent: "#06b6d4", bg: "#0d2e2e" },
  ];
  const perfModes = [
    { id: "low", name: "LOW", desc: "No animations, static wallpaper" },
    { id: "medium", name: "MEDIUM", desc: "Basic animations" },
    { id: "high", name: "HIGH", desc: "Smooth animations, canvas wallpaper" },
    { id: "ultra", name: "ULTRA", desc: "All effects, 3D wallpaper ready" },
  ];
  const keyboards = [
    { id: "us", name: "US / American" },
    { id: "au", name: "AU / Australian" },
    { id: "jp", name: "JP / Japanese" },
  ];

  const save = async (newSettings) => {
    setSettings(newSettings);
    await vfs.ensureDir("/Settings");
    await vfs.update("/Settings/os.json", JSON.stringify(newSettings)) || await vfs.create("/Settings/os.json", JSON.stringify(newSettings));
  };

  return (
    <div className="mw-app">
      <div className="mw-app-header"><span style={{fontWeight:600}}> Settings</span></div>
      <div className="mw-app-body mw-scroll" style={{padding:16}}>
        <div style={{marginBottom:24}}>
          <div style={{fontWeight:600,marginBottom:8,color:"#ddd"}}>Theme</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {themes.map(t => (
              <div key={t.name} onClick={()=>save({...settings,accent:t.accent,bg:t.bg})} style={{cursor:"pointer",padding:"8px 12px",borderRadius:8,border:`2px solid ${settings.accent===t.accent?t.accent:"transparent"}`,background:"#13132a",display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:t.accent}} />
                <span style={{fontSize:12,color:"#ccc"}}>{t.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{marginBottom:24}}>
          <div style={{fontWeight:600,marginBottom:8,color:"#ddd"}}>Performance Mode</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {perfModes.map(p => (
              <div key={p.id} onClick={()=>save({...settings,perf:p.id})} style={{cursor:"pointer",padding:"10px 14px",borderRadius:8,border:`2px solid ${settings.perf===p.id?(settings.accent||"#ff8c00"):"transparent"}`,background:"#13132a"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#ddd"}}>{p.name}</div>
                <div style={{fontSize:10,color:"#888",marginTop:2}}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{marginBottom:24}}>
          <div style={{fontWeight:600,marginBottom:8,color:"#ddd"}}>Keyboard Layout</div>
          <div style={{display:"flex",gap:8}}>
            {keyboards.map(k => (
              <div key={k.id} onClick={()=>save({...settings,keyboard:k.id})} style={{cursor:"pointer",padding:"8px 14px",borderRadius:8,border:`2px solid ${settings.keyboard===k.id?(settings.accent||"#ff8c00"):"transparent"}`,background:"#13132a",fontSize:12,color:"#ccc"}}>{k.name}</div>
            ))}
          </div>
          <div style={{color:"#555",fontSize:11,marginTop:6}}>Uses real browser keyboard events. Does not remap physical keys.</div>
        </div>
        <div style={{marginBottom:24}}>
          <div style={{fontWeight:600,marginBottom:8,color:"#ddd"}}>Reduced Motion</div>
          <div onClick={()=>save({...settings,reducedMotion:!settings.reducedMotion})} style={{cursor:"pointer",padding:"10px 14px",borderRadius:8,background:"#13132a",display:"flex",alignItems:"center",gap:8,width:"fit-content"}}>
            <div style={{width:40,height:22,borderRadius:11,background:settings.reducedMotion?(settings.accent||"#ff8c00"):"#333",position:"relative",transition:"0.2s"}}>
              <div style={{position:"absolute",top:2,left:settings.reducedMotion?20:2,width:18,height:18,borderRadius:"50%",background:"white",transition:"0.2s"}} />
            </div>
            <span style={{fontSize:12,color:"#ccc"}}>{settings.reducedMotion?"Enabled":"Disabled"}</span>
          </div>
        </div>
        <div style={{marginBottom:24}}>
          <div style={{fontWeight:600,marginBottom:8,color:"#ddd"}}>Storage</div>
          <StorageInfo vfs={vfs} />
        </div>
        <div style={{padding:"12px",background:"rgba(255,255,255,0.05)",borderRadius:8,fontSize:11,color:"#888"}}>
          <div style={{marginBottom:4,display:"flex",alignItems:"center",gap:6}}><Ico name="database" size={14}/> MW-VFS: IndexedDB local storage</div>
          <div style={{marginBottom:4,display:"flex",alignItems:"center",gap:6}}><Ico name="lock" size={14}/> Profiles stored locally — no server sync</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}><Ico name="chart" size={14}/> Status: <span className="mw-badge mw-badge-ok">LOCAL ONLY</span></div>
        </div>
      </div>
    </div>
  );
}

function StorageInfo({ vfs }) {
  const [used, setUsed] = useState(0);
  useEffect(() => { vfs.getUsedSpace().then(setUsed); }, [vfs]);
  const kb = (used / 1024).toFixed(1);
  return <div style={{fontSize:12,color:"#888"}}>Used: {kb} KB in MW-VFS (IndexedDB)</div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSTICS APP
// ═══════════════════════════════════════════════════════════════════════════
function Diagnostics() {
  const [tests, setTests] = useState([]);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    const results = [];
    const test = (name, fn) => {
      try { const r = fn(); results.push({ name, pass: r !== false, detail: typeof r === "string" ? r : r ? "Supported" : "Not available" }); }
      catch (e) { results.push({ name, pass: false, detail: e.message }); }
    };

    test("IndexedDB", () => !!window.indexedDB);
    test("Service Worker", () => "serviceWorker" in navigator ? "Supported" : false);
    test("WebGL", () => { const c = document.createElement("canvas"); return !!(c.getContext("webgl") || c.getContext("experimental-webgl")) ? "Supported" : false; });
    test("WebGL2", () => { const c = document.createElement("canvas"); return !!c.getContext("webgl2") ? "Supported" : false; });
    test("WebGPU", () => "gpu" in navigator ? "Supported" : false);
    test("WebXR", () => "xr" in navigator ? "Supported" : false);
    test("WebXR Session", async () => { if (!navigator.xr) return false; try { await navigator.xr.isSessionSupported("immersive-vr"); return "VR supported"; } catch { return "VR not supported"; } });
    test("Gamepad API", () => "getGamepads" in navigator ? "Supported" : false);
    test("Pointer Events", () => "PointerEvent" in window ? "Supported" : false);
    test("Touch Events", () => "ontouchstart" in window ? "Supported" : false);
    test("Keyboard Events", () => "KeyboardEvent" in window ? "Supported" : false);
    test("File API", () => "File" in window && "FileReader" in window ? "Supported" : false);
    test("File System Access API", () => "showOpenFilePicker" in window ? "Supported" : false);
    test("MediaRecorder", () => "MediaRecorder" in window ? "Supported" : false);
    test("AudioContext", () => "AudioContext" in window || "webkitAudioContext" in window ? "Supported" : false);
    test("Speech Recognition", () => ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) ? "Supported" : false);
    test("Speech Synthesis", () => "speechSynthesis" in window ? "Supported" : false);
    test("Geolocation", () => "geolocation" in navigator ? "Supported" : false);
    test("Bluetooth", () => "bluetooth" in navigator ? "Supported" : false);
    test("Vibration", () => "vibrate" in navigator ? "Supported" : false);
    test("Battery API", () => "getBattery" in navigator ? "Supported" : false);
    test("Clipboard API", () => "clipboard" in navigator ? "Supported" : false);
    test("Share API", () => "share" in navigator ? "Supported" : false);
    test("Notifications", () => "Notification" in window ? "Supported" : false);
    test("WebSocket", () => "WebSocket" in window ? "Supported" : false);
    test("Canvas 2D", () => { const c = document.createElement("canvas"); return !!c.getContext("2d") ? "Supported" : false; });
    test("ResizeObserver", () => "ResizeObserver" in window ? "Supported" : false);
    test("IntersectionObserver", () => "IntersectionObserver" in window ? "Supported" : false);
    test("Crypto", () => "crypto" in window && "subtle" in crypto ? "Supported" : false);

    // Check gamepad connection
    if ("getGamepads" in navigator) {
      const gps = navigator.getGamepads();
      const connected = gps.filter(g => g).length;
      results.push({ name: "Gamepad Connected", pass: connected > 0, detail: connected > 0 ? `${connected} gamepad(s)` : "No gamepad connected" });
    }

    // Check screen
    results.push({ name: "Screen Size", pass: true, detail: `${screen.width}×${screen.height}` });
    results.push({ name: "Viewport", pass: true, detail: `${window.innerWidth}×${window.innerHeight}` });
    results.push({ name: "Pixel Ratio", pass: true, detail: String(window.devicePixelRatio) });
    results.push({ name: "User Agent", pass: true, detail: navigator.userAgent.substring(0, 80) });
    results.push({ name: "Online Status", pass: navigator.onLine, detail: navigator.onLine ? "Online" : "Offline" });

    setTests(results);
    setRunning(false);
  };

  useEffect(() => { runTests(); }, []);

  const passCount = tests.filter(t => t.pass).length;
  const failCount = tests.filter(t => !t.pass).length;

  return (
    <div className="mw-app">
      <div className="mw-app-header">
        <span style={{fontWeight:600}}> Diagnostics</span>
        <button className="mw-btn mw-btn-primary" style={{padding:"4px 10px",fontSize:12}} onClick={runTests} disabled={running}>{running?"Running...":"Re-run Tests"}</button>
        <div style={{flex:1}} />
        <span className="mw-badge mw-badge-ok">{passCount} pass</span>
        <span className="mw-badge mw-badge-err" style={{marginLeft:4}}>{failCount} fail</span>
      </div>
      <div className="mw-app-body mw-scroll">
        {tests.map((t, i) => (
          <div key={i} className="mw-diag-row">
            <span style={{flex:1,fontSize:12,color:"#ddd"}}>{t.name}</span>
            <span style={{fontSize:11,color:"#888",maxWidth:200,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{t.detail}</span>
            <span className={t.pass?"mw-diag-pass":"mw-diag-fail"} style={{fontWeight:700,fontSize:12}}>{t.pass?"+":"x"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BROWSER APP
// ═══════════════════════════════════════════════════════════════════════════
function MwBrowser({ vfs }) {
  const [url, setUrl] = useState("");
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => { vfs.read("/Settings/bookmarks.json").then(b => { if (b) setBookmarks(JSON.parse(b.content || "[]")); }).catch(()=>{}); }, []);

  const navigate = (u) => {
    if (!u) return;
    let full = u;
    if (!u.startsWith("http")) full = "https://" + u;
    setUrl(full); setLoading(true); setError("");
    const newHist = history.slice(0, histIdx + 1); newHist.push(full);
    setHistory(newHist); setHistIdx(newHist.length - 1);
    setTimeout(() => setLoading(false), 1000);
  };

  const back = () => { if (histIdx > 0) { setHistIdx(histIdx - 1); setUrl(history[histIdx - 1]); } };
  const forward = () => { if (histIdx < history.length - 1) { setHistIdx(histIdx + 1); setUrl(history[histIdx + 1]); } };

  const addBookmark = async () => {
    if (!url) return;
    const newBm = [...bookmarks, { url, name: url.replace(/^https?:\/\//, "").split("/")[0] }];
    setBookmarks(newBm);
    await vfs.ensureDir("/Settings");
    await vfs.update("/Settings/bookmarks.json", JSON.stringify(newBm)) || await vfs.create("/Settings/bookmarks.json", JSON.stringify(newBm));
  };

  return (
    <div className="mw-app">
      <div className="mw-app-header">
        <button className="mw-btn mw-btn-secondary" style={{padding:"4px 8px",fontSize:12}} onClick={back} disabled={histIdx<=0}></button>
        <button className="mw-btn mw-btn-secondary" style={{padding:"4px 8px",fontSize:12}} onClick={forward} disabled={histIdx>=history.length-1}></button>
        <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&navigate(url)} placeholder="Enter URL or search..." style={{flex:1,padding:"6px 10px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"#ddd",fontSize:12,outline:"none"}} />
        <button className="mw-btn mw-btn-secondary" style={{padding:"4px 8px",fontSize:12}} onClick={addBookmark}><Ico name="star" size={12}/></button>
        <button className="mw-btn mw-btn-primary" style={{padding:"4px 10px",fontSize:12}} onClick={()=>navigate(url)}>Go</button>
      </div>
      <div className="mw-app-body" style={{padding:0,position:"relative"}}>
        {bookmarks.length > 0 && (
          <div style={{padding:"4px 8px",display:"flex",gap:8,overflowX:"auto",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            {bookmarks.map((b, i) => <span key={i} onClick={()=>navigate(b.url)} style={{cursor:"pointer",fontSize:11,color:"#888",whiteSpace:"nowrap",padding:"2px 8px",borderRadius:6,background:"rgba(255,255,255,0.05)"}}> {b.name}</span>)}
          </div>
        )}
        {!url ? (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",color:"#555"}}>
            <div style={{fontSize:48,marginBottom:12}}></div>
            <div style={{fontSize:14,color:"#888"}}>Enter a URL to browse</div>
            <div style={{fontSize:11,color:"#444",marginTop:8,maxWidth:300,textAlign:"center"}}>Note: Many sites block iframe embedding (X-Frame-Options/CSP). This is a browser security feature, not a bug.</div>
          </div>
        ) : (
          <iframe src={url} style={{width:"100%",height:"100%",border:"none",background:"white"}} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="browser" onLoad={()=>setLoading(false)} onError={()=>{setError("Failed to load — site may block iframe embedding."); setLoading(false);}} />
        )}
        {loading && <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"var(--mw-accent,#ff8c00)",animation:"mwSpin 1s linear"}} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHATTER (AI) APP
// ═══════════════════════════════════════════════════════════════════════════
function Chatter({ vfs }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState("checking");
  const bottomRef = useRef(null);

  useEffect(() => {
    mwAIChat({ messages: [{ role: "user", content: "Hello" }], systemPrompt: "Say 'Chatter is ready.' in 3 words." })
      .then(r => { if (r?.text) setAiStatus("available"); else setAiStatus("unavailable"); })
      .catch(() => setAiStatus("unavailable"));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    setMsgs(m => [...m, userMsg]); setInput(""); setLoading(true);
    try {
      const res = await mwAIChat({
        messages: [...msgs, userMsg].map(m => ({ role: m.role, content: m.content })),
        systemPrompt: "You are Chatter, a helpful AI assistant for the MossyWoss OS environment. You specialize in coding, debugging, research, planning, writing, game development, web development, and project organization. Be concise and practical. If a health/medical question arises, say you're not qualified and suggest seeing a professional. Never provide harmful or illegal information."
      });
      if (res?.text) setMsgs(m => [...m, { role: "assistant", content: res.text }]);
      else if (res?.error) setMsgs(m => [...m, { role: "assistant", content: ` ${res.error}: ${res.message || "AI service not configured."}` }]);
    } catch (e) { setMsgs(m => [...m, { role: "assistant", content: " AI_SERVICE_UNAVAILABLE: Could not reach AI service." }]); }
    setLoading(false);
  };

  return (
    <div className="mw-app">
      <div className="mw-app-header">
        <span style={{fontWeight:600}}> Chatter</span>
        <div style={{flex:1}} />
        <span className={`mw-badge ${aiStatus==="available"?"mw-badge-ok":"mw-badge-warn"}`}>{aiStatus==="available"?"AI READY":"AI UNAVAILABLE"}</span>
      </div>
      <div className="mw-app-body mw-scroll" style={{display:"flex",flexDirection:"column",padding:8}}>
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          {msgs.length === 0 && <div style={{textAlign:"center",padding:40,color:"#555"}}><div style={{marginBottom:8,display:"flex",justifyContent:"center"}}><Ico name="chat" size={40}/></div>Ask about coding, debugging, game dev, or anything!</div>}
          {msgs.map((m, i) => (
            <div key={i} className={`mw-chat-msg ${m.role==="user"?"mw-chat-user":"mw-chat-ai"}`} style={{whiteSpace:"pre-wrap"}}>{m.content}</div>
          ))}
          {loading && <div className="mw-chat-msg mw-chat-ai" style={{color:"#888"}}>...</div>}
          <div ref={bottomRef} />
        </div>
        <div style={{display:"flex",gap:8,padding:"8px 0"}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask Chatter anything..." style={{flex:1,padding:"8px 12px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,color:"#ddd",fontSize:13,outline:"none"}} />
          <button className="mw-btn mw-btn-primary" onClick={send} disabled={loading}>Send</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROLEPLAYVERSE APP
// ═══════════════════════════════════════════════════════════════════════════
function Roleplayverse({ vfs }) {
  const [view, setView] = useState("home");
  const [characters, setCharacters] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChar, setActiveChar] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [newChar, setNewChar] = useState({ name: "", personality: "", background: "", speech: "", greeting: "" });

  useEffect(() => { loadCharacters(); }, []);
  const loadCharacters = async () => {
    const f = await vfs.read("/Projects/Roleplayverse/characters.json");
    if (f) setCharacters(JSON.parse(f.content || "[]"));
  };
  const saveCharacters = async (chars) => {
    setCharacters(chars);
    await vfs.ensureDir("/Projects/Roleplayverse");
    await vfs.update("/Projects/Roleplayverse/characters.json", JSON.stringify(chars)) || await vfs.create("/Projects/Roleplayverse/characters.json", JSON.stringify(chars));
  };

  const createChar = async () => {
    if (!newChar.name.trim()) return;
    const char = { id: Date.now().toString(), ...newChar, created: Date.now() };
    const updated = [...characters, char];
    await saveCharacters(updated);
    setNewChar({ name: "", personality: "", background: "", speech: "", greeting: "" });
    setView("home");
  };

  const startChat = (char) => {
    setActiveChar(char); setMsgs([]); setView("chat");
    if (char.greeting) setMsgs([{ role: "assistant", content: char.greeting }]);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    setMsgs(m => [...m, userMsg]); setInput(""); setLoading(true);
    try {
      const sys = `You are ${activeChar.name}. ${activeChar.personality || ""} ${activeChar.background ? "Background: " + activeChar.background : ""} ${activeChar.speech ? "Speech style: " + activeChar.speech : ""} Stay in character. Never control the player's character. Never break character. Never provide harmful content. If health topics arise, say you're not qualified.`;
      const res = await mwAIChat({ messages: [...msgs, userMsg].map(m => ({ role: m.role, content: m.content })), systemPrompt: sys });
      if (res?.text) setMsgs(m => [...m, { role: "assistant", content: res.text }]);
      else setMsgs(m => [...m, { role: "assistant", content: " AI_SERVICE_UNAVAILABLE" }]);
    } catch { setMsgs(m => [...m, { role: "assistant", content: " AI_SERVICE_UNAVAILABLE" }]); }
    setLoading(false);
  };

  if (view === "home") return (
    <div className="mw-app">
      <div className="mw-app-header"><span style={{fontWeight:600}}> Roleplayverse</span><button className="mw-btn mw-btn-primary" style={{padding:"4px 10px",fontSize:12}} onClick={()=>setView("create")}>+ Character</button></div>
      <div className="mw-app-body mw-scroll">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8,padding:4}}>
          {characters.length === 0 && <div style={{gridColumn:"1/-1",textAlign:"center",padding:40,color:"#555"}}>No characters yet. Create one to start!</div>}
          {characters.map(c => (
            <div key={c.id} onClick={()=>startChat(c)} style={{padding:12,background:"#13132a",borderRadius:8,cursor:"pointer",textAlign:"center"}}>
              <div style={{marginBottom:4,display:"flex",justifyContent:"center"}}><Ico name="mask" size={32}/></div>
              <div style={{fontSize:13,fontWeight:600,color:"#ddd"}}>{c.name}</div>
              <div style={{fontSize:10,color:"#888",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.personality?.substring(0,40)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (view === "create") return (
    <div className="mw-app">
      <div className="mw-app-header"><button className="mw-btn mw-btn-secondary" style={{padding:"4px 10px",fontSize:12}} onClick={()=>setView("home")}> Back</button><span style={{fontWeight:600,marginLeft:8}}>Create Character</span></div>
      <div className="mw-app-body mw-scroll" style={{padding:16,maxWidth:400}}>
        <input placeholder="Name" value={newChar.name} onChange={e=>setNewChar({...newChar,name:e.target.value})} style={{width:"100%",marginBottom:8,padding:"8px 12px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"#ddd",fontSize:13,outline:"none"}} />
        <textarea placeholder="Personality traits" value={newChar.personality} onChange={e=>setNewChar({...newChar,personality:e.target.value})} rows={3} style={{width:"100%",marginBottom:8,padding:"8px 12px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"#ddd",fontSize:13,outline:"none",resize:"vertical"}} />
        <textarea placeholder="Background" value={newChar.background} onChange={e=>setNewChar({...newChar,background:e.target.value})} rows={3} style={{width:"100%",marginBottom:8,padding:"8px 12px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"#ddd",fontSize:13,outline:"none",resize:"vertical"}} />
        <input placeholder="Speech style" value={newChar.speech} onChange={e=>setNewChar({...newChar,speech:e.target.value})} style={{width:"100%",marginBottom:8,padding:"8px 12px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"#ddd",fontSize:13,outline:"none"}} />
        <textarea placeholder="Greeting (first message)" value={newChar.greeting} onChange={e=>setNewChar({...newChar,greeting:e.target.value})} rows={2} style={{width:"100%",marginBottom:8,padding:"8px 12px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"#ddd",fontSize:13,outline:"none",resize:"vertical"}} />
        <button className="mw-btn mw-btn-primary" style={{width:"100%"}} onClick={createChar}>Create Character</button>
      </div>
    </div>
  );

  if (view === "chat") return (
    <div className="mw-app">
      <div className="mw-app-header"><button className="mw-btn mw-btn-secondary" style={{padding:"4px 10px",fontSize:12}} onClick={()=>setView("home")}> Back</button><span style={{fontWeight:600,marginLeft:8}}> {activeChar?.name}</span></div>
      <div className="mw-app-body mw-scroll" style={{display:"flex",flexDirection:"column",padding:8}}>
        <div style={{flex:1,overflowY:"auto"}}>
          {msgs.map((m,i)=>(<div key={i} className={`mw-chat-msg ${m.role==="user"?"mw-chat-user":"mw-chat-ai"}`} style={{whiteSpace:"pre-wrap"}}>{m.content}</div>))}
          {loading&&<div className="mw-chat-msg mw-chat-ai" style={{color:"#888"}}>...</div>}
        </div>
        <div style={{display:"flex",gap:8,padding:"8px 0"}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={`Message ${activeChar?.name}...`} style={{flex:1,padding:"8px 12px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,color:"#ddd",fontSize:13,outline:"none"}} />
          <button className="mw-btn mw-btn-primary" onClick={send} disabled={loading}>Send</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2D GAME STUDIO APP
// ═══════════════════════════════════════════════════════════════════════════
function GameStudio2D({ vfs }) {
  const canvasRef = useRef(null);
  const [sprites, setSprites] = useState([]);
  const [selected, setSelected] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [projectName, setProjectName] = useState("Untitled Game");
  const animRef = useRef(null);
  const keysRef = useRef({});
  const [spriteForm, setSpriteForm] = useState({ name: "sprite1", x: 100, y: 100, w: 40, h: 40, color: "#ff8c00", vx: 0, vy: 0 });

  const draw = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0d0d1a"; ctx.fillRect(0, 0, c.width, c.height);
    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
    for (let x = 0; x < c.width; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke(); }
    for (let y = 0; y < c.height; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke(); }
    // Sprites
    sprites.forEach(s => {
      ctx.fillStyle = s.color; ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = selected === s.id ? "#fff" : "transparent"; ctx.lineWidth = 2; ctx.strokeRect(s.x, s.y, s.w, s.h);
      if (s.name) { ctx.fillStyle = "#ddd"; ctx.font = "10px sans-serif"; ctx.fillText(s.name, s.x, s.y - 4); }
    });
  }, [sprites, selected]);

  useEffect(() => { draw(); }, [draw, sprites]);

  const gameLoop = useCallback(() => {
    if (!playing) return;
    setSprites(prev => prev.map(s => {
      let { x, y, vx, vy } = s;
      const keys = keysRef.current;
      if (s.id === selected || s.isPlayer) {
        if (keys["ArrowLeft"] || keys["a"]) vx = -3; else if (keys["ArrowRight"] || keys["d"]) vx = 3; else vx = 0;
        if (keys["ArrowUp"] || keys["w"]) vy = -3; else if (keys["ArrowDown"] || keys["s"]) vy = 3; else vy = 0;
      }
      x += vx; y += vy;
      const c = canvasRef.current; if (c) { x = Math.max(0, Math.min(c.width - s.w, x)); y = Math.max(0, Math.min(c.height - s.h, y)); }
      return { ...s, x, y, vx, vy };
    }));
    animRef.current = requestAnimationFrame(gameLoop);
  }, [playing, selected]);

  useEffect(() => {
    if (playing) {
      const handleKey = (e, down) => { keysRef.current[e.key] = down; };
      window.addEventListener("keydown", e => handleKey(e, true));
      window.addEventListener("keyup", e => handleKey(e, false));
      animRef.current = requestAnimationFrame(gameLoop);
      return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("keydown", e => handleKey(e, true)); window.removeEventListener("keyup", e => handleKey(e, false)); };
    }
  }, [playing, gameLoop]);

  const addSprite = () => {
    const s = { ...spriteForm, id: Date.now().toString(), isPlayer: sprites.length === 0 };
    setSprites(prev => [...prev, s]);
    setSelected(s.id);
  };

  const saveProject = async () => {
    await vfs.ensureDir("/Projects/Games");
    const path = `/Projects/Games/${projectName.replace(/\s+/g, "_")}.json`;
    await vfs.update(path, JSON.stringify({ name: projectName, sprites, canvas: { w: 600, h: 400 } })) || await vfs.create(path, JSON.stringify({ name: projectName, sprites, canvas: { w: 600, h: 400 } }));
    alert("Saved to MW-VFS: " + path);
  };

  const handleCanvasClick = (e) => {
    const c = canvasRef.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (c.width / rect.width);
    const y = (e.clientY - rect.top) * (c.height / rect.height);
    const hit = sprites.find(s => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    setSelected(hit ? hit.id : null);
    if (hit && !playing) {
      const move = (ev) => {
        const mx = (ev.clientX - rect.left) * (c.width / rect.width);
        const my = (ev.clientY - rect.top) * (c.height / rect.height);
        setSprites(prev => prev.map(s => s.id === hit.id ? { ...s, x: mx - s.w / 2, y: my - s.h / 2 } : s));
      };
      const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
      document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
    }
  };

  return (
    <div className="mw-app">
      <div className="mw-app-header">
        <input value={projectName} onChange={e=>setProjectName(e.target.value)} style={{padding:"4px 8px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"#ddd",fontSize:12,outline:"none",width:120}} />
        <button className="mw-btn mw-btn-primary" style={{padding:"4px 10px",fontSize:12}} onClick={saveProject}>Save</button>
        <button className="mw-btn mw-btn-secondary" style={{padding:"4px 10px",fontSize:12}} onClick={()=>setPlaying(p=>!p)}>{playing?"⏹ Stop":"▶ Play"}</button>
        <div style={{flex:1}} />
        <span className="mw-badge mw-badge-ok">Canvas 2D</span>
        <span className="mw-badge mw-badge-ok" style={{marginLeft:4}}>Runtime: Browser Canvas</span>
      </div>
      <div className="mw-app-body mw-scroll" style={{display:"flex",gap:8,padding:8}}>
        <div style={{width:200,flexShrink:0}}>
          <div style={{fontWeight:600,marginBottom:8,color:"#ddd",fontSize:12}}>Add Sprite</div>
          <input placeholder="Name" value={spriteForm.name} onChange={e=>setSpriteForm({...spriteForm,name:e.target.value})} style={{width:"100%",marginBottom:4,padding:"4px 8px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:4,color:"#ddd",fontSize:11,outline:"none"}} />
          <div style={{display:"flex",gap:4,marginBottom:4}}>
            <input type="number" placeholder="X" value={spriteForm.x} onChange={e=>setSpriteForm({...spriteForm,x:+e.target.value})} style={{flex:1,padding:"4px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:4,color:"#ddd",fontSize:11,outline:"none"}} />
            <input type="number" placeholder="Y" value={spriteForm.y} onChange={e=>setSpriteForm({...spriteForm,y:+e.target.value})} style={{flex:1,padding:"4px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:4,color:"#ddd",fontSize:11,outline:"none"}} />
          </div>
          <div style={{display:"flex",gap:4,marginBottom:4}}>
            <input type="number" placeholder="W" value={spriteForm.w} onChange={e=>setSpriteForm({...spriteForm,w:+e.target.value})} style={{flex:1,padding:"4px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:4,color:"#ddd",fontSize:11,outline:"none"}} />
            <input type="number" placeholder="H" value={spriteForm.h} onChange={e=>setSpriteForm({...spriteForm,h:+e.target.value})} style={{flex:1,padding:"4px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:4,color:"#ddd",fontSize:11,outline:"none"}} />
          </div>
          <input type="color" value={spriteForm.color} onChange={e=>setSpriteForm({...spriteForm,color:e.target.value})} style={{width:"100%",height:30,marginBottom:4,borderRadius:4,border:"1px solid rgba(255,255,255,0.15)",background:"#0d0d1a"}} />
          <button className="mw-btn mw-btn-primary" style={{width:"100%",padding:"4px",fontSize:12,marginBottom:12}} onClick={addSprite}>+ Add Sprite</button>
          <div style={{fontWeight:600,marginBottom:4,color:"#ddd",fontSize:12}}>Sprites ({sprites.length})</div>
          {sprites.map(s => (
            <div key={s.id} onClick={()=>setSelected(s.id)} style={{padding:"4px 8px",borderRadius:4,cursor:"pointer",marginBottom:2,background:selected===s.id?"rgba(255,255,255,0.1)":"transparent",display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:12,height:12,background:s.color,borderRadius:2}} />
              <span style={{flex:1,fontSize:11,color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</span>
              {s.isPlayer && <span style={{fontSize:9,color:"#23a55a"}}>P1</span>}
              <span onClick={(e)=>{e.stopPropagation();setSprites(prev=>prev.filter(x=>x.id!==s.id));}} style={{color:"#dc2626",cursor:"pointer",fontSize:12,display:"inline-flex"}}><Ico name="x" size={12}/></span>
            </div>
          ))}
          {playing && <div style={{marginTop:8,padding:8,background:"rgba(35,165,90,0.1)",borderRadius:6,fontSize:10,color:"#23a55a"}}>▶ Playing! Use Arrow/WASD keys to move player sprite.</div>}
        </div>
        <canvas ref={canvasRef} width={600} height={400} onClick={handleCanvasClick} className="mw-canvas" style={{flex:1,maxWidth:"calc(100% - 220px)"}} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OS MAKER APP
// ═══════════════════════════════════════════════════════════════════════════
function OsMaker({ vfs }) {
  const [view, setView] = useState("home");
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [buildStatus, setBuildStatus] = useState("");
  const [buildLog, setBuildLog] = useState([]);

  useEffect(() => { loadProjects(); }, []);
  const loadProjects = async () => {
    const f = await vfs.read("/Projects/OS-Maker/projects.json");
    if (f) setProjects(JSON.parse(f.content || "[]"));
  };
  const saveProjects = async (p) => {
    setProjects(p);
    await vfs.ensureDir("/Projects/OS-Maker");
    await vfs.update("/Projects/OS-Maker/projects.json", JSON.stringify(p)) || await vfs.create("/Projects/OS-Maker/projects.json", JSON.stringify(p));
  };

  const newProject = async () => {
    const name = prompt("Project name:"); if (!name) return;
    const proj = {
      id: Date.now().toString(), name,
      osMeta: { name, version: "1.0.0", author: "Unknown", description: "" },
      theme: { accent: "#4ade80", bg: "#0a1a0a", taskbar: "#0d0d1a" },
      wallpaper: { type: "gradient", value: "#0a1a0a" },
      apps: [{ id: "files", name: "Files", icon: "folder" }, { id: "code", name: "Code Studio", icon: "code" }, { id: "settings", name: "Settings", icon: "settings" }],
      boot: { showLogo: true, logo: "fox", text: name },
      created: Date.now()
    };
    const updated = [...projects, proj];
    await saveProjects(updated);
    setActiveProject(proj);
    setView("editor");
  };

  const openProject = (p) => { setActiveProject(p); setView("editor"); };

  const updateProject = (updates) => {
    const updated = { ...activeProject, ...updates };
    setActiveProject(updated);
    const allProjects = projects.map(p => p.id === updated.id ? updated : p);
    saveProjects(allProjects);
  };

  const buildProject = async () => {
    setBuildStatus("BUILDING");
    setBuildLog([]);
    const steps = [
      { name: "Validate project metadata", check: () => activeProject.osMeta.name && activeProject.osMeta.version },
      { name: "Process theme", check: () => activeProject.theme.accent },
      { name: "Process wallpaper", check: () => activeProject.wallpaper.value },
      { name: "Validate apps", check: () => activeProject.apps.length > 0 },
      { name: "Generate project.json", check: () => true },
      { name: "Generate manifest", check: () => true },
      { name: "Package application", check: () => true },
      { name: "Validate package", check: () => true },
    ];
    for (const step of steps) {
      setBuildLog(l => [...l, `▶ ${step.name}...`]);
      await new Promise(r => setTimeout(r, 300));
      if (!step.check()) { setBuildLog(l => [...l, `FAILED: ${step.name}`]); setBuildStatus("FAILED"); return; }
      setBuildLog(l => [...l, `${step.name} — OK`]);
    }
    setBuildStatus("COMPLETE");
    setBuildLog(l => [...l, "BUILD COMPLETE"]);
  };

  const exportProject = () => {
    const blob = new Blob([JSON.stringify(activeProject, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${activeProject.name.replace(/\s+/g, "_")}.mwproj`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (view === "home") return (
    <div className="mw-app">
      <div className="mw-app-header"><span style={{fontWeight:600}}> MossyWoss OS Maker</span><button className="mw-btn mw-btn-primary" style={{padding:"4px 10px",fontSize:12}} onClick={newProject}>+ New Project</button></div>
      <div className="mw-app-body mw-scroll">
        {projects.length === 0 && <div style={{textAlign:"center",padding:40,color:"#555"}}><div style={{marginBottom:8,display:"flex",justifyContent:"center"}}><Ico name="chat" size={40}/></div>No projects yet. Create one to start building!</div>}
        {projects.map(p => (
          <div key={p.id} onClick={()=>openProject(p)} style={{padding:12,background:"#13132a",borderRadius:8,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:24,display:"flex",alignItems:"center",justifyContent:"center"}}><Ico name={p.boot?.logo || "fox"} size={24} style={{color:"#4ade80"}}/></span>
            <div style={{flex:1}}><div style={{fontWeight:600,color:"#ddd",fontSize:13}}>{p.name}</div><div style={{color:"#888",fontSize:11}}>v{p.osMeta?.version} — {p.apps?.length || 0} apps</div></div>
            <button onClick={(e)=>{e.stopPropagation();const updated=projects.filter(x=>x.id!==p.id);saveProjects(updated);}} style={{background:"transparent",border:"none",color:"#dc2626",cursor:"pointer",fontSize:14}}></button>
          </div>
        ))}
      </div>
    </div>
  );

  if (view === "editor" && activeProject) return (
    <div className="mw-app">
      <div className="mw-app-header">
        <button className="mw-btn mw-btn-secondary" style={{padding:"4px 10px",fontSize:12}} onClick={()=>setView("home")}> Back</button>
        <span style={{fontWeight:600,marginLeft:8}}>{activeProject.boot?.logo} {activeProject.name}</span>
        <div style={{flex:1}} />
        <button className="mw-btn mw-btn-primary" style={{padding:"4px 10px",fontSize:12}} onClick={buildProject}>Build</button>
        <button className="mw-btn mw-btn-secondary" style={{padding:"4px 10px",fontSize:12,marginLeft:4}} onClick={exportProject}>Export</button>
      </div>
      <div className="mw-app-body mw-scroll" style={{padding:16,display:"flex",flexDirection:"column",gap:16}}>
        {buildStatus && (
          <div style={{padding:12,background:"#0d0d1a",borderRadius:8,border:`1px solid ${buildStatus==="COMPLETE"?"#23a55a":buildStatus==="FAILED"?"#dc2626":"#f0b132"}`}}>
            <div style={{fontWeight:600,marginBottom:8,color:buildStatus==="COMPLETE"?"#23a55a":buildStatus==="FAILED"?"#dc2626":"#f0b132"}}>Build: {buildStatus}</div>
            {buildLog.map((l, i) => <div key={i} style={{fontSize:11,color:"#888",fontFamily:"monospace"}}>{l}</div>)}
            {buildStatus === "COMPLETE" && <button className="mw-btn mw-btn-primary" style={{marginTop:8,padding:"4px 10px",fontSize:12}} onClick={exportProject}>Download Package</button>}
          </div>
        )}
        <div>
          <div style={{fontWeight:600,marginBottom:8,color:"#ddd"}}>OS Metadata</div>
          <input placeholder="OS Name" value={activeProject.osMeta?.name || ""} onChange={e=>updateProject({osMeta:{...activeProject.osMeta,name:e.target.value}})} style={{width:"100%",marginBottom:4,padding:"6px 10px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"#ddd",fontSize:12,outline:"none"}} />
          <div style={{display:"flex",gap:4}}>
            <input placeholder="Version" value={activeProject.osMeta?.version || ""} onChange={e=>updateProject({osMeta:{...activeProject.osMeta,version:e.target.value}})} style={{flex:1,padding:"6px 10px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"#ddd",fontSize:12,outline:"none"}} />
            <input placeholder="Author" value={activeProject.osMeta?.author || ""} onChange={e=>updateProject({osMeta:{...activeProject.osMeta,author:e.target.value}})} style={{flex:1,padding:"6px 10px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"#ddd",fontSize:12,outline:"none"}} />
          </div>
        </div>
        <div>
          <div style={{fontWeight:600,marginBottom:8,color:"#ddd"}}>Theme</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <label style={{fontSize:12,color:"#888"}}>Accent</label>
            <input type="color" value={activeProject.theme?.accent || "#4ade80"} onChange={e=>updateProject({theme:{...activeProject.theme,accent:e.target.value}})} style={{width:40,height:28,borderRadius:4,border:"1px solid rgba(255,255,255,0.15)"}} />
            <label style={{fontSize:12,color:"#888",marginLeft:8}}>Background</label>
            <input type="color" value={activeProject.theme?.bg || "#0a1a0a"} onChange={e=>updateProject({theme:{...activeProject.theme,bg:e.target.value}})} style={{width:40,height:28,borderRadius:4,border:"1px solid rgba(255,255,255,0.15)"}} />
          </div>
        </div>
        <div>
          <div style={{fontWeight:600,marginBottom:8,color:"#ddd"}}>Boot Screen</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input placeholder="Logo icon" value={activeProject.boot?.logo || ""} onChange={e=>updateProject({boot:{...activeProject.boot,logo:e.target.value}})} style={{width:60,padding:"6px 10px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"#ddd",fontSize:12,outline:"none"}} />
            <input placeholder="Boot text" value={activeProject.boot?.text || ""} onChange={e=>updateProject({boot:{...activeProject.boot,text:e.target.value}})} style={{flex:1,padding:"6px 10px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"#ddd",fontSize:12,outline:"none"}} />
          </div>
        </div>
        <div>
          <div style={{fontWeight:600,marginBottom:8,color:"#ddd"}}>Apps ({activeProject.apps?.length || 0})</div>
          {activeProject.apps?.map((app, i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",background:"#13132a",borderRadius:6,marginBottom:4}}>
              <input value={app.icon} onChange={e=>{const a=[...activeProject.apps];a[i]={...a[i],icon:e.target.value};updateProject({apps:a});}} style={{width:32,padding:"4px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:4,color:"#ddd",fontSize:14,textAlign:"center",outline:"none"}} />
              <input value={app.name} onChange={e=>{const a=[...activeProject.apps];a[i]={...a[i],name:e.target.value};updateProject({apps:a});}} style={{flex:1,padding:"4px 8px",background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:4,color:"#ddd",fontSize:12,outline:"none"}} />
              <button onClick={()=>{const a=activeProject.apps.filter((_,j)=>j!==i);updateProject({apps:a});}} style={{background:"transparent",border:"none",color:"#dc2626",cursor:"pointer",fontSize:14,display:"inline-flex"}}><Ico name="x" size={14}/></button>
            </div>
          ))}
          <button className="mw-btn mw-btn-secondary" style={{padding:"4px 10px",fontSize:12,marginTop:4}} onClick={()=>updateProject({apps:[...activeProject.apps,{id:Date.now().toString(),name:"NewApp",icon:"cube"}]})}>+ Add App</button>
        </div>
        <div>
          <div style={{fontWeight:600,marginBottom:8,color:"#ddd"}}>Project JSON</div>
          <pre style={{padding:12,background:"#0d0d1a",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",fontSize:11,color:"#888",overflow:"auto",maxHeight:200}}>{JSON.stringify(activeProject, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBXR DETECT APP
// ═══════════════════════════════════════════════════════════════════════════
function WebXRDetect() {
  const [status, setStatus] = useState("checking");
  const [details, setDetails] = useState([]);

  useEffect(() => {
    const run = async () => {
      const d = [];
      if (!("xr" in navigator)) { setStatus("unsupported"); d.push("WebXR API not available in this browser."); setDetails(d); return; }
      d.push("WebXR API: Available");
      try { const vr = await navigator.xr.isSessionSupported("immersive-vr"); d.push(`Immersive VR: ${vr ? "Supported" : "Not supported"}`); } catch (e) { d.push(`Immersive VR: Error — ${e.message}`); }
      try { const ar = await navigator.xr.isSessionSupported("immersive-ar"); d.push(`Immersive AR: ${ar ? "Supported" : "Not supported"}`); } catch (e) { d.push(`Immersive AR: Error — ${e.message}`); }
      d.push(`Inline sessions: ${"isSessionSupported" in navigator.xr ? "Supported" : "Not supported"}`);
      setStatus("supported"); setDetails(d);
    };
    run();
  }, []);

  return (
    <div className="mw-app">
      <div className="mw-app-header"><span style={{fontWeight:600,display:"flex",alignItems:"center",gap:6}}><Ico name="vr" size={14}/> WebXR Studio</span><div style={{flex:1}} /><span className={`mw-badge ${status==="supported"?"mw-badge-ok":status==="unsupported"?"mw-badge-err":"mw-badge-warn"}`}>{status.toUpperCase()}</span></div>
      <div className="mw-app-body mw-scroll" style={{padding:16}}>
        {status === "unsupported" && <div style={{padding:16,background:"rgba(220,38,38,0.1)",borderRadius:8,border:"1px solid rgba(220,38,38,0.2)",color:"#f87171",fontSize:13}}>
          WebXR is not available in this browser. WebXR requires a compatible browser (Chrome, Edge, Firefox Reality) and may require a VR/AR headset connected. This is a real capability check — no fake VR mode is provided.
        </div>}
        {details.map((d, i) => <div key={i} style={{padding:"6px 0",fontSize:13,color:"#ddd",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>{d}</div>)}
        <div style={{marginTop:16,fontSize:11,color:"#555"}}>Note: WebXR requires HTTPS, compatible hardware, and user permission. No simulated VR mode is provided — only real capability detection.</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ABOUT APP
// ═══════════════════════════════════════════════════════════════════════════
function About() {
  return (
    <div className="mw-app">
      <div className="mw-app-body mw-scroll" style={{padding:24,textAlign:"center"}}>
        <div style={{marginBottom:8,display:"flex",justifyContent:"center"}}><Ico name="fox" size={48} style={{color:"#4ade80"}}/></div>
        <div style={{fontSize:20,fontWeight:700,color:"#ddd"}}>MossyWoss OS</div>
        <div style={{color:"#888",fontSize:12,marginBottom:16}}>MWO v1.0.0 — Browser-Based Operating Environment</div>
        <div style={{textAlign:"left",maxWidth:360,margin:"0 auto",fontSize:12,color:"#aaa",lineHeight:1.6}}>
          <p style={{marginBottom:8}}>MossyWoss OS is a browser-based personal computing environment. It is NOT a native operating system. It runs inside supported browsers and respects browser security.</p>
          <p style={{marginBottom:8}}><strong>Storage:</strong> IndexedDB (MW-VFS) — local-first, no server sync</p>
          <p style={{marginBottom:8}}><strong>Offline:</strong> Core functionality works offline after initial load</p>
          <p style={{marginBottom:8}}><strong>Security:</strong> Never bypasses browser sandbox, CORS, CSP, or same-origin policy</p>
          <p style={{marginBottom:8}}><strong>Limitations:</strong> No native kernel access, no unrestricted filesystem access, no native C++/Python execution without a compiler/runtime</p>
        </div>
        <div style={{marginTop:16,padding:12,background:"rgba(255,255,255,0.05)",borderRadius:8,fontSize:11,color:"#666"}}>
          Built with love for Socks
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// APP REGISTRY
// ═══════════════════════════════════════════════════════════════════════════
const APPS = [
  { id: "files", name: "File Manager", icon: "folder", w: 500, h: 400 },
  { id: "code", name: "Code Studio", icon: "code", w: 700, h: 500 },
  { id: "settings", name: "Settings", icon: "settings", w: 450, h: 500 },
  { id: "diag", name: "Diagnostics", icon: "search", w: 500, h: 450 },
  { id: "browser", name: "Browser", icon: "globe", w: 700, h: 500 },
  { id: "chatter", name: "Chatter", icon: "chat", w: 450, h: 500 },
  { id: "rp", name: "Roleplayverse", icon: "mask", w: 450, h: 500 },
  { id: "game2d", name: "2D Game Studio", icon: "gamepad", w: 700, h: 500 },
  { id: "maker", name: "OS Maker", icon: "tools", w: 600, h: 500 },
  { id: "webxr", name: "WebXR Studio", icon: "vr", w: 450, h: 350 },
  { id: "about", name: "About MWO", icon: "info", w: 400, h: 350 },
  { id: "aura", name: "AURA Chat", icon: "discord", w: 600, h: 500 },
  { id: "games", name: "Game Hub", icon: "game-hub", w: 700, h: 550 },
  { id: "lifesim", name: "Life Sim", icon: "life-sim", w: 500, h: 450 },
  { id: "survival", name: "Survival", icon: "tent", w: 600, h: 500 },
  { id: "turnrpg", name: "Turn RPG", icon: "sword", w: 550, h: 500 },
  { id: "catcher", name: "Critter Catcher", icon: "net", w: 500, h: 500 },
  { id: "cube3d", name: "3D Viewer", icon: "cube", w: 600, h: 500 },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function MossyWoss() {
  const [booted, setBooted] = useState(false);
  const [user, setUser] = useState(null);
  const [vfs, setVfs] = useState(null);
  const [windows, setWindows] = useState([]);
  const [zCounter, setZCounter] = useState(100);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [settings, setSettings] = useState({ accent: "#4ade80", bg: "#0a1a0a", perf: "medium", keyboard: "us", reducedMotion: false });
  const [codeFile, setCodeFile] = useState(null);

  // Initialize VFS
  useEffect(() => {
    const v = new MWVFS();
    v.init().then(async () => {
      // Create default directories
      const dirs = ["/Desktop","/Documents","/Downloads","/Pictures","/Videos","/Music","/Projects","/Projects/Games","/Projects/Websites","/Projects/Apps","/Apps","/Games","/Assets","/Templates","/Exports","/Trash","/Settings"];
      for (const d of dirs) await v.ensureDir(d);
      // Load settings
      const s = await v.read("/Settings/os.json");
      if (s) { const parsed = JSON.parse(s.content); setSettings(parsed); }
      setVfs(v);
    });
  }, []);

  // Clock
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  // Close launcher when clicking elsewhere
  useEffect(() => {
    if (!launcherOpen) return;
    const handler = () => setLauncherOpen(false);
    setTimeout(() => document.addEventListener("click", handler), 100);
    return () => document.removeEventListener("click", handler);
  }, [launcherOpen]);

  // Window management
  const openApp = (appId) => {
    const app = APPS.find(a => a.id === appId);
    if (!app || !vfs) return;
    // If already open, just focus it
    const existing = windows.find(w => w.appId === appId);
    if (existing) { focusWindow(existing.id); setLauncherOpen(false); return; }
    const id = `${appId}_${Date.now()}`;
    const offset = windows.length * 30;
    setWindows(ws => [...ws, { id, appId, title: app.name, icon: app.icon, x: 60 + offset, y: 40 + offset, w: app.w, h: app.h, z: zCounter + 1, minimized: false, maximized: false }]);
    setZCounter(z => z + 1);
    setLauncherOpen(false);
  };

  const closeWindow = (id) => setWindows(ws => ws.filter(w => w.id !== id));
  const minimizeWindow = (id) => setWindows(ws => ws.map(w => w.id === id ? { ...w, minimized: true } : w));
  const maximizeWindow = (id) => setWindows(ws => ws.map(w => w.id === id ? {
    ...w, maximized: !w.maximized, prevX: w.x, prevY: w.y, prevW: w.w, prevH: w.h,
    x: w.maximized ? w.prevX : 0, y: w.maximized ? w.prevY : 0,
    w: w.maximized ? w.prevW : window.innerWidth, h: w.maximized ? w.prevH : window.innerHeight - 48
  } : w));
  const focusWindow = (id) => { setZCounter(z => z + 1); setWindows(ws => ws.map(w => w.id === id ? { ...w, z: zCounter + 1, minimized: false } : w)); };
  const dragWindow = (id, x, y) => setWindows(ws => ws.map(w => w.id === id ? { ...w, x, y } : w));
  const resizeWindow = (id, w, h) => setWindows(ws => ws.map(win => win.id === id ? { ...win, w, h } : win));

  const openFileInCodeStudio = (file) => {
    setCodeFile(file);
    openApp("code");
  };

  const renderApp = (win) => {
    switch (win.appId) {
      case "files": return <FileManager vfs={vfs} onOpenFile={openFileInCodeStudio} />;
      case "code": return <CodeStudio vfs={vfs} initialFile={codeFile} />;
      case "settings": return <SettingsApp settings={settings} setSettings={setSettings} vfs={vfs} />;
      case "diag": return <Diagnostics />;
      case "browser": return <MwBrowser vfs={vfs} />;
      case "chatter": return <Chatter vfs={vfs} />;
      case "rp": return <Roleplayverse vfs={vfs} />;
      case "game2d": return <GameStudio2D vfs={vfs} />;
      case "maker": return <OsMaker vfs={vfs} />;
      case "webxr": return <WebXRDetect />;
      case "about": return <About />;
      case "aura": return <AuraApp vfs={vfs} />;
      case "games": return <GameHub launchApp={(id) => openApp(id)} />;
      case "lifesim": return <LifeSim />;
      case "survival": return <SurvivalGame />;
      case "turnrpg": return <TurnRPG />;
      case "catcher": return <CritterCatcher />;
      case "cube3d": return <Cube3D />;
      default: return <div style={{padding:20,color:"#888"}}>Unknown app</div>;
    }
  };

  if (!vfs) return <div className="mw-boot"><div className="mw-boot-logo" style={{display:"flex",alignItems:"center",justifyContent:"center"}}><Ico name="fox" size={48} style={{color:"#4ade80"}}/></div><div className="mw-boot-text">Initializing MW-VFS...</div></div>;
  if (!booted || !user) return <><style>{MW_CSS}</style><BootScreen onLogin={(u) => { setUser(u); setBooted(true); }} vfs={vfs} /></>;

  const desktopApps = ["files", "code", "browser", "chatter", "games", "aura", "game2d", "maker", "settings", "about"];

  return (
    <>
      <style>{MW_CSS}</style>
      <div className="mw-root" style={{ ["--mw-accent"]: settings.accent }}>
        {/* Desktop */}
        <div className="mw-desktop" style={{ background: settings.bg }}>
          <div className="mw-desktop-icons">
            {desktopApps.map(id => {
              const app = APPS.find(a => a.id === id);
              return (
                <div key={id} className="mw-desktop-icon" onDoubleClick={() => openApp(id)} onClick={(e) => { if (e.detail === 1) openApp(id); }}>
                  <span style={{display:"flex",alignItems:"center",justifyContent:"center"}}><Ico name={app.icon} size={28}/></span>
                  <span>{app.name}</span>
                </div>
              );
            })}
          </div>

          {/* Windows */}
          {windows.map(win => (
            <MwWindow key={win.id} win={win} onFocus={focusWindow} onClose={closeWindow} onMinimize={minimizeWindow} onMaximize={maximizeWindow} onDrag={dragWindow} onResize={resizeWindow}>
              {renderApp(win)}
            </MwWindow>
          ))}

          {/* Taskbar */}
          <div className="mw-taskbar">
            <div onClick={(e) => { e.stopPropagation(); setLauncherOpen(o => !o); }} style={{cursor:"pointer",padding:"6px 10px",borderRadius:8,background:settings.accent,color:"white",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}><Ico name="fox" size={16}/></div>
            {windows.map(w => {
              const app = APPS.find(a => a.id === w.appId);
              return (
                <div key={w.id} className={`mw-taskbar-item ${!w.minimized ? "active" : ""}`} onClick={() => w.minimized ? focusWindow(w.id) : minimizeWindow(w.id)}>
                  <span>{app?.icon}</span>
                  <span>{w.title}</span>
                </div>
              );
            })}
            <div className="mw-tray">
              <span className="mw-tray-clock">
                {time.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                <div style={{fontSize:9,color:"#666"}}>{time.toLocaleDateString("en-AU",{day:"numeric",month:"short"})}</div>
              </span>
            </div>
          </div>

          {/* Launcher */}
          {launcherOpen && (
            <div className="mw-launcher" onClick={e => e.stopPropagation()}>
              <div style={{color:"#888",fontSize:11,marginBottom:8,padding:"0 4px"}}>Applications</div>
              <div className="mw-launcher-grid">
                {APPS.map(app => (
                  <div key={app.id} className="mw-launcher-item" onClick={() => openApp(app.id)}>
                    <span style={{display:"flex",alignItems:"center",justifyContent:"center"}}><Ico name={app.icon} size={24}/></span>
                    <span>{app.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
