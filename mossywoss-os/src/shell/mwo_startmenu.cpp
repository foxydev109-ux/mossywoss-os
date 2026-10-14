#include "mwo_startmenu.h"
#include "mwo_theme.h"
#include "mwo_sound.h"
#include "mwo_text.h"
#include "mwo_window.h"
#include "mwo_taskbar.h"
#include <vector>
#include <string>
#include <cstring>
#include <algorithm>
#include <iostream>

static SDL_Renderer* g_renderer = NULL;
static bool g_is_open = false;
static std::vector<MWOApp> g_apps;
static std::string g_search_query = "";
static int g_screen_w = 1024;
static int g_screen_h = 768;

static const char* CATEGORIES[] = {
    "System", "Utilities", "Files", "Internet", "Creative",
    "Development", "Games", "Media", "Education", "Settings"
};
static const int CATEGORY_COUNT = 10;

static void populate_default_apps() {
    if (!g_apps.empty()) return;

    MWOApp defaults[] = {
        {"mwo.terminal", "Terminal", "System", NULL, NULL},
        {"mwo.taskmgr", "Task Manager", "System", NULL, NULL},
        {"mwo.calculator", "Calculator", "Utilities", NULL, NULL},
        {"mwo.textedit", "Text Editor", "Utilities", NULL, NULL},
        {"mwo.files", "File Manager", "Files", NULL, NULL},
        {"mwo.browser", "Web Browser", "Internet", NULL, NULL},
        {"mwo.mail", "Mail Client", "Internet", NULL, NULL},
        {"mwo.paint", "Paint Studio", "Creative", NULL, NULL},
        {"mwo.codestudio", "Code Studio", "Development", NULL, NULL},
        {"mwo.spacegame", "Space Arcade", "Games", NULL, NULL},
        {"mwo.music", "Music Player", "Media", NULL, NULL},
        {"mwo.mathtutor", "Math Tutor", "Education", NULL, NULL},
        {"mwo.settings", "Control Panel", "Settings", NULL, NULL}
    };

    for (const auto& app : defaults) {
        g_apps.push_back(app);
    }
}

void StartMenu::set_screen_bounds(int screen_w, int screen_h) {
    g_screen_w = screen_w;
    g_screen_h = screen_h;
}

void StartMenu::init(SDL_Renderer* renderer) {
    g_renderer = renderer;
    populate_default_apps();
}

void StartMenu::toggle() {
    g_is_open = !g_is_open;
    if (g_is_open) {
        g_search_query = "";
        playPop();
    } else {
        playClick();
    }
}

bool StartMenu::is_open() {
    return g_is_open;
}

void StartMenu::set_apps(MWOApp* apps, int count) {
    g_apps.clear();
    if (apps && count > 0) {
        for (int i = 0; i < count; ++i) {
            g_apps.push_back(apps[i]);
        }
    } else {
        populate_default_apps();
    }
}

void StartMenu::add_app(const MWOApp& app) {
    g_apps.push_back(app);
}

void StartMenu::render() {
    if (!g_is_open || !g_renderer) return;

    Theme* theme = theme_current();

    int panel_w = 360;
    int max_panel_h = static_cast<int>(g_screen_h * 0.70f);
    int panel_x = 10;
    int panel_y = g_screen_h - 48 - max_panel_h;

    // 1. Outer Panel Shadow & Background
    SDL_Rect panel_rect = {panel_x, panel_y, panel_w, max_panel_h};
    SDL_SetRenderDrawColor(g_renderer, theme->window_bg.r, theme->window_bg.g, theme->window_bg.b, 245);
    SDL_RenderFillRect(g_renderer, &panel_rect);

    SDL_SetRenderDrawColor(g_renderer, theme->accent.r, theme->accent.g, theme->accent.b, theme->accent.a);
    SDL_RenderDrawRect(g_renderer, &panel_rect);

    // 2. Search Bar at Top (x = panel_x + 15, y = panel_y + 15, w = 330, h = 36)
    SDL_Rect search_rect = {panel_x + 15, panel_y + 15, panel_w - 30, 36};
    SDL_SetRenderDrawColor(g_renderer, theme->input_bg.r, theme->input_bg.g, theme->input_bg.b, theme->input_bg.a);
    SDL_RenderFillRect(g_renderer, &search_rect);

    SDL_SetRenderDrawColor(g_renderer, theme->input_border.r, theme->input_border.g, theme->input_border.b, theme->input_border.a);
    SDL_RenderDrawRect(g_renderer, &search_rect);

    if (g_search_query.empty()) {
        Text::render(g_renderer, "Search apps & categories...", search_rect.x + 10, search_rect.y + 8, theme->text_secondary);
    } else {
        Text::render(g_renderer, g_search_query.c_str(), search_rect.x + 10, search_rect.y + 8, theme->text_primary);
    }

    // 3. Category Sections & 3-Column App Grid
    int current_y = panel_y + 65;
    int content_bottom = panel_y + max_panel_h - 15;

    // Filter apps based on g_search_query
    auto matches_filter = [](const MWOApp& app, const std::string& query) {
        if (query.empty()) return true;
        std::string name_lower = app.name;
        std::string cat_lower = app.category;
        std::string q_lower = query;
        std::transform(name_lower.begin(), name_lower.end(), name_lower.begin(), ::tolower);
        std::transform(cat_lower.begin(), cat_lower.end(), cat_lower.begin(), ::tolower);
        std::transform(q_lower.begin(), q_lower.end(), q_lower.begin(), ::tolower);
        return (name_lower.find(q_lower) != std::string::npos || cat_lower.find(q_lower) != std::string::npos);
    };

    for (int c = 0; c < CATEGORY_COUNT; ++c) {
        const char* cat_name = CATEGORIES[c];

        // Gather matching apps in this category
        std::vector<const MWOApp*> category_apps;
        for (const auto& app : g_apps) {
            if (std::strcmp(app.category, cat_name) == 0 && matches_filter(app, g_search_query)) {
                category_apps.push_back(&app);
            }
        }

        if (category_apps.empty()) continue;
        if (current_y + 30 > content_bottom) break;

        // Render Category Header
        Text::render(g_renderer, cat_name, panel_x + 15, current_y, theme->accent);
        SDL_SetRenderDrawColor(g_renderer, theme->input_border.r, theme->input_border.g, theme->input_border.b, theme->input_border.a);
        SDL_RenderDrawLine(g_renderer, panel_x + 15, current_y + 20, panel_x + panel_w - 15, current_y + 20);

        current_y += 26;

        // Render 3-column app grid
        int col_width = (panel_w - 30) / 3;
        int grid_row_h = 65;

        for (size_t i = 0; i < category_apps.size(); ++i) {
            int col = i % 3;
            int row = static_cast<int>(i / 3);

            int item_x = panel_x + 15 + col * col_width;
            int item_y = current_y + row * grid_row_h;

            if (item_y + grid_row_h > content_bottom) break;

            const MWOApp* app = category_apps[i];

            // App Icon Box (32x32)
            SDL_Rect icon_box = {item_x + (col_width - 32) / 2, item_y, 32, 32};
            SDL_SetRenderDrawColor(g_renderer, theme->button_bg.r, theme->button_bg.g, theme->button_bg.b, theme->button_bg.a);
            SDL_RenderFillRect(g_renderer, &icon_box);
            SDL_SetRenderDrawColor(g_renderer, theme->accent.r, theme->accent.g, theme->accent.b, theme->accent.a);
            SDL_RenderDrawRect(g_renderer, &icon_box);

            if (app->icon_surface) {
                SDL_Texture* tex = SDL_CreateTextureFromSurface(g_renderer, app->icon_surface);
                if (tex) {
                    SDL_RenderCopy(g_renderer, tex, NULL, &icon_box);
                    SDL_DestroyTexture(tex);
                }
            } else {
                // Draw app letter fallback
                char initial[2] = {app->name[0], '\0'};
                Text::render(g_renderer, initial, icon_box.x + 11, icon_box.y + 6, theme->text_primary);
            }

            // App Name Label (below icon)
            std::string short_name = app->name;
            if (short_name.length() > 10) {
                short_name = short_name.substr(0, 8) + "..";
            }
            Text::render(g_renderer, short_name.c_str(), item_x + 5, item_y + 36, theme->text_primary);
        }

        int total_rows = static_cast<int>((category_apps.size() + 2) / 3);
        current_y += total_rows * grid_row_h + 10;
    }
}

bool StartMenu::handle_event(SDL_Event* event) {
    if (!g_is_open || !event) return false;

    int panel_w = 360;
    int max_panel_h = static_cast<int>(g_screen_h * 0.70f);
    int panel_x = 10;
    int panel_y = g_screen_h - 48 - max_panel_h;

    if (event->type == SDL_TEXTINPUT) {
        g_search_query += event->text.text;
        return true;
    } else if (event->type == SDL_KEYDOWN) {
        if (event->key.keysym.sym == 8 /* Backspace */ && !g_search_query.empty()) {
            g_search_query.pop_back();
            return true;
        } else if (event->key.keysym.sym == 27 /* Escape */) {
            toggle();
            return true;
        }
    }

    int click_x = 0, click_y = 0;
    bool is_click = false;

    if (event->type == SDL_MOUSEBUTTONDOWN && event->button.button == SDL_BUTTON_LEFT) {
        click_x = event->button.x;
        click_y = event->button.y;
        is_click = true;
    } else if (event->type == SDL_FINGERDOWN) {
        click_x = static_cast<int>(event->tfinger.x * g_screen_w);
        click_y = static_cast<int>(event->tfinger.y * g_screen_h);
        is_click = true;
    }

    if (is_click) {
        // If click is outside panel, close start menu
        if (click_x < panel_x || click_x > panel_x + panel_w ||
            click_y < panel_y || click_y > panel_y + max_panel_h) {
            
            // Check if start button was clicked (don't double-toggle)
            if (!Taskbar::is_start_button_clicked(click_x, click_y)) {
                toggle();
            }
            return false;
        }

        // Check app icon clicks
        int current_y = panel_y + 65;
        int content_bottom = panel_y + max_panel_h - 15;

        auto matches_filter = [](const MWOApp& app, const std::string& query) {
            if (query.empty()) return true;
            std::string name_lower = app.name;
            std::string cat_lower = app.category;
            std::string q_lower = query;
            std::transform(name_lower.begin(), name_lower.end(), name_lower.begin(), ::tolower);
            std::transform(cat_lower.begin(), cat_lower.end(), cat_lower.begin(), ::tolower);
            std::transform(q_lower.begin(), q_lower.end(), q_lower.begin(), ::tolower);
            return (name_lower.find(q_lower) != std::string::npos || cat_lower.find(q_lower) != std::string::npos);
        };

        for (int c = 0; c < CATEGORY_COUNT; ++c) {
            const char* cat_name = CATEGORIES[c];
            std::vector<const MWOApp*> category_apps;

            for (const auto& app : g_apps) {
                if (std::strcmp(app.category, cat_name) == 0 && matches_filter(app, g_search_query)) {
                    category_apps.push_back(&app);
                }
            }

            if (category_apps.empty()) continue;
            if (current_y + 30 > content_bottom) break;

            current_y += 26; // After category header

            int col_width = (panel_w - 30) / 3;
            int grid_row_h = 65;

            for (size_t i = 0; i < category_apps.size(); ++i) {
                int col = i % 3;
                int row = static_cast<int>(i / 3);

                int item_x = panel_x + 15 + col * col_width;
                int item_y = current_y + row * grid_row_h;

                if (item_y + grid_row_h > content_bottom) break;

                // Check click on app item
                if (click_x >= item_x && click_x <= item_x + col_width &&
                    click_y >= item_y && click_y <= item_y + grid_row_h) {

                    const MWOApp* app = category_apps[i];

                    // Launch App: Create Window & Add to Taskbar
                    int win_id = WindowManager::create(app->name, 120, 80, 640, 440, app->app_id);
                    Taskbar::add_app(app->name, win_id);

                    toggle(); // Close Start menu
                    return true;
                }
            }

            int total_rows = static_cast<int>((category_apps.size() + 2) / 3);
            current_y += total_rows * grid_row_h + 10;
        }

        return true; // Click inside start menu
    }

    return false;
}
