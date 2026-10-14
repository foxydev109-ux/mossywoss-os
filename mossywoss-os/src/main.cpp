#include <iostream>
#include <memory>
#include <chrono>
#include <thread>
#include <string>

#include <SDL2/SDL.h>
#include <SDL2/SDL_ttf.h>
#include <SDL2/SDL_image.h>

extern "C" {
#include "core/mwo_fs.h"
#include "core/mwo_db.h"
#include "core/mwo_auth.h"
#include "core/mwo_config.h"
#include "core/mwo_events.h"
#include "core/mwo_input.h"
#include "core/mwo_appreg.h"
#include "core/mwo_download.h"
}

#include "shell/Theme.hpp"
#include "shell/Text.hpp"
#include "shell/Desktop.hpp"
#include "shell/WindowManager.hpp"
#include "shell/Taskbar.hpp"
#include "shell/StartMenu.hpp"
#include "shell/Sound.hpp"

#include "apps/FilesApp.hpp"
#include "apps/TerminalApp.hpp"
#include "apps/SettingsApp.hpp"
#include "apps/CalculatorApp.hpp"
#include "apps/PaintApp.hpp"
#include "apps/NotesApp.hpp"
#include "apps/TaskManagerApp.hpp"
#include "apps/AboutApp.hpp"
#include "apps/BrowserApp.hpp"

constexpr int WINDOW_WIDTH = 1280;
constexpr int WINDOW_HEIGHT = 800;
constexpr int TARGET_FPS = 60;
constexpr float FRAME_TARGET_TIME = 1000.0f / TARGET_FPS;

int main(int argc, char* argv[]) {
    (void)argc;
    (void)argv;

    std::cout << "[MossyWoss OS] Initializing system subsystems..." << std::endl;

    // 1. Initialize SDL2 (Video & Audio)
    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_AUDIO) != 0) {
        std::cerr << "[Error] Failed to initialize SDL2: " << SDL_GetError() << std::endl;
        return 1;
    }

    // Initialize SDL_image
    int imgFlags = IMG_INIT_PNG | IMG_INIT_JPG;
    if ((IMG_Init(imgFlags) & imgFlags) != imgFlags) {
        std::cerr << "[Warning] SDL_image initialization failed: " << IMG_GetError() << std::endl;
    }

    // Initialize SDL_ttf
    if (TTF_Init() != 0) {
        std::cerr << "[Error] Failed to initialize SDL_ttf: " << TTF_GetError() << std::endl;
        SDL_Quit();
        return 1;
    }

    // 2. Create Window (1280x800, resizable, HighDPI)
    Uint32 windowFlags = SDL_WINDOW_SHOWN | SDL_WINDOW_RESIZABLE | SDL_WINDOW_ALLOW_HIGHDPI;
    SDL_Window* window = SDL_CreateWindow(
        "MossyWoss OS",
        SDL_WINDOWPOS_CENTERED,
        SDL_WINDOWPOS_CENTERED,
        WINDOW_WIDTH,
        WINDOW_HEIGHT,
        windowFlags
    );

    if (!window) {
        std::cerr << "[Error] Failed to create SDL Window: " << SDL_GetError() << std::endl;
        TTF_Quit();
        SDL_Quit();
        return 1;
    }

    // 3. Create Renderer (Accelerated & VSync)
    SDL_Renderer* renderer = SDL_CreateRenderer(
        window,
        -1,
        SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC
    );

    if (!renderer) {
        std::cout << "[Info] Hardware accelerated renderer fallback to software..." << std::endl;
        renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_SOFTWARE);
    }

    if (!renderer) {
        std::cerr << "[Error] Failed to create SDL Renderer: " << SDL_GetError() << std::endl;
        SDL_DestroyWindow(window);
        TTF_Quit();
        SDL_Quit();
        return 1;
    }

    // 4. Initialize C Core Subsystems
    std::cout << "[MossyWoss OS] Booting C Core Subsystems..." << std::endl;
    mwo_fs_init();
    mwo_db_init();
    mwo_auth();
    mwo_config();
    mwo_events();
    mwo_input();
    mwo_appreg();
    mwo_download();

    // 5. Initialize C++ Shell Subsystems
    std::cout << "[MossyWoss OS] Initializing C++ Desktop Shell..." << std::endl;
    mwo::Theme themeManager;
    themeManager.load_themes("assets/themes/themes.json");
    themeManager.set_active_theme("Lavender");

    mwo::Text textRenderer;
    textRenderer.init(renderer);

    mwo::Sound soundManager;
    soundManager.init();
    soundManager.play_startup_sound();

    mwo::WindowManager windowManager;
    mwo::Taskbar taskbar;
    mwo::StartMenu startMenu;

    mwo::Desktop desktop(
        &windowManager,
        &taskbar,
        &startMenu,
        &themeManager,
        &textRenderer,
        &soundManager
    );
    desktop.init(renderer, WINDOW_WIDTH, WINDOW_HEIGHT);

    // 6. Register Default Native Applications
    std::cout << "[MossyWoss OS] Registering Default Desktop Applications..." << std::endl;
    desktop.register_app("Files", "File Explorer", []() { return std::make_unique<mwo::FilesApp>(); });
    desktop.register_app("Terminal", "Command Console", []() { return std::make_unique<mwo::TerminalApp>(); });
    desktop.register_app("Settings", "System Settings", []() { return std::make_unique<mwo::SettingsApp>(); });
    desktop.register_app("Calculator", "Math Calculator", []() { return std::make_unique<mwo::CalculatorApp>(); });
    desktop.register_app("Paint", "Graphics Painter", []() { return std::make_unique<mwo::PaintApp>(); });
    desktop.register_app("Notes", "Text Notepad", []() { return std::make_unique<mwo::NotesApp>(); });
    desktop.register_app("Task Manager", "Process Monitor", []() { return std::make_unique<mwo::TaskManagerApp>(); });
    desktop.register_app("About", "About MossyWoss", []() { return std::make_unique<mwo::AboutApp>(); });
    desktop.register_app("Browser", "Web Browser Subsystem", []() { return std::make_unique<mwo::BrowserApp>(); });

    // 7. Main Loop (Event Polling -> Input Update -> Desktop Update -> Render -> Present -> 60 FPS Cap)
    bool isRunning = true;
    Uint32 lastFrameTicks = SDL_GetTicks();

    std::cout << "[MossyWoss OS] Desktop environment ready. Entering main event loop..." << std::endl;

    while (isRunning) {
        Uint32 frameStartTicks = SDL_GetTicks();
        float deltaTime = (frameStartTicks - lastFrameTicks) / 1000.0f;
        lastFrameTicks = frameStartTicks;

        SDL_Event sdlEvent;
        while (SDL_PollEvent(&sdlEvent)) {
            if (sdlEvent.type == SDL_QUIT) {
                isRunning = false;
            } else if (sdlEvent.type == SDL_WINDOWEVENT) {
                if (sdlEvent.window.event == SDL_WINDOWEVENT_RESIZED ||
                    sdlEvent.window.event == SDL_WINDOWEVENT_SIZE_CHANGED) {
                    int w = sdlEvent.window.data1;
                    int h = sdlEvent.window.data2;
                    desktop.handle_resize(w, h);
                }
            }

            // Convert SDL Event to MWO Event structure & Dispatch to C Core
            mwo_event_t mwoEv = mwo_event_from_sdl(&sdlEvent);
            mwo_events_dispatch(&mwoEv);

            // Forward to Desktop Shell Event Handler
            desktop.handle_event(&sdlEvent, &mwoEv);
        }

        // Update Input State
        mwo_input_update();

        // Update Desktop State
        desktop.update(deltaTime);

        // Render Desktop Frame
        const auto& currentTheme = themeManager.get_active_theme();
        SDL_SetRenderDrawColor(
            renderer,
            currentTheme.desktop_bg.r,
            currentTheme.desktop_bg.g,
            currentTheme.desktop_bg.b,
            255
        );
        SDL_RenderClear(renderer);

        desktop.render(renderer);

        SDL_RenderPresent(renderer);

        // Frame rate limiter (Targeting 60 FPS)
        Uint32 frameTime = SDL_GetTicks() - frameStartTicks;
        if (FRAME_TARGET_TIME > frameTime) {
            SDL_Delay(static_cast<Uint32>(FRAME_TARGET_TIME - frameTime));
        }
    }

    // 8. Cleanup Subsystems on Exit
    std::cout << "[MossyWoss OS] Shutting down MossyWoss OS..." << std::endl;
    soundManager.play_shutdown_sound();

    desktop.cleanup();
    soundManager.cleanup();
    textRenderer.cleanup();

    mwo_download_cleanup();
    mwo_appreg_cleanup();
    mwo_input_cleanup();
    mwo_events_cleanup();
    mwo_config_cleanup();
    mwo_auth_cleanup();
    mwo_db_cleanup();
    mwo_fs_cleanup();

    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    TTF_Quit();
    IMG_Quit();
    SDL_Quit();

    std::cout << "[MossyWoss OS] Clean shutdown completed successfully." << std::endl;
    return 0;
}
