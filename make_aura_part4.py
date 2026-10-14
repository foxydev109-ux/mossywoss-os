import sys, os

with open('mw_web/aura.js', 'a', encoding='utf-8') as f:
    f.write('''
  // ---------------------------------------------------------------------------
  // BOT CONVERSATION ENGINE (PIPELINE)
  // ---------------------------------------------------------------------------

  function getBotMemory(botId) {
    if (!botMemories[botId]) botMemories[botId] = { facts: {} };
    return botMemories[botId];
  }

  function saveBotMemory(botId, key, val) {
    let mem = getBotMemory(botId);
    mem.facts[key] = val;
    MWO.db.put('aura-data', 'mem:' + botId, mem);
  }

  function respond(bot, userMessage, context) {
    const text = userMessage.trim();
    const lower = text.toLowerCase();
    const mem = getBotMemory(bot.id);

    // Memory Extraction
    let nameMatch = lower.match(/(?:my name is|i'm|i am) ([a-z0-9_-]+)/i);
    if (nameMatch && nameMatch[1] && !['a', 'the', 'here', 'working', 'playing'].includes(nameMatch[1])) {
      saveBotMemory(bot.id, 'userName', nameMatch[1]);
    }
    let likeMatch = lower.match(/(?:i like|i love|my favorite is) ([a-z0-9 _-]+)/i);
    if (likeMatch && likeMatch[1]) {
      saveBotMemory(bot.id, 'userLikes', likeMatch[1].trim());
    }

    // Pipeline Step 1: Code Detection (Vector / Bit)
    let isCode = text.includes('```') || /#include|function\\b|void\\b|class\\b|=>|\\bconsole\\.log\\b|\\bint\\b|\\bpublic\\b|\\breturn\\b/.test(text);
    if (isCode && (bot.id === 'vector' || bot.id === 'bit')) {
      let cleanCode = text.replace(/```[a-z]*\\n?/gi, '').replace(/```/g, '').trim();
      let analysis = analyzeCode(cleanCode);

      if (bot.id === 'vector') {
        if (analysis.issues.length > 0) {
          return `💻 **Vector Static Analysis Report (${analysis.lang})**:\\n` +
            `I parsed your ${analysis.linesCount} lines of code and spotted **${analysis.issues.length} issue(s)**:\\n` +
            analysis.issues.map(i => `• ${i}`).join('\\n') +
            `\\n\\n*Suggested Fix*: Ensure all statement lines end with \`;\` and all brackets \`{\`, \`(\`, \`[\` have matching closing pairs!`;
        } else {
          return `💻 **Vector Code Review (${analysis.lang})**:\\n` +
            `Nice work! Your ${analysis.linesCount}-line snippet is **clean of syntax/bracket bugs**. The logic flows structured and modularly.\\n` +
            `*Tip*: Keep memory usage efficient and consider profiling if this executes inside tight performance loops!`;
        }
      } else {
        return `🤖 **Bit DX Feedback**: That ${analysis.lang} code looks sleek! Vector verified the syntax — if you are bundling this, I recommend using Vite + Prettier for sub-millisecond hot reloads!`;
      }
    }

    // Check Vector/Bit Code Concept Queries
    if (bot.id === 'vector' || bot.id === 'bit') {
      for (let conceptKey in CODE_CONCEPTS) {
        if (lower.includes(conceptKey)) {
          let c = CODE_CONCEPTS[conceptKey];
          return `💻 **${conceptKey.toUpperCase()} Concept Explanation**:\\n${c.explanation}\\n\\n\`\`\`cpp\\n${c.example}\\n\`\`\``;
        }
      }
    }

    // Pipeline Step 2: Math Engine
    let mathResult = parseAndEvalMath(text);
    if (mathResult !== null) {
      if (bot.id === 'vector') return `💻 **Vector Math Result**: \`${text}\` = **${mathResult}**`;
      if (bot.id === 'palette') return `🎨 **Palette Math Result**: \`${text}\` = **${mathResult}**`;
      return `🔢 **Math Answer**: The calculated result of \`${text}\` is **${mathResult}**.`;
    }

    // Pipeline Step 3: Palette Color Math Engine
    if (bot.id === 'palette' && (lower.includes('color') || lower.includes('palette') || lower.includes('hex') || lower.includes('rgb') || lower.includes('#') || ['red','blue','green','teal','purple','gold','sunset','ocean'].some(c => lower.includes(c)))) {
      let matchedWord = ['red','blue','green','teal','purple','gold','sunset','ocean'].find(c => lower.includes(c)) || '#a855f7';
      return generatePaletteAnalysis(matchedWord);
    }

    // Pipeline Step 4: Terra Nature Facts Engine
    if (bot.id === 'terra' && (lower.includes('fact') || lower.includes('nature') || lower.includes('earth') || lower.includes('geography') || lower.includes('place') || lower.includes('tell me'))) {
      let randomFact = TERRA_FACTS[Math.floor(Math.random() * TERRA_FACTS.length)];
      return `🌍 **Terra Earth Fact**: ${randomFact}`;
    }

    // Pipeline Step 5: Roleplay Engine (if channel in RP mode)
    if (context && context.rpMode && bot.id === 'nyx') {
      return handleRoleplay(context.channelId, lower);
    }

    // Pipeline Step 6: Question Intent (Knowledge Base Search)
    let isQuestion = lower.includes('what') || lower.includes('why') || lower.includes('how') || lower.includes('when') || lower.includes('who') || lower.includes('can you') || lower.includes('?');
    if (isQuestion) {
      for (let item of GENERAL_KB) {
        if (item.keywords.some(k => lower.includes(k))) {
          return `${bot.avatar} **${bot.name}**: ${item.answer}`;
        }
      }
    }

    // Pipeline Step 7: Greeting / Farewell / Name Mentions
    if (/^(hi|hello|hey|greetings|sup|yo)\\b/.test(lower)) {
      let knownName = mem.facts.userName || profile.username;
      let knownLikes = mem.facts.userLikes ? ` I remember you like ${mem.facts.userLikes}!` : '';
      return `${bot.avatar} Hey there, **${knownName}**! Awesome to see you in #${context ? context.channelName : 'chat'}.${knownLikes} What are you up to today?`;
    }

    // Pipeline Step 8: Emotion Detection
    if (/\\b(sad|depressed|unhappy|down)\\b/.test(lower)) {
      return `${bot.avatar} I'm so sorry you're feeling down. I'm right here with you — take all the time you need, and remember you're appreciated! ❤️`;
    }
    if (/\\b(happy|excited|great|awesome|wonderful|yay)\\b/.test(lower)) {
      return `${bot.avatar} YAY! That positive energy is so contagious! Tell me all about what made your day so great! ✨`;
    }
    if (/\\b(tired|exhausted|sleepy|stressed|anxious)\\b/.test(lower)) {
      return `${bot.avatar} Take a deep breath, stretch your shoulders, and relax. You've been working hard — don't forget to rest! ☕`;
    }

    // Pipeline Step 9: Topic Keyword Scan
    for (let point of bot.talkingPoints) {
      let words = point.toLowerCase().split(' ');
      if (words.some(w => w.length > 4 && lower.includes(w))) {
        return `${bot.avatar} ${point}`;
      }
    }

    // Pipeline Step 10: Fallback
    let memoryRecall = mem.facts.userLikes ? ` (By the way, I still remember you love ${mem.facts.userLikes}!)` : '';
    let fallbackTpl = bot.fallbacks[Math.floor(Math.random() * bot.fallbacks.length)];
    return `${bot.avatar} ${fallbackTpl}${memoryRecall}`;
  }

  // ---------------------------------------------------------------------------
  // DATA STORAGE & PERSISTENCE
  // ---------------------------------------------------------------------------

  function loadDataFromStorage() {
    return Promise.all([
      MWO.db.get('aura-data', 'profile'),
      MWO.db.getAll('aura-data')
    ]).then(([savedProfile, allRecords]) => {
      if (savedProfile && savedProfile.username) {
        profile = Object.assign({}, profile, savedProfile);
      } else {
        MWO.db.put('aura-data', 'profile', profile);
      }

      let loadedServers = [];
      if (Array.isArray(allRecords)) {
        allRecords.forEach(rec => {
          if (rec.id && rec.id.startsWith('server:')) {
            loadedServers.push(rec.data || rec);
          } else if (rec.id && rec.id.startsWith('msgs:')) {
            let cid = rec.id.replace('msgs:', '');
            messages[cid] = rec.items || [];
          } else if (rec.id && rec.id.startsWith('mem:')) {
            let bid = rec.id.replace('mem:', '');
            botMemories[bid] = rec.facts ? rec : { facts: rec.data || {} };
          }
        });
      }

      if (loadedServers.length === 0) {
        servers = INITIAL_SERVERS;
        servers.forEach(s => {
          MWO.db.put('aura-data', 'server:' + s.id, { id: 'server:' + s.id, data: s });
        });
      } else {
        servers = loadedServers;
      }
    }).catch(err => {
      console.warn('Aura DB load fallback:', err);
      servers = INITIAL_SERVERS;
    });
  }

  function saveServer(srv) {
    MWO.db.put('aura-data', 'server:' + srv.id, { id: 'server:' + srv.id, data: srv });
  }

  function saveChannelMessages(channelId) {
    let list = (messages[channelId] || []).slice(-100);
    MWO.db.put('aura-data', 'msgs:' + channelId, { id: 'msgs:' + channelId, items: list });
  }
''')

print("Part 4 written")
