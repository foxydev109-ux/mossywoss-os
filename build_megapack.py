import subprocess
import os

# We will write the megapack.js builder in Python to create a single file.

js_header = """var MWO=MWO||{};
(function(){
  'use strict';
  function reg(id, name, desc, icon, cat, fn){
    MWO.registerApp({
      id: id,
      name: name,
      description: desc,
      icon: icon,
      category: cat || 'game',
      installed: false,
      launch: fn
    });
  }
  function playTone(freq, dur, type, vol) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ctx = new AC();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol || 0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (dur || 0.2));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (dur || 0.2));
      setTimeout(function(){ ctx.close(); }, (dur || 0.2) * 1000 + 100);
    } catch(e) {}
  }
"""

print("Header initialized.")
