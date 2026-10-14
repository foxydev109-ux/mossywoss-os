#include "mwo_taskbar.h"
#include "mwo_theme.h"
#include "mwo_sound.h"
#include "mwo_text.h"
#include "mwo_window.h"
#include "mwo_startmenu.h"
#include <ctime>
#include <cstring>
#include <algorithm>
#include <iostream>

static SDL_Renderer* g_renderer = NULL;
static int g_screen_w = 1024;
static int g_taskbar_y = 720;
static std::vector<TaskbarApp> g_apps;
static char g_clock_text[32] = "00:00 01 Jan";
static int g_active_window_id = -1;

void Taskbar::init(SDL_Renderer* renderer, int screen_w, int y) {
    g_renderer = renderer;
    g_screen_w = screen_w;
    g_taskbar_y = y;
    update_clock();
}

void Taskbar::update_clock() {
    std::time_t now = std::time(NULL);
    std::tm* local_time = std::localtime(&now);
    if (local_time) {
        std::strftime(g_clock_text, sizeof(g_clock_text), "%H:%M %d %b", local_time);
    }
}

void Taskbar::add_app(const char* title, int window_id) {
    for (auto& app : g_apps) {
        if (app.window_id == window_id) {
            app.title = title ? title : "App";
            return;
        }
    }
    TaskbarApp app;
    app.title = title ? title : "App";
    app.window_id = window_id;
    app.active = true;
    g_apps.push_back(app);
    update_active(window_id);
}

void Taskbar::remove_app(int window_id) {
    g_apps.erase(
        std::remove_if(g_apps.begin(), g_apps.end(), [window_id](const TaskbarApp& a) {
            return a.window_id == window_id;
        }),
        g_apps.end()
    );
}

void Taskbar::update_active(int window_id) {
    g_active_window_id = window_id;
    for (auto& app : g_apps) {
        app.active = (app.window_id == window_id);
    }
}

bool Taskbar::is_start_button_clicked(int x, int y) {
    if (x >= 8 && x <= 98 && y >= g_taskbar_y + 6 && y <= g_taskbar_y + 42) {
        return true;
    }
    return false;
}

void Taskbar::render() {
    if (!g_renderer) return;

    update_clock();
    Theme* theme = theme_current();

    // 1. Taskbar Background (Height 48px)
    SDL_Rect taskbar_rect = {0, g_taskbar_y, g_screen_w, 48};
    SDL_SetRenderDrawColor(g_renderer, theme->taskbar_bg.r, theme->taskbar_bg.g, theme->taskbar_bg.b, theme->taskbar_bg.a);
    SDL_RenderFillRect(g_renderer, &taskbar_rect);

    // Top border line
    SDL_SetRenderDrawColor(g_renderer, theme->accent.r, theme->accent.g, theme->accent.b, theme->accent.a);
    SDL_RenderDrawLine(g_renderer, 0, g_taskbar_y, g_screen_w, g_taskbar_y);

    // 2. Start Button (x=8, y=g_taskbar_y+6, w=90, h=36)
    bool start_open = StartMenu::is_open();
    SDL_Rect start_rect = {8, g_taskbar_y + 6, 90, 36};
    SDL_Color start_bg = start_open ? theme->accent : theme->button_bg;
    SDL_SetRenderDrawColor(g_renderer, start_bg.r, start_bg.g, start_bg.b, start_bg.a);
    SDL_RenderFillRect(g_renderer, &start_rect);

    SDL_SetRenderDrawColor(g_renderer, theme->accent.r, theme->accent.g, theme->accent.b, theme->accent.a);
    SDL_RenderDrawRect(g_renderer, &start_rect);

    Text::render(g_renderer, "Mossy", start_rect.x + 18, start_rect.y + 8, start_open ? theme->window_bg : theme->text_primary);

    // 3. Running App Buttons (x=110 to g_screen_w-150)
    int btn_x = 110;
    int btn_w = 140;
    int max_btn_x = g_screen_w - 150;

    for (const auto& app : g_apps) {
        if (btn_x + btn_w > max_btn_x) break;

        SDL_Rect app_btn = {btn_x, g_taskbar_y + 6, btn_w, 36};

        if (app.active) {
            SDL_SetRenderDrawColor(g_renderer, theme->button_hover.r, theme->button_hover.g, theme->button_hover.b, theme->button_hover.a);
            SDL_RenderFillRect(g_renderer, &app_btn);

            // Active underline indicator
            SDL_SetRenderDrawColor(g_renderer, theme->accent.r, theme->accent.g, theme->accent.b, theme->accent.a);
            SDL_Rect indicator = {btn_x + 4, g_taskbar_y + 38, btn_w - 8, 3};
            SDL_RenderFillRect(g_renderer, &indicator);
        } else {
            SDL_SetRenderDrawColor(g_renderer, theme->button_bg.r, theme->button_bg.g, theme->button_bg.b, theme->button_bg.a);
            SDL_RenderFillRect(g_renderer, &app_btn);
        }

        SDL_SetRenderDrawColor(g_renderer, theme->input_border.r, theme->input_border.g, theme->input_border.b, theme->input_border.a);
        SDL_RenderDrawRect(g_renderer, &app_btn);

        // Truncate title if needed
        std::string display_title = app.title;
        if (display_title.length() > 14) {
            display_title = display_title.substr(0, 11) + "...";
        }

        Text::render(g_renderer, display_title.c_str(), app_btn.x + 8, app_btn.y + 8, theme->text_primary);

        btn_x += btn_w + 6;
    }

    // 4. System Tray with Clock (Right side: x = g_screen_w - 140, w = 130, h = 36)
    SDL_Rect tray_rect = {g_screen_w - 138, g_taskbar_y + 6, 130, 36};
    SDL_SetRenderDrawColor(g_renderer, theme->input_bg.r, theme->input_bg.g, theme->input_bg.b, theme->input_bg.a);
    SDL_RenderFillRect(g_renderer, &tray_rect);
    SDL_SetRenderDrawColor(g_renderer, theme->input_border.r, theme->input_border.g, theme->input_border.b, theme->input_border.a);
    SDL_RenderDrawRect(g_renderer, &tray_rect);

    Text::render(g_renderer, g_clock_text, tray_rect.x + 10, tray_rect.y + 8, theme->text_primary);
}

bool Taskbar::handle_event(SDL_Event* event) {
    if (!event) return false;

    int click_x = 0, click_y = 0;
    bool is_click = false;

    if (event->type == SDL_MOUSEBUTTONDOWN && event->button.button == SDL_BUTTON_LEFT) {
        click_x = event->button.x;
        click_y = event->button.y;
        is_click = true;
    } else if (event->type == SDL_FINGERDOWN) {
        click_x = static_cast<int>(event->tfinger.x * g_screen_w);
        click_y = static_cast<int>(event->tfinger.y * (g_taskbar_y + 48));
        is_click = true;
    }

    if (!is_click) return false;

    // Check if click is on taskbar
    if (click_y >= g_taskbar_y && click_y <= g_taskbar_y + 48) {
        // Start button check
        if (is_start_button_clicked(click_x, click_y)) {
            playClick();
            StartMenu::toggle();
            return true;
        }

        // App button check
        int btn_x = 110;
        int btn_w = 140;
        int max_btn_x = g_screen_w - 150;

        for (const auto& app : g_apps) {
            if (btn_x + btn_w > max_btn_x) break;

            if (click_x >= btn_x && click_x <= btn_x + btn_w &&
                click_y >= g_taskbar_y + 6 && click_y <= g_taskbar_y + 42) {

                playClick();
                MWindow* win = WindowManager::get(app.window_id);
                if (win) {
                    if (win->minimized) {
                        win->minimized = false;
                        WindowManager::focus(win->id);
                    } else if (app.active) {
                        WindowManager::minimize(win->id);
                    } else {
                        WindowManager::focus(win->id);
                    }
                }
                return true;
            }
            btn_x += btn_w + 6;
        }
        return true; // Click consumed by taskbar
    }

    return false;
}
