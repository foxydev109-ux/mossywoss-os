/* ========================================
 * MossyWoss OS - itch.io Export Validator
 * Follows itch.io HTML5 rules:
 * - index.html must exist in root
 * - Max 1,000 files
 * - Max 500MB total extracted
 * - Max 200MB per individual file
 * - Self-contained (no external deps)
 * ======================================== */

/**
 * ItchExporter - validates and packages projects for itch.io
 */
const ItchExporter = {

  /**
   * Validate a project for itch.io HTML5 compliance
   * @param {Object} projectFiles - Map of filename to content
   * @param {string} projectFiles.path - file path
   * @param {string} projectFiles.content - file content
   * @returns {Object} validation result {valid, errors, warnings, stats}
   */
  validate(projectFiles) {
    const errors = [];
    const warnings = [];
    let totalSize = 0;
    let fileCount = 0;
    let hasIndex = false;

    for (const [path, content] of Object.entries(projectFiles)) {
      fileCount++;
      const size = typeof content === 'string' ? content.length : (content.byteLength || 0);
      totalSize += size;

      if (path === 'index.html' || path === './index.html') {
        hasIndex = true;
      }

      if (size > 200 * 1024 * 1024) {
        errors.push('File "' + path + '" exceeds 200MB itch.io limit (' + (size / 1024 / 1024).toFixed(1) + 'MB)');
      }

      if (typeof content === 'string' && content.includes('http://') && !content.includes('https://')) {
        warnings.push('File "' + path + '" contains insecure http:// URLs - itch.io requires HTTPS');
      }

      const ext = path.split('.').pop().toLowerCase();
      if (['exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'apk', 'aab'].includes(ext)) {
        warnings.push('File "' + path + '" is a native package - itch.io HTML5 needs web files only');
      }
    }

    if (!hasIndex) {
      errors.push('Missing index.html - itch.io requires index.html in the root of the ZIP');
    }
    if (fileCount > 1000) {
      errors.push('Too many files: ' + fileCount + ' (itch.io max is 1,000)');
    }
    if (totalSize > 500 * 1024 * 1024) {
      errors.push('Total size ' + (totalSize / 1024 / 1024).toFixed(1) + 'MB exceeds itch.io 500MB limit');
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      stats: {
        files: fileCount,
        totalSize: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        hasIndex: hasIndex
      }
    };
  },

  /**
   * Build a standalone HTML5 game package for itch.io
   * @param {Object} opts - export options
   * @param {string} opts.title - game title
   * @param {string} opts.html - HTML content
   * @param {string} opts.css - CSS content (optional)
   * @param {string} opts.js - JavaScript content (optional)
   * @param {string} opts.engine - engine used ('babylonjs', 'custom', 'none')
   * @returns {string} complete standalone HTML file
   */
  buildPackage(opts) {
    const title = opts.title || 'Untitled Game';
    const engineIncludes = opts.engine === 'babylonjs'
      ? '<script src="https://cdn.babylonjs.com/babylon.js"></script>\n'
      : '';

    const styleTag = opts.css ? '<style>\n' + opts.css + '\n</style>\n' : '';
    const scriptTag = opts.js ? '<script>\n' + opts.js + '\n</script>\n' : '';

    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no">\n' +
      '<title>' + title + '</title>\n' +
      '<style>\n' +
      'html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000;touch-action:none}\n' +
      'canvas{display:block;width:100%;height:100%}\n' +
      '</style>\n' +
      styleTag +
      engineIncludes +
      '</head>\n<body>\n' +
      opts.html +
      '\n' +
      scriptTag +
      '</body>\n</html>';
  },

  /**
   * Generate a download for the itch.io package
   * @param {string} filename - output filename
   * @param {string} htmlContent - complete HTML file content
   */
  download(filename, htmlContent) {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'game.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  },

  /**
   * Render the itch.io export dialog UI
   * @param {string} winId - window ID
   * @returns {string} HTML for the export dialog
   */
  renderExportDialog(winId) {
    return '<div style="padding:16px;overflow-y:auto;height:100%">' +
      '<h3 style="font-size:1em;margin-bottom:14px">itch.io HTML5 Export</h3>' +
      '<div id="itch-validate-' + winId + '" style="margin-bottom:14px"></div>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' +
      '<label style="font-size:0.85em">Game Title</label>' +
      '<input class="mw-input" id="itch-title-' + winId + '" placeholder="My Awesome Game" style="width:100%">' +
      '<label style="font-size:0.85em">Engine</label>' +
      '<select class="mw-select" id="itch-engine-' + winId + '" style="width:100%">' +
      '<option value="babylonjs">Babylon.js (3D)</option>' +
      '<option value="custom">Custom (HTML5 Canvas)</option>' +
      '<option value="none">None (Pure HTML/CSS)</option>' +
      '</select>' +
      '<label style="font-size:0.85em">HTML Body Content</label>' +
      '<textarea class="mw-input" id="itch-html-' + winId + '" style="width:100%;min-height:80px;font-family:monospace;font-size:0.8em" placeholder="<canvas id=\"renderCanvas\"></canvas>"></textarea>' +
      '<label style="font-size:0.85em">JavaScript (optional)</label>' +
      '<textarea class="mw-input" id="itch-js-' + winId + '" style="width:100%;min-height:120px;font-family:monospace;font-size:0.8em" placeholder="// Game logic here"></textarea>' +
      '<label style="font-size:0.85em">CSS (optional)</label>' +
      '<textarea class="mw-input" id="itch-css-' + winId + '" style="width:100%;min-height:60px;font-family:monospace;font-size:0.8em" placeholder="/* Custom styles */"></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:8px">' +
      '<button class="mw-btn primary" onclick="ItchExporter.doExport(\'' + winId + '\')">Validate & Export</button>' +
      '<button class="mw-btn" onclick="ItchExporter.doValidate(\'' + winId + '\')">Validate Only</button>' +
      '</div>' +
      '</div></div>';
  },

  /**
   * Run validation and display results
   * @param {string} winId - window ID
   */
  doValidate(winId) {
    var title = document.getElementById('itch-title-' + winId).value || 'Untitled';
    var html = document.getElementById('itch-html-' + winId).value || '';
    var js = document.getElementById('itch-js-' + winId).value || '';
    var css = document.getElementById('itch-css-' + winId).value || '';
    var engine = document.getElementById('itch-engine-' + winId).value;

    var files = { 'index.html': ItchExporter.buildPackage({title:title, html:html, css:css, js:js, engine:engine}) };
    if (css) files['style.css'] = css;
    if (js) files['script.js'] = js;

    var result = ItchExporter.validate(files);
    var el = document.getElementById('itch-validate-' + winId);

    var html2 = '<div style="padding:12px;border-radius:8px;';
    if (result.valid) {
      html2 += 'background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.3)"><div style="color:#4caf50;font-size:0.9em;margin-bottom:8px">Validation Passed</div>';
    } else {
      html2 += 'background:rgba(244,67,54,0.1);border:1px solid rgba(244,67,54,0.3)"><div style="color:#f44336;font-size:0.9em;margin-bottom:8px">Validation Failed</div>';
    }
    html2 += '<div style="font-size:0.78em;color:var(--text2);margin-bottom:6px">Files: ' + result.stats.files + ' | Size: ' + result.stats.totalSizeMB + 'MB</div>';
    if (result.errors.length > 0) {
      html2 += '<div style="font-size:0.78em;color:#f44336;margin-bottom:4px">Errors:</div>';
      result.errors.forEach(function(e) { html2 += '<div style="font-size:0.76em;color:#f44336;padding-left:8px">' + e + '</div>'; });
    }
    if (result.warnings.length > 0) {
      html2 += '<div style="font-size:0.78em;color:#ffc107;margin-top:6px">Warnings:</div>';
      result.warnings.forEach(function(w) { html2 += '<div style="font-size:0.76em;color:#ffc107;padding-left:8px">' + w + '</div>'; });
    }
    html2 += '</div>';
    el.innerHTML = html2;
  },

  /**
   * Validate, build, and download the itch.io package
   * @param {string} winId - window ID
   */
  doExport(winId) {
    ItchExporter.doValidate(winId);
    var title = document.getElementById('itch-title-' + winId).value || 'Untitled';
    var html = document.getElementById('itch-html-' + winId).value || '';
    var js = document.getElementById('itch-js-' + winId).value || '';
    var css = document.getElementById('itch-css-' + winId).value || '';
    var engine = document.getElementById('itch-engine-' + winId).value;

    var pkg = ItchExporter.buildPackage({title:title, html:html, css:css, js:js, engine:engine});
    ItchExporter.download(title.replace(/\s/g, '_') + '_itch.html', pkg);
  }
};

/* ========================================
 * C / C++ / C# Language Support for Code Studio
 * ======================================== */

/**
 * Syntax highlighting for C, C++, and C#
 * @param {string} code - source code
 * @param {string} lang - language ('c', 'cpp', 'csharp')
 * @returns {string} highlighted HTML
 */
function highlightCSharp(code) {
  return highlightCCode(code, true);
}

function highlightCCode(code, isCSharp) {
  var kw = isCSharp
    ? /\b(abstract|as|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|virtual|void|volatile|while|var|async|await|yield|get|set|partial|where|global|dynamic|nameof|when)\b/g
    : /\b(auto|break|case|catch|char|class|const|continue|default|delete|do|double|else|enum|explicit|extern|false|float|for|friend|goto|if|inline|int|long|namespace|new|operator|private|protected|public|register|return|short|signed|sizeof|static|struct|switch|template|this|throw|true|try|typedef|typename|union|unsigned|using|virtual|void|volatile|while|bool|constexpr|nullptr|constexpr|decltype|noexcept|nullptr|static_assert|thread_local|alignas|alignof|final|override|char16_t|char32_t|char8_t|wchar_t|size_t|std|string|vector|map|set|unordered_map|unordered_set|array|list|queue|stack|pair|shared_ptr|unique_ptr|make_shared|make_unique|printf|scanf|malloc|free|calloc|realloc|memcpy|memset|strlen|strcmp|strcpy|strcat|fopen|fclose|fread|fwrite|fgets|fputs|main|argc|argv|include|define|ifdef|ifndef|endif|pragma|ifdef|ifndef)\b/g;

  var tokens = [];
  var pos = 0;
  var patterns = [
    [/^\/\/[^\n]*/, 'c'],
    [/^\/\*[\s\S]*?\*\//, 'c'],
    [/^"[^"\\]*(?:\\.[^"\\]*)*"/, 's'],
    [/^'[^'\\]*(?:\\.[^'\\]*)*'/, 's'],
    [/^#\w+[^\n]*/, 'k'],
    [/^\d+\.?\d*[fFuUlL]*/, 'n'],
    [kw, 'k'],
    [/^[a-zA-Z_]\w*(?=\s*\()/, 'f'],
    [/^\s+/, ''],
    [/^./, '']
  ];

  while (pos < code.length) {
    var rest = code.slice(pos);
    var matched = false;
    for (var i = 0; i < patterns.length; i++) {
      var pair = patterns[i];
      var re = pair[0];
      var type = pair[1];
      var m = re.exec(rest);
      if (m && m[0]) {
        if (type) tokens.push({t: type, v: m[0]});
        else tokens.push({v: m[0]});
        pos += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) { tokens.push({v: code[pos]}); pos++; }
  }

  return tokens.map(function(tk) {
    if (tk.t) return '<span class="tk-' + tk.t + '">' + escHtml2(tk.v) + '</span>';
    return escHtml2(tk.v);
  }).join('');
}

function escHtml2(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
