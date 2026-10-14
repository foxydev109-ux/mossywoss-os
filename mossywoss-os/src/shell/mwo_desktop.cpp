/**
 * mwo_desktop.cpp — MossyWoss OS Desktop Shell
 * Renders desktop background, icons, windows, taskbar, start menu.
 * Routes events to the correct subsystem.
 */
#include "mwo_desktop.h"
#include <SDL2/SDL.h>
#include <SDL2/SDL_ttf.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>

Desktop::Desktop()
    : renderer_(NULL), font_(NULL), screen_w_(0), screen_h_(0)
    , bg_color_{26, 26, 38, 255}, icon_count_(0), window_mgr_(NULL)
    , taskbar_(NULL), start_menu_(NULL), theme_(NULL), text_render_(NULL) {
}

Desktop::~Desktop() {
}

void Desktop::init(SDL_Renderer* r, int w, int h) {
    renderer_ = r;
    screen_w_ = w;
    screen_h_ = h;

    /* Default desktop background */
    bg_color_.r = 26; bg_color_.g = 26; bg_color_.b = 38; bg_color_.a = 255;

    /* Create default app icons */
    icon_count_ = 0;
    add_app_icon("files", "Files");
    add_app_icon("terminal", "Terminal");
    add_app_icon("calculator", "Calculator");
    add_app_icon("paint", "Paint");
    add_app_icon("notes", "Notes");
    add_app_icon("settings", "Settings");
    add_app_icon("taskmgr", "Task Mgr");
    add_app_icon("about", "About");
    add_app_icon("nodeedit", "Node Editor");
}

void Desktop::render(SDL_Renderer* renderer) {
    /* 1. Fill background with wallpaper color */
    SDL_SetRenderDrawColor(renderer, bg_color_.r, bg_color_.g, bg_color_.b, 255);
    SDL_RenderClear(renderer);

    /* 2. Render desktop icons (left column, 84px wide) */
    int icon_size = 64;
    int icon_gap = 12;
    int icon_x = 16;
    int icon_y = 16;
    int label_h = 18;

    for (int i = 0; i < icon_count_; i++) {
        int y = icon_y + i * (icon_size + label_h + icon_gap);
        if (y + icon_size + label_h > screen_h_ - 60) {
            /* Wrap to next column */
            icon_x += icon_size + 24;
            icon_y = 16;
            y = 16;
        }
        icons_[i].rect.x = icon_x;
        icons_[i].rect.y = y;
        icons_[i].rect.w = icon_size;
        icons_[i].rect.h = icon_size;

        /* Draw icon background (rounded rectangle approximation) */
        SDL_SetRenderDrawColor(renderer, 40, 40, 56, 200);
        SDL_RenderFillRect(renderer, &icons_[i].rect);

        /* Draw icon border */
        SDL_SetRenderDrawColor(renderer, 80, 80, 110, 255);
        SDL_RenderDrawRect(renderer, &icons_[i].rect);

        /* Draw app icon label */
        if (text_render_) {
            int text_w, text_h;
            text_render_->measure(icons_[i].label, &text_w, &text_h);
            int label_x = icon_x + (icon_size - text_w) / 2;
            int label_y = y + icon_size + 2;
            SDL_Color text_color = {200, 200, 220, 255};
            text_render_->render(renderer, icons_[i].label, label_x, label_y, text_color);
        }
    }

    /* 3. Windows are rendered by the window manager externally */
    /* (WindowManager::render is called from main loop) */

    /* 4. Taskbar is rendered externally */
    /* 5. Start menu is rendered externally */
}

void Desktop::handle_event(SDL_Event* e) {
    if (!e) return;

    /* Check desktop icon clicks */
    if (e->type == SDL_MOUSEBUTTONDOWN && e->button.button == SDL_BUTTON_LEFT) {
        int mx = e->button.x;
        int my = e->button.y;
        for (int i = 0; i < icon_count_; i++) {
            if (mx >= icons_[i].rect.x && mx <= icons_[i].rect.x + icons_[i].rect.w &&
                my >= icons_[i].rect.y && my <= icons_[i].rect.y + icons_[i].rect.h + 20) {
                /* Icon clicked — launch app */
                if (icon_callback_) {
                    icon_callback_(icons_[i].app_id);
                }
                return;
            }
        }
    }

    /* Touch tap on icons */
    if (e->type == SDL_FINGERDOWN) {
        int mx = (int)(e->tfinger.x * screen_w_);
        int my = (int)(e->tfinger.y * screen_h_);
        for (int i = 0; i < icon_count_; i++) {
            if (mx >= icons_[i].rect.x && mx <= icons_[i].rect.x + icons_[i].rect.w &&
                my >= icons_[i].rect.y && my <= icons_[i].rect.y + icons_[i].rect.h + 20) {
                if (icon_callback_) {
                    icon_callback_(icons_[i].app_id);
                }
                return;
            }
        }
    }
}

void Desktop::add_app_icon(const char* app_id, const char* label) {
    if (icon_count_ >= MAX_DESKTOP_ICONS) return;
    strncpy(icons_[icon_count_].app_id, app_id, 63);
    icons_[icon_count_].app_id[63] = '\0';
    strncpy(icons_[icon_count_].label, label, 63);
    icons_[icon_count_].label[63] = '\0';
    icons_[icon_count_].rect = {0, 0, 0, 0};
    icon_count_++;
}

void Desktop::set_wallpaper(Uint8 r, Uint8 g, Uint8 b) {
    bg_color_.r = r;
    bg_color_.g = g;
    bg_color_.b = b;
}

void Desktop::set_theme(ThemeColors* t) {
    if (!t) return;
    bg_color_ = t->desktop_bg;
}

void Desktop::handle_resize(int w, int h) {
    screen_w_ = w;
    screen_h_ = h;
}

void Desktop::set_icon_callback(void (*cb)(const char*)) {
    icon_callback_ = cb;
}
