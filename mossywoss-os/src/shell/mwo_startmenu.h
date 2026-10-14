#pragma once

#include <SDL2/SDL.h>
#include <string>
#include <vector>

struct MWOApp {
    char app_id[64];
    char name[64];
    char category[32];
    SDL_Surface* icon_surface;
    SDL_Texture* icon_texture;
};

class StartMenu {
public:
    static void init(SDL_Renderer* renderer);
    static void toggle();
    static bool is_open();
    static void render();
    static bool handle_event(SDL_Event* event);
    static void set_apps(MWOApp* apps, int count);
    static void add_app(const MWOApp& app);
    static void set_screen_bounds(int screen_w, int screen_h);
};
