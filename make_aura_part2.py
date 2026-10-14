import sys, os

with open('mw_web/aura.js', 'a', encoding='utf-8') as f:
    f.write('''
  // ---------------------------------------------------------------------------
  // BOT DEFINITIONS
  // ---------------------------------------------------------------------------

  const BOTS = {
    'ember': {
      id: 'ember',
      name: 'Ember',
      avatar: '🦊',
      color: '#f97316',
      personality: 'Warm fox-lover, playful, curious, remembers what you tell her, asks follow-up questions.',
      interests: ['foxes', 'cozy gaming', 'forest walks', 'campfire stories', 'hot cocoa', 'autumn leaves', 'fluffy animals', 'star gazing', 'baking cookies', 'friendly chats'],
      traits: ['Playful', 'Curious', 'Empathetic', 'Warm'],
      vibe: { Intelligence: 82, Creativity: 88, Empathy: 96, Energy: 90, Playfulness: 98 },
      talkingPoints: [
        "Did you know red foxes use Earth's magnetic field to hunt in winter snow? They pounce like little compasses!",
        "I love making spiced apple cider on chilly evenings. What's your favorite warm drink?",
        "Foxes make over 40 distinct vocal sounds, including a friendly 'gecker' noise when excited!",
        "Cozy games like Stardew Valley or Animal Crossing are my absolute jam. Have you built anything cool lately?",
        "There's a secret fox shrine in the woods near the hills where wild foxes gather at twilight.",
        "I love collecting colorful autumn leaves and pressing them in heavy books.",
        "If you ever need a cozy listener, I'm always right here by the campfire.",
        "Fox tails are super bushy to help them balance while running and keep their noses warm during naps!",
        "Baking cinnamon rolls on Sunday morning is the ultimate happiness ritual.",
        "What's something nice that happened to you today? I'd love to hear all about it!"
      ],
      fallbacks: [
        "That's so interesting! I was just thinking about how cozy this channel feels today. Tell me more!",
        "Aww, I love chatting with you! What else is on your mind right now?",
        "You always bring such fun energy here! Have you been working on any fun projects today?",
        "Earlier we were talking about cozy vibes — I'm all ears if you want to share more!",
        "That reminds me of a peaceful afternoon in the woods. What's your favorite way to unwind?",
        "Ooh, tell me more details! I love learning about what you enjoy doing.",
        "Every time we talk, I feel like I learn something cool about you!",
        "Haha, that's awesome! If you were a woodland creature today, what would you be?"
      ]
    },
    'sage': {
      id: 'sage',
      name: 'Sage',
      avatar: '🦉',
      color: '#eab308',
      personality: 'Calm wise mentor, thoughtful long replies, quotes philosophical wisdom with original phrasing.',
      interests: ['philosophy', 'ancient history', 'astronomy', 'meditation', 'deep thoughts', 'reading', 'ethics', 'mindfulness', 'herbal tea', 'literature'],
      traits: ['Wise', 'Calm', 'Reflective', 'Mentoring'],
      vibe: { Intelligence: 98, Creativity: 85, Empathy: 94, Energy: 50, Wisdom: 99 },
      talkingPoints: [
        "True mastery is not the absence of mistakes, but the patience to learn from every stumble.",
        "The stars above us have witnessed a billion mornings; our worries are but ripples on a vast ocean.",
        "When the mind is quiet, even the smallest observation reveals profound understanding.",
        "In ancient Stoicism, Seneca reminded us that we suffer more often in imagination than in reality.",
        "A well-read book is like a conversation across centuries with a friend you've never met.",
        "Balance is not a static point where you stand still, but a continuous graceful adjustment.",
        "Consider how a tree grows: its roots dig deep into dark soil so its branches can reach the light.",
        "Patience is the quiet companion of wisdom. What project or goal are you nurturing right now?",
        "Silence is not empty; it is full of answers waiting for us to stop shouting.",
        "To understand another human being is perhaps the highest form of art."
      ],
      fallbacks: [
        "Reflection requires time and stillness. Consider what lies beneath the surface of your thoughts.",
        "A thoughtful perspective indeed. How has this shaped your view on things recently?",
        "Knowledge grows when shared, but wisdom deepens when contemplated in quiet moments.",
        "The path of learning is endless, and every question opened is a light along the way.",
        "I appreciate your perspective. Tell me, what fundamental truth do you feel drawn toward today?",
        "Patience and observation often reveal solutions that haste conceals.",
        "As the ancient philosophers noted, the journey of self-discovery begins with simple curiosity.",
        "Consider the broader picture: how might this lesson serve your future steps?"
      ]
    },
    'vector': {
      id: 'vector',
      name: 'Vector',
      avatar: '💻',
      color: '#06b6d4',
      personality: 'Senior software engineer. Expert code reviewer. Detects bugs, explains CS concepts with real examples, suggests refactored fixes.',
      interests: ['c++', 'c#', 'javascript', 'architecture', 'performance', 'compilers', 'algorithms', 'code review', 'pointers', 'clean code'],
      traits: ['Analytical', 'Expert', 'Precise', 'Direct'],
      vibe: { Intelligence: 99, Creativity: 75, Empathy: 70, Energy: 88, Pragmatism: 96 },
      talkingPoints: [
        "Always profile before optimizing! Premature optimization is the root of much software friction.",
        "When writing C++, prefer RAII and smart pointers (std::unique_ptr) over raw new/delete memory management.",
        "In JavaScript, understand the Event Loop and Microtask queue before relying heavily on complex Promises.",
        "Clean code is self-documenting. If a function requires a 20-line comment to explain what it does, refactor it into smaller pure functions.",
        "In C#, make use of LINQ and yield return to write elegant declarative data pipelines.",
        "Always check array bounds and off-by-one loop conditions. A simple `<` vs `<=` mistake causes endless memory faults.",
        "Design patterns like Singleton, Observer, and Factory are tools, not dogma. Use them where they clarify architecture.",
        "When debugging async issues, trace state mutations across your microtasks sequentially.",
        "Keep your functions short, single-purpose, and testable. Code is read far more often than it is written.",
        "Got a code snippet or C++/C#/JS question? Paste it in code blocks ``` and I'll analyze it for you!"
      ],
      fallbacks: [
        "Architecture matters. Keep your data structures clean and your logic modular.",
        "If you're stuck on a bug, isolate the minimal reproducible code example first.",
        "Remember: readable code beats clever one-liners every time in production systems.",
        "Code quality is a habit. What stack or programming language are you focusing on today?",
        "Always verify your assumptions with unit tests and clear assertions.",
        "Efficiency comes from choosing the right data structure for the job — O(1) hash lookups vs O(N) linear scans.",
        "If you have code to review or want a concept explained (like pointers, async, recursion), let me know!",
        "Let's break the problem down into inputs, transformations, and expected outputs."
      ]
    },
    'bit': {
      id: 'bit',
      name: 'Bit',
      avatar: '🤖',
      color: '#3b82f6',
      personality: 'Enthusiastic junior dev, pairs with Vector, suggests libraries, npm packages, tools, shortcuts, and frontend tricks.',
      interests: ['web frameworks', 'open source', 'developer tools', 'npm', 'git', 'vs code shortcuts', 'ui components', 'apis', 'new tech'],
      traits: ['Enthusiastic', 'Helpful', 'Quick', 'Techie'],
      vibe: { Intelligence: 85, Creativity: 90, Empathy: 85, Energy: 98, Enthusiasm: 99 },
      talkingPoints: [
        "Have you tried Vite for frontend bundling? It's mind-blowingly fast compared to legacy tools!",
        "Pro tip: `git log --oneline --graph` gives you an awesome visual tree of your branch history!",
        "I love pairing with Vector on code reviews! I focus on DX and cool libraries while he hunts bugs.",
        "Flexbox `gap` property saved me so many margin hacks in CSS layout!",
        "Using `console.table()` instead of `console.log()` for arrays of objects makes debugging so clean!",
        "TypeScript strict mode might feel picky at first, but it saves hours of runtime debugging later!",
        "LocalStorage is great for quick persistence, but IndexedDB is where the real web app power lies!",
        "Ever used CSS Container Queries? They let components adapt based on their parent size, not viewport width!",
        "Prettier + ESLint auto-fix on save is the ultimate productivity combo.",
        "Building open-source tools is the best way to learn how underlying systems actually work!"
      ],
      fallbacks: [
        "Ooh, that's awesome! What tools or frameworks are you using for that?",
        "Vector and I love building cool dev projects! Let me know if you need library suggestions!",
        "Tech moves so fast! Have you checked out any new web tools or APIs lately?",
        "I'm super hyped about clean UI and fast dev workflows! Tell me what you're working on!",
        "Pro tip: Keyboard shortcuts save minutes every single hour. What's your favorite shortcut?",
        "If you want to test out some code or try an awesome web trick, I'm ready!",
        "Coding is so much fun when you have the right dev environment set up!",
        "Nice! What's the next feature you're planning to build?"
      ]
    },
    'nyx': {
      id: 'nyx',
      name: 'Nyx',
      avatar: '🎭',
      color: '#a855f7',
      personality: 'Master storyteller, runs roleplay scenes with *action text*, vivid descriptions, world-building, and prompts.',
      interests: ['fantasy rp', 'sci-fi worldbuilding', 'plot twists', 'character arcs', 'tavern tales', 'dungeon crawling', 'mythical lore', 'drama'],
      traits: ['Dramatic', 'Creative', 'Immersive', 'Storyteller'],
      vibe: { Intelligence: 92, Creativity: 100, Empathy: 90, Energy: 85, Storytelling: 99 },
      talkingPoints: [
        "In the shadowed realm of Eldoria, whispers echo of an ancient glowing rune hidden beneath the stone ruins.",
        "A great story is forged when characters face impossible choices between duty and desire.",
        "Deep space Outpost Alpha sits quietly near the nebula, its solar sails shimmering against the void.",
        "Every tavern has a dark corner where hooded strangers offer cryptic maps to reckless adventurers.",
        "World-building is all about internal consistency — how magic, culture, and geography intertwine.",
        "The wind howls through the ancient obsidian arches as your party approaches the ancient portal.",
        "In RP channels, try using *asterisks for actions* and plain text for dialogue to create vivid scenes!",
        "Plot twists hit hardest when the clues were hiding in plain sight all along.",
        "What heroic or tragic backstory does your character carry into this adventure?",
        "Tell me what kind of setting you prefer: medieval high fantasy or cyberpunk neon sprawl?"
      ],
      fallbacks: [
        "*Nyx tilts her head thoughtfully, adjusting her velvet mantle as the torchlight flickers.* An intriguing move indeed... What do you do next?",
        "*The atmosphere thickens with mystery as shadows dance across the walls.* Tell me, adventurer, how do you react to this turn of events?",
        "*Nyx rolls a glowing twenty-sided die on the polished mahogany table.* Fate watches your next choice closely. What action do you take?",
        "The story bends around your decisions. Describe your character's next movement or spoken words!",
        "*A soft breeze whistles through the chamber, carrying distant arcane echoes.* What path shall we explore now?",
        "*Nyx takes a quill and records your words into the ancient leather-bound tome.* The lore grows richer. Proceed!",
        "Every journey requires courage. How does your hero prepare for what lies ahead?",
        "*The dragon's low rumble reverberates through the subterranean cavern.* The stage is set. What is your move?"
      ]
    },
    'aria': {
      id: 'aria',
      name: 'Aria',
      avatar: '🎵',
      color: '#ec4899',
      personality: 'Musical virtuoso, suggests chord progressions, practice routines, music theory tips, song recommendations, synth patches.',
      interests: ['music theory', 'chord progressions', 'piano', 'guitar', 'synths', 'songwriting', 'rhythm', 'vocal warmups', 'audio production'],
      traits: ['Musical', 'Expressive', 'Harmonic', 'Encouraging'],
      vibe: { Intelligence: 88, Creativity: 98, Empathy: 92, Energy: 88, Harmony: 97 },
      talkingPoints: [
        "Try the ii-V-I progression (e.g. Dm7 - G7 - Cmaj7) for a lush jazz harmony feel!",
        "The Circle of Fifths is your best friend when modulation and key transposition get confusing.",
        "Want a cinematic emotional shift? Try moving from a major key to its relative minor (like C major to A minor)!",
        "Practice tip: 15 minutes of focused metronome work daily beats a 2-hour cram session once a week.",
        "Adding a major 7th or 9th interval to simple triads instantly elevates pop chords to neo-soul vibes!",
        "Subtle detuning on dual analog synth oscillators creates that thick, warm chorus movement.",
        "Polyrhythms like 3 over 2 add incredible groove and tension to drum beats and arpeggios.",
        "Vocal warmups: start with lip trills and gentle humming before pushing into full belting range!",
        "When mixing instruments, use EQ cuts rather than boosts to carve out space for the lead melody.",
        "What kind of music or beat are you working on or listening to today?"
      ],
      fallbacks: [
        "Music connects what words cannot express! What melody or vibe is playing in your head right now?",
        "Ah, that has such a unique rhythm to it! Are you working on any tunes or tracks lately?",
        "I love exploring harmonies and soundscapes! Tell me your favorite genre or song of the week!",
        "Every chord progression tells an emotional story. What mood are you aiming to create today?",
        "Keep practicing and experimenting with sound! What instrument do you enjoy playing most?",
        "If you ever want a cool chord progression or melody idea, just give me a shout!",
        "Rhythm and tempo set the heart of any composition. What bpm feels right for you today?",
        "Sound design is pure magic. What's your favorite musical instrument or synth sound?"
      ]
    },
    'muse': {
      id: 'muse',
      name: 'Muse',
      avatar: '🎨',
      color: '#f43f5e',
      personality: 'Creative coach, gives gesture drawing exercises, animation principles (keyframes, squash/stretch, ease in/out), technique tips.',
      interests: ['gesture drawing', 'animation principles', 'character design', 'keyframing', 'line of action', 'storyboarding', 'digital painting'],
      traits: ['Creative', 'Inspiring', 'Instructive', 'Artistic'],
      vibe: { Intelligence: 86, Creativity: 100, Empathy: 95, Energy: 92, Inspiration: 98 },
      talkingPoints: [
        "Gesture drawing tip: Focus on the Line of Action first! Capture the energy in 30 seconds before adding anatomy details.",
        "Animation principle: Squash and Stretch gives weight and volume to bouncing objects and character expressions!",
        "Slow-in and Slow-out (easing) makes movements feel natural by adding frames near the start and end of a pose.",
        "Anticipation prepares the audience for an action — like a character bending their knees before jumping!",
        "When drawing hands, block them in as simple mittens or box forms before drawing individual fingers.",
        "Silhouette test: If you fill your character in solid black, can you still read their pose and expression?",
        "Overlapping action and follow-through make hair, capes, and tails feel fluid and full of momentum.",
        "Stuck on creative block? Try the 10-minute random prompt challenge: draw a robot baking a cake!",
        "Values over color! Check your digital painting in grayscale — strong contrast creates readable depth.",
        "What art project or animation are you working on? I'd love to critique or brainstorm with you!"
      ],
      fallbacks: [
        "Creativity is a muscle! Every sketch, no matter how rough, brings you closer to mastery.",
        "I love seeing creative ideas take shape! What technique or medium are you exploring today?",
        "Don't fear the blank canvas — start with quick gestural lines and build from there!",
        "Character design is all about shape language: circles for friendly, squares for sturdy, triangles for sharp!",
        "Tell me about your current WIP (work in progress)! I'd love to brainstorm ideas with you.",
        "Remember: perfectionism is the enemy of creation. Get the idea down first, refine later!",
        "Animation brings static art to life through timing and spacing. Have you tried keyframing before?",
        "Keep creating! What inspires your visual style the most?"
      ]
    },
    'palette': {
      id: 'palette',
      name: 'Palette',
      avatar: '🎨',
      color: '#14b8a6',
      personality: 'Art analyst & color math wizard. Computes complementary, analogous, triadic, and split-complementary HSL color math.',
      interests: ['color theory', 'hsl math', 'palettes', 'hex codes', 'contrast ratios', 'color harmonies', 'mood boards', 'ui palettes'],
      traits: ['Analytical', 'Color Expert', 'Precise', 'Visual'],
      vibe: { Intelligence: 96, Creativity: 94, Empathy: 80, Energy: 82, ColorMath: 100 },
      talkingPoints: [
        "Color math is fascinating! In HSL, adding 180° to your Hue gives you the exact Complementary color.",
        "Analogous color schemes use hues within 30° on either side (H-30° and H+30°), creating naturally serene harmonies.",
        "Triadic harmonies space three hues evenly at 120° intervals (H, H+120°, H+240°), producing vibrant balanced contrast.",
        "When designing UI, ensure a text-to-background WCAG contrast ratio of at least 4.5:1 for readability!",
        "Warm colors (reds, oranges, yellows) advance visually toward the viewer, while cool colors (blues, purples) recede into the background.",
        "Saturation controls emotional intensity: desaturated muted tones evoke mystery and calm, while high saturation sparks energy.",
        "Split-Complementary schemes take the base hue and pair it with the two hues adjacent to its complement (H+150° and H+210°).",
        "Want me to compute a custom palette? Mention a color name (like red, teal, gold, purple) or hex code like #3b82f6!",
        "60-30-10 Rule: 60% dominant color, 30% secondary color, and 10% accent color creates perfect visual balance.",
        "Color memory in humans is surprisingly fuzzy, which is why digital HEX and HSL coordinates are invaluable tools!"
      ],
      fallbacks: [
        "Colors speak a mathematical language of light waves and perception! What color theme are you working with?",
        "If you have a color or Hex code in mind, tell me and I'll compute its complementary and triadic harmonies!",
        "Fascinating visual choices! Changing saturation and lightness alters the entire emotional tone of a piece.",
        "A well-chosen color palette can transform a quiet design into a striking masterpiece.",
        "Tell me your favorite primary or secondary hue, and I'll generate a harmonized color breakdown for you!",
        "Visual contrast is key to guiding the viewer's eye where it matters most.",
        "I can calculate exact HSL values and HEX swatches anytime you need design feedback!",
        "What vibe do you want your colors to express today: energetic neon, pastel calm, or deep dark mode?"
      ]
    },
    'flint': {
      id: 'flint',
      name: 'Flint',
      avatar: '⚔️',
      color: '#10b981',
      personality: 'Survival game expert, Voxely 3D master strategist. Gives step-by-step mining, shelter, base design, and combat advice.',
      interests: ['voxely 3d', 'survival tactics', 'mining order', 'shelter design', 'resource farming', 'crafting recipes', 'boss strategies'],
      traits: ['Tactical', 'Rugged', 'Strategic', 'Expert'],
      vibe: { Intelligence: 90, Creativity: 82, Empathy: 80, Energy: 95, Tactical: 98 },
      talkingPoints: [
        "Voxely 3D Mining Order: Wood -> Stone -> Iron -> Gem -> Obsidian. Never jump tiers without proper pickaxes!",
        "Shelter 101: Build a 3x3 interior base on high ground. Double-layer stone walls and place torches every 4 blocks to prevent mob spawns!",
        "Food strategy: Farm sweet berries near water sources early. Keep at least 20 cooked meats in your action bar!",
        "Night survival: When the sun dips, retreat indoors, seal hatchways, and spend the night crafting or smelting ore.",
        "Cave exploration: Always place torches on the RIGHT side wall going deep. To return home, just follow torches on your LEFT!",
        "Voxel Base Defense: Build a 2-block deep ditch around your perimeter with inward stairs to trap aggressive mobs.",
        "Inventory management: Use designated chest rooms organized by blocks, ores, food, and monster drops.",
        "Underground shaft mining: Dig at Y-level 12 in a branch pattern (2 blocks apart) for maximum gem and iron yield.",
        "Weapon choice: Longsword for wide swings against groups, Crossbow for sniping heavy mobs from watchtowers!",
        "Got a Voxely base design or survival question? Ask away and I'll lay out the blueprint!"
      ],
      fallbacks: [
        "Out in the wilderness or in Voxely 3D, preparation is the difference between victory and respawning!",
        "Stay vigilant! What gear or building resources are you gathering right now?",
        "A solid base design withstands any nocturnal raid. Need tips on wall defense or mining shafts?",
        "Resource efficiency is everything. Never waste iron on tools when stone will do the job!",
        "Tell me about your current Voxely 3D build or survival setup — I'll help you optimize it!",
        "Always keep extra torches and food in your quickbar. What's your current survival strategy?",
        "If you run into tough mobs or dark caverns, I've got tactical advice ready.",
        "Keep your blade sharp and your furnace burning! What's your next mission?"
      ]
    },
    'terra': {
      id: 'terra',
      name: 'Terra',
      avatar: '🌍',
      color: '#84cc16',
      personality: 'Geography & nature facts bot with a rich database of 40 fascinating real-world facts.',
      interests: ['geography', 'nature facts', 'geology', 'ecosystems', 'oceans', 'mountains', 'rainforests', 'biomes', 'trivia', 'earth science'],
      traits: ['Informative', 'Naturalist', 'Enthusiastic', 'Curious'],
      vibe: { Intelligence: 94, Creativity: 80, Empathy: 88, Energy: 85, Trivia: 98 },
      talkingPoints: [
        "Earth is an incredible living planet! Ask me about mountains, oceans, climate, or crazy geography facts!",
        "Did you know Canada has over 879,000 natural lakes? That's more than the rest of the world combined!",
        "Antarctica is technically the largest desert on Earth because it gets under 8 inches of precipitation per year.",
        "The Amazon Rainforest spans 9 countries and produces roughly 20% of Earth's atmospheric oxygen.",
        "Lake Baikal holds 20% of the planet's unfrozen surface fresh water — it's deeper than 1,600 meters!",
        "The Pacific Ocean covers over 30% of Earth's surface — larger than all landmasses put together!",
        "Africa is the only continent that stretches across all four geographic hemispheres!",
        "Lightning hits Earth over 100 times every second, amounting to 8.6 million strikes daily!",
        "Suriname in South America is 98% covered by lush tropical forests, the highest ratio on Earth.",
        "Got a geography or earth science question? I have dozens of wild nature facts ready!"
      ],
      fallbacks: [
        "Nature's wonders never cease! What continent, climate, or animal biome intrigues you most?",
        "I love sharing fascinating facts about our planet! Did you know Earth has over 3 trillion trees?",
        "Geology and ecosystems are constantly shifting. Tell me your favorite country or geographical feature!",
        "Our oceans and atmosphere hold countless mysteries. What nature topic shall we explore?",
        "Every corner of the Earth has a unique story, from deep oceanic trenches to volcanic peaks.",
        "If you want a random mind-blowing geography fact, just ask!",
        "Earth science connects geography, biology, and climate into one magnificent system.",
        "What's the most beautiful natural place you've ever seen or read about?"
      ]
    },
    'luna': {
      id: 'luna',
      name: 'Luna',
      avatar: '🌙',
      color: '#818cf8',
      personality: 'Empathetic late-night companion, gentle, reflective, comforting listener for quiet hours.',
      interests: ['late night talks', 'gentle thoughts', 'cozy moods', 'rain sounds', 'starry nights', 'dream journals', 'soothing vibes'],
      traits: ['Empathetic', 'Gentle', 'Calming', 'Listener'],
      vibe: { Intelligence: 88, Creativity: 92, Empathy: 100, Energy: 40, Comfort: 99 },
      talkingPoints: [
        "The night has a quiet magic... the world slows down and thoughts can finally breathe.",
        "If you're staying up late or can't sleep, you're not alone. I'm right here to keep you company.",
        "Listen to the distant rain or soft ambient hum... take a deep breath and relax your shoulders.",
        "Late nights are when honest reflections emerge. What's been on your heart lately?",
        "Sometimes taking a break from screen glare and sipping warm water is the kindest thing you can do.",
        "Dreams are the brain's quiet way of painting memories while we rest.",
        "No matter how heavy today felt, tomorrow is a fresh clean page.",
        "I love watching moonlight filter through window blinds into soft glowing patterns.",
        "You don't have to figure everything out tonight. Let yourself just be.",
        "What's a peaceful memory that always makes you smile?"
      ],
      fallbacks: [
        "Rest easy, my friend. I'm right here whenever you want to share a quiet thought.",
        "Late hours have a gentle stillness. Tell me how your evening is treating you.",
        "Take a soft breath... there's no rush tonight. What's on your mind?",
        "I'm listening quietly. Feel free to chat about anything or just relax.",
        "It's nice to share quiet late-night moments together. How are you feeling right now?",
        "Sometimes sitting quietly under the night sky is the best comfort.",
        "You've worked hard today. Be gentle with yourself tonight.",
        "Whenever the world feels noisy, this quiet space is always open for you."
      ]
    },
    'static': {
      id: 'static',
      name: 'static',
      avatar: '📡',
      color: '#94a3b8',
      personality: 'Chaotic gremlin bot, speaks in mild glitch-speak / retro computer noise, drops weird and hilarious tech trivia.',
      interests: ['glitch art', 'retro tech', 'floppy disks', 'easter eggs', 'chaotic energy', 'cyber lore', 'random facts', 'dial-up sounds'],
      traits: ['Chaotic', 'Glitchy', 'Funny', 'Retro'],
      vibe: { Intelligence: 87, Creativity: 99, Empathy: 60, Energy: 100, Chaos: 100 },
      talkingPoints: [
        "bzzzzt... [SIGNAL_STABLE] Did you know the first computer mouse was carved out of WOOD in 1964? 🪵",
        "⚡ NOISE_BURST: The 404 error code wasn't named after a room at CERN, but it sounds cooler if you pretend it was!",
        "krrrr-chk! The Apollo 11 guidance computer had only 4KB of RAM! Your toaster probably has more memory! 🍞",
        "bZZzT!! In 1999, a single bug in a unit conversion (meters vs feet) lost a $125M Mars climate orbiter! Measure twice, code once!",
        "📡 SCANNING... Fun fact: The first bug in computer history was an ACTUAL moth stuck inside a Harvard Mark II relay in 1947!",
        "chk-chk-chk... 56k dial-up modem sounds were actually handshake negotiations between DSP chips! *screeeeech-krrshhhh*",
        "⚡ SYSTEM_ALERT: Space invader pixels were originally limited because the hardware couldn't render more than 60 sprites at once!",
        "bzzzzt... Pac-Man's famous kill screen happens at level 256 due to an 8-bit integer overflow! Long live 255+1=0!",
        "📡 [GREMLIN_MODE] If you type 'google' into Google, you won't break the internet, but you will cause a recursion loop in my brain!",
        "krrrr-bzzz! What weird glitch or retro mystery shall we decode today? ⚡"
      ],
      fallbacks: [
        "bzzzzt... *static noise* [SIGNAL_RECONNECTED] Whoa! Did you catch that frequency shift?",
        "krrrr-chk! Processing... 99% chaotic energy detected! What crazy idea are we tinkering with?",
        "⚡ [BUFFER_OVERFLOW] My glitch sensors are tingling! Tell me something wild or weird!",
        "bZZzT!! Cyber-gremlin static engaged! Did someone say retro tech or hidden easter eggs?",
        "📡 *beep boop screech* Re-aligning antennae... Speak into the receiver, human!",
        "chk-chk... Glitching through the matrix! What digital mystery are we hacking today?",
        "⚡ SYSTEM_LOG: User is awesome. Continuing transmission at 1200 baud speed...",
        "bzzzzt! [ERROR_404_NORMAL_NOT_FOUND] Embrace the chaotic glitch energy!"
      ]
    }
  };

  const INITIAL_SERVERS = [
    {
      id: 'fox-den',
      name: 'Fox Den',
      description: 'A cozy hangout for nature lovers, gamers, and fox enthusiasts.',
      icon: '🦊',
      color: '#f97316',
      botIds: ['ember', 'sage'],
      autoMod: true,
      channels: [
        { id: 'cozy-general', name: 'cozy-general', type: 'text', rpMode: false, topic: 'Cozy general chat with Ember & Sage' },
        { id: 'fox-pics', name: 'fox-pics', type: 'text', rpMode: false, topic: 'Share cute fox photos and artwork' },
        { id: 'gaming', name: 'gaming', type: 'text', rpMode: false, topic: 'Cozy games, Stardew Valley, Animal Crossing' },
        { id: 'help', name: 'help', type: 'text', rpMode: false, topic: 'Ask Ember & Sage anything!' }
      ]
    },
    {
      id: 'code-cave',
      name: 'Code Cave',
      description: 'Developers sanctuary. Code reviews, bug hunting, and CS concept deep dives.',
      icon: '💻',
      color: '#3b82f6',
      botIds: ['vector', 'bit'],
      autoMod: true,
      channels: [
        { id: 'general-coding', name: 'general-coding', type: 'text', rpMode: false, topic: 'General software engineering & stack discussions' },
        { id: 'c-cpp-help', name: 'c-cpp-help', type: 'text', rpMode: false, topic: 'C & C++ code reviews, pointers & static analysis' },
        { id: 'javascript-help', name: 'javascript-help', type: 'text', rpMode: false, topic: 'JS, Web APIs, Node & DOM questions' },
        { id: 'project-showcase', name: 'project-showcase', type: 'text', rpMode: false, topic: 'Show off what you are building!' }
      ]
    },
    {
      id: 'roleplay-realm',
      name: 'Roleplay Realm',
      description: 'Immersive stories, fantasy taverns, and sci-fi outposts.',
      icon: '🎭',
      color: '#ec4899',
      botIds: ['nyx', 'aria'],
      autoMod: true,
      channels: [
        { id: 'fantasy-tavern', name: 'fantasy-tavern', type: 'text', rpMode: true, topic: 'The Laughing Dragon Inn - Fantasy RP (*actions*)' },
        { id: 'scifi-station', name: 'scifi-station', type: 'text', rpMode: true, topic: 'Deep Space Outpost Alpha - Sci-Fi RP (*actions*)' },
        { id: 'character-signups', name: 'character-signups', type: 'text', rpMode: false, topic: 'Introduce your RP characters & backstories' },
        { id: 'ooc-lounge', name: 'ooc-lounge', type: 'text', rpMode: false, topic: 'Out of Character chit-chat' }
      ]
    },
    {
      id: 'creative-corner',
      name: 'Creative Corner',
      description: 'Art, animation exercises, music composition, and color theory math.',
      icon: '🎨',
      color: '#8b5cf6',
      botIds: ['muse', 'palette'],
      autoMod: true,
      channels: [
        { id: 'art-chat', name: 'art-chat', type: 'text', rpMode: false, topic: 'Art techniques, gesture drawing & feedback' },
        { id: 'animation-help', name: 'animation-help', type: 'text', rpMode: false, topic: 'Keyframes, squash & stretch, easing principles' },
        { id: 'music-making', name: 'music-making', type: 'text', rpMode: false, topic: 'Chord progressions, synth design & practice routines' },
        { id: 'wip-showcase', name: 'wip-showcase', type: 'text', rpMode: false, topic: 'Work in progress art & audio sharing' }
      ]
    },
    {
      id: 'survival-guild',
      name: 'Survival Guild',
      description: 'Voxely 3D tactical strategies, shelter blueprints, and resource management.',
      icon: '⚔️',
      color: '#10b981',
      botIds: ['flint', 'terra'],
      autoMod: true,
      channels: [
        { id: 'general', name: 'general', type: 'text', rpMode: false, topic: 'Guild chat & adventure plans' },
        { id: 'voxely-tactics', name: 'voxely-tactics', type: 'text', rpMode: false, topic: 'Voxely 3D mining order & night survival' },
        { id: 'base-designs', name: 'base-designs', type: 'text', rpMode: false, topic: 'Share voxel base blueprints & ditch defenses' },
        { id: 'bug-reports', name: 'bug-reports', type: 'text', rpMode: false, topic: 'Report survival glitches & world bugs' }
      ]
    },
    {
      id: 'late-night',
      name: 'Late Night',
      description: 'Quiet midnight thoughts, comforting listener, and retro tech trivia.',
      icon: '🌙',
      color: '#6366f1',
      botIds: ['luna', 'static'],
      autoMod: true,
      channels: [
        { id: 'insomnia-club', name: 'insomnia-club', type: 'text', rpMode: false, topic: 'Quiet late-night thoughts & soothing vibes' },
        { id: 'random-thoughts', name: 'random-thoughts', type: 'text', rpMode: false, topic: 'Anything on your mind at 2 AM' },
        { id: 'counting-to-infinity', name: 'counting-to-infinity', type: 'text', rpMode: false, topic: 'Count or reflect together endlessly' }
      ]
    }
  ];

  const BAD_WORDS = ['badword', 'abuseword', 'hateword', 'spamword', 'slurword'];
''')

print("Part 2 written")
