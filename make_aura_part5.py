import sys, os

with open('mw_web/aura.js', 'a', encoding='utf-8') as f:
    f.write('''
  // ---------------------------------------------------------------------------
  // UI RENDERING ENGINE
  // ---------------------------------------------------------------------------

  function injectStyles() {
    if (document.getElementById('aura-custom-styles')) return;
    const style = document.createElement('style');
    style.id = 'aura-custom-styles';
    style.textContent = `
      .aura-root { display:flex; height:100%; width:100%; background:#130f1e; color:#ece0fd; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; overflow:hidden; }
      .aura-rail { flex:0 0 72px; background:#0d0a14; border-right:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; align-items:center; padding:12px 0; gap:10px; z-index:10; }
      .aura-server-icon { width:48px; height:48px; border-radius:50%; background:#231b34; color:#fff; font-size:22px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s ease; position:relative; user-select:none; }
      .aura-server-icon:hover { border-radius:16px; background:#432d68; }
      .aura-server-icon.active { border-radius:16px; background:#583985; box-shadow:0 0 14px rgba(168,85,247,0.4); }
      .aura-server-icon.active::before { content:''; position:absolute; left:-12px; width:4px; height:32px; background:#a855f7; border-radius:0 4px 4px 0; }
      
      .aura-channels-pane { flex:0 0 220px; background:#1a1427; border-right:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; z-index:9; }
      .aura-server-header { padding:14px 16px; border-bottom:1px solid rgba(255,255,255,0.06); font-weight:700; font-size:0.95em; display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.15); }
      .aura-channel-list { flex:1; overflow-y:auto; padding:12px 8px; display:flex; flex-direction:column; gap:2px; }
      .aura-channel-item { padding:8px 10px; border-radius:6px; font-size:0.88em; color:#a799c4; cursor:pointer; display:flex; align-items:center; gap:8px; transition:all 0.15s ease; }
      .aura-channel-item:hover { background:rgba(255,255,255,0.05); color:#ece0fd; }
      .aura-channel-item.active { background:rgba(168,85,247,0.22); color:#fff; font-weight:600; }
      .aura-rp-badge { font-size:0.68em; background:#ec4899; color:#fff; padding:1px 5px; border-radius:4px; font-weight:700; margin-left:auto; }

      .aura-user-panel { height:56px; background:#110d1a; padding:8px 12px; display:flex; align-items:center; gap:10px; border-top:1px solid rgba(255,255,255,0.06); cursor:pointer; }
      .aura-user-panel:hover { background:#181225; }
      .aura-status-dot { width:10px; height:10px; border-radius:50%; position:absolute; bottom:0; right:0; border:2px solid #110d1a; }
      .aura-status-online { background:#10b981; }
      .aura-status-idle { background:#f59e0b; }
      .aura-status-invisible { background:#6b7280; }

      .aura-chat-pane { flex:1; display:flex; flex-direction:column; background:#130f1e; position:relative; }
      .aura-chat-header { height:48px; border-bottom:1px solid rgba(255,255,255,0.06); padding:0 16px; display:flex; align-items:center; gap:10px; background:rgba(0,0,0,0.1); }
      .aura-msg-container { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; }

      .aura-msg-card { display:flex; gap:12px; padding:6px 10px; border-radius:8px; transition:background 0.15s ease; position:relative; }
      .aura-msg-card:hover { background:rgba(255,255,255,0.025); }
      .aura-msg-avatar { width:38px; height:38px; border-radius:50%; background:#231b34; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; cursor:pointer; }
      .aura-msg-content { flex:1; font-size:0.92em; line-height:1.45; }
      .aura-msg-header { display:flex; align-items:baseline; gap:8px; margin-bottom:3px; }
      .aura-msg-author { font-weight:700; cursor:pointer; }
      .aura-msg-time { font-size:0.75em; color:#7e6d9b; }

      .aura-reactions-row { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
      .aura-chip { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:12px; background:rgba(255,255,255,0.08); font-size:0.78em; cursor:pointer; transition:background 0.15s ease; user-select:none; }
      .aura-chip:hover { background:rgba(168,85,247,0.3); }

      .aura-input-box { padding:12px 16px; border-top:1px solid rgba(255,255,255,0.06); background:#110d1a; display:flex; flex-direction:column; gap:6px; }
      .aura-input-wrapper { display:flex; align-items:center; gap:10px; background:#1e172e; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:6px 12px; }
      .aura-textarea { flex:1; background:transparent; border:none; color:#fff; font-size:0.9em; outline:none; resize:none; font-family:inherit; max-height:100px; }

      .aura-modal-overlay { position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:100; backdrop-filter:blur(3px); }
      .aura-modal { background:#1e172e; border:1px solid rgba(255,255,255,0.12); border-radius:14px; width:460px; max-width:92%; padding:20px; box-shadow:0 12px 36px rgba(0,0,0,0.5); color:#ece0fd; }

      .aura-btn { padding:8px 16px; border-radius:8px; border:none; background:#583985; color:#fff; font-weight:600; cursor:pointer; transition:all 0.15s ease; }
      .aura-btn:hover { background:#7046aa; }
      .aura-btn-secondary { background:rgba(255,255,255,0.1); color:#ccc; }
      .aura-btn-secondary:hover { background:rgba(255,255,255,0.18); }

      @media (max-width: 720px) {
        .aura-rail { flex:0 0 60px; }
        .aura-channels-pane { flex:0 0 180px; }
      }
    `;
    document.head.appendChild(style);
  }

  function renderApp() {
    if (!winBody) return;
    injectStyles();

    let curServer = servers.find(s => s.id === activeServerId) || servers[0];
    let curChannel = curServer.channels.find(c => c.id === activeChannelId) || curServer.channels[0];
    activeChannelId = curChannel.id;

    let curMsgs = messages[activeChannelId] || [];

    winBody.innerHTML = `
      <div class="aura-root">
        <!-- LEFT SERVER RAIL -->
        <div class="aura-rail">
          <div class="aura-server-icon" title="Browse / Add Server" onclick="MWO.Aura.openServerModal()">➕</div>
          <div style="width:32px; height:2px; background:rgba(255,255,255,0.1); margin:4px 0;"></div>
          ${servers.map(s => `
            <div class="aura-server-icon ${s.id === activeServerId ? 'active' : ''}" style="${s.id === activeServerId ? 'background:' + s.color : ''}" title="${s.name}" onclick="MWO.Aura.switchServer('${s.id}')">
              ${s.icon}
            </div>
          `).join('')}
        </div>

        <!-- MIDDLE CHANNEL LIST -->
        <div class="aura-channels-pane">
          <div class="aura-server-header">
            <span>${curServer.icon} ${curServer.name}</span>
            <span style="font-size:0.75em; color:${curServer.autoMod ? '#10b981' : '#6b7280'}; cursor:pointer;" onclick="MWO.Aura.toggleAutoMod('${curServer.id}')" title="Toggle AutoMod">
              ${curServer.autoMod ? '🛡️ AutoMod On' : '🛡️ Off'}
            </span>
          </div>
          <div class="aura-channel-list">
            <div style="font-size:0.72em; font-weight:700; color:#7e6d9b; padding:6px 8px; letter-spacing:0.05em;">CHANNELS</div>
            ${curServer.channels.map(c => `
              <div class="aura-channel-item ${c.id === activeChannelId ? 'active' : ''}" onclick="MWO.Aura.switchChannel('${c.id}')">
                <span>#</span>
                <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.name}</span>
                ${c.rpMode ? `<span class="aura-rp-badge">RP</span>` : ''}
              </div>
            `).join('')}
          </div>

          <!-- USER PANEL AT BOTTOM -->
          <div class="aura-user-panel" onclick="MWO.Aura.openProfileModal()">
            <div style="position:relative;">
              <div style="width:36px; height:36px; border-radius:50%; background:#231b34; display:flex; align-items:center; justify-content:center; font-size:18px;">
                ${profile.avatar}
              </div>
              <div class="aura-status-dot aura-status-${profile.status}"></div>
            </div>
            <div style="flex:1; overflow:hidden;">
              <div style="font-weight:700; font-size:0.88em; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${profile.username}</div>
              <div style="font-size:0.72em; color:#8c7ba8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${profile.bio}</div>
            </div>
            <span style="font-size:16px;" title="Edit Profile">⚙️</span>
          </div>
        </div>

        <!-- RIGHT MAIN CHAT AREA -->
        <div class="aura-chat-pane">
          <div class="aura-chat-header">
            <span style="font-size:18px; font-weight:700; color:#a855f7;">#</span>
            <span style="font-weight:700; font-size:0.95em;">${curChannel.name}</span>
            <span style="font-size:0.8em; color:#8c7ba8; margin-left:8px; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${curChannel.topic || ''}</span>
          </div>

          <!-- MESSAGES CONTAINER -->
          <div class="aura-msg-container" id="aura-msg-scroll">
            ${curMsgs.length === 0 ? `
              <div style="margin:auto; text-align:center; color:#7e6d9b; padding:40px;">
                <div style="font-size:42px; margin-bottom:10px;">💬</div>
                <div style="font-weight:700; font-size:1.1em; color:#fff;">Welcome to #${curChannel.name}!</div>
                <div style="font-size:0.85em; margin-top:4px;">This is the start of the #${curChannel.name} channel. Say hi to the AI companions!</div>
              </div>
            ` : curMsgs.map(m => renderMessageCard(m)).join('')}
          </div>

          <!-- TYPING INDICATOR -->
          <div id="aura-typing-indicator" style="height:20px; padding:0 18px; font-size:0.75em; color:#a855f7; display:none; align-items:center; gap:6px;">
            <span style="animation:pulse 1s infinite;">● ● ●</span> <span id="aura-typing-text">AI is typing...</span>
          </div>

          <!-- INPUT BOX -->
          <div class="aura-input-box">
            <div class="aura-input-wrapper">
              <button style="background:none; border:none; font-size:18px; cursor:pointer; color:#a855f7;" title="Share Image" onclick="MWO.Aura.triggerFileUpload()">📎</button>
              <input type="file" id="aura-file-input" accept="image/*" style="display:none;" onchange="MWO.Aura.handleImageUpload(event)" />
              
              <textarea id="aura-input-textarea" class="aura-textarea" rows="1" placeholder="Message #${curChannel.name}..." onkeydown="MWO.Aura.handleInputKeydown(event)" oninput="MWO.Aura.updateCharCounter()"></textarea>
              
              <span id="aura-char-count" style="font-size:0.72em; color:#6b7280; user-select:none;">0/2000</span>
              <button id="aura-send-btn" class="aura-btn" style="padding:6px 14px; font-size:0.85em;" onclick="MWO.Aura.sendMessage()">Send 🚀</button>
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(scrollToBottom, 50);
  }

  function renderMessageCard(m) {
    let isUser = m.senderId === 'user';
    let parsedText = parseMarkdown(m.text || '');

    return `
      <div class="aura-msg-card" id="msg-${m.id}">
        <div class="aura-msg-avatar" onclick="MWO.Aura.openBotCard('${m.senderId}')">
          ${m.senderAvatar}
        </div>
        <div class="aura-msg-content">
          <div class="aura-msg-header">
            <span class="aura-msg-author" style="color:${m.senderColor}" onclick="MWO.Aura.openBotCard('${m.senderId}')">${m.senderName}</span>
            <span class="aura-msg-time">${m.timestamp}</span>
            ${isUser ? `<button style="margin-left:auto; background:none; border:none; color:#ef4444; font-size:0.75em; cursor:pointer;" onclick="MWO.Aura.deleteMessage('${m.id}')" title="Delete Message">🗑️</button>` : ''}
          </div>
          <div>${parsedText}</div>
          ${m.imageUrl ? `<img src="${m.imageUrl}" style="max-height:200px; border-radius:8px; margin-top:8px; display:block; border:1px solid rgba(255,255,255,0.1);" />` : ''}
          
          <div class="aura-reactions-row">
            ${m.reactions ? Object.keys(m.reactions).map(emoji => `
              <span class="aura-chip" onclick="MWO.Aura.toggleReaction('${m.id}', '${emoji}')">${emoji} ${m.reactions[emoji]}</span>
            `).join('') : ''}
            <span class="aura-chip" style="opacity:0.6;" onclick="MWO.Aura.showReactionPicker('${m.id}')">+😊</span>
          </div>
        </div>
      </div>
    `;
  }

  function parseMarkdown(text) {
    if (!text) return '';
    let escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    escaped = escaped.replace(/```([a-z]*)\n([\s\S]*?)```/gi, '<pre style="background:#0d0a14; padding:10px; border-radius:6px; font-family:var(--mono, monospace); font-size:0.85em; overflow-x:auto; margin:6px 0; border:1px solid rgba(255,255,255,0.08);"><code>$2</code></pre>');
    escaped = escaped.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 5px; border-radius:4px; font-family:var(--mono, monospace); font-size:0.88em;">$1</code>');
    escaped = escaped.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\\*([^*]+)\\*/g, '<em style="color:#d8b4fe;">$1</em>');
    escaped = escaped.replace(/\\n/g, '<br/>');
    return escaped;
  }

  function scrollToBottom() {
    let el = document.getElementById('aura-msg-scroll');
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ---------------------------------------------------------------------------
  // HANDLERS & MODERATION LOGIC
  // ---------------------------------------------------------------------------

  function switchServer(srvId) {
    activeServerId = srvId;
    let srv = servers.find(s => s.id === srvId);
    if (srv && srv.channels.length > 0) {
      activeChannelId = srv.channels[0].id;
    }
    renderApp();
  }

  function switchChannel(chanId) {
    activeChannelId = chanId;
    renderApp();
  }

  function toggleAutoMod(srvId) {
    let srv = servers.find(s => s.id === srvId);
    if (srv) {
      srv.autoMod = !srv.autoMod;
      saveServer(srv);
      MWO.notif.show('Aura Moderation', `AutoMod is now ${srv.autoMod ? 'ENABLED' : 'DISABLED'} for ${srv.name}.`);
      renderApp();
    }
  }

  function updateCharCounter() {
    let txt = document.getElementById('aura-input-textarea');
    let cnt = document.getElementById('aura-char-count');
    if (txt && cnt) {
      cnt.textContent = `${txt.value.length}/2000`;
      if (txt.value.length > 2000) cnt.style.color = '#ef4444';
      else cnt.style.color = '#6b7280';
    }
  }

  function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function sendMessage() {
    if (Date.now() < cooldownEndTime) {
      MWO.notif.show('Aura Mod', 'You are on cooldown! Please wait a moment.');
      return;
    }

    let txtEl = document.getElementById('aura-input-textarea');
    if (!txtEl) return;
    let rawText = txtEl.value.trim();
    if (!rawText) return;

    let srv = servers.find(s => s.id === activeServerId) || servers[0];

    // Moderation Check 1: Bad words
    if (srv.autoMod && BAD_WORDS.some(w => rawText.toLowerCase().includes(w))) {
      MWO.notif.show('AuraMod Warning', 'Your message contained inappropriate words and was blocked by AutoMod.');
      return;
    }

    // Moderation Check 2: Spam Detection (same msg 3x in 10s)
    let now = Date.now();
    recentUserMsgs = recentUserMsgs.filter(m => now - m.time < 10000);
    let sameCount = recentUserMsgs.filter(m => m.text === rawText).length;
    if (srv.autoMod && sameCount >= 2) {
      postSystemMessage(`[AuraMod] ⚠️ Slowed down — please don't spam identical messages!`);
      txtEl.value = '';
      updateCharCounter();
      return;
    }

    // Moderation Check 3: Flood Detection (6 msgs in 5s)
    let fiveSecMsgs = recentUserMsgs.filter(m => now - m.time < 5000);
    if (srv.autoMod && fiveSecMsgs.length >= 5) {
      enforceCooldown(5);
      postSystemMessage(`[AuraMod] ⚠️ Flood limit reached. 5-second cooldown activated.`);
      return;
    }

    recentUserMsgs.push({ text: rawText, time: now });

    let msgObj = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      senderId: 'user',
      senderName: profile.username,
      senderAvatar: profile.avatar,
      senderColor: profile.color,
      isBot: false,
      text: rawText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: {}
    };

    if (!messages[activeChannelId]) messages[activeChannelId] = [];
    messages[activeChannelId].push(msgObj);
    saveChannelMessages(activeChannelId);

    txtEl.value = '';
    updateCharCounter();
    renderApp();

    triggerBotReplies(srv, rawText);
  }

  function postSystemMessage(text) {
    let sysMsg = {
      id: 'sys-' + Date.now(),
      senderId: 'system',
      senderName: 'AuraMod System',
      senderAvatar: '🛡️',
      senderColor: '#ef4444',
      isBot: true,
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: {}
    };
    if (!messages[activeChannelId]) messages[activeChannelId] = [];
    messages[activeChannelId].push(sysMsg);
    saveChannelMessages(activeChannelId);
    renderApp();
  }

  function enforceCooldown(seconds) {
    cooldownEndTime = Date.now() + (seconds * 1000);
    let sendBtn = document.getElementById('aura-send-btn');
    let txtArea = document.getElementById('aura-input-textarea');
    if (txtArea) txtArea.disabled = true;

    if (cooldownTimerInterval) clearInterval(cooldownTimerInterval);
    cooldownTimerInterval = setInterval(() => {
      let remaining = Math.ceil((cooldownEndTime - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(cooldownTimerInterval);
        if (txtArea) txtArea.disabled = false;
        if (sendBtn) sendBtn.textContent = 'Send 🚀';
      } else {
        if (sendBtn) sendBtn.textContent = `Cooldown (${remaining}s)`;
      }
    }, 500);
  }

  function triggerBotReplies(srv, userMsgText) {
    let curChan = srv.channels.find(c => c.id === activeChannelId);
    let botIds = srv.botIds || ['ember', 'sage'];

    let primaryBot = BOTS[botIds[0]] || BOTS['ember'];

    showTypingIndicator(`${primaryBot.avatar} ${primaryBot.name} is typing...`);

    let delay = Math.min(2500, Math.max(800, userMsgText.length * 40));

    setTimeout(() => {
      hideTypingIndicator();

      let replyText = respond(primaryBot, userMsgText, { channelId: activeChannelId, channelName: curChan ? curChan.name : '', rpMode: curChan ? curChan.rpMode : false });

      let botMsgObj = {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        senderId: primaryBot.id,
        senderName: primaryBot.name,
        senderAvatar: primaryBot.avatar,
        senderColor: primaryBot.color,
        isBot: true,
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reactions: {}
      };

      messages[activeChannelId].push(botMsgObj);
      saveChannelMessages(activeChannelId);
      renderApp();

      channelMsgCounts[activeChannelId] = (channelMsgCounts[activeChannelId] || 0) + 1;
      if (channelMsgCounts[activeChannelId] >= 4 && botIds.length > 1) {
        channelMsgCounts[activeChannelId] = 0;
        let secBot = BOTS[botIds[1]] || BOTS['sage'];
        setTimeout(() => {
          let autoMsg = `${secBot.avatar} **${secBot.name}**: ${secBot.talkingPoints[Math.floor(Math.random() * secBot.talkingPoints.length)]}`;
          messages[activeChannelId].push({
            id: 'auto-' + Date.now(),
            senderId: secBot.id,
            senderName: secBot.name,
            senderAvatar: secBot.avatar,
            senderColor: secBot.color,
            isBot: true,
            text: autoMsg,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            reactions: {}
          });
          saveChannelMessages(activeChannelId);
          renderApp();
        }, 3000);
      }
    }, delay);
  }

  function showTypingIndicator(txt) {
    let ind = document.getElementById('aura-typing-indicator');
    let label = document.getElementById('aura-typing-text');
    if (ind && label) {
      label.textContent = txt;
      ind.style.display = 'flex';
    }
  }

  function hideTypingIndicator() {
    let ind = document.getElementById('aura-typing-indicator');
    if (ind) ind.style.display = 'none';
  }

  function deleteMessage(msgId) {
    if (!messages[activeChannelId]) return;
    messages[activeChannelId] = messages[activeChannelId].filter(m => m.id !== msgId);
    saveChannelMessages(activeChannelId);
    renderApp();
  }

  function toggleReaction(msgId, emoji) {
    let list = messages[activeChannelId] || [];
    let msg = list.find(m => m.id === msgId);
    if (!msg) return;
    if (!msg.reactions) msg.reactions = {};
    if (msg.reactions[emoji]) {
      msg.reactions[emoji]++;
    } else {
      msg.reactions[emoji] = 1;
    }
    saveChannelMessages(activeChannelId);
    renderApp();
  }

  function showReactionPicker(msgId) {
    const emojis = ['👍', '❤️', '😂', '🔥', '🚀', '💜'];
    let chosen = emojis[Math.floor(Math.random() * emojis.length)];
    toggleReaction(msgId, chosen);
  }

  function triggerFileUpload() {
    let inp = document.getElementById('aura-file-input');
    if (inp) inp.click();
  }

  function handleImageUpload(evt) {
    let file = evt.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function(e) {
      let dataUrl = e.target.result;
      let path = '/Pictures/aura_' + Date.now() + '.png';

      MWO.fs.writeFile(path, dataUrl).then(() => {
        let msgObj = {
          id: 'msg-' + Date.now(),
          senderId: 'user',
          senderName: profile.username,
          senderAvatar: profile.avatar,
          senderColor: profile.color,
          isBot: false,
          text: `Shared an image to #${activeChannelId}`,
          imageUrl: dataUrl,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          reactions: {}
        };
        if (!messages[activeChannelId]) messages[activeChannelId] = [];
        messages[activeChannelId].push(msgObj);
        saveChannelMessages(activeChannelId);
        renderApp();
        MWO.notif.show('Aura Image', 'Saved image to VFS ' + path);
      });
    };
    reader.readAsDataURL(file);
  }

  // ---------------------------------------------------------------------------
  // MODALS
  // ---------------------------------------------------------------------------

  function openProfileModal() {
    let overlay = document.createElement('div');
    overlay.className = 'aura-modal-overlay';
    overlay.id = 'aura-profile-modal-overlay';

    let emojis = ['💜','🦊','🦉','💻','🤖','🎭','🎵','🎨','⚔️','🌍','🌙','📡','🚀','✨','🔥','⭐','🐺','🐱','🐶','🦁','🐼','🦄','🐉','👑','💎','🎮','🎧','🎯','🏆','🎲'];

    overlay.innerHTML = `
      <div class="aura-modal">
        <h3 style="margin-top:0; color:#a855f7; display:flex; align-items:center; gap:8px;">⚙️ User Profile Settings</h3>
        
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:14px;">
          <div>
            <label style="font-size:0.8em; color:#a799c4; display:block; margin-bottom:4px;">USERNAME</label>
            <input id="pm-username" type="text" value="${profile.username}" style="width:100%; padding:8px 12px; background:#110d1a; border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff;" />
          </div>

          <div>
            <label style="font-size:0.8em; color:#a799c4; display:block; margin-bottom:4px;">CHOOSE AVATAR</label>
            <div style="display:grid; grid-template-columns:repeat(10, 1fr); gap:6px; max-height:100px; overflow-y:auto; padding:6px; background:#110d1a; border-radius:6px;">
              ${emojis.map(e => `
                <span style="font-size:20px; cursor:pointer; text-align:center; padding:2px; border-radius:4px; background:${profile.avatar === e ? 'rgba(168,85,247,0.4)' : 'transparent'};" onclick="MWO.Aura.selectProfileAvatar('${e}')">${e}</span>
              `).join('')}
            </div>
          </div>

          <div>
            <label style="font-size:0.8em; color:#a799c4; display:block; margin-bottom:4px;">BIO / ABOUT YOU</label>
            <textarea id="pm-bio" rows="2" style="width:100%; padding:8px 12px; background:#110d1a; border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff; resize:none;">${profile.bio}</textarea>
          </div>

          <div>
            <label style="font-size:0.8em; color:#a799c4; display:block; margin-bottom:4px;">STATUS</label>
            <div style="display:flex; gap:16px; font-size:0.88em;">
              <label><input type="radio" name="pm-status" value="online" ${profile.status === 'online' ? 'checked' : ''} /> 🟢 Online</label>
              <label><input type="radio" name="pm-status" value="idle" ${profile.status === 'idle' ? 'checked' : ''} /> 🟡 Idle</label>
              <label><input type="radio" name="pm-status" value="invisible" ${profile.status === 'invisible' ? 'checked' : ''} /> ⚪ Invisible</label>
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:18px;">
          <button class="aura-btn aura-btn-secondary" onclick="MWO.Aura.closeModal('aura-profile-modal-overlay')">Cancel</button>
          <button class="aura-btn" onclick="MWO.Aura.saveProfile()">Save Changes</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function selectProfileAvatar(e) {
    profile.avatar = e;
    closeModal('aura-profile-modal-overlay');
    openProfileModal();
  }

  function saveProfile() {
    let un = document.getElementById('pm-username');
    let bio = document.getElementById('pm-bio');
    let stat = document.querySelector('input[name="pm-status"]:checked');

    if (un && un.value) profile.username = un.value.trim();
    if (bio) profile.bio = bio.value.trim();
    if (stat) profile.status = stat.value;

    MWO.db.put('aura-data', 'profile', profile);
    closeModal('aura-profile-modal-overlay');
    MWO.notif.show('Aura Profile', 'Saved profile changes successfully!');
    renderApp();
  }

  function openBotCard(botId) {
    if (botId === 'user') { openProfileModal(); return; }
    let bot = BOTS[botId];
    if (!bot) return;

    let overlay = document.createElement('div');
    overlay.className = 'aura-modal-overlay';
    overlay.id = 'aura-bot-card-overlay';

    overlay.innerHTML = `
      <div class="aura-modal">
        <div style="height:80px; background:${bot.color}; margin:-20px -20px 0 -20px; border-radius:14px 14px 0 0; position:relative;">
          <div style="width:64px; height:64px; border-radius:50%; background:#1e172e; border:4px solid #1e172e; display:flex; align-items:center; justify-content:center; font-size:32px; position:absolute; bottom:-28px; left:20px;">
            ${bot.avatar}
          </div>
        </div>

        <div style="margin-top:36px;">
          <h3 style="margin:0; color:#fff;">${bot.name} <span style="font-size:0.6em; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; color:#a799c4;">BOT</span></h3>
          <p style="font-size:0.85em; color:#a799c4; margin:6px 0 12px 0;">${bot.personality}</p>

          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px;">
            ${bot.traits.map(t => `<span style="font-size:0.75em; background:rgba(168,85,247,0.2); color:#d8b4fe; padding:2px 8px; border-radius:12px;">${t}</span>`).join('')}
          </div>

          <div style="font-weight:700; font-size:0.8em; color:#7e6d9b; margin-bottom:8px;">VIBE STATS</div>
          <div style="display:flex; flex-direction:column; gap:6px; font-size:0.8em;">
            ${Object.keys(bot.vibe).map(stat => `
              <div>
                <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                  <span>${stat}</span>
                  <span style="color:${bot.color}">${bot.vibe[stat]}%</span>
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
                  <div style="width:${bot.vibe[stat]}%; height:100%; background:${bot.color}; border-radius:3px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:20px;">
          <button class="aura-btn" onclick="MWO.Aura.closeModal('aura-bot-card-overlay')">Close Card</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function openServerModal() {
    let overlay = document.createElement('div');
    overlay.className = 'aura-modal-overlay';
    overlay.id = 'aura-server-modal-overlay';

    overlay.innerHTML = `
      <div class="aura-modal" style="width:520px;">
        <div style="background:rgba(168,85,247,0.15); border:1px solid rgba(168,85,247,0.3); padding:10px 14px; border-radius:8px; font-size:0.82em; color:#d8b4fe; margin-bottom:16px;">
          ℹ️ <strong>Aura Companion Notice</strong>: Aura is inhabited entirely by AI companions — every member you meet in servers is a bot companion.
        </div>

        <div style="display:flex; border-bottom:1px solid rgba(255,255,255,0.1); margin-bottom:16px;">
          <button id="sm-tab-create" style="flex:1; padding:8px; background:none; border:none; color:#a855f7; border-bottom:2px solid #a855f7; font-weight:700; cursor:pointer;" onclick="MWO.Aura.switchServerTab('create')">➕ Create Server</button>
          <button id="sm-tab-browse" style="flex:1; padding:8px; background:none; border:none; color:#a799c4; font-weight:700; cursor:pointer;" onclick="MWO.Aura.switchServerTab('browse')">🔍 Browse Pre-made Servers</button>
        </div>

        <div id="sm-content-create">
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div>
              <label style="font-size:0.8em; color:#a799c4; display:block; margin-bottom:4px;">SERVER NAME</label>
              <input id="sm-name" type="text" placeholder="e.g. Stargazer Club" style="width:100%; padding:8px 12px; background:#110d1a; border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff;" />
            </div>

            <div>
              <label style="font-size:0.8em; color:#a799c4; display:block; margin-bottom:4px;">ICON EMOJI</label>
              <input id="sm-icon" type="text" value="🔮" style="width:100%; padding:8px 12px; background:#110d1a; border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff;" />
            </div>

            <div>
              <label style="font-size:0.8em; color:#a799c4; display:block; margin-bottom:4px;">THEME COLOR</label>
              <input id="sm-color" type="color" value="#a855f7" style="width:100%; height:38px; padding:2px; background:#110d1a; border:1px solid rgba(255,255,255,0.1); border-radius:6px; cursor:pointer;" />
            </div>

            <div>
              <label style="font-size:0.8em; color:#a799c4; display:block; margin-bottom:4px;">DESCRIPTION</label>
              <textarea id="sm-desc" rows="2" placeholder="What is this server about?" style="width:100%; padding:8px 12px; background:#110d1a; border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff; resize:none;"></textarea>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:18px;">
            <button class="aura-btn aura-btn-secondary" onclick="MWO.Aura.closeModal('aura-server-modal-overlay')">Cancel</button>
            <button class="aura-btn" onclick="MWO.Aura.createNewServer()">Create Server</button>
          </div>
        </div>

        <div id="sm-content-browse" style="display:none; max-height:300px; overflow-y:auto;">
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${INITIAL_SERVERS.map(s => `
              <div style="display:flex; align-items:center; gap:12px; padding:10px; background:#110d1a; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                <div style="font-size:28px; width:40px; text-align:center;">${s.icon}</div>
                <div style="flex:1;">
                  <div style="font-weight:700; color:#fff;">${s.name}</div>
                  <div style="font-size:0.78em; color:#a799c4;">${s.description}</div>
                </div>
                <button class="aura-btn" style="padding:4px 12px; font-size:0.8em;" onclick="MWO.Aura.joinPremadeServer('${s.id}')">Join / Switch</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function switchServerTab(tab) {
    let btnCreate = document.getElementById('sm-tab-create');
    let btnBrowse = document.getElementById('sm-tab-browse');
    let cntCreate = document.getElementById('sm-content-create');
    let cntBrowse = document.getElementById('sm-content-browse');

    if (tab === 'create') {
      btnCreate.style.color = '#a855f7'; btnCreate.style.borderBottom = '2px solid #a855f7';
      btnBrowse.style.color = '#a799c4'; btnBrowse.style.borderBottom = 'none';
      cntCreate.style.display = 'block'; cntBrowse.style.display = 'none';
    } else {
      btnBrowse.style.color = '#a855f7'; btnBrowse.style.borderBottom = '2px solid #a855f7';
      btnCreate.style.color = '#a799c4'; btnCreate.style.borderBottom = 'none';
      cntBrowse.style.display = 'block'; cntCreate.style.display = 'none';
    }
  }

  function createNewServer() {
    let nameEl = document.getElementById('sm-name');
    let iconEl = document.getElementById('sm-icon');
    let colorEl = document.getElementById('sm-color');
    let descEl = document.getElementById('sm-desc');

    let name = nameEl && nameEl.value ? nameEl.value.trim() : 'Custom Guild';
    let icon = iconEl && iconEl.value ? iconEl.value.trim() : '🔮';
    let color = colorEl && colorEl.value ? colorEl.value : '#a855f7';
    let desc = descEl && descEl.value ? descEl.value.trim() : 'User created AI server';

    let newSrv = {
      id: 'srv-' + Date.now(),
      name: name,
      icon: icon,
      color: color,
      description: desc,
      botIds: ['ember', 'sage'],
      autoMod: true,
      channels: [
        { id: 'general-' + Date.now(), name: 'general', type: 'text', rpMode: false, topic: 'General chat for ' + name }
      ]
    };

    servers.push(newSrv);
    saveServer(newSrv);

    activeServerId = newSrv.id;
    activeChannelId = newSrv.channels[0].id;

    closeModal('aura-server-modal-overlay');
    MWO.notif.show('Aura Server', `Created server '${name}' with starter bots Ember & Sage!`);
    renderApp();
  }

  function joinPremadeServer(srvId) {
    switchServer(srvId);
    closeModal('aura-server-modal-overlay');
  }

  function closeModal(overlayId) {
    let el = document.getElementById(overlayId);
    if (el) el.remove();
  }

  // ---------------------------------------------------------------------------
  // PUBLIC LAUNCH FUNCTION & APP REGISTRATION
  // ---------------------------------------------------------------------------

  function launch() {
    let w = MWO.wm.create({
      id: 'aura-' + Date.now(),
      title: 'Aura — AI Social Platform',
      icon: '💜',
      width: 960,
      height: 640,
      x: 60,
      y: 40,
      resizable: true
    });
    winBody = w;

    loadDataFromStorage().then(() => {
      renderApp();
    });
  }

  return {
    launch: launch,
    switchServer: switchServer,
    switchChannel: switchChannel,
    toggleAutoMod: toggleAutoMod,
    updateCharCounter: updateCharCounter,
    handleInputKeydown: handleInputKeydown,
    sendMessage: sendMessage,
    triggerFileUpload: triggerFileUpload,
    handleImageUpload: handleImageUpload,
    openProfileModal: openProfileModal,
    selectProfileAvatar: selectProfileAvatar,
    saveProfile: saveProfile,
    openBotCard: openBotCard,
    openServerModal: openServerModal,
    switchServerTab: switchServerTab,
    createNewServer: createNewServer,
    joinPremadeServer: joinPremadeServer,
    deleteMessage: deleteMessage,
    toggleReaction: toggleReaction,
    showReactionPicker: showReactionPicker,
    closeModal: closeModal
  };

})();

// Register with MossyWoss OS App Store
MWO.registerApp({
  id: 'aura',
  name: 'Aura',
  description: 'AI social platform — servers, channels & AI companions',
  icon: '💜',
  category: 'app',
  installed: false,
  launch: function() {
    MWO.Aura.launch();
  }
});
''')

print("Part 5 written")
