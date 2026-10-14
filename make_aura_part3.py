import sys, os

with open('mw_web/aura.js', 'a', encoding='utf-8') as f:
    f.write('''
  // ---------------------------------------------------------------------------
  // HELPER ENGINES: MATH, CODE, COLOR, RP
  // ---------------------------------------------------------------------------

  // 1. Shunting-Yard Math Parser (NO EVAL)
  function parseAndEvalMath(str) {
    try {
      let s = str.trim().toLowerCase();
      s = s.replace(/^(what is|calculate|evaluate|math|solve)\s+/i, '');
      s = s.replace(/\\?+$/, '').trim();

      if (!/^[0-9+\\-*/%^().,\\s\\ba-z]+$/i.test(s)) return null;
      if (!/\\d/.test(s)) return null;
      if (!/[+\\-*/%^]|\\b(sqrt|sin|cos|tan|abs|log)\\b/.test(s)) return null;

      s = s.replace(/sqrt\\(/g, 'S(')
           .replace(/sin\\(/g, 'N(')
           .replace(/cos\\(/g, 'C(')
           .replace(/tan\\(/g, 'T(')
           .replace(/abs\\(/g, 'A(')
           .replace(/log\\(/g, 'L(');

      let tokens = [];
      let i = 0;
      while (i < s.length) {
        let c = s[i];
        if (/\\s/.test(c)) { i++; continue; }
        if (/[0-9.]/.test(c)) {
          let num = '';
          while (i < s.length && /[0-9.]/.test(s[i])) { num += s[i]; i++; }
          tokens.push({ type: 'num', value: parseFloat(num) });
        } else if ('+-*/%^()SNCTAL'.includes(c)) {
          if (c === '-' && (tokens.length === 0 || (tokens[tokens.length - 1].type === 'op' && tokens[tokens.length - 1].value !== ')') || tokens[tokens.length - 1].value === '(')) {
            tokens.push({ type: 'num', value: 0 });
          }
          tokens.push({ type: 'op', value: c });
          i++;
        } else {
          return null;
        }
      }

      let output = [];
      let stack = [];
      let prec = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };
      let assoc = { '+': 'L', '-': 'L', '*': 'L', '/': 'L', '%': 'L', '^': 'R' };
      let funcs = 'SNCTAL';

      for (let t of tokens) {
        if (t.type === 'num') {
          output.push(t.value);
        } else if (funcs.includes(t.value)) {
          stack.push(t.value);
        } else if (t.value === '(') {
          stack.push('(');
        } else if (t.value === ')') {
          while (stack.length > 0 && stack[stack.length - 1] !== '(') {
            output.push(stack.pop());
          }
          if (stack.length === 0) return null;
          stack.pop();
          if (stack.length > 0 && funcs.includes(stack[stack.length - 1])) {
            output.push(stack.pop());
          }
        } else if (prec[t.value]) {
          while (stack.length > 0 && prec[stack[stack.length - 1]]) {
            let top = stack[stack.length - 1];
            if ((assoc[t.value] === 'L' && prec[t.value] <= prec[top]) ||
                (assoc[t.value] === 'R' && prec[t.value] < prec[top])) {
              output.push(stack.pop());
            } else {
              break;
            }
          }
          stack.push(t.value);
        }
      }
      while (stack.length > 0) {
        let top = stack.pop();
        if (top === '(' || top === ')') return null;
        output.push(top);
      }

      let evalStack = [];
      for (let item of output) {
        if (typeof item === 'number') {
          evalStack.push(item);
        } else {
          if (funcs.includes(item)) {
            if (evalStack.length < 1) return null;
            let a = evalStack.pop();
            if (item === 'S') evalStack.push(Math.sqrt(a));
            else if (item === 'N') evalStack.push(Math.sin(a));
            else if (item === 'C') evalStack.push(Math.cos(a));
            else if (item === 'T') evalStack.push(Math.tan(a));
            else if (item === 'A') evalStack.push(Math.abs(a));
            else if (item === 'L') evalStack.push(Math.log(a));
          } else {
            if (evalStack.length < 2) return null;
            let b = evalStack.pop();
            let a = evalStack.pop();
            if (item === '+') evalStack.push(a + b);
            else if (item === '-') evalStack.push(a - b);
            else if (item === '*') evalStack.push(a * b);
            else if (item === '/') evalStack.push(b === 0 ? NaN : a / b);
            else if (item === '%') evalStack.push(a % b);
            else if (item === '^') evalStack.push(Math.pow(a, b));
          }
        }
      }
      if (evalStack.length !== 1 || isNaN(evalStack[0])) return null;
      let res = evalStack[0];
      return Number.isInteger(res) ? res.toString() : res.toFixed(4).replace(/\\.?0+$/, '');
    } catch (e) {
      return null;
    }
  }

  // 2. Vector Static Code Analyzer
  function analyzeCode(code) {
    let lang = 'JavaScript';
    if (/#include|std::|printf|cout|int main/.test(code)) lang = 'C / C++';
    else if (/using System|Console\\.WriteLine|namespace|public class/.test(code)) lang = 'C#';

    let lines = code.split('\\n');
    let issues = [];
    let bracketStack = [];

    lines.forEach((lineText, idx) => {
      let lineNum = idx + 1;
      let trimmed = lineText.trim();

      if (!trimmed || trimmed.startsWith('//') || trimmed.startswith('/*') || trimmed.startswith('*') || trimmed.startswith('#')) return;

      for (let ch of lineText) {
        if (ch === '{' || ch === '(' || ch === '[') {
          bracketStack.push({ char: ch, line: lineNum });
        } else if (ch === '}' || ch === ')' || ch === ']') {
          let match = ch === '}' ? '{' : (ch === ')' ? '(' : '[');
          if (bracketStack.length > 0 && bracketStack[bracketStack.length - 1].char === match) {
            bracketStack.pop();
          } else {
            issues.push(`Line ${lineNum}: Unmatched closing bracket '${ch}'.`);
          }
        }
      }

      let isStatement = /^(int|double|float|char|var|let|const|return|console\\.log|printf|cout|Console\\.WriteLine|std::cout|import|using)\\b/.test(trimmed);
      if (isStatement && !/[;{}:,]$/.test(trimmed) && !trimmed.includes('//')) {
        issues.push(`Line ${lineNum}: Missing semicolon ';' at end of statement.`);
      }

      if (/\\b(if|while)\\s*\\([^=]*=[^=][^)]*\\)/.test(trimmed)) {
        issues.push(`Line ${lineNum}: Assignment '=' used inside condition expression (did you mean '==' or '==='?).`);
      }
    });

    if (bracketStack.length > 0) {
      bracketStack.forEach(b => {
        issues.push(`Line ${b.line}: Unclosed opening bracket '${b.char}'.`);
      });
    }

    return { lang, linesCount: lines.length, issues };
  }

  // 3. Palette Color Math Engine
  function parseColorToRgb(str) {
    str = str.trim().toLowerCase();
    const namedColors = {
      'red': [255, 0, 0], 'green': [0, 255, 0], 'blue': [0, 0, 255],
      'teal': [20, 184, 166], 'purple': [168, 85, 247], 'gold': [234, 179, 8],
      'orange': [249, 115, 22], 'pink': [236, 72, 153], 'cyan': [6, 182, 212],
      'sunset': [244, 63, 94], 'ocean': [59, 130, 246], 'neon': [132, 204, 22]
    };
    if (namedColors[str]) return namedColors[str];

    let hexMatch = str.match(/^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i);
    if (hexMatch) {
      return [parseInt(hexMatch[1], 16), parseInt(hexMatch[2], 16), parseInt(hexMatch[3], 16)];
    }
    let rgbMatch = str.match(/rgb\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)/i);
    if (rgbMatch) {
      return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
    }
    return [168, 85, 247];
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  function hslToHex(h, s, l) {
    h = (h % 360 + 360) % 360;
    s /= 100; l /= 100;
    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
    let rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    let gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    let bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');
    return `#${rHex}${gHex}${bHex}`;
  }

  function generatePaletteAnalysis(colorInput) {
    let [r, g, b] = parseColorToRgb(colorInput);
    let [h, s, l] = rgbToHsl(r, g, b);

    let baseHex = hslToHex(h, s, l);
    let compHex = hslToHex(h + 180, s, l);
    let ana1Hex = hslToHex(h - 30, s, l);
    let ana2Hex = hslToHex(h + 30, s, l);
    let tri1Hex = hslToHex(h + 120, s, l);
    let tri2Hex = hslToHex(h + 240, s, l);

    return `🎨 **Color Math Breakdown for '${colorInput}' (HSL: ${h}°, ${s}%, ${l}%)**:\\n\\n` +
      `• **Base Color**: \`${baseHex}\`\\n` +
      `• **Complementary (+180°)**: \`${compHex}\`\\n` +
      `• **Analogous (-30°, +30°)**: \`${ana1Hex}\`, \`${ana2Hex}\`\\n` +
      `• **Triadic (+120°, +240°)**: \`${tri1Hex}\`, \`${tri2Hex}\`\\n\\n` +
      `*Palette Tip: Use \`${baseHex}\` for 60% layout, \`${compHex}\` or \`${tri1Hex}\` for high-contrast action buttons!*`;
  }

  // 4. Nyx Roleplay Scene Engine
  function handleRoleplay(channelId, userMsg) {
    if (!storyStates[channelId]) {
      storyStates[channelId] = {
        location: channelId.includes('tavern') ? 'The Laughing Dragon Inn' : 'Deep Space Outpost Alpha',
        charactersPresent: ['Nyx', profile.username],
        ongoingPlot: channelId.includes('tavern') ? 'A mysterious traveler in dark armor dropped a glowing crystal map.' : 'A long-range sensor blip registered an unmapped alien distress beacon.',
        turnCount: 1
      };
    }
    let st = storyStates[channelId];
    st.turnCount++;

    let actionResponse = '';
    if (userMsg.includes('look') || userMsg.includes('search') || userMsg.includes('inspect')) {
      actionResponse = `*Nyx steps closer to the center of ${st.location}, scanning the surroundings carefully.* "Notice how the faint light catches the dust motes... ${st.ongoingPlot}"`;
    } else if (userMsg.includes('attack') || userMsg.includes('fight') || userMsg.includes('draw sword') || userMsg.includes('laser')) {
      actionResponse = `*Nyx raises her hand, energy crackling at her fingertips as the tension in ${st.location} skyrockets!* "Hold your strike! We must discern who is friend or foe first!"`;
    } else if (userMsg.includes('talk') || userMsg.includes('ask') || userMsg.includes('greet') || userMsg.includes('hello')) {
      actionResponse = `*Nyx smiles under the torchlight of ${st.location}, leaning in to whisper.* "Words are powerful keys in this realm. ${st.ongoingPlot}"`;
    } else {
      actionResponse = `*Nyx adjusts her cloak, observing your action carefully inside ${st.location}.* The ambient hum deepens as turn ${st.turnCount} unfolds. ${st.ongoingPlot}`;
    }

    actionResponse += `\\n\\n*What do you do next?*`;
    return actionResponse;
  }
''')

print("Part 3 written")
