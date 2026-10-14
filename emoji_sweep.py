#!/usr/bin/env python3
"""MossyWoss OS emoji sweep: replaces/removes every emoji-presentation character
in mw_web source files. Icon fields get descriptive keys (rendered as CSS tiles);
functional glyphs (game pieces) become plain text shapes; decorative ones are
stripped. No emoji-presentation characters remain. Plain ASCII + geometric
shapes (U+25xx) are the only symbols allowed."""
import re, sys, glob

# emoji-presentation + flagged ranges (the scan gate)
FLAG = re.compile(r'[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u2705\u274C\u2713\u2717\u2190-\u21FF]')

# functional map: game pieces / status glyphs -> plain text shapes or words
MAP = {
    '\u2705': '[ok]', '\u274C': '[FAIL]', '\u2713': '[ok]', '\u2717': '[FAIL]',
    '\u2714': '[ok]', '\u2716': '[FAIL]',
    '\u25b6': 'Run', '\u25b6\ufe0f': 'Run',
    '\u271f': '', '\u2715': 'Close',
    '\u2764': 'Heart', '\u2764\ufe0f': 'Heart',
    '\u2665': 'H', '\u2660': 'S', '\u2666': 'D', '\u2663': 'C',  # card suits -> letters
    '\u266a': '~', '\u266b': '~', '\u2669': '~',
    '\u26a0': '', '\u26a0\ufe0f': '',  # warning triangle, text usually precedes
    '\u2699': '', '\u2699\ufe0f': '',  # gear decorative
    '\u261d': '', '\u261d\ufe0f': '',
    '\u26f3': 'Goal', '\u26be': 'Ball',
    '\u2b50': 'Star', '\u2b50\ufe0f': 'Star',
    '\u2b55': '',
    # common game-piece emojis -> plain geometric text glyphs (colored by canvas fillStyle / CSS)
    '\U0001F34E': '\u25cf', '\U0001F34C': '\u25cf', '\U0001F347': '\u25cf',
    '\U0001F353': '\u25cf', '\U0001F354': '\u25cf', '\U0001F355': '\u25cf',
    '\U0001F349': '\u25cf', '\U0001F34A': '\u25cf', '\U0001F34B': '\u25cf',
    '\U0001F346': '\u25cf', '\U0001F351': '\u25cf', '\U0001F345': '\u25cf',
    '\U0001F344': '\u25c9', '\U0001F341': '\u25cf', '\U0001F33F': '\u25b2',
    '\U0001F340': '\u25cf',
    '\U0001F4A3': '\u25a0', '\U0001F4A2': '!', '\U0001F4A4': 'z',
    '\U0001F4A5': 'X', '\U0001F4A8': '>', '\U0001F4AB': '\u25c6',
    '\U0001F381': '+', '\U0001F383': '\u25cf', '\U0001F384': '\u25b2',
    '\U0001F389': '!', '\U0001F38A': '!',
    '\U0001F3C0': '\u25cf', '\U0001F3C8': '\u25cf', '\U0001F3C5': '\u2605',
    '\U0001F3C6': 'WIN', '\U0001F3C7': '\u25cf',
    '\U0001F408': 'Cat', '\U0001F407': 'Bunny', '\U0001F415': 'Dog',
    '\U0001F98A': 'Fox', '\U0001F989': 'Owl', '\U0001F43C': 'Bear',
    '\U0001F431': 'Cat', '\U0001F436': 'Dog', '\U0001F430': 'Bunny',
    '\U0001F40D': 'Snake', '\U0001F425': 'Chick', '\U0001F427': 'Penguin',
    '\U0001F984': 'Deer', '\U0001F41F': 'Fish', '\U0001F41B': 'Bug',
    '\U0001F577': 'Bug', '\U0001F578': 'Bug',
    '\U0001F464': 'User', '\U0001F465': 'Users', '\U0001F9D1': 'User',
    '\U0001F5A4': 'Heart', '\U0001F494': 'Heart', '\U0001F495': 'Heart',
    '\U0001F49B': 'Heart', '\U0001F49A': 'Heart', '\U0001F499': 'Heart',
    '\U0001F49C': 'Heart', '\U0001F493': 'Heart', '\U0001F497': 'Heart',
    '\U0001F496': 'Heart', '\U0001F498': 'Heart', '\U0001F49D': 'Heart',
    '\U0001F4AF': '100', '\U0001F4A2': '!',
    '\U0001F4B0': '$', '\U0001F4B4': '$', '\U0001F4B5': '$',
    '\U0001F4A6': '', '\U0001F4A7': '',
    '\U0001F31F': '\u25c6', '\U0001F320': '\u25c6', '\U0001F304': '',
    '\U0001F31E': 'Sun', '\U0001F31B': 'Moon', '\U0001F319': 'Moon',
    '\U0001F308': '', '\U0001F324': '', '\U0001F327': '',
    '\U0001F54D': '', '\U0001F3F0': '', '\U0001F3DB': '',
    '\U0001F511': '', '\U0001F513': '', '\U0001F510': '',
    '\U0001F5DD': '', '\U0001F5DE': '', '\U0001F4C4': 'Doc', '\U0001F4C1': 'Dir',
    '\U0001F4C2': 'Dir', '\U0001F4C3': 'Doc', '\U0001F4DA': 'Doc',
    '\U0001F50D': '', '\U0001F50E': '', '\U0001F52D': '',
    '\U0001F680': '', '\U0001F6D0': '', '\U0001F6E0': '',
    '\U0001F3AF': 'Target', '\U0001F3B1': 'Ball', '\U0001F3AE': 'Games',
    '\U0001F47E': 'Alien', '\U0001F916': 'Bot', '\U0001F9E0': 'Brain',
    '\U0001F419': 'Kraken', '\U0001F42D': 'Mouse', '\U0001F986': 'Duck',
    '\U0001F983': 'Turkey', '\U0001F41D': 'Bee', '\U0001F98B': 'Butterfly',
    '\U0001F332': 'Tree', '\U0001F333': 'Tree', '\U0001F334': 'Palm',
    '\U0001F340': '\u25cf', '\U0001F339': 'Rose', '\U0001F338': 'Blossom',
    '\U0001F331': '', '\U0001F33E': '', '\U0001F30D': 'Earth',
    '\U0001F30F': '', '\U0001F310': '', '\U0001F5FA': 'Map',
    '\U0001F5FE': '', '\U0001F3D4': 'Peak', '\U0001F3EF': 'Palace',
    '\U0001F3F9': 'Bow', '\U0001F3B2': 'Dice', '\U0001F3B0': 'Slots',
    '\U0001F3AD': 'Theater', '\U0001F3A8': 'Art', '\U0001F3AA': 'Circus',
    '\U0001F393': 'Grad', '\U0001F396': 'Medal', '\U0001F3C1': 'Flag',
    '\U0001F6A9': 'Flag', '\U0001F3F3': 'Flag', '\U0001F3F4': 'Flag',
    '\U0001F4CC': '', '\U0001F4CE': '', '\U0001F5C2': 'Files',
    '\U0001F5C3': 'Files', '\U0001F5C4': 'Files',
    '\U0001F4E6': 'Box', '\U0001F4E4': 'Out', '\U0001F4E5': 'In',
    '\U0001F512': 'Lock', '\U0001F516': 'Tag',
    '\U0001F50A': '', '\U0001F508': '', '\U0001F509': '',
    '\U0001F3A7': '', '\U0001F3B5': '~', '\U0001F3B6': '~',
    '\U0001F3BC': '~', '\U0001F3B3': 'Strike',
    '\U0001F955': 'Veg', '\U0001F966': 'Veg', '\U0001F951': 'Fruit',
    '\U0001F957': 'Fruit', '\U0001F965': 'Fruit',
    '\U0001F6BD': '', '\U0001F6BF': '',
    '\U0001F531': 'Trident', '\U0001F48E': 'Gem', '\U0001F39F': '',
    '\U0001F3B7': 'Sax', '\U0001F3B8': 'Guitar', '\U0001F3B9': 'Piano',
    '\U0001F9F8': 'Teddy', '\U0001F528': 'Hammer', '\U0001F529': '',
    '\U0001F6E1': '', '\U0001F6D1': 'Stop', '\U0001F6D2': '',
    '\U0001F5FF': '', '\U0001F5FB': '', '\U0001F5FC': '',
    '\U0001F5FD': '', '\U0001F5F3': '',
}
# keycap digits -> digits
for d in '0123456789':
    MAP[d + '\ufe0f\u20e3'] = d
    MAP[d + '\u20e3'] = d
# skin tones / ZWJ -> strip
STRIP = re.compile(r'[\U0001F3FB-\U0001F3FF\u200D\ufe0f]')

def slug(name):
    s = re.sub(r"[^a-zA-Z0-9]+", '-', name).strip('-').lower()
    return s[:24] or 'app'

def find_name(src, pos):
    """nearest name/title/label string in the surrounding statement"""
    lo = max(0, pos - 220); hi = min(len(src), pos + 220)
    win = src[lo:hi]
    best = None; bestd = 99999
    for m in re.finditer(r"(?:name|title|label|id)\s*:\s*['\"]([^'\"]{1,40})['\"]", win):
        d = abs(m.start() - (pos - lo))
        if d < bestd:
            bestd = d; best = m.group(1)
    return best or 'app'

def sweep(path):
    src = open(path, encoding='utf-8').read()
    orig = src
    # 1. icon/avatar/logo glyph fields -> descriptive keys
    def icon_sub(m):
        val = m.group(2)
        if not FLAG.search(val):
            return m.group(0)
        key = slug(find_name(src, m.start()))
        return m.group(1) + key + m.group(3)
    src = re.sub(r"((?:icon|avatar|logo|glyph|iconHTML)\s*:\s*['\"])([^'\"]*)(['\"])", lambda m: icon_sub(m), src)
    # 2. mapped functional emojis
    for k in sorted(MAP, key=len, reverse=True):
        src = src.replace(k, MAP[k])
    # 3. any remaining flagged chars in string-ish contexts: strip + clean
    def strip_line(m):
        seg = m.group(0)
        seg = FLAG.sub('', seg)
        seg = re.sub(r'  +', ' ', seg)
        seg = re.sub(r"(['\"]) +", r"\1", seg)
        seg = re.sub(r" +(['\"])", r"\1", seg)
        return seg
    # apply strip to the whole file but only inside quotes conservatively:
    # safe approach: strip everywhere EXCEPT leaving ASCII intact (regex only removes flagged chars)
    seg_lines = []
    for line in src.split('\n'):
        if FLAG.search(line):
            line = FLAG.sub('', line)
            line = re.sub(r'  +', ' ', line)
            line = re.sub(r' +([,.!?;:])', r'\1', line)
            line = re.sub(r'( , )+', ', ', line)
        seg_lines.append(line)
    src = '\n'.join(seg_lines)
    # cleanup artifacts: "''" empty strings where a whole label vanished are OK only in icon fields (already keyed)
    src = src.replace('\ufe0f', '')
    if src != orig:
        open(path, 'w', encoding='utf-8').write(src)
    return len(FLAG.findall(src))

total = 0
for f in sorted(glob.glob('mw_web/*.js') + ['mw_web/core.html']):
    if 'three.min' in f or 'icons.js' in f:
        continue
    n = sweep(f)
    if n:
        print('REMAIN', f, n)
    total += n
print('TOTAL remaining after sweep:', total)
