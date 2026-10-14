#pragma once

/**
 * mwo_desktop.h — MossyWoss OS Desktop Shell header
 * Renders desktop background, icons, and routes events.
 */

#include <SDL2/SDL.h>
#include <SDL2/SDL_ttf.h>

#define MAX_DESKTOP_ICONS 32

struct ThemeColors;

typedef struct {
    char app_id[64];
    char label[64];
    SDL_Rect rect;
} DesktopIcon;

class Desktop {
private:
    SDL_Renderer* renderer_;
    TTF_Font* font_;
    int screen_w_;
    int screen_h_;
    SDL_Color bg_color_;
    DesktopIcon icons_[MAX_DESKTOP_ICONS];
    int icon_count_;
    void* window_mgr_;
    void* taskbar_;
    void* start_menu_;
    ThemeColors* theme_;
    void* text_render_;
    void (*icon_callback_)(const char*);

public:
    Desktop();
    ~Desktop();

    void init(SDL_Renderer* r, int w, int h);
    void render(SDL_Renderer* renderer);
    void handle_event(SDL_Event* e);
    void add_app_icon(const char* app_id, const char* label);
    void set_wallpaper(Uint8 r, Uint8 g, Uint8 b);
    void set_theme(ThemeColors* t);
    void handle_resize(int w, int h);
    void set_icon_callback(void (*cb)(const char*));
};
