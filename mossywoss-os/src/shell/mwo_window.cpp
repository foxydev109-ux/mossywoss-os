#include "mwo_window.h"
#include "mwo_theme.h"
#include "mwo_sound.h"
#include "mwo_text.h"
#include <algorithm>
#include <iostream>

static std::vector<MWindow*> g_windows;
static int g_next_window_id = 1;
static int g_top_z_order = 1;
static int g_screen_width = 1024;
static int g_screen_height = 768;

static int g_drag_window_id = -1;
static int g_drag_offset_x = 0;
static int g_drag_offset_y = 0;

static int g_resize_window_id = -1;
static int g_resize_start_w = 0;
static int g_resize_start_h = 0;
static int g_resize_start_x = 0;
static int g_resize_start_y = 0;

void WindowManager::set_screen_bounds(int w, int h) {
    g_screen_width = w;
    g_screen_height = h;
}

int WindowManager::create(const char* title, int x, int y, int w, int h, const char* app_id) {
    MWindow* win = new MWindow();
    win->id = g_next_window_id++;
    win->title = title ? title : "Untitled Window";
    win->x = x;
    win->y = y;
    win->w = std::max(180, w);
    win->h = std::max(100, h);
    win->z_order = ++g_top_z_order;
    win->minimized = false;
    win->maximized = false;
    win->prev_rect = SDL_Rect{x, y, win->w, win->h};
    win->app_id = app_id ? app_id : "app";
    win->content_surface = NULL;
    win->needs_redraw = true;

    g_windows.push_back(win);
    playPop();
    return win->id;
}

void WindowManager::close(int id) {
    auto it = std::find_if(g_windows.begin(), g_windows.end(), [id](MWindow* w) {
        return w->id == id;
    });

    if (it != g_windows.end()) {
        MWindow* win = *it;
        if (win->content_surface) {
            SDL_FreeSurface(win->content_surface);
            win->content_surface = NULL;
        }
        delete win;
        g_windows.erase(it);
        playClick();
    }
}

void WindowManager::minimize(int id) {
    MWindow* win = get(id);
    if (win) {
        win->minimized = true;
        playClick();
    }
}

void WindowManager::maximize(int id) {
    MWindow* win = get(id);
    if (!win) return;

    if (win->maximized) {
        // Restore
        win->x = win->prev_rect.x;
        win->y = win->prev_rect.y;
        win->w = win->prev_rect.w;
        win->h = win->prev_rect.h;
        win->maximized = false;
    } else {
        // Maximize
        win->prev_rect = SDL_Rect{win->x, win->y, win->w, win->h};
        win->x = 0;
        win->y = 0;
        win->w = g_screen_width;
        win->h = g_screen_height - 48; // Leave room for taskbar
        win->maximized = true;
    }
    win->needs_redraw = true;
    playClick();
}

void WindowManager::focus(int id) {
    MWindow* win = get(id);
    if (win) {
        win->minimized = false;
        win->z_order = ++g_top_z_order;
    }
}

MWindow* WindowManager::get(int id) {
    for (MWindow* w : g_windows) {
        if (w->id == id) return w;
    }
    return NULL;
}

std::vector<MWindow*> WindowManager::list() {
    return g_windows;
}

void WindowManager::render(SDL_Renderer* renderer) {
    if (!renderer) return;

    // Sort windows by z_order ascending so top window is rendered last
    std::vector<MWindow*> sorted_windows = g_windows;
    std::sort(sorted_windows.begin(), sorted_windows.end(), [](MWindow* a, MWindow* b) {
        return a->z_order < b->z_order;
    });

    Theme* theme = theme_current();

    for (MWindow* win : sorted_windows) {
        if (win->minimized) continue;

        bool is_focused = (win->z_order == g_top_z_order);

        // 1. Draw Window Border
        SDL_Rect border_rect = {win->x, win->y, win->w, win->h};
        SDL_Color border_color = is_focused ? theme->accent : theme->window_border;
        SDL_SetRenderDrawColor(renderer, border_color.r, border_color.g, border_color.b, border_color.a);
        SDL_RenderDrawRect(renderer, &border_rect);

        // 2. Draw Title Bar (30px high)
        SDL_Rect title_rect = {win->x + 1, win->y + 1, win->w - 2, 28};
        SDL_Color title_bg = is_focused ? theme->title_bar : theme->button_bg;
        SDL_SetRenderDrawColor(renderer, title_bg.r, title_bg.g, title_bg.b, title_bg.a);
        SDL_RenderFillRect(renderer, &title_rect);

        // Title Bar Separator Line
        SDL_SetRenderDrawColor(renderer, border_color.r, border_color.g, border_color.b, border_color.a);
        SDL_RenderDrawLine(renderer, win->x, win->y + 29, win->x + win->w, win->y + 29);

        // Render Title Text
        Text::render(renderer, win->title.c_str(), win->x + 10, win->y + 6, theme->text_primary);

        // 3. Render Window Buttons (20x20px each)
        // Close Button (Rightmost)
        SDL_Rect close_btn = {win->x + win->w - 25, win->y + 5, 20, 20};
        SDL_SetRenderDrawColor(renderer, theme->error.r, theme->error.g, theme->error.b, theme->error.a);
        SDL_RenderFillRect(renderer, &close_btn);
        Text::render(renderer, "X", close_btn.x + 6, close_btn.y + 2, theme->text_primary);

        // Maximize Button
        SDL_Rect max_btn = {win->x + win->w - 50, win->y + 5, 20, 20};
        SDL_SetRenderDrawColor(renderer, theme->button_bg.r, theme->button_bg.g, theme->button_bg.b, theme->button_bg.a);
        SDL_RenderFillRect(renderer, &max_btn);
        Text::render(renderer, win->maximized ? "r" : "+", max_btn.x + 5, max_btn.y + 2, theme->text_primary);

        // Minimize Button
        SDL_Rect min_btn = {win->x + win->w - 75, win->y + 5, 20, 20};
        SDL_SetRenderDrawColor(renderer, theme->button_bg.r, theme->button_bg.g, theme->button_bg.b, theme->button_bg.a);
        SDL_RenderFillRect(renderer, &min_btn);
        Text::render(renderer, "-", min_btn.x + 6, min_btn.y + 2, theme->text_primary);

        // 4. Render Window Body/Content Area
        SDL_Rect content_rect = {win->x + 2, win->y + 30, win->w - 4, win->h - 32};
        SDL_SetRenderDrawColor(renderer, theme->window_bg.r, theme->window_bg.g, theme->window_bg.b, theme->window_bg.a);
        SDL_RenderFillRect(renderer, &content_rect);

        // Render content surface if present
        if (win->content_surface) {
            SDL_Texture* tex = SDL_CreateTextureFromSurface(renderer, win->content_surface);
            if (tex) {
                SDL_RenderCopy(renderer, tex, NULL, &content_rect);
                SDL_DestroyTexture(tex);
            }
        }

        // 5. Draw Resize Handle (bottom right corner)
        if (!win->maximized) {
            SDL_SetRenderDrawColor(renderer, theme->text_secondary.r, theme->text_secondary.g, theme->text_secondary.b, theme->text_secondary.a);
            SDL_RenderDrawLine(renderer, win->x + win->w - 12, win->y + win->h - 2, win->x + win->w - 2, win->y + win->h - 12);
            SDL_RenderDrawLine(renderer, win->x + win->w - 8, win->y + win->h - 2, win->x + win->w - 2, win->y + win->h - 8);
            SDL_RenderDrawLine(renderer, win->x + win->w - 4, win->y + win->h - 2, win->x + win->w - 2, win->y + win->h - 4);
        }
    }
}

bool WindowManager::handle_event(SDL_Event* event) {
    if (!event) return false;

    int mouse_x = 0, mouse_y = 0;
    bool is_down = false;
    bool is_up = false;
    bool is_motion = false;

    if (event->type == SDL_MOUSEBUTTONDOWN && event->button.button == SDL_BUTTON_LEFT) {
        mouse_x = event->button.x;
        mouse_y = event->button.y;
        is_down = true;
    } else if (event->type == SDL_MOUSEBUTTONUP && event->button.button == SDL_BUTTON_LEFT) {
        mouse_x = event->button.x;
        mouse_y = event->button.y;
        is_up = true;
    } else if (event->type == SDL_MOUSEMOTION) {
        mouse_x = event->motion.x;
        mouse_y = event->motion.y;
        is_motion = true;
    } else if (event->type == SDL_FINGERDOWN) {
        mouse_x = static_cast<int>(event->tfinger.x * g_screen_width);
        mouse_y = static_cast<int>(event->tfinger.y * g_screen_height);
        is_down = true;
    } else if (event->type == SDL_FINGERUP) {
        mouse_x = static_cast<int>(event->tfinger.x * g_screen_width);
        mouse_y = static_cast<int>(event->tfinger.y * g_screen_height);
        is_up = true;
    } else if (event->type == SDL_FINGERMOTION) {
        mouse_x = static_cast<int>(event->tfinger.x * g_screen_width);
        mouse_y = static_cast<int>(event->tfinger.y * g_screen_height);
        is_motion = true;
    }

    // Handle mouse / touch motion during dragging or resizing
    if (is_motion) {
        if (g_drag_window_id != -1) {
            MWindow* win = get(g_drag_window_id);
            if (win && !win->maximized) {
                win->x = mouse_x - g_drag_offset_x;
                win->y = mouse_y - g_drag_offset_y;
                return true;
            }
        }
        if (g_resize_window_id != -1) {
            MWindow* win = get(g_resize_window_id);
            if (win && !win->maximized) {
                win->w = std::max(180, g_resize_start_w + (mouse_x - g_resize_start_x));
                win->h = std::max(100, g_resize_start_h + (mouse_y - g_resize_start_y));
                return true;
            }
        }
    }

    if (is_up) {
        if (g_drag_window_id != -1 || g_resize_window_id != -1) {
            g_drag_window_id = -1;
            g_resize_window_id = -1;
            return true;
        }
    }

    if (is_down) {
        // Iterate through windows in reverse z_order (topmost first)
        std::vector<MWindow*> sorted_windows = g_windows;
        std::sort(sorted_windows.begin(), sorted_windows.end(), [](MWindow* a, MWindow* b) {
            return a->z_order > b->z_order;
        });

        for (MWindow* win : sorted_windows) {
            if (win->minimized) continue;

            // Check if click is inside window rect
            if (mouse_x >= win->x && mouse_x <= win->x + win->w &&
                mouse_y >= win->y && mouse_y <= win->y + win->h) {

                focus(win->id);

                // Title bar check (top 30px)
                if (mouse_y >= win->y && mouse_y <= win->y + 30) {
                    // Close button check
                    if (mouse_x >= win->x + win->w - 25 && mouse_x <= win->x + win->w - 5) {
                        close(win->id);
                        return true;
                    }
                    // Maximize button check
                    if (mouse_x >= win->x + win->w - 50 && mouse_x <= win->x + win->w - 30) {
                        maximize(win->id);
                        return true;
                    }
                    // Minimize button check
                    if (mouse_x >= win->x + win->w - 75 && mouse_x <= win->x + win->w - 55) {
                        minimize(win->id);
                        return true;
                    }

                    // Clicked title bar elsewhere -> start dragging
                    if (!win->maximized) {
                        g_drag_window_id = win->id;
                        g_drag_offset_x = mouse_x - win->x;
                        g_drag_offset_y = mouse_y - win->y;
                    }
                    return true;
                }

                // Resize handle check (bottom-right 15x15)
                if (!win->maximized &&
                    mouse_x >= win->x + win->w - 15 && mouse_x <= win->x + win->w &&
                    mouse_y >= win->y + win->h - 15 && mouse_y <= win->y + win->h) {
                    g_resize_window_id = win->id;
                    g_resize_start_w = win->w;
                    g_resize_start_h = win->h;
                    g_resize_start_x = mouse_x;
                    g_resize_start_y = mouse_y;
                    return true;
                }

                return true; // Click consumed by window
            }
        }
    }

    return false;
}
