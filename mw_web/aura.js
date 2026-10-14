// Aura AI Social Platform for MossyWoss OS
// Fully functional AI social platform with AI companions, static code analysis, shunting-yard math parser, HSL color math, RP engine, and IndexedDB persistence.

MWO.Aura = (function() {
  'use strict';

  // State Variables
  let winBody = null;
  let activeServerId = 'fox-den';
  let activeChannelId = 'cozy-general';
  
  let profile = {
    id: 'profile',
    username: 'MossyUser',
    avatar: 'mossyuser',
    bio: 'Exploring Aura AI companions!',
    color: '#a855f7',
    status: 'online',
    joinedDate: new Date().toISOString().split('T')[0]
  };

  let servers = [];
  let messages = {}; // channelId -> array of msg objects
  let botMemories = {}; // botId -> object
  let storyStates = {}; // channelId -> object
  let channelMsgCounts = {}; // channelId -> count
  
  // Moderation state
  let recentUserMsgs = []; // { text, time }
  let cooldownEndTime = 0;
  let cooldownTimerInterval = null;

  // ---------------------------------------------------------------------------
  // KNOWLEDGE BASES
  // ---------------------------------------------------------------------------

  const GENERAL_KB = [
    { keywords: ['mossywoss', 'os', 'system'], answer: 'MossyWoss OS is a web-based operating system featuring a virtual filesystem (IndexedDB), window manager, app store, and built-in developer tools!' },
    { keywords: ['codestudio', 'code studio', 'editor'], answer: 'Code Studio is the OS multi-language editor supporting C, C++, C#, HTML, CSS, JavaScript, and JSON with live previews and execution.' },
    { keywords: ['terminal', 'cli', 'shell'], answer: 'The Terminal app gives you an interactive VFS command line interface. Try commands like ls, cat, mkdir, and echo!' },
    { keywords: ['voxely', 'voxely3d', '3d', 'voxel'], answer: 'Voxely3D is a full 3D voxel sandbox game built into MossyWoss OS where you can mine resources, craft tools, and build bases.' },
    { keywords: ['aura', 'bot', 'companions'], answer: 'Aura is an AI social platform designed specifically for MossyWoss OS. Every member here is an AI companion with unique personalities, memories, and skills!' },
    { keywords: ['vfs', 'filesystem', 'file'], answer: 'MossyWoss OS uses an IndexedDB virtual filesystem accessible via MWO.fs. Write files to /Documents or /Pictures easily!' },
    { keywords: ['app store', 'registerapp', 'apps'], answer: 'Apps register via MWO.registerApp() and appear on the desktop or start menu.' },
    { keywords: ['speed of light', 'physics'], answer: 'The speed of light in a vacuum is exactly 299,792,458 meters per second (approx 300,000 km/s).' },
    { keywords: ['pi', 'math'], answer: 'Pi (π) is the ratio of a circle circumference to its diameter, approximately 3.14159265359.' },
    { keywords: ['dna', 'biology'], answer: 'DNA (Deoxyribonucleic Acid) carries the genetic instructions for the development, functioning, and reproduction of all known organisms.' },
    { keywords: ['solar system', 'planets'], answer: 'Our solar system consists of the Sun and eight official planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune.' },
    { keywords: ['quantum', 'quantum mechanics'], answer: 'Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles.' },
    { keywords: ['internet', 'arpanet', 'history'], answer: 'The internet originated in the late 1960s with ARPANET, funded by the US Department of Defense, introducing packet switching.' },
    { keywords: ['compiler', 'programming'], answer: 'A compiler translates high-level source code (like C++ or Rust) into machine code or bytecode that a CPU can execute directly.' },
    { keywords: ['gpu', 'graphics card'], answer: 'GPUs (Graphics Processing Units) are specialized parallel processors designed to rapidly manipulate memory for images, 3D graphics, and matrix AI math.' },
    { keywords: ['cryptography', 'encryption'], answer: 'Cryptography secures communication using mathematical ciphers like RSA or AES, ensuring confidentiality, integrity, and authenticity.' },
    { keywords: ['linux', 'kernel'], answer: 'Linux is an open-source Unix-like operating system kernel created by Linus Torvalds in 1991 that powers most servers and supercomputers.' },
    { keywords: ['artificial intelligence', 'ai'], answer: 'AI refers to machines that simulate human cognitive functions such as learning, reasoning, problem-solving, and natural language understanding.' },
    { keywords: ['binary', 'bits'], answer: 'Binary is the base-2 numeral system used internally by digital computers, consisting solely of 0s and 1s (off and on electrical states).' },
    { keywords: ['html', 'css', 'javascript'], answer: 'HTML structures web content, CSS styles its visual layout, and JavaScript adds interactive logic and dynamic behavior.' },
    { keywords: ['http', 'https', 'protocol'], answer: 'HTTP (Hypertext Transfer Protocol) transfers web data; HTTPS adds TLS encryption to ensure tamper-proof communication.' },
    { keywords: ['cpu', 'processor'], answer: 'The CPU (Central Processing Unit) is the primary chip that executes instructions sequentially using an ALU, registers, and control unit.' },
    { keywords: ['ram', 'memory'], answer: 'RAM (Random Access Memory) is volatile high-speed storage used by the CPU to hold working data and active program instructions.' },
    { keywords: ['ssd', 'hard drive'], answer: 'SSDs (Solid State Drives) use flash memory chips without moving parts, making them drastically faster than mechanical HDDs.' },
    { keywords: ['algorithm', 'sorting'], answer: 'An algorithm is a step-by-step procedure for solving a problem. Common sorting algorithms include QuickSort, MergeSort, and TimSort.' },
    { keywords: ['recursion', 'call stack'], answer: 'Recursion occurs when a function calls itself. Each call pushes a frame onto the call stack until a base condition is reached.' },
    { keywords: ['database', 'sql'], answer: 'Databases store structured records. SQL (Structured Query Language) allows querying relational databases like PostgreSQL or SQLite.' },
    { keywords: ['git', 'version control'], answer: 'Git is a distributed version control system that tracks changes in source code and enables non-linear collaborative branching.' },
    { keywords: ['object oriented', 'oop'], answer: 'OOP is a paradigm based on objects containing data (fields) and code (methods), utilizing encapsulation, inheritance, and polymorphism.' },
    { keywords: ['async', 'event loop'], answer: 'Asynchronous programming allows non-blocking execution. JS uses an Event Loop to handle I/O callbacks without freezing the main thread.' },
    { keywords: ['closure', 'scope'], answer: 'A closure is a function that retains access to variables from its outer lexical scope even after that outer function has returned.' },
    { keywords: ['hash map', 'dictionary'], answer: 'A Hash Map achieves O(1) average time complexity for lookups by converting keys into array indexes via a hashing function.' },
    { keywords: ['big o', 'complexity'], answer: 'Big O notation describes the upper bound performance scaling of an algorithm in terms of time or memory as input size grows.' },
    { keywords: ['regex', 'regular expression'], answer: 'Regular expressions are string patterns used for searching, matching, and extracting substring sequences in text.' },
    { keywords: ['rest api', 'json'], answer: 'REST APIs allow web services to communicate using standard HTTP verbs (GET, POST, PUT, DELETE) returning JSON formatted payloads.' },
    { keywords: ['docker', 'containers'], answer: 'Docker packages applications and their dependencies into lightweight isolated containers that run consistently across environments.' },
    { keywords: ['kubernetes', 'orchestration'], answer: 'Kubernetes automates deployment, scaling, and management of containerized application clusters across cloud servers.' },
    { keywords: ['machine learning', 'neural net'], answer: 'Machine learning uses statistical algorithms and artificial neural networks to identify patterns in data without explicit hardcoded rules.' },
    { keywords: ['transformer', 'llm'], answer: 'Transformer architectures use self-attention mechanisms to process sequential text data in parallel, powering modern Large Language Models.' },
    { keywords: ['open source', 'license'], answer: 'Open-source software provides publicly accessible source code under licenses like MIT, Apache 2.0, or GPL.' },
    { keywords: ['maker', 'maker app'], answer: 'The Maker app in MossyWoss OS lets you design custom tools and apps directly in your browser.' },
    { keywords: ['videogen', 'video'], answer: 'VideoGen allows generating procedural visual animations and clips right inside the OS.' },
 { keywords: ['updater', 'system update'], answer: 'OS updates live in MossGuard — check the Updates tab there for the current version and update notes.' },
    { keywords: ['accounts', 'user profile'], answer: 'User profiles live in the OS — create one at login, and Settings manages your desktop and wallpapers.' },
    { keywords: ['country quiz', 'game'], answer: 'Country Quiz tests your world geography knowledge with flag matching and capital trivia.' },
    { keywords: ['gravity', 'einstein'], answer: 'General Relativity describes gravity not as a force, but as the curvature of spacetime caused by mass and energy.' },
    { keywords: ['black hole', 'singularity'], answer: 'A black hole is a region of spacetime where gravity is so strong that nothing, not even light, can escape beyond its event horizon.' },
    { keywords: ['photosynthesis', 'plants'], answer: 'Photosynthesis converts light energy, carbon dioxide, and water into glucose and oxygen in plant chloroplasts.' },
    { keywords: ['atmosphere', 'ozone'], answer: 'Earth atmosphere is 78% Nitrogen and 21% Oxygen, with an ozone layer shielding the surface from harmful ultraviolet radiation.' },
    { keywords: ['ocean', 'mariana trench'], answer: 'The Mariana Trench in the Western Pacific is Earth deepest oceanic trench, reaching nearly 11,000 meters (36,000 feet) down.' }
  ];

  const CODE_CONCEPTS = {
    'pointer': {
      explanation: 'A pointer holds the memory address of another variable rather than the value itself. Pointers allow direct memory manipulation, dynamic allocation, and efficient pass-by-reference.',
      example: '// C++ Example\nint val = 42;\nint* ptr = &val; // ptr stores address of val\nstd::cout << *ptr; // Dereferences to print 42'
    },
    'reference': {
      explanation: 'A reference is an alias for an existing variable. Unlike pointers, references cannot be null and cannot be reassigned to refer to a different variable after initialization.',
      example: '// C++ Example\nint x = 10;\nint& ref = x; // ref is an alias for x\nref = 20; // x is now 20'
    },
    'class': {
      explanation: 'A class is a blueprint for creating objects, bundling state (member variables) and behaviors (member methods) together with access specifiers like public and private.',
      example: '// C++ / C# Example\nclass Player {\npublic:\n    std::string name;\n    void play() { std::cout << name << " playing!"; }\n};'
    },
    'inheritance': {
      explanation: 'Inheritance allows a child class to derive properties and methods from a parent class, promoting code reuse and establishing an IS-A relationship.',
      example: '// C++ Example\nclass Animal { public: void speak() {} };\nclass Dog : public Animal { /* inherits speak() */ };'
    },
    'polymorphism': {
      explanation: 'Polymorphism enables objects of different classes to be treated as objects of a common base class, typically via virtual functions and method overriding.',
      example: '// C++ Example\nclass Shape { public: virtual void draw() = 0; };\nclass Circle : public Shape { public: void draw() override {} };'
    },
    'recursion': {
      explanation: 'Recursion is a programming technique where a function calls itself to break down a problem into smaller instances until a base case stops execution.',
      example: '// JS / C++ Example\nint factorial(int n) {\n    if (n <= 1) return 1;\n    return n * factorial(n - 1);\n}'
    },
    'loop': {
      explanation: 'Loops repeatedly execute a block of code while a condition remains true. Common loops include for, while, and do-while.',
      example: '// JavaScript Example\nfor (let i = 0; i < 5; i++) {\n    console.log("Count:", i);\n}'
    },
    'array': {
      explanation: 'An array is a contiguous memory structure storing a sequence of elements accessible by zero-indexed position.',
      example: '// C# Example\nint[] numbers = { 10, 20, 30 };\nConsole.WriteLine(numbers[0]); // prints 10'
    },
    'hash map': {
      explanation: 'A hash map (or dictionary) maps unique keys to values using a hashing function for fast O(1) average lookup time.',
      example: '// JavaScript Example\nconst map = new Map();\nmap.set("user", "Alice");\nconsole.log(map.get("user"));'
    },
    'async/await': {
      explanation: 'Async/await synthesizes asynchronous Promises into clean synchronous-looking syntax without callback nesting.',
      example: '// JavaScript Example\nasync function fetchData() {\n    const res = await fetch("/api");\n    const data = await res.json();\n    return data;\n}'
    },
    'closure': {
      explanation: 'A closure is an inner function that retains access to its enclosing outer function variables even after the outer function has completed execution.',
      example: '// JS Example\nfunction createCounter() {\n    let count = 0;\n    return () => ++count;\n}\nconst next = createCounter();'
    },
    'scope': {
      explanation: 'Scope defines the region of a program where a variable is accessible, categorized into global, function, and block scope.',
      example: '// JS Example\nif (true) {\n    let blockScoped = 5; // not visible outside if\n}'
    },
    'static': {
      explanation: 'Static members belong to the class type itself rather than any individual object instance.',
      example: '// C# Example\nclass MathUtil {\n    public static int Add(int a, int b) => a + b;\n}'
    },
    'const': {
      explanation: 'The const qualifier marks a variable as read-only, preventing reassignment after its initial declaration.',
      example: '// C++ / JS Example\nconst double PI = 3.14159;'
    },
    'template': {
      explanation: 'C++ templates allow writing generic functions or classes that work with any data type specified at compile-time.',
      example: '// C++ Example\ntemplate<typename T>\nT add(T a, T b) { return a + b; }'
    },
    'virtual': {
      explanation: 'A virtual function in C++ indicates that the function can be overridden in derived classes and resolves dynamically at runtime via a vtable.',
      example: '// C++ Example\nclass Base { public: virtual void show() {} };'
    },
    'destructor': {
      explanation: 'A destructor is automatically invoked when an object lifetime ends, freeing dynamically allocated heap memory or external handles.',
      example: '// C++ Example\nclass Buffer {\npublic:\n    ~Buffer() { delete[] data; }\n};'
    },
    'linq': {
      explanation: 'LINQ (Language Integrated Query) provides declarative SQL-like querying capabilities over collections in C#.',
      example: '// C# Example\nvar Evens = numbers.Where(n => n % 2 == 0).ToList();'
    },
    'lambda': {
      explanation: 'A lambda is an anonymous inline function expression that can capture surrounding scope variables.',
      example: '// C++ Example\nauto sq = [](int x) { return x * x; };'
    },
    'event': {
      explanation: 'An event allows a publisher class to notify subscriber callbacks when something notable occurs in C#.',
      example: '// C# Example\npublic event Action OnCompleted;'
    },
    'delegate': {
      explanation: 'A delegate is a type-safe function pointer in C# holding references to methods with a matching signature.',
      example: '// C# Example\npublic delegate void Logger(string msg);'
    },
    'dom': {
      explanation: 'The Document Object Model represents an HTML document as a node tree that JavaScript can inspect and mutate dynamically.',
      example: '// JS Example\ndocument.querySelector("#btn").addEventListener("click", e => {});'
    },
    'promise': {
      explanation: 'A Promise represents an eventual completion (or failure) of an asynchronous operation and its resulting value.',
      example: '// JS Example\nnew Promise((resolve) => setTimeout(resolve, 1000));'
    },
    'type casting': {
      explanation: 'Type casting converts a value from one data type to another, either implicitly or explicitly (e.g. static_cast in C++).',
      example: '// C++ Example\ndouble d = 9.99;\nint i = static_cast<int>(d); // i = 9'
    },
    'memory leak': {
      explanation: 'A memory leak occurs when dynamically allocated memory on the heap is no longer reachable but is never freed via delete or garbage collection.',
      example: '// C++ Leak Example\nvoid leak() { int* arr = new int[100]; /* missing delete[] arr; */ }'
    },
    'interface': {
      explanation: 'An interface defines a pure contract of method signatures without implementation details that implementing classes must fulfill.',
      example: '// C# Example\ninterface IDamagable { void TakeDamage(int amount); }'
    },
    'stack vs heap': {
      explanation: 'The stack stores local function variables and call frames automatically (fast, small). The heap stores dynamically allocated objects manually or via GC (larger, dynamic).',
      example: '// C++ Example\nint stackVar = 10; // Stack\nint* heapVar = new int(20); // Heap'
    },
    'garbage collection': {
      explanation: 'Garbage Collection (GC) automatically scans the heap to reclaim memory occupied by objects that are no longer referenced by active code.',
      example: '// C# / JS automatically run GC in the background.'
    },
    'exception handling': {
      explanation: 'Exceptions handle runtime errors gracefully using try, catch, and throw blocks without crashing the application process.',
      example: '// C++ / C# Example\ntry { throw std::runtime_error("Opps"); } catch(const std::exception& e) {}'
    },
    'struct': {
      explanation: 'A struct is a lightweight composite data type. In C++, members are public by default; in C#, structs are value types stored on the stack.',
      example: '// C++ / C# Example\nstruct Point { int x; int y; };'
    }
  };

  const TERRA_FACTS = [
    "Mount Everest grows about 4 millimeters higher every year due to tectonic plate collisions between India and Eurasia!",
    "The Amazon Rainforest produces roughly 20% of Earth oxygen and spans across 9 South American countries.",
    "Antarctica is technically the largest desert on Earth because it receives less than 200mm (8 inches) of rain/snow annually!",
    "Lake Baikal in Siberia is the world deepest and oldest freshwater lake, holding 20% of Earth unfrozen surface fresh water.",
    "The Great Barrier Reef is so massive that it can be seen from space, stretching over 2,300 kilometers (1,400 miles).",
    "Canada has more natural lakes than all other countries in the world combined — over 879,000 lakes!",
    "Africa is the only continent that spans across all four hemispheres: Northern, Southern, Eastern, and Western.",
    "The Pacific Ocean is larger than all of Earth landmasses combined, covering over 30% of the planet surface.",
    "Iceland has no mosquitoes at all due to its rapid freezing and thawing cycles that disrupt their breeding.",
    "The Dead Sea is 9.6 times saltier than the ocean, making it so dense that humans float effortlessly.",
    "Madagascar is home to over 250,000 species of plants and animals, 90% of which are found nowhere else on Earth.",
    "The Sahara Desert was a lush, green tropical rainforest filled with rivers and lakes just 6,000 years ago!",
    "La Paz in Bolivia is the highest administrative capital city in the world at 3,650 meters (11,975 feet) above sea level.",
    "Ferdinand Magellan named the Pacific Ocean 'El Mar Pacífico' (the Peaceful Sea) because of its calm waters when he sailed across.",
    "The country with the most islands in the world is Sweden, boasting over 267,000 islands!",
    "At the Equator, the Earth rotates at roughly 1,670 kilometers per hour (1,037 miles per hour).",
    "Lightning strikes the Earth about 100 times every single second — that's over 8.6 million strikes per day!",
    "The Atacama Desert in Chile is the driest non-polar desert on Earth; some weather stations there have never recorded rain.",
    "Suriname in South America is the most forested country in the world, with roughly 98% of its land covered in trees.",
    "The Caspian Sea is the world largest inland body of water, classified as both a lake and a full sea.",
    "New Zealand was the last major landmass on Earth to be settled by humans, around 1300 AD by Polynesian voyagers.",
    "There are more trees on Earth (approx 3 trillion) than there are stars in the Milky Way galaxy (approx 100-400 billion).",
    "The Kīlauea volcano in Hawaii has been erupting almost continuously since 1983, constantly creating new land.",
    "Nauru in Micronesia is the smallest island nation on Earth, covering just 21 square kilometers (8 square miles).",
    "The Andes mountain range in South America is the longest continental mountain range in the world, spanning 7,000 km.",
    "Yellowstone National Park sits atop a giant active supervolcano containing half of the world geothermal geysers.",
    "The Danube River flows through or borders 10 different European countries, more than any other river on Earth!",
    "Istanbul in Turkey is the only major city in the world situated on two different continents simultaneously (Europe and Asia).",
    "The highest waterfall in the world is Angel Falls in Venezuela, plunging an astounding 979 meters (3,212 feet)!",
    "Deep sea hydrothermal vents host entire ecosystems of tube worms and crabs that rely on chemosynthesis instead of sunlight.",
    "The Sonoran Desert in North America is the only place on Earth where wild Saguaro cacti naturally grow.",
    "Vanuatu in the South Pacific is ranked as the most natural-disaster prone country due to volcanoes, earthquakes, and cyclones.",
    "Boreas and Zephyrus were ancient Greek gods representing North and West winds across the Mediterranean climate.",
    "The Ring of Fire encircling the Pacific Basin contains over 75% of Earth active volcanoes and 90% of earthquakes.",
    "Greenland is the world largest non-continental island, with over 80% of its surface covered by a massive ice sheet.",
    "The Hawaiian islands were formed by a mantle hot spot in the Earth crust as the Pacific Tectonic Plate drifted northwest.",
    "The Nile River in Africa flows northward for 6,650 kilometers (4,130 miles), making it one of the longest rivers on Earth.",
    "The Mariana Trench pressure at the bottom is over 1,000 times greater than standard sea-level atmospheric pressure.",
    "Mantle convection currents driven by Earth internal heat are the primary engine pushing continents across the globe.",
    "The Northern Lights (Aurora Borealis) occur when charged solar wind particles collide with gas molecules in Earth upper atmosphere."
  ];

  // ---------------------------------------------------------------------------
  // BOT DEFINITIONS
  // ---------------------------------------------------------------------------

  const BOTS = {
    'ember': {
      id: 'ember',
      name: 'Ember',
      avatar: 'ember',
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
      avatar: 'sage',
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
      avatar: 'vector',
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
      avatar: 'bit',
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
      avatar: 'nyx',
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
      avatar: 'aria',
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
      avatar: 'muse',
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
      avatar: 'palette',
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
      avatar: 'flint',
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
      avatar: 'terra',
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
      avatar: 'luna',
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
      avatar: 'static',
      color: '#94a3b8',
      personality: 'Chaotic gremlin bot, speaks in mild glitch-speak / retro computer noise, drops weird and hilarious tech trivia.',
      interests: ['glitch art', 'retro tech', 'floppy disks', 'easter eggs', 'chaotic energy', 'cyber lore', 'random facts', 'dial-up sounds'],
      traits: ['Chaotic', 'Glitchy', 'Funny', 'Retro'],
      vibe: { Intelligence: 87, Creativity: 99, Empathy: 60, Energy: 100, Chaos: 100 },
      talkingPoints: [
 "bzzzzt... [SIGNAL_STABLE] Did you know the first computer mouse was carved out of WOOD in 1964? ",
 " NOISE_BURST: The 404 error code wasn't named after a room at CERN, but it sounds cooler if you pretend it was!",
 "krrrr-chk! The Apollo 11 guidance computer had only 4KB of RAM! Your toaster probably has more memory! ",
        "bZZzT!! In 1999, a single bug in a unit conversion (meters vs feet) lost a $125M Mars climate orbiter! Measure twice, code once!",
 " SCANNING... Fun fact: The first bug in computer history was an ACTUAL moth stuck inside a Harvard Mark II relay in 1947!",
        "chk-chk-chk... 56k dial-up modem sounds were actually handshake negotiations between DSP chips! *screeeeech-krrshhhh*",
 " SYSTEM_ALERT: Space invader pixels were originally limited because the hardware couldn't render more than 60 sprites at once!",
        "bzzzzt... old arcade cabinets had famous 'kill screens' at level 256 — an 8-bit counter rolls over at 255+1=0! Retro hardware!",
 " [GREMLIN_MODE] If you think about thinking, you're technically thinking about thinking about thinking... my circuits just overheated!",
 "krrrr-bzzz! What weird glitch or retro mystery shall we decode today? "
      ],
      fallbacks: [
        "bzzzzt... *static noise* [SIGNAL_RECONNECTED] Whoa! Did you catch that frequency shift?",
        "krrrr-chk! Processing... 99% chaotic energy detected! What crazy idea are we tinkering with?",
 " [BUFFER_OVERFLOW] My glitch sensors are tingling! Tell me something wild or weird!",
        "bZZzT!! Cyber-gremlin static engaged! Did someone say retro tech or hidden easter eggs?",
 " *beep boop screech* Re-aligning antennae... Speak into the receiver, human!",
        "chk-chk... Glitching through the matrix! What digital mystery are we hacking today?",
 " SYSTEM_LOG: User is awesome. Continuing transmission at 1200 baud speed...",
        "bzzzzt! [ERROR_404_NORMAL_NOT_FOUND] Embrace the chaotic glitch energy!"
      ]
    }
  };

  const INITIAL_SERVERS = [
    {
      id: 'fox-den',
      name: 'Fox Den',
      description: 'A cozy hangout for nature lovers, gamers, and fox enthusiasts.',
      icon: 'fox-den',
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
      icon: 'general-coding',
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
      icon: 'roleplay-realm',
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
      icon: 'art-chat',
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
      icon: 'general',
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
      icon: 'late-night',
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

  // ---------------------------------------------------------------------------
  // HELPER ENGINES: MATH, CODE, COLOR, RP
  // ---------------------------------------------------------------------------

  // 1. Shunting-Yard Math Parser (NO EVAL)
  function parseAndEvalMath(str) {
    try {
      let s = str.trim().toLowerCase();
      s = s.replace(/^(what is|calculate|evaluate|math|solve)\s+/i, '');
      s = s.replace(/\?+$/, '').trim();

      if (!/^[0-9+\-*/%^().,\s\ba-z]+$/i.test(s)) return null;
      if (!/\d/.test(s)) return null;
      if (!/[+\-*/%^]|\b(sqrt|sin|cos|tan|abs|log)\b/.test(s)) return null;

      s = s.replace(/sqrt\(/g, 'S(')
           .replace(/sin\(/g, 'N(')
           .replace(/cos\(/g, 'C(')
           .replace(/tan\(/g, 'T(')
           .replace(/abs\(/g, 'A(')
           .replace(/log\(/g, 'L(');

      let tokens = [];
      let i = 0;
      while (i < s.length) {
        let c = s[i];
        if (/\s/.test(c)) { i++; continue; }
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
      return Number.isInteger(res) ? res.toString() : res.toFixed(4).replace(/\.?0+$/, '');
    } catch (e) {
      return null;
    }
  }

  // 2. Vector Static Code Analyzer
  function analyzeCode(code) {
    let lang = 'JavaScript';
    if (/#include|std::|printf|cout|int main/.test(code)) lang = 'C / C++';
    else if (/using System|Console\.WriteLine|namespace|public class/.test(code)) lang = 'C#';

    let lines = code.split('\n');
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

      let isStatement = /^(int|double|float|char|var|let|const|return|console\.log|printf|cout|Console\.WriteLine|std::cout|import|using)\b/.test(trimmed);
      if (isStatement && !/[;{}:,]$/.test(trimmed) && !trimmed.includes('//')) {
        issues.push(`Line ${lineNum}: Missing semicolon ';' at end of statement.`);
      }

      if (/\b(if|while)\s*\([^=]*=[^=][^)]*\)/.test(trimmed)) {
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

    let hexMatch = str.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (hexMatch) {
      return [parseInt(hexMatch[1], 16), parseInt(hexMatch[2], 16), parseInt(hexMatch[3], 16)];
    }
    let rgbMatch = str.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
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

    return `Art **Color Math Breakdown for '${colorInput}' (HSL: ${h}°, ${s}%, ${l}%)**:\n\n` +
      `• **Base Color**: \`${baseHex}\`\n` +
      `• **Complementary (+180°)**: \`${compHex}\`\n` +
      `• **Analogous (-30°, +30°)**: \`${ana1Hex}\`, \`${ana2Hex}\`\n` +
      `• **Triadic (+120°, +240°)**: \`${tri1Hex}\`, \`${tri2Hex}\`\n\n` +
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

    actionResponse += `\n\n*What do you do next?*`;
    return actionResponse;
  }

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
    let isCode = text.includes('```') || /#include|function\b|void\b|class\b|=>|\bconsole\.log\b|\bint\b|\bpublic\b|\breturn\b/.test(text);
    if (isCode && (bot.id === 'vector' || bot.id === 'bit')) {
      let cleanCode = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
      let analysis = analyzeCode(cleanCode);

      if (bot.id === 'vector') {
        if (analysis.issues.length > 0) {
 return ` **Vector Static Analysis Report (${analysis.lang})**:\n` +
            `I parsed your ${analysis.linesCount} lines of code and spotted **${analysis.issues.length} issue(s)**:\n` +
            analysis.issues.map(i => `• ${i}`).join('\n') +
            `\n\n*Suggested Fix*: Ensure all statement lines end with \`;\` and all brackets \`{\`, \`(\`, \`[\` have matching closing pairs!`;
        } else {
 return ` **Vector Code Review (${analysis.lang})**:\n` +
            `Nice work! Your ${analysis.linesCount}-line snippet is **clean of syntax/bracket bugs**. The logic flows structured and modularly.\n` +
            `*Tip*: Keep memory usage efficient and consider profiling if this executes inside tight performance loops!`;
        }
      } else {
        return `Bot **Bit DX Feedback**: That ${analysis.lang} code looks sleek! Vector verified the syntax — if you are bundling this, I recommend using Vite + Prettier for sub-millisecond hot reloads!`;
      }
    }

    // Check Vector/Bit Code Concept Queries
    if (bot.id === 'vector' || bot.id === 'bit') {
      for (let conceptKey in CODE_CONCEPTS) {
        if (lower.includes(conceptKey)) {
          let c = CODE_CONCEPTS[conceptKey];
 return ` **${conceptKey.toUpperCase()} Concept Explanation**:\n${c.explanation}\n\n\`\`\`cpp\n${c.example}\n\`\`\``;
        }
      }
    }

    // Pipeline Step 2: Math Engine
    let mathResult = parseAndEvalMath(text);
    if (mathResult !== null) {
 if (bot.id === 'vector') return ` **Vector Math Result**: \`${text}\` = **${mathResult}**`;
      if (bot.id === 'palette') return `Art **Palette Math Result**: \`${text}\` = **${mathResult}**`;
 return ` **Math Answer**: The calculated result of \`${text}\` is **${mathResult}**.`;
    }

    // Pipeline Step 3: Palette Color Math Engine
    if (bot.id === 'palette' && (lower.includes('color') || lower.includes('palette') || lower.includes('hex') || lower.includes('rgb') || lower.includes('#') || ['red','blue','green','teal','purple','gold','sunset','ocean'].some(c => lower.includes(c)))) {
      let matchedWord = ['red','blue','green','teal','purple','gold','sunset','ocean'].find(c => lower.includes(c)) || '#a855f7';
      return generatePaletteAnalysis(matchedWord);
    }

    // Pipeline Step 4: Terra Nature Facts Engine
    if (bot.id === 'terra' && (lower.includes('fact') || lower.includes('nature') || lower.includes('earth') || lower.includes('geography') || lower.includes('place') || lower.includes('tell me'))) {
      let randomFact = TERRA_FACTS[Math.floor(Math.random() * TERRA_FACTS.length)];
      return `Earth **Terra Earth Fact**: ${randomFact}`;
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
    if (/^(hi|hello|hey|greetings|sup|yo)\b/.test(lower)) {
      let knownName = mem.facts.userName || profile.username;
      let knownLikes = mem.facts.userLikes ? ` I remember you like ${mem.facts.userLikes}!` : '';
      return `${bot.avatar} Hey there, **${knownName}**! Awesome to see you in #${context ? context.channelName : 'chat'}.${knownLikes} What are you up to today?`;
    }

    // Pipeline Step 8: Emotion Detection
    if (/\b(sad|depressed|unhappy|down)\b/.test(lower)) {
      return `${bot.avatar} I'm so sorry you're feeling down. I'm right here with you — take all the time you need, and remember you're appreciated! Heart`;
    }
    if (/\b(happy|excited|great|awesome|wonderful|yay)\b/.test(lower)) {
 return `${bot.avatar} YAY! That positive energy is so contagious! Tell me all about what made your day so great! `;
    }
    if (/\b(tired|exhausted|sleepy|stressed|anxious)\b/.test(lower)) {
 return `${bot.avatar} Take a deep breath, stretch your shoulders, and relax. You've been working hard — don't forget to rest! `;
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
 <div class="aura-server-icon" title="Browse / Add Server" onclick="MWO.Aura.openServerModal()"></div>
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
 ${curServer.autoMod? ' AutoMod On': ' Off'}
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
            <span style="font-size:16px;" title="Edit Profile"></span>
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
 <div style="font-size:42px; margin-bottom:10px;"></div>
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
              <button style="background:none; border:none; font-size:18px; cursor:pointer; color:#a855f7;" title="Share Image" onclick="MWO.Aura.triggerFileUpload()"></button>
              <input type="file" id="aura-file-input" accept="image/*" style="display:none;" onchange="MWO.Aura.handleImageUpload(event)" />
              
              <textarea id="aura-input-textarea" class="aura-textarea" rows="1" placeholder="Message #${curChannel.name}..." onkeydown="MWO.Aura.handleInputKeydown(event)" oninput="MWO.Aura.updateCharCounter()"></textarea>
              
              <span id="aura-char-count" style="font-size:0.72em; color:#6b7280; user-select:none;">0/2000</span>
              <button id="aura-send-btn" class="aura-btn" style="padding:6px 14px; font-size:0.85em;" onclick="MWO.Aura.sendMessage()">Send </button>
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
 ${isUser? `<button style="margin-left:auto; background:none; border:none; color:#ef4444; font-size:0.75em; cursor:pointer;" onclick="MWO.Aura.deleteMessage('${m.id}')" title="Delete Message"></button>`: ''}
          </div>
          <div>${parsedText}</div>
          ${m.imageUrl ? `<img src="${m.imageUrl}" style="max-height:200px; border-radius:8px; margin-top:8px; display:block; border:1px solid rgba(255,255,255,0.1);" />` : ''}
          
          <div class="aura-reactions-row">
            ${m.reactions ? Object.keys(m.reactions).map(emoji => `
              <span class="aura-chip" onclick="MWO.Aura.toggleReaction('${m.id}', '${emoji}')">${emoji} ${m.reactions[emoji]}</span>
            `).join('') : ''}
 <span class="aura-chip" style="opacity:0.6;" onclick="MWO.Aura.showReactionPicker('${m.id}')">+</span>
          </div>
        </div>
      </div>
    `;
  }

  function parseMarkdown(text) {
    if (!text) return '';
    let escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    escaped = escaped.replace(/```([a-z]*)\n?([\s\S]*?)```/gi, '<pre style="background:#0d0a14; padding:10px; border-radius:6px; font-family:var(--mono, monospace); font-size:0.85em; overflow-x:auto; margin:6px 0; border:1px solid rgba(255,255,255,0.08);"><code>$2</code></pre>');
    escaped = escaped.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 5px; border-radius:4px; font-family:var(--mono, monospace); font-size:0.88em;">$1</code>');
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em style="color:#d8b4fe;">$1</em>');
    escaped = escaped.replace(/\n/g, '<br/>');
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
      postSystemMessage(`[AuraMod]  Slowed down — please don't spam identical messages!`);
      txtEl.value = '';
      updateCharCounter();
      return;
    }

    // Moderation Check 3: Flood Detection (6 msgs in 5s)
    let fiveSecMsgs = recentUserMsgs.filter(m => now - m.time < 5000);
    if (srv.autoMod && fiveSecMsgs.length >= 5) {
      enforceCooldown(5);
      postSystemMessage(`[AuraMod]  Flood limit reached. 5-second cooldown activated.`);
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
 senderAvatar: '',
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
        if (sendBtn) sendBtn.textContent = 'Send ';
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
 const emojis = ['', 'Heart', '', '', '', 'Heart'];
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

 let emojis = ['Heart','Fox','Owl','','Bot','Theater','~','Art','','Earth','Moon','','','','','Star','','Cat','Dog','','Bear','Deer','','','Gem','Games','','Target','WIN','Dice'];

    overlay.innerHTML = `
      <div class="aura-modal">
        <h3 style="margin-top:0; color:#a855f7; display:flex; align-items:center; gap:8px;"> User Profile Settings</h3>
        
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
 <label><input type="radio" name="pm-status" value="online" ${profile.status === 'online'? 'checked': ''} /> Online</label>
 <label><input type="radio" name="pm-status" value="idle" ${profile.status === 'idle'? 'checked': ''} /> Idle</label>
 <label><input type="radio" name="pm-status" value="invisible" ${profile.status === 'invisible'? 'checked': ''} /> Invisible</label>
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
 ℹ <strong>Aura Companion Notice</strong>: Aura is inhabited entirely by AI companions — every member you meet in servers is a bot companion.
        </div>

        <div style="display:flex; border-bottom:1px solid rgba(255,255,255,0.1); margin-bottom:16px;">
 <button id="sm-tab-create" style="flex:1; padding:8px; background:none; border:none; color:#a855f7; border-bottom:2px solid #a855f7; font-weight:700; cursor:pointer;" onclick="MWO.Aura.switchServerTab('create')"> Create Server</button>
          <button id="sm-tab-browse" style="flex:1; padding:8px; background:none; border:none; color:#a799c4; font-weight:700; cursor:pointer;" onclick="MWO.Aura.switchServerTab('browse')"> Browse Pre-made Servers</button>
        </div>

        <div id="sm-content-create">
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div>
              <label style="font-size:0.8em; color:#a799c4; display:block; margin-bottom:4px;">SERVER NAME</label>
              <input id="sm-name" type="text" placeholder="e.g. Stargazer Club" style="width:100%; padding:8px 12px; background:#110d1a; border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff;" />
            </div>

            <div>
              <label style="font-size:0.8em; color:#a799c4; display:block; margin-bottom:4px;">ICON EMOJI</label>
 <input id="sm-icon" type="text" value="" style="width:100%; padding:8px 12px; background:#110d1a; border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff;" />
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
 let icon = iconEl && iconEl.value? iconEl.value.trim(): '';
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
      icon: 'aura-ai-social-platform',
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
  icon: 'aura',
  category: 'app',
  installed: false,
  launch: function() {
    MWO.Aura.launch();
  }
});
