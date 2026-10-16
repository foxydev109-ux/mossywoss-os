#!/usr/bin/env python3
"""
MossyWoss OS — HTML5 Assembler
Combines all parts into a single self-contained HTML5 file for personal use.
"""
import os, sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, 'mw_web')
OUTPUT = os.path.join(BASE_DIR, 'mossywoss_os.html')

def read_file(name):
    path = os.path.join(WEB_DIR, name)
    if not os.path.exists(path):
        print(f"  SKIP: {name} (not found)")
        return ""
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    print(f"  OK: {name} ({len(content)} bytes)")
    return content

def assemble():
    print("=== MossyWoss OS HTML5 Assembler ===\n")
    
    # Read core HTML
    html = read_file('core.html')
    if not html:
        print("ERROR: core.html is required")
        return False
    
    # Read all JS files in order
    js_files = ['three.min.js', 'assets.js', 'countries.js', 'core.js', 'icons.js', 'recyclebin.js', 'videogen.js', 'cinterp.js', 'codestudio.js', 'gamebuilder.js', 'linuxlab.js', 
                'maker.js', 'voxely3d.js',
                'apps.js', 'browser.js', 'sec.js', 'publisher.js', 'games.js', 'animation.js', 'aura.js',
                'recorder.js', 'mediaimport.js', 'visualcode.js',
                'simsgames.js', 'games3d.js', 'megapack.js', 'oddities.js', 'hostlink.js', 'vrvoxel.js',
                'gamepad.js', 'peinspector.js']
    
    js_parts = []
    for f in js_files:
        content = read_file(f)
        if content:
            js_parts.append(f"// === {f} ===\n{content}")
    
    combined_js = '\n\n'.join(js_parts)
    
    # Replace the script placeholder
    placeholder = '<!--=$_SCRIPTS_PLACEHOLDER_=>-->'
    if placeholder in html:
        html = html.replace(placeholder, 
                          f'<script>\n{combined_js}\n</script>\n</body>\n</html>')
    else:
        # Append script before closing body/html
        if '</body>' in html:
            html = html.replace('</body>', f'<script>\n{combined_js}\n</script>\n</body>')
        else:
            html = html + f'\n<script>\n{combined_js}\n</script>\n</body>\n</html>'
    
    # Ensure proper ending
    if '</html>' not in html:
        html += '\n</html>'
    
    # Write
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        f.write(html)
    
    size = os.path.getsize(OUTPUT)
    lines = html.count('\n')
    print(f"\n{'='*50}")
    print(f"  ASSEMBLED: mossywoss_os.html")
    print(f"  Size: {size:,} bytes ({size/1024:.1f} KB)")
    print(f"  Lines: {lines:,}")
    print(f"  File size: {size//1024} KB")
    print(f"  Per-file limit: 200 MB {'✅' if size < 200*1024*1024 else '❌'}")
    print(f"  DOCTYPE: {'✅' if '<!DOCTYPE html>' in html[:100] else '❌'}")
    print(f"  {'='*50}")
    
    # Count features
    features = {
        'Apps registered': html.count('registerApp'),
        'MWO subsystems': len(set(part.split('(')[0].strip() for part in html.split('MWO.') if '(' in part and '=' in part)),
        'Canvas elements': html.count('<canvas') + html.count('getElementById') // 10,
        'Touch handlers': html.count('touchstart') + html.count('touchend') + html.count('touchmove'),
        'Event listeners': html.count('addEventListener'),
        'IndexedDB calls': html.count('indexedDB') + html.count('IDB') ,
    }
    print(f"\n  Features:")
    for k, v in features.items():
        print(f"    {k}: {v}")
    
    print(f"\n  MossyWoss OS assembled — personal build ready!")
    return True

if __name__ == '__main__':
    success = assemble()
    sys.exit(0 if success else 1)
