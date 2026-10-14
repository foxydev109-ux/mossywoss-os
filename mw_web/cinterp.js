// C / C++ / C# Real Interpreter for MossyWoss OS (MWO.CInterp)
// Parses and evaluates a practical subset of C, C++, and C# AST.

if (typeof MWO === 'undefined') {
  if (typeof window !== 'undefined') window.MWO = {};
  else if (typeof global !== 'undefined') global.MWO = {};
}

MWO.CInterp = (function() {
  'use strict';

  var VERSION = '1.0';

  // --- Helper: C printf Formatter ---
  function formatPrintf(fmt, args) {
    var argIdx = 0;
    return fmt.replace(/%([-+ 0#]*)?(\d+|\*)?(?:\.(\d+|\*))?([hlLzjtZ]*)?([diuoxXfFeEgGaAcsp%])/g, function(match, flags, widthStr, precStr, lenMod, spec) {
      if (spec === '%') return '%';
      var val = args[argIdx++];
      flags = flags || '';

      var leftAlign = flags.indexOf('-') !== -1;
      var zeroPad = flags.indexOf('0') !== -1 && !leftAlign;
      var showSign = flags.indexOf('+') !== -1;
      var spaceSign = flags.indexOf(' ') !== -1;

      var width = widthStr === '*' ? args[argIdx++] : (widthStr ? parseInt(widthStr, 10) : 0);
      var precision = precStr === '*' ? args[argIdx++] : (precStr !== undefined && precStr !== '' ? parseInt(precStr, 10) : null);

      var str = '';

      if (spec === 'd' || spec === 'i') {
        var num = Math.trunc(Number(val) || 0);
        var isNeg = num < 0;
        var absStr = Math.abs(num).toString();
        if (precision !== null) {
          absStr = absStr.padStart(precision, '0');
        }
        var signStr = isNeg ? '-' : (showSign ? '+' : (spaceSign ? ' ' : ''));
        str = signStr + absStr;
        if (zeroPad && precision === null) {
          var padLen = width - str.length;
          if (padLen > 0) {
            str = signStr + '0'.repeat(padLen) + absStr;
          }
        }
      } else if (spec === 'u') {
        var numU = (Number(val) || 0) >>> 0;
        str = numU.toString();
        if (precision !== null) str = str.padStart(precision, '0');
      } else if (spec === 'x' || spec === 'X') {
        var numX = (Number(val) || 0) >>> 0;
        str = numX.toString(16);
        if (spec === 'X') str = str.toUpperCase();
        if (precision !== null) str = str.padStart(precision, '0');
      } else if (spec === 'f' || spec === 'F') {
        var numF = Number(val) || 0;
        var prec = precision !== null ? precision : 6;
        str = numF.toFixed(prec);
        if (showSign && numF >= 0) str = '+' + str;
        else if (spaceSign && numF >= 0) str = ' ' + str;
      } else if (spec === 'c') {
        if (typeof val === 'number') str = String.fromCharCode(val);
        else if (typeof val === 'string') str = val.charAt(0);
        else str = String(val).charAt(0);
      } else if (spec === 's') {
        str = String(val !== undefined && val !== null ? val : '');
        if (precision !== null) str = str.slice(0, precision);
      } else {
        str = String(val !== undefined ? val : '');
      }

      if (str.length < width) {
        var pad = ' '.repeat(width - str.length);
        str = leftAlign ? (str + pad) : (pad + str);
      }
      return str;
    });
  }

  // --- Preprocessor ---
  function preprocess(code) {
    var lines = code.split('\n');
    var macros = {};
    var cleanLines = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      if (trimmed.startsWith('#include')) {
        cleanLines.push('// [Included header ignored]');
        continue;
      }
      if (trimmed.startsWith('#define')) {
        var parts = trimmed.substring(7).trim().split(/\s+/);
        if (parts.length >= 2) {
          var macroName = parts[0];
          var macroVal = parts.slice(1).join(' ');
          macros[macroName] = macroVal;
        }
        cleanLines.push('');
        continue;
      }
      cleanLines.push(line);
    }

    var processed = cleanLines.join('\n');
    for (var m in macros) {
      if (Object.prototype.hasOwnProperty.call(macros, m)) {
        var reg = new RegExp('\\b' + m + '\\b', 'g');
        processed = processed.replace(reg, macros[m]);
      }
    }
    return processed;
  }

  // --- Tokenizer ---
  var KEYWORDS = new Set([
    'if', 'else', 'while', 'do', 'for', 'switch', 'case', 'default',
    'break', 'continue', 'return', 'struct', 'class', 'public', 'private',
    'static', 'void', 'int', 'float', 'double', 'char', 'long', 'short',
    'unsigned', 'bool', 'string', 'auto', 'var', 'const', 'using', 'namespace',
    'true', 'false', 'null', 'nullptr', 'new'
  ]);

  function tokenize(src) {
    var tokens = [];
    var i = 0;
    var len = src.length;
    var line = 1;
    var col = 1;

    while (i < len) {
      var ch = src[i];

      if (ch === ' ' || ch === '\t' || ch === '\r') {
        i++; col++; continue;
      }
      if (ch === '\n') {
        i++; line++; col = 1; continue;
      }

      // Single-line comment //
      if (ch === '/' && src[i + 1] === '/') {
        i += 2;
        while (i < len && src[i] !== '\n') i++;
        continue;
      }

      // Multi-line comment /* */
      if (ch === '/' && src[i + 1] === '*') {
        i += 2;
        while (i < len && !(src[i] === '*' && src[i + 1] === '/')) {
          if (src[i] === '\n') { line++; col = 1; } else col++;
          i++;
        }
        if (i < len) i += 2;
        continue;
      }

      // Interpolated string $"..." (C#)
      if (ch === '$' && src[i + 1] === '"') {
        i += 2;
        var strValI = '';
        while (i < len && src[i] !== '"') {
          if (src[i] === '\\' && i + 1 < len) {
            strValI += src[i] + src[i + 1];
            i += 2;
          } else {
            strValI += src[i];
            i++;
          }
        }
        if (i < len) i++;
        tokens.push({ type: 'INTERPOLATED_STRING', value: strValI, line: line, col: col });
        continue;
      }

      // String literal "..."
      if (ch === '"') {
        i++;
        var strVal = '';
        while (i < len && src[i] !== '"') {
          if (src[i] === '\\' && i + 1 < len) {
            var esc = src[i + 1];
            if (esc === 'n') strVal += '\n';
            else if (esc === 't') strVal += '\t';
            else if (esc === 'r') strVal += '\r';
            else if (esc === '0') strVal += '\0';
            else if (esc === '\\') strVal += '\\';
            else if (esc === '"') strVal += '"';
            else strVal += esc;
            i += 2;
          } else {
            strVal += src[i];
            i++;
          }
        }
        if (i < len) i++;
        tokens.push({ type: 'STRING', value: strVal, line: line, col: col });
        continue;
      }

      // Char literal '...'
      if (ch === "'") {
        i++;
        var charVal = '';
        if (src[i] === '\\' && i + 1 < len) {
          var escC = src[i + 1];
          if (escC === 'n') charVal = '\n';
          else if (escC === 't') charVal = '\t';
          else if (escC === 'r') charVal = '\r';
          else if (escC === '0') charVal = '\0';
          else charVal = escC;
          i += 2;
        } else {
          charVal = src[i] || '';
          i++;
        }
        if (src[i] === "'") i++;
        tokens.push({ type: 'CHAR', value: charVal.charCodeAt(0) || 0, charStr: charVal, line: line, col: col });
        continue;
      }

      // Numbers
      if (/\d/.test(ch) || (ch === '.' && /\d/.test(src[i + 1]))) {
        var numStr = '';
        var isFloat = false;
        if (ch === '0' && (src[i + 1] === 'x' || src[i + 1] === 'X')) {
          numStr += src[i] + src[i + 1];
          i += 2;
          while (i < len && /[0-9a-fA-F]/.test(src[i])) {
            numStr += src[i]; i++;
          }
          tokens.push({ type: 'NUMBER', value: parseInt(numStr, 16), isFloat: false, line: line, col: col });
          continue;
        }
        while (i < len && (/\d/.test(src[i]) || src[i] === '.' || src[i] === 'e' || src[i] === 'E')) {
          if (src[i] === '.' || src[i] === 'e' || src[i] === 'E') isFloat = true;
          numStr += src[i]; i++;
        }
        if (i < len && (src[i] === 'f' || src[i] === 'F' || src[i] === 'd' || src[i] === 'D')) {
          i++;
        }
        var numVal = isFloat ? parseFloat(numStr) : parseInt(numStr, 10);
        tokens.push({ type: 'NUMBER', value: numVal, isFloat: isFloat, line: line, col: col });
        continue;
      }

      // Identifiers & Keywords
      if (/[a-zA-Z_]/.test(ch)) {
        var ident = '';
        while (i < len && /[a-zA-Z0-9_]/.test(src[i])) {
          ident += src[i]; i++;
        }
        if (KEYWORDS.has(ident)) {
          tokens.push({ type: 'KEYWORD', value: ident, line: line, col: col });
        } else {
          tokens.push({ type: 'IDENT', value: ident, line: line, col: col });
        }
        continue;
      }

      // Operators & Punctuation
      var threeChar = src.substr(i, 3);
      if (threeChar === '<<=' || threeChar === '>>=') {
        tokens.push({ type: 'OPERATOR', value: threeChar, line: line, col: col });
        i += 3; continue;
      }

      var twoChar = src.substr(i, 2);
      if (['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '->', '::'].indexOf(twoChar) !== -1) {
        tokens.push({ type: 'OPERATOR', value: twoChar, line: line, col: col });
        i += 2; continue;
      }

      if ('+-*/%&|^~! =<>?:.,;(){}[]'.indexOf(ch) !== -1) {
        var tokType = ('+-*/%&|^~!=<>?.:'.indexOf(ch) !== -1) ? 'OPERATOR' : 'PUNCT';
        tokens.push({ type: tokType, value: ch, line: line, col: col });
        i++; continue;
      }

      throw new Error('Syntax error: Unexpected character `' + ch + '` at line ' + line);
    }

    tokens.push({ type: 'EOF', value: 'EOF', line: line, col: col });
    return tokens;
  }

  // --- Parser ---
  function Parser(tokens, registeredStructs) {
    this.tokens = tokens;
    this.pos = 0;
    this.structNames = new Set(registeredStructs || []);
  }

  Parser.prototype = {
    peek: function() {
      return this.tokens[this.pos] || { type: 'EOF', value: 'EOF' };
    },
    peekNext: function() {
      return this.tokens[this.pos + 1] || { type: 'EOF', value: 'EOF' };
    },
    previous: function() {
      return this.tokens[this.pos - 1];
    },
    advance: function() {
      var tok = this.tokens[this.pos];
      if (tok.type !== 'EOF') this.pos++;
      return tok;
    },
    check: function(type, val) {
      var tok = this.peek();
      if (tok.type !== type) return false;
      if (val !== undefined && tok.value !== val) return false;
      return true;
    },
    match: function(type, val) {
      if (this.check(type, val)) {
        this.advance();
        return true;
      }
      return false;
    },
    expect: function(type, val) {
      if (this.check(type, val)) {
        return this.advance();
      }
      var tok = this.peek();
      throw new Error('Syntax error: Expected `' + val + '`, got `' + tok.value + '` at line ' + tok.line);
    },

    isTypeToken: function() {
      var tok = this.peek();
      if (tok.type === 'KEYWORD') {
        var k = tok.value;
        if (['int', 'float', 'double', 'char', 'long', 'short', 'unsigned', 'bool', 'void', 'string', 'auto', 'var', 'const', 'struct', 'class'].indexOf(k) !== -1) {
          return true;
        }
      }
      if (tok.type === 'IDENT' && this.structNames.has(tok.value)) {
        return true;
      }
      return false;
    },

    parseProgram: function() {
      var body = [];
      while (!this.check('EOF')) {
        var stmt = this.parseTopLevelItem();
        if (stmt) body.push(stmt);
      }
      return { type: 'Program', body: body };
    },

    parseTopLevelItem: function() {
      if (this.match('KEYWORD', 'using')) {
        while (!this.check('EOF') && !this.match('PUNCT', ';')) this.advance();
        return null;
      }

      var isStatic = false;
      var isConst = false;
      while (this.check('KEYWORD', 'public') || this.check('KEYWORD', 'private') || this.check('KEYWORD', 'static') || this.check('KEYWORD', 'const')) {
        var kw = this.advance().value;
        if (kw === 'static') isStatic = true;
        if (kw === 'const') isConst = true;
      }

      if (this.match('KEYWORD', 'class')) {
        var className = this.expect('IDENT').value;
        this.structNames.add(className);
        this.expect('PUNCT', '{');
        var classMembers = [];
        while (!this.check('EOF') && !this.check('PUNCT', '}')) {
          var item = this.parseTopLevelItem();
          if (item) classMembers.push(item);
        }
        this.expect('PUNCT', '}');
        this.match('PUNCT', ';');
        return { type: 'ClassDecl', name: className, members: classMembers };
      }

      if (this.check('KEYWORD', 'struct') && this.peekNext().type === 'IDENT' && this.tokens[this.pos + 2] && this.tokens[this.pos + 2].value === '{') {
        this.advance();
        var structName = this.expect('IDENT').value;
        this.structNames.add(structName);
        this.expect('PUNCT', '{');
        var fields = [];
        while (!this.check('EOF') && !this.check('PUNCT', '}')) {
          var fieldStmt = this.parseStatement();
          if (fieldStmt && fieldStmt.type === 'VarDeclStmt') {
            fields.push(fieldStmt);
          }
        }
        this.expect('PUNCT', '}');
        this.expect('PUNCT', ';');
        return { type: 'StructDecl', name: structName, fields: fields };
      }

      if (this.isTypeToken()) {
        var typeInfo = this.parseTypeSpecifier();
        if (isConst) typeInfo.isConst = true;

        if (this.peek().type === 'IDENT' && this.peekNext().value === '(') {
          var funcName = this.advance().value;
          this.expect('PUNCT', '(');
          var params = [];
          if (!this.check('PUNCT', ')')) {
            do {
              while (this.check('KEYWORD', 'const') || this.check('OPERATOR', '&')) this.advance();
              var pType = this.parseTypeSpecifier();
              var pName = this.expect('IDENT').value;
              params.push({ type: pType, name: pName });
            } while (this.match('PUNCT', ','));
          }
          this.expect('PUNCT', ')');

          if (this.match('PUNCT', ';')) {
            return null;
          }

          var bodyBlock = this.parseBlockStmt();
          return { type: 'FunctionDecl', name: funcName, returnType: typeInfo, params: params, body: bodyBlock };
        }

        return this.parseVarDeclAfterType(typeInfo);
      }

      return this.parseStatement();
    },

    parseTypeSpecifier: function() {
      var base = '';
      if (this.match('KEYWORD', 'struct')) {
        base = 'struct ' + this.expect('IDENT').value;
      } else {
        base = this.advance().value;
      }

      if (this.match('OPERATOR', '*')) {
        if (base === 'char' || base === 'const char') {
          return { name: 'string', isPointer: false };
        }
        throw new Error('Runtime error: Pointers not supported in this subset');
      }
      return { name: base, isPointer: false };
    },

    parseVarDeclAfterType: function(typeInfo) {
      var decls = [];
      do {
        var name = this.expect('IDENT').value;
        var arrayDims = [];
        while (this.match('PUNCT', '[')) {
          if (this.check('PUNCT', ']')) {
            arrayDims.push(null);
            this.advance();
          } else {
            var dimExpr = this.parseAssignmentExpr();
            this.expect('PUNCT', ']');
            arrayDims.push(dimExpr);
          }
        }

        var initExpr = null;
        if (this.match('OPERATOR', '=')) {
          initExpr = this.parseAssignmentExpr();
        }

        decls.push({ name: name, arrayDims: arrayDims, init: initExpr });
      } while (this.match('PUNCT', ','));

      this.expect('PUNCT', ';');
      return { type: 'VarDeclStmt', varType: typeInfo, decls: decls };
    },

    parseStatement: function() {
      var tok = this.peek();

      if (this.match('PUNCT', ';')) return null;

      if (tok.type === 'PUNCT' && tok.value === '{') {
        return this.parseBlockStmt();
      }

      if (this.isTypeToken()) {
        var typeInfo = this.parseTypeSpecifier();
        return this.parseVarDeclAfterType(typeInfo);
      }

      if (this.match('KEYWORD', 'if')) {
        this.expect('PUNCT', '(');
        var cond = this.parseAssignmentExpr();
        this.expect('PUNCT', ')');
        var thenBranch = this.parseStatement();
        var elseBranch = null;
        if (this.match('KEYWORD', 'else')) {
          elseBranch = this.parseStatement();
        }
        return { type: 'IfStmt', condition: cond, thenBranch: thenBranch, elseBranch: elseBranch };
      }

      if (this.match('KEYWORD', 'while')) {
        this.expect('PUNCT', '(');
        var condW = this.parseAssignmentExpr();
        this.expect('PUNCT', ')');
        var bodyW = this.parseStatement();
        return { type: 'WhileStmt', condition: condW, body: bodyW };
      }

      if (this.match('KEYWORD', 'do')) {
        var bodyDo = this.parseStatement();
        this.expect('KEYWORD', 'while');
        this.expect('PUNCT', '(');
        var condDo = this.parseAssignmentExpr();
        this.expect('PUNCT', ')');
        this.match('PUNCT', ';');
        return { type: 'DoWhileStmt', body: bodyDo, condition: condDo };
      }

      if (this.match('KEYWORD', 'for')) {
        this.expect('PUNCT', '(');
        var init = null;
        if (!this.check('PUNCT', ';')) {
          if (this.isTypeToken()) {
            var tInfo = this.parseTypeSpecifier();
            init = this.parseVarDeclAfterType(tInfo);
          } else {
            init = { type: 'ExprStmt', expr: this.parseAssignmentExpr() };
            this.expect('PUNCT', ';');
          }
        } else {
          this.expect('PUNCT', ';');
        }

        var condF = null;
        if (!this.check('PUNCT', ';')) {
          condF = this.parseAssignmentExpr();
        }
        this.expect('PUNCT', ';');

        var postF = null;
        if (!this.check('PUNCT', ')')) {
          postF = this.parseAssignmentExpr();
        }
        this.expect('PUNCT', ')');

        var bodyF = this.parseStatement();
        return { type: 'ForStmt', init: init, condition: condF, post: postF, body: bodyF };
      }

      if (this.match('KEYWORD', 'switch')) {
        this.expect('PUNCT', '(');
        var disc = this.parseAssignmentExpr();
        this.expect('PUNCT', ')');
        this.expect('PUNCT', '{');
        var cases = [];
        while (!this.check('EOF') && !this.check('PUNCT', '}')) {
          if (this.match('KEYWORD', 'case')) {
            var caseVal = this.parseAssignmentExpr();
            this.expect('OPERATOR', ':');
            var caseStmts = [];
            while (!this.check('EOF') && !this.check('PUNCT', '}') && !this.check('KEYWORD', 'case') && !this.check('KEYWORD', 'default')) {
              var s = this.parseStatement();
              if (s) caseStmts.push(s);
            }
            cases.push({ value: caseVal, body: caseStmts });
          } else if (this.match('KEYWORD', 'default')) {
            this.expect('OPERATOR', ':');
            var defStmts = [];
            while (!this.check('EOF') && !this.check('PUNCT', '}') && !this.check('KEYWORD', 'case') && !this.check('KEYWORD', 'default')) {
              var ds = this.parseStatement();
              if (ds) defStmts.push(ds);
            }
            cases.push({ value: null, body: defStmts });
          } else {
            this.advance();
          }
        }
        this.expect('PUNCT', '}');
        return { type: 'SwitchStmt', discriminant: disc, cases: cases };
      }

      if (this.match('KEYWORD', 'return')) {
        var retExpr = null;
        if (!this.check('PUNCT', ';')) {
          retExpr = this.parseAssignmentExpr();
        }
        this.expect('PUNCT', ';');
        return { type: 'ReturnStmt', expr: retExpr };
      }

      if (this.match('KEYWORD', 'break')) {
        this.expect('PUNCT', ';');
        return { type: 'BreakStmt' };
      }

      if (this.match('KEYWORD', 'continue')) {
        this.expect('PUNCT', ';');
        return { type: 'ContinueStmt' };
      }

      var expr = this.parseAssignmentExpr();
      this.expect('PUNCT', ';');
      return { type: 'ExprStmt', expr: expr };
    },

    parseBlockStmt: function() {
      this.expect('PUNCT', '{');
      var stmts = [];
      while (!this.check('EOF') && !this.check('PUNCT', '}')) {
        var s = this.parseStatement();
        if (s) stmts.push(s);
      }
      this.expect('PUNCT', '}');
      return { type: 'BlockStmt', statements: stmts };
    },

    parseAssignmentExpr: function() {
      var left = this.parseTernaryExpr();
      var tok = this.peek();
      if (tok.type === 'OPERATOR' && ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='].indexOf(tok.value) !== -1) {
        var op = this.advance().value;
        var right = this.parseAssignmentExpr();
        return { type: 'AssignmentExpr', operator: op, left: left, right: right };
      }
      return left;
    },

    parseTernaryExpr: function() {
      var expr = this.parseLogicalOrExpr();
      if (this.match('OPERATOR', '?')) {
        var trueExpr = this.parseAssignmentExpr();
        this.expect('OPERATOR', ':');
        var falseExpr = this.parseAssignmentExpr();
        return { type: 'TernaryExpr', condition: expr, trueExpr: trueExpr, falseExpr: falseExpr };
      }
      return expr;
    },

    parseLogicalOrExpr: function() {
      var left = this.parseLogicalAndExpr();
      while (this.match('OPERATOR', '||')) {
        var right = this.parseLogicalAndExpr();
        left = { type: 'BinaryExpr', operator: '||', left: left, right: right };
      }
      return left;
    },

    parseLogicalAndExpr: function() {
      var left = this.parseBitwiseOrExpr();
      while (this.match('OPERATOR', '&&')) {
        var right = this.parseBitwiseOrExpr();
        left = { type: 'BinaryExpr', operator: '&&', left: left, right: right };
      }
      return left;
    },

    parseBitwiseOrExpr: function() {
      var left = this.parseBitwiseXorExpr();
      while (this.match('OPERATOR', '|')) {
        var right = this.parseBitwiseXorExpr();
        left = { type: 'BinaryExpr', operator: '|', left: left, right: right };
      }
      return left;
    },

    parseBitwiseXorExpr: function() {
      var left = this.parseBitwiseAndExpr();
      while (this.match('OPERATOR', '^')) {
        var right = this.parseBitwiseAndExpr();
        left = { type: 'BinaryExpr', operator: '^', left: left, right: right };
      }
      return left;
    },

    parseBitwiseAndExpr: function() {
      var left = this.parseEqualityExpr();
      while (this.match('OPERATOR', '&')) {
        var right = this.parseEqualityExpr();
        left = { type: 'BinaryExpr', operator: '&', left: left, right: right };
      }
      return left;
    },

    parseEqualityExpr: function() {
      var left = this.parseRelationalExpr();
      while (this.peek().type === 'OPERATOR' && (this.peek().value === '==' || this.peek().value === '!=')) {
        var op = this.advance().value;
        var right = this.parseRelationalExpr();
        left = { type: 'BinaryExpr', operator: op, left: left, right: right };
      }
      return left;
    },

    parseRelationalExpr: function() {
      var left = this.parseShiftExpr();
      while (this.peek().type === 'OPERATOR' && ['<', '<=', '>', '>='].indexOf(this.peek().value) !== -1) {
        var op = this.advance().value;
        var right = this.parseShiftExpr();
        left = { type: 'BinaryExpr', operator: op, left: left, right: right };
      }
      return left;
    },

    parseShiftExpr: function() {
      var left = this.parseAdditiveExpr();
      while (this.peek().type === 'OPERATOR' && (this.peek().value === '<<' || this.peek().value === '>>')) {
        var op = this.advance().value;
        var right = this.parseAdditiveExpr();
        left = { type: 'BinaryExpr', operator: op, left: left, right: right };
      }
      return left;
    },

    parseAdditiveExpr: function() {
      var left = this.parseMultiplicativeExpr();
      while (this.peek().type === 'OPERATOR' && (this.peek().value === '+' || this.peek().value === '-')) {
        var op = this.advance().value;
        var right = this.parseMultiplicativeExpr();
        left = { type: 'BinaryExpr', operator: op, left: left, right: right };
      }
      return left;
    },

    parseMultiplicativeExpr: function() {
      var left = this.parseUnaryExpr();
      while (this.peek().type === 'OPERATOR' && (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%')) {
        var op = this.advance().value;
        var right = this.parseUnaryExpr();
        left = { type: 'BinaryExpr', operator: op, left: left, right: right };
      }
      return left;
    },

    parseUnaryExpr: function() {
      var tok = this.peek();
      if (tok.type === 'OPERATOR' && ['!', '~', '+', '-', '++', '--', '&', '*'].indexOf(tok.value) !== -1) {
        var op = this.advance().value;
        if (op === '*') {
          throw new Error('Runtime error: Pointers not supported in this subset');
        }
        var arg = this.parseUnaryExpr();
        if (op === '++' || op === '--') {
          return { type: 'UpdateExpr', operator: op, argument: arg, prefix: true };
        }
        if (op === '&') {
          return { type: 'AddressOfExpr', argument: arg };
        }
        return { type: 'UnaryExpr', operator: op, argument: arg };
      }
      return this.parsePostfixExpr();
    },

    parsePostfixExpr: function() {
      var expr = this.parsePrimaryExpr();
      while (true) {
        if (this.match('OPERATOR', '++') || this.match('OPERATOR', '--')) {
          expr = { type: 'UpdateExpr', operator: this.previous().value, argument: expr, prefix: false };
        } else if (this.match('PUNCT', '(')) {
          var args = [];
          if (!this.check('PUNCT', ')')) {
            do {
              args.push(this.parseAssignmentExpr());
            } while (this.match('PUNCT', ','));
          }
          this.expect('PUNCT', ')');
          expr = { type: 'CallExpr', callee: expr, arguments: args };
        } else if (this.match('PUNCT', '[')) {
          var indexExpr = this.parseAssignmentExpr();
          this.expect('PUNCT', ']');
          expr = { type: 'MemberExpr', object: expr, property: indexExpr, computed: true };
        } else if (this.match('OPERATOR', '.') || this.match('PUNCT', '.') || this.match('OPERATOR', '->')) {
          var propTok = this.advance();
          expr = { type: 'MemberExpr', object: expr, property: propTok.value, computed: false };
        } else {
          break;
        }
      }
      return expr;
    },

    parsePrimaryExpr: function() {
      var tok = this.peek();
      if (tok.type === 'NUMBER') {
        this.advance();
        return { type: 'Literal', value: tok.value, rawType: tok.isFloat ? 'float' : 'int' };
      }
      if (tok.type === 'STRING') {
        this.advance();
        return { type: 'Literal', value: tok.value, rawType: 'string' };
      }
      if (tok.type === 'CHAR') {
        this.advance();
        return { type: 'Literal', value: tok.value, charStr: tok.charStr, rawType: 'char' };
      }
      if (tok.type === 'INTERPOLATED_STRING') {
        this.advance();
        return { type: 'InterpolatedStringLiteral', value: tok.value };
      }
      if (tok.type === 'KEYWORD' && (tok.value === 'true' || tok.value === 'false')) {
        this.advance();
        return { type: 'Literal', value: tok.value === 'true', rawType: 'bool' };
      }
      if (tok.type === 'IDENT' || tok.type === 'KEYWORD') {
        this.advance();
        return { type: 'Identifier', name: tok.value };
      }
      if (this.match('PUNCT', '(')) {
        var expr = this.parseAssignmentExpr();
        this.expect('PUNCT', ')');
        return expr;
      }
      if (this.match('PUNCT', '{')) {
        var elements = [];
        if (!this.check('PUNCT', '}')) {
          do {
            elements.push(this.parseAssignmentExpr());
          } while (this.match('PUNCT', ','));
        }
        this.expect('PUNCT', '}');
        return { type: 'ArrayInitExpr', elements: elements };
      }
      throw new Error('Syntax error: Unexpected token `' + tok.value + '` at line ' + tok.line);
    }
  };

  // --- Control Signals ---
  function ReturnSignal(val) { this.value = val; }
  function BreakSignal() {}
  function ContinueSignal() {}

  // --- Environment ---
  function Environment(parent) {
    this.vars = Object.create(null);
    this.parent = parent || null;
  }
  Environment.prototype = {
    get: function(name) {
      if (Object.prototype.hasOwnProperty.call(this.vars, name)) {
        return this.vars[name];
      }
      if (this.parent) return this.parent.get(name);
      throw new Error('Runtime error: Undefined variable `' + name + '`');
    },
    set: function(name, val) {
      if (Object.prototype.hasOwnProperty.call(this.vars, name)) {
        this.vars[name] = val;
        return val;
      }
      if (this.parent) return this.parent.set(name, val);
      throw new Error('Runtime error: Undefined variable `' + name + '`');
    },
    declare: function(name, val) {
      this.vars[name] = val;
      return val;
    }
  };

  // --- Evaluator ---
  function Evaluator(stdinText) {
    this.globalEnv = new Environment();
    this.currentEnv = this.globalEnv;
    this.functions = Object.create(null);
    this.structs = Object.create(null);
    this.output = '';
    this.instructionCount = 0;
    this.maxInstructions = 5000000;
    this.maxOutputLen = 102400; // 100KB
    this.callDepth = 0;
    this.maxCallDepth = 500;

    this.stdinText = stdinText || '';
    this.stdinTokens = this.stdinText.trim().split(/\s+/).filter(Boolean);
    this.stdinIdx = 0;
    this.stdinTextIdx = 0;

    this.setupBuiltins();
  }

  Evaluator.prototype = {
    appendOutput: function(str) {
      if (this.output.length + str.length > this.maxOutputLen) {
        this.output += str.substring(0, this.maxOutputLen - this.output.length) + '\n[Output truncated > 100KB]';
        throw new Error('Execution aborted: Output cap of 100KB exceeded');
      }
      this.output += str;
    },

    setupBuiltins: function() {
      var self = this;

      this.functions['printf'] = function(args) {
        if (args.length === 0) return 0;
        var fmt = String(args[0]);
        var rest = args.slice(1);
        var formatted = formatPrintf(fmt, rest);
        self.appendOutput(formatted);
        return formatted.length;
      };

      this.functions['scanf'] = function(args) {
        if (args.length === 0) return 0;
        var fmt = String(args[0]);
        var varTargets = args.slice(1);
        var specs = fmt.match(/%[diuoxXfs c]/g) || [];
        var count = 0;
        for (var i = 0; i < specs.length && i < varTargets.length; i++) {
          if (self.stdinIdx >= self.stdinTokens.length) break;
          var spec = specs[i];
          var rawTok = self.stdinTokens[self.stdinIdx++];
          var val;
          if (spec === '%d' || spec === '%i') val = parseInt(rawTok, 10) || 0;
          else if (spec === '%f') val = parseFloat(rawTok) || 0;
          else if (spec === '%c') val = rawTok.charAt(0);
          else val = rawTok;

          var target = varTargets[i];
          if (target && target.isAddressOf) {
            self.currentEnv.set(target.varName, val);
            count++;
          }
        }
        return count;
      };

      this.functions['putchar'] = function(args) {
        var c = args[0];
        var str = typeof c === 'number' ? String.fromCharCode(c) : String(c).charAt(0);
        self.appendOutput(str);
        return typeof c === 'number' ? c : str.charCodeAt(0);
      };

      this.functions['puts'] = function(args) {
        var str = String(args[0] !== undefined ? args[0] : '');
        self.appendOutput(str + '\n');
        return str.length + 1;
      };

      this.functions['strlen'] = function(args) {
        return String(args[0] !== undefined ? args[0] : '').length;
      };

      this.functions['strcpy'] = function(args) {
        return String(args[1] !== undefined ? args[1] : '');
      };

      this.functions['strcmp'] = function(args) {
        var s1 = String(args[0] !== undefined ? args[0] : '');
        var s2 = String(args[1] !== undefined ? args[1] : '');
        if (s1 < s2) return -1;
        if (s1 > s2) return 1;
        return 0;
      };

      this.functions['sqrt'] = function(args) { return Math.sqrt(args[0]); };
      this.functions['pow'] = function(args) { return Math.pow(args[0], args[1]); };
      this.functions['abs'] = function(args) { return Math.abs(args[0]); };
      this.functions['fabs'] = function(args) { return Math.abs(args[0]); };
      this.functions['rand'] = function() { return Math.floor(Math.random() * 32768); };
      this.functions['srand'] = function() { return 0; };
      this.functions['malloc'] = function() { throw new Error('Runtime error: malloc not supported in this subset'); };

      var coutObj = { isCout: true };
      var cinObj = { isCin: true };
      this.globalEnv.declare('cout', coutObj);
      this.globalEnv.declare('cin', cinObj);
      this.globalEnv.declare('endl', '\n');

      var ConsoleObj = {
        WriteLine: function(arg) {
          self.appendOutput((arg !== undefined ? String(arg) : '') + '\n');
        },
        Write: function(arg) {
          self.appendOutput(arg !== undefined ? String(arg) : '');
        },
        ReadLine: function() {
          var line = '';
          var nextNewline = self.stdinText.indexOf('\n', self.stdinTextIdx);
          if (nextNewline !== -1) {
            line = self.stdinText.substring(self.stdinTextIdx, nextNewline);
            self.stdinTextIdx = nextNewline + 1;
          } else {
            line = self.stdinText.substring(self.stdinTextIdx);
            self.stdinTextIdx = self.stdinText.length;
          }
          return line.replace(/\r$/, '');
        }
      };

      var MathObj = {
        Sqrt: Math.sqrt,
        Pow: Math.pow,
        Abs: Math.abs,
        Max: Math.max,
        Min: Math.min,
        Floor: Math.floor,
        Ceiling: Math.ceil,
        PI: Math.PI
      };

      this.globalEnv.declare('Console', ConsoleObj);
      this.globalEnv.declare('Math', MathObj);
    },

    eval: function(node) {
      if (!node) return undefined;
      this.instructionCount++;
      if (this.instructionCount > this.maxInstructions) {
        throw new Error('Execution timed out (possible infinite loop)');
      }

      switch (node.type) {
        case 'Program':
          for (var i = 0; i < node.body.length; i++) {
            this.eval(node.body[i]);
          }
          return undefined;

        case 'BlockStmt':
          var prevEnv = this.currentEnv;
          this.currentEnv = new Environment(prevEnv);
          try {
            for (var b = 0; b < node.statements.length; b++) {
              this.eval(node.statements[b]);
            }
          } finally {
            this.currentEnv = prevEnv;
          }
          return undefined;

        case 'VarDeclStmt':
          var rawTypeName = node.varType.name;
          var cleanTypeName = rawTypeName.replace(/^struct\s+/, '');
          for (var d = 0; d < node.decls.length; d++) {
            var decl = node.decls[d];
            var val;
            if (decl.init) {
              val = this.eval(decl.init);
            } else {
              if (decl.arrayDims && decl.arrayDims.length > 0) {
                val = this.createArray(decl.arrayDims, 0);
              } else if (cleanTypeName === 'float' || cleanTypeName === 'double') {
                val = 0.0;
              } else if (cleanTypeName === 'string') {
                val = '';
              } else if (cleanTypeName === 'bool') {
                val = false;
              } else if (cleanTypeName === 'char') {
                val = 0;
              } else if (this.structs[cleanTypeName]) {
                val = this.createStructInstance(cleanTypeName);
              } else {
                val = 0;
              }
            }
            this.currentEnv.declare(decl.name, val);
          }
          return undefined;

        case 'ExprStmt':
          return this.eval(node.expr);

        case 'IfStmt':
          var condVal = this.eval(node.condition);
          if (this.isTruthy(condVal)) {
            return this.eval(node.thenBranch);
          } else if (node.elseBranch) {
            return this.eval(node.elseBranch);
          }
          return undefined;

        case 'WhileStmt':
          while (this.isTruthy(this.eval(node.condition))) {
            try {
              this.eval(node.body);
            } catch (e) {
              if (e instanceof BreakSignal) break;
              if (e instanceof ContinueSignal) continue;
              throw e;
            }
          }
          return undefined;

        case 'DoWhileStmt':
          do {
            try {
              this.eval(node.body);
            } catch (e) {
              if (e instanceof BreakSignal) break;
              if (e instanceof ContinueSignal) continue;
              throw e;
            }
          } while (this.isTruthy(this.eval(node.condition)));
          return undefined;

        case 'ForStmt':
          var prevEnvF = this.currentEnv;
          this.currentEnv = new Environment(prevEnvF);
          try {
            if (node.init) this.eval(node.init);
            while (node.condition === null || this.isTruthy(this.eval(node.condition))) {
              try {
                if (node.body) this.eval(node.body);
              } catch (e) {
                if (e instanceof BreakSignal) break;
                if (e instanceof ContinueSignal) {
                  if (node.post) this.eval(node.post);
                  continue;
                }
                throw e;
              }
              if (node.post) this.eval(node.post);
            }
          } finally {
            this.currentEnv = prevEnvF;
          }
          return undefined;

        case 'SwitchStmt':
          var discVal = this.eval(node.discriminant);
          var matched = false;
          for (var sc = 0; sc < node.cases.length; sc++) {
            var cCase = node.cases[sc];
            if (!matched) {
              if (cCase.value !== null) {
                var cVal = this.eval(cCase.value);
                if (cVal === discVal) matched = true;
              } else {
                matched = true;
              }
            }
            if (matched) {
              try {
                for (var cs = 0; cs < cCase.body.length; cs++) {
                  this.eval(cCase.body[cs]);
                }
              } catch (e) {
                if (e instanceof BreakSignal) break;
                throw e;
              }
            }
          }
          return undefined;

        case 'ReturnStmt':
          var retVal = node.expr ? this.eval(node.expr) : undefined;
          throw new ReturnSignal(retVal);

        case 'BreakStmt':
          throw new BreakSignal();

        case 'ContinueStmt':
          throw new ContinueSignal();

        case 'Literal':
          return node.value;

        case 'InterpolatedStringLiteral':
          return this.evalInterpolatedString(node.value);

        case 'Identifier':
          try {
            return this.currentEnv.get(node.name);
          } catch (e) {
            if (this.functions[node.name]) {
              return this.functions[node.name];
            }
            throw e;
          }

        case 'AddressOfExpr':
          if (node.argument.type === 'Identifier') {
            return { isAddressOf: true, varName: node.argument.name };
          }
          throw new Error('Runtime error: Pointers not supported in this subset');

        case 'ArrayInitExpr':
          var elems = [];
          for (var el = 0; el < node.elements.length; el++) {
            elems.push(this.eval(node.elements[el]));
          }
          return elems;

        case 'BinaryExpr':
          if (node.operator === '<<') {
            var leftV = this.eval(node.left);
            if (leftV && leftV.isCout) {
              var rightV = this.eval(node.right);
              if (rightV === '\n') this.appendOutput('\n');
              else this.appendOutput(rightV !== undefined ? String(rightV) : '');
              return leftV;
            }
          }
          if (node.operator === '>>') {
            var leftVin = this.eval(node.left);
            if (leftVin && leftVin.isCin) {
              if (this.stdinIdx < this.stdinTokens.length) {
                var inTok = this.stdinTokens[this.stdinIdx++];
                var targetNode = node.right;
                var numValIn = Number(inTok);
                var assignedVal = isNaN(numValIn) ? inTok : numValIn;
                this.assignLValue(targetNode, assignedVal);
              }
              return leftVin;
            }
          }

          if (node.operator === '&&') {
            var lAnd = this.eval(node.left);
            if (!this.isTruthy(lAnd)) return false;
            return this.isTruthy(this.eval(node.right));
          }
          if (node.operator === '||') {
            var lOr = this.eval(node.left);
            if (this.isTruthy(lOr)) return true;
            return this.isTruthy(this.eval(node.right));
          }

          var lVal = this.eval(node.left);
          var rVal = this.eval(node.right);

          if (typeof lVal === 'string' && lVal.length === 1 && typeof rVal === 'number' && node.operator !== '+') {
            lVal = lVal.charCodeAt(0);
          }
          if (typeof rVal === 'string' && rVal.length === 1 && typeof lVal === 'number' && node.operator !== '+') {
            rVal = rVal.charCodeAt(0);
          }

          switch (node.operator) {
            case '+': return lVal + rVal;
            case '-': return lVal - rVal;
            case '*': return lVal * rVal;
            case '/':
              if (rVal === 0) throw new Error('Runtime error: Division by zero');
              if (typeof lVal === 'number' && typeof rVal === 'number' && Number.isInteger(lVal) && Number.isInteger(rVal)) {
                return Math.trunc(lVal / rVal);
              }
              return lVal / rVal;
            case '%':
              if (rVal === 0) throw new Error('Runtime error: Division by zero');
              return lVal % rVal;
            case '==': return lVal === rVal;
            case '!=': return lVal !== rVal;
            case '<': return lVal < rVal;
            case '<=': return lVal <= rVal;
            case '>': return lVal > rVal;
            case '>=': return lVal >= rVal;
            case '&': return lVal & rVal;
            case '|': return lVal | rVal;
            case '^': return lVal ^ rVal;
            case '<<': return lVal << rVal;
            case '>>': return lVal >> rVal;
          }
          throw new Error('Runtime error: Unsupported binary operator `' + node.operator + '`');

        case 'UnaryExpr':
          var argVal = this.eval(node.argument);
          if (node.operator === '!') return !this.isTruthy(argVal);
          if (node.operator === '~') return ~argVal;
          if (node.operator === '+') return +argVal;
          if (node.operator === '-') return -argVal;
          throw new Error('Runtime error: Unsupported unary operator `' + node.operator + '`');

        case 'UpdateExpr':
          var oldVal = this.eval(node.argument);
          var newVal = (node.operator === '++') ? (oldVal + 1) : (oldVal - 1);
          this.assignLValue(node.argument, newVal);
          return node.prefix ? newVal : oldVal;

        case 'AssignmentExpr':
          var rhs = this.eval(node.right);
          if (node.operator !== '=') {
            var lhsVal = this.eval(node.left);
            var baseOp = node.operator.replace('=', '');
            if (baseOp === '+') rhs = lhsVal + rhs;
            else if (baseOp === '-') rhs = lhsVal - rhs;
            else if (baseOp === '*') rhs = lhsVal * rhs;
            else if (baseOp === '/') {
              if (rhs === 0) throw new Error('Runtime error: Division by zero');
              rhs = Math.trunc(lhsVal / rhs);
            }
            else if (baseOp === '%') {
              if (rhs === 0) throw new Error('Runtime error: Division by zero');
              rhs = lhsVal % rhs;
            }
            else if (baseOp === '&') rhs = lhsVal & rhs;
            else if (baseOp === '|') rhs = lhsVal | rhs;
            else if (baseOp === '^') rhs = lhsVal ^ rhs;
            else if (baseOp === '<<') rhs = lhsVal << rhs;
            else if (baseOp === '>>') rhs = lhsVal >> rhs;
          }
          this.assignLValue(node.left, rhs);
          return rhs;

        case 'TernaryExpr':
          var tCond = this.eval(node.condition);
          return this.isTruthy(tCond) ? this.eval(node.trueExpr) : this.eval(node.falseExpr);

        case 'MemberExpr':
          var obj = this.eval(node.object);
          if (obj === null || obj === undefined) {
            throw new Error('Runtime error: Null reference exception');
          }
          var propName = node.computed ? this.eval(node.property) : node.property;

          if (Array.isArray(obj)) {
            if (typeof propName !== 'number' || propName < 0 || propName >= obj.length) {
              throw new Error('Runtime error: Array index ' + propName + ' out of bounds (length ' + obj.length + ')');
            }
            return obj[propName];
          }

          if (typeof obj === 'string') {
            if (propName === 'Length' || propName === 'length') return obj.length;
          }

          if (typeof obj === 'object') {
            if (Object.prototype.hasOwnProperty.call(obj, propName)) {
              var val = obj[propName];
              if (typeof val === 'function') return val.bind(obj);
              return val;
            }
            if (typeof obj[propName] === 'function') {
              return obj[propName].bind(obj);
            }
            if (propName === 'Length' || propName === 'length') {
              if (obj.length !== undefined) return obj.length;
            }
          }
          throw new Error('Runtime error: Member `' + propName + '` not found');

        case 'CallExpr':
          var func = this.eval(node.callee);
          var argsList = [];
          for (var a = 0; a < node.arguments.length; a++) {
            argsList.push(this.eval(node.arguments[a]));
          }
          if (typeof func === 'function') {
            return func(argsList);
          }
          if (func && func.type === 'FunctionDecl') {
            return this.callFunction(func, argsList);
          }
          throw new Error('Runtime error: Expression is not a function');

        default:
          throw new Error('Runtime error: Unknown AST node type `' + node.type + '`');
      }
    },

    assignLValue: function(targetNode, value) {
      if (targetNode.type === 'Identifier') {
        this.currentEnv.set(targetNode.name, value);
      } else if (targetNode.type === 'MemberExpr') {
        var obj = this.eval(targetNode.object);
        if (obj === null || obj === undefined) {
          throw new Error('Runtime error: Null reference exception');
        }
        var propName = targetNode.computed ? this.eval(targetNode.property) : targetNode.property;
        if (Array.isArray(obj)) {
          if (typeof propName !== 'number' || propName < 0 || propName >= obj.length) {
            throw new Error('Runtime error: Array index ' + propName + ' out of bounds (length ' + obj.length + ')');
          }
          obj[propName] = value;
        } else {
          obj[propName] = value;
        }
      } else {
        throw new Error('Runtime error: Invalid lvalue for assignment');
      }
    },

    callFunction: function(funcDecl, args) {
      this.callDepth++;
      if (this.callDepth > this.maxCallDepth) {
        throw new Error('Runtime error: Stack overflow (max recursion depth 500 exceeded)');
      }
      var prevEnv = this.currentEnv;
      this.currentEnv = new Environment(this.globalEnv);
      try {
        for (var p = 0; p < funcDecl.params.length; p++) {
          var pName = funcDecl.params[p].name;
          var pVal = (p < args.length) ? args[p] : undefined;
          this.currentEnv.declare(pName, pVal);
        }
        this.eval(funcDecl.body);
      } catch (e) {
        if (e instanceof ReturnSignal) {
          return e.value;
        }
        throw e;
      } finally {
        this.currentEnv = prevEnv;
        this.callDepth--;
      }
      return undefined;
    },

    isTruthy: function(val) {
      if (val === false || val === 0 || val === null || val === undefined || val === '') return false;
      return true;
    },

    createArray: function(dims, depth) {
      if (depth >= dims.length) return 0;
      var sizeNode = dims[depth];
      var size = sizeNode ? this.eval(sizeNode) : 0;
      var arr = new Array(size);
      for (var i = 0; i < size; i++) {
        arr[i] = (depth + 1 < dims.length) ? this.createArray(dims, depth + 1) : 0;
      }
      return arr;
    },

    createStructInstance: function(typeName) {
      var structDef = this.structs[typeName];
      var inst = Object.create(null);
      if (structDef && structDef.fields) {
        for (var f = 0; f < structDef.fields.length; f++) {
          var fieldStmt = structDef.fields[f];
          for (var d = 0; d < fieldStmt.decls.length; d++) {
            var fDecl = fieldStmt.decls[d];
            inst[fDecl.name] = 0;
          }
        }
      }
      return inst;
    },

    evalInterpolatedString: function(str) {
      var self = this;
      return str.replace(/\{([^}]+)\}/g, function(match, exprCode) {
        try {
          var toks = tokenize(exprCode);
          var p = new Parser(toks, Object.keys(self.structs));
          var ast = p.parseAssignmentExpr();
          var val = self.eval(ast);
          return val !== undefined ? String(val) : '';
        } catch (e) {
          return match;
        }
      });
    }
  };

  function run(code, lang, stdin) {
    var output = '';
    var errors = [];
    var ok = true;
    var evaler;

    try {
      var processed = preprocess(code || '');
      var tokens = tokenize(processed);

      var parser = new Parser(tokens);
      var programAst = parser.parseProgram();

      evaler = new Evaluator(stdin || '');

      var topLevelStmts = [];
      for (var i = 0; i < programAst.body.length; i++) {
        var stmt = programAst.body[i];
        if (stmt.type === 'ClassDecl') {
          for (var m = 0; m < stmt.members.length; m++) {
            var member = stmt.members[m];
            if (member.type === 'FunctionDecl') {
              evaler.functions[member.name] = member;
            }
          }
        } else if (stmt.type === 'StructDecl') {
          evaler.structs[stmt.name] = stmt;
        } else if (stmt.type === 'FunctionDecl') {
          evaler.functions[stmt.name] = stmt;
        } else if (stmt.type === 'VarDeclStmt') {
          evaler.eval(stmt);
        } else {
          topLevelStmts.push(stmt);
        }
      }

      // Execute top-level statements
      for (var t = 0; t < topLevelStmts.length; t++) {
        evaler.eval(topLevelStmts[t]);
      }

      // If main or Main exists, execute it
      var mainFunc = evaler.functions['main'] || evaler.functions['Main'];
      if (mainFunc) {
        evaler.callFunction(mainFunc, []);
      }

      output = evaler.output;
    } catch (e) {
      ok = false;
      errors.push(e.message || String(e));
      if (typeof evaler !== 'undefined' && evaler && evaler.output) {
        output = evaler.output;
      }
    }

    return {
      ok: ok,
      output: output,
      errors: errors
    };
  }

  return {
    version: VERSION,
    run: run
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MWO.CInterp;
}
