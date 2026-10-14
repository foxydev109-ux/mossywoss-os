import sys, os, json

with open('mw_web/aura.js', 'w', encoding='utf-8') as f:
    f.write('''// Aura AI Social Platform for MossyWoss OS
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
    avatar: '💜',
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
    { keywords: ['updater', 'system update'], answer: 'The Updater app keeps your MossyWoss OS packages and web binaries up to date.' },
    { keywords: ['accounts', 'user profile'], answer: 'The Accounts manager tracks local OS credentials, app permissions, and identity badges.' },
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
      example: '// C++ Example\\nint val = 42;\\nint* ptr = &val; // ptr stores address of val\\nstd::cout << *ptr; // Dereferences to print 42'
    },
    'reference': {
      explanation: 'A reference is an alias for an existing variable. Unlike pointers, references cannot be null and cannot be reassigned to refer to a different variable after initialization.',
      example: '// C++ Example\\nint x = 10;\\nint& ref = x; // ref is an alias for x\\nref = 20; // x is now 20'
    },
    'class': {
      explanation: 'A class is a blueprint for creating objects, bundling state (member variables) and behaviors (member methods) together with access specifiers like public and private.',
      example: '// C++ / C# Example\\nclass Player {\\npublic:\\n    std::string name;\\n    void play() { std::cout << name << " playing!"; }\\n};'
    },
    'inheritance': {
      explanation: 'Inheritance allows a child class to derive properties and methods from a parent class, promoting code reuse and establishing an IS-A relationship.',
      example: '// C++ Example\\nclass Animal { public: void speak() {} };\\nclass Dog : public Animal { /* inherits speak() */ };'
    },
    'polymorphism': {
      explanation: 'Polymorphism enables objects of different classes to be treated as objects of a common base class, typically via virtual functions and method overriding.',
      example: '// C++ Example\\nclass Shape { public: virtual void draw() = 0; };\\nclass Circle : public Shape { public: void draw() override {} };'
    },
    'recursion': {
      explanation: 'Recursion is a programming technique where a function calls itself to break down a problem into smaller instances until a base case stops execution.',
      example: '// JS / C++ Example\\nint factorial(int n) {\\n    if (n <= 1) return 1;\\n    return n * factorial(n - 1);\\n}'
    },
    'loop': {
      explanation: 'Loops repeatedly execute a block of code while a condition remains true. Common loops include for, while, and do-while.',
      example: '// JavaScript Example\\nfor (let i = 0; i < 5; i++) {\\n    console.log("Count:", i);\\n}'
    },
    'array': {
      explanation: 'An array is a contiguous memory structure storing a sequence of elements accessible by zero-indexed position.',
      example: '// C# Example\\nint[] numbers = { 10, 20, 30 };\\nConsole.WriteLine(numbers[0]); // prints 10'
    },
    'hash map': {
      explanation: 'A hash map (or dictionary) maps unique keys to values using a hashing function for fast O(1) average lookup time.',
      example: '// JavaScript Example\\nconst map = new Map();\\nmap.set("user", "Alice");\\nconsole.log(map.get("user"));'
    },
    'async/await': {
      explanation: 'Async/await synthesizes asynchronous Promises into clean synchronous-looking syntax without callback nesting.',
      example: '// JavaScript Example\\nasync function fetchData() {\\n    const res = await fetch("/api");\\n    const data = await res.json();\\n    return data;\\n}'
    },
    'closure': {
      explanation: 'A closure is an inner function that retains access to its enclosing outer function variables even after the outer function has completed execution.',
      example: '// JS Example\\nfunction createCounter() {\\n    let count = 0;\\n    return () => ++count;\\n}\\nconst next = createCounter();'
    },
    'scope': {
      explanation: 'Scope defines the region of a program where a variable is accessible, categorized into global, function, and block scope.',
      example: '// JS Example\\nif (true) {\\n    let blockScoped = 5; // not visible outside if\\n}'
    },
    'static': {
      explanation: 'Static members belong to the class type itself rather than any individual object instance.',
      example: '// C# Example\\nclass MathUtil {\\n    public static int Add(int a, int b) => a + b;\\n}'
    },
    'const': {
      explanation: 'The const qualifier marks a variable as read-only, preventing reassignment after its initial declaration.',
      example: '// C++ / JS Example\\nconst double PI = 3.14159;'
    },
    'template': {
      explanation: 'C++ templates allow writing generic functions or classes that work with any data type specified at compile-time.',
      example: '// C++ Example\\ntemplate<typename T>\\nT add(T a, T b) { return a + b; }'
    },
    'virtual': {
      explanation: 'A virtual function in C++ indicates that the function can be overridden in derived classes and resolves dynamically at runtime via a vtable.',
      example: '// C++ Example\\nclass Base { public: virtual void show() {} };'
    },
    'destructor': {
      explanation: 'A destructor is automatically invoked when an object lifetime ends, freeing dynamically allocated heap memory or external handles.',
      example: '// C++ Example\\nclass Buffer {\\npublic:\\n    ~Buffer() { delete[] data; }\\n};'
    },
    'linq': {
      explanation: 'LINQ (Language Integrated Query) provides declarative SQL-like querying capabilities over collections in C#.',
      example: '// C# Example\\nvar Evens = numbers.Where(n => n % 2 == 0).ToList();'
    },
    'lambda': {
      explanation: 'A lambda is an anonymous inline function expression that can capture surrounding scope variables.',
      example: '// C++ Example\\nauto sq = [](int x) { return x * x; };'
    },
    'event': {
      explanation: 'An event allows a publisher class to notify subscriber callbacks when something notable occurs in C#.',
      example: '// C# Example\\npublic event Action OnCompleted;'
    },
    'delegate': {
      explanation: 'A delegate is a type-safe function pointer in C# holding references to methods with a matching signature.',
      example: '// C# Example\\npublic delegate void Logger(string msg);'
    },
    'dom': {
      explanation: 'The Document Object Model represents an HTML document as a node tree that JavaScript can inspect and mutate dynamically.',
      example: '// JS Example\\ndocument.querySelector("#btn").addEventListener("click", e => {});'
    },
    'promise': {
      explanation: 'A Promise represents an eventual completion (or failure) of an asynchronous operation and its resulting value.',
      example: '// JS Example\\nnew Promise((resolve) => setTimeout(resolve, 1000));'
    },
    'type casting': {
      explanation: 'Type casting converts a value from one data type to another, either implicitly or explicitly (e.g. static_cast in C++).',
      example: '// C++ Example\\ndouble d = 9.99;\\nint i = static_cast<int>(d); // i = 9'
    },
    'memory leak': {
      explanation: 'A memory leak occurs when dynamically allocated memory on the heap is no longer reachable but is never freed via delete or garbage collection.',
      example: '// C++ Leak Example\\nvoid leak() { int* arr = new int[100]; /* missing delete[] arr; */ }'
    },
    'interface': {
      explanation: 'An interface defines a pure contract of method signatures without implementation details that implementing classes must fulfill.',
      example: '// C# Example\\ninterface IDamagable { void TakeDamage(int amount); }'
    },
    'stack vs heap': {
      explanation: 'The stack stores local function variables and call frames automatically (fast, small). The heap stores dynamically allocated objects manually or via GC (larger, dynamic).',
      example: '// C++ Example\\nint stackVar = 10; // Stack\\nint* heapVar = new int(20); // Heap'
    },
    'garbage collection': {
      explanation: 'Garbage Collection (GC) automatically scans the heap to reclaim memory occupied by objects that are no longer referenced by active code.',
      example: '// C# / JS automatically run GC in the background.'
    },
    'exception handling': {
      explanation: 'Exceptions handle runtime errors gracefully using try, catch, and throw blocks without crashing the application process.',
      example: '// C++ / C# Example\\ntry { throw std::runtime_error("Opps"); } catch(const std::exception& e) {}'
    },
    'struct': {
      explanation: 'A struct is a lightweight composite data type. In C++, members are public by default; in C#, structs are value types stored on the stack.',
      example: '// C++ / C# Example\\nstruct Point { int x; int y; };'
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
''')

print("Part 1 written")
