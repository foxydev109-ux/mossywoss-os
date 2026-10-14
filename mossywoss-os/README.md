# MossyWoss OS

A cross-platform desktop environment built in **C**, **C++**, and **C#** with SDL2.

## Architecture

```
MOSSYWOSS OS
                       |
             +---------+---------+
             |                   |
          C CORE             C++ SHELL
             |                   |
      +------+------++      +----+--------+
      |      |      |      |    |        |
   Files   SQLite  Input  UI  Windows  Apps
      |      |      |      |    |        |
      +------+------+------+----+--------+
                       |
                     SDL2
                       |
             +--------+--------+
             |        |        |
          Android  Windows  Linux/macOS
             |
        CxxDroid target

     +--------+
     |   C#   |  Application Scripting Layer
     +--------+
     | Mono /  |  Full C# execution (if Mono linked)
     | Interp  |  Built-in interpreter (fallback)
     +--------+
```

### Language Boundaries

- **C** handles: filesystem, SQLite database, authentication, configuration, logging, event translation, input state, application registry, download manager, C# scripting engine
- **C++** handles: desktop shell, window manager, taskbar, start menu, theme engine, procedural audio, text rendering, all UI apps
- **C#** handles: application scripting, game logic, web content scripting

### itch.io Integration

Games and web projects created in MossyWoss OS can be exported as standalone HTML5 packages following itch.io rules:
- `index.html` as entry point
- Max 1,000 files
- Max 500MB total extracted content
- Max 200MB per individual file
- Self-contained (no external dependencies)

## Build

### Dependencies

- SDL2 (video, audio, input)
- SDL2_ttf (text rendering)
- SDL2_image (image loading)
- SQLite3 (database)
- libcurl (downloads)
- Optional: Mono (full C# scripting support)

### Build with Make

```bash
make        # Build
make run    # Build and run
make clean  # Clean build
make debug  # Debug build with GDB
```

### Build with CMake

```bash
mkdir build && cd build
cmake ..
make
```

### Building with CxxDroid (Android)

The project is designed to be compilable in CxxDroid on Android tablets.
SDL2, SQLite3, and libcurl are available as CxxDroid packages.

If Mono is not available on the target device, the built-in C# interpreter
handles basic scripts automatically.

## Directory Structure

```
mossywoss-os/
+-- Makefile
+-- CMakeLists.txt
+-- README.md
+-- src/
|   +-- core/          (C - system core)
|   |   +-- mwo_types.h
|   |   +-- mwo_log.c/h
|   |   +-- mwo_fs.c/h
|   |   +-- mwo_db.c/h
|   |   +-- mwo_auth.c/h
|   |   +-- mwo_config.c/h
|   |   +-- mwo_events.c/h
|   |   +-- mwo_input.c/h
|   |   +-- mwo_appreg.c/h
|   |   +-- mwo_download.c/h
|   |   +-- mwo_csharp.c/h
|   +-- shell/         (C++ - desktop shell)
|   |   +-- mwo_theme.cpp/h
|   |   +-- mwo_sound.cpp/h
|   |   +-- mwo_window.cpp/h
|   |   +-- mwo_desktop.cpp/h
|   |   +-- mwo_taskbar.cpp/h
|   |   +-- mwo_startmenu.cpp/h
|   |   +-- mwo_text.cpp/h
|   +-- apps/          (C++ - applications)
|   |   +-- mwo_terminal.cpp/h
|   |   +-- mwo_files_ui.cpp/h
|   |   +-- mwo_calculator.cpp/h
|   |   +-- mwo_paint.cpp/h
|   |   +-- mwo_notes.cpp/h
|   |   +-- mwo_taskmgr.cpp/h
|   |   +-- mwo_settings_ui.cpp/h
|   |   +-- mwo_about.cpp/h
|   +-- main.cpp
+-- web/
|   +-- browser/
|       +-- index.html
|       +-- style.css
|       +-- script.js
+-- assets/
    +-- themes/
        +-- themes.json
```

## Virtual Filesystem

MWO has its own virtual filesystem, separate from the host OS:

```
MWO_SYSTEM/
+-- system/
+-- registry/
+-- database/
+-- settings/
+-- applications/
+-- assets/
+-- themes/
+-- cache/
+-- logs/
+-- desktop/
+-- users/
    +-- <username>/
        +-- Desktop/
        +-- Documents/
        +-- Downloads/
        +-- Pictures/
        +-- Music/
        +-- Videos/
        +-- Games/
        +-- WebApps/
        +-- AppData/
        +-- Settings/
```

The physical storage location is hidden behind the MWO filesystem abstraction.
The rest of MWO calls filesystem functions instead of directly opening host paths.

## Themes

13 built-in themes:
Lavender, Orange, Light Pink, Green, Mint Green, Forest Green, Silver, Gold, White, Light Grey, Medium Grey, Dark Grey, Black

Each theme controls: desktop background, taskbar, windows, title bars, buttons, text, accents, selection, notifications, inputs.

## Platform Targets

| Platform | Target | Input |
|----------|--------|-------|
| Windows 10/11 | Desktop build | Mouse + keyboard + touch |
| Linux | Desktop build | Mouse + keyboard + touch |
| macOS | Desktop build | Mouse/trackpad + keyboard |
| Android tablets | CxxDroid build | Touch + S-Pen + mouse + keyboard |

## License

MIT License
