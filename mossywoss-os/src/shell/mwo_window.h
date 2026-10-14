#pragma once

#include <SDL2/SDL.h>
#include <string>
#include <vector>

struct MWindow {
    int id;
    std::string title;
    int x;
    int y;
    int w;
    int h;
    int z_order;
    bool minimized;
    bool maximized;
    SDL_Rect prev_rect;
    std::string app_id;
    SDL_Surface* content_surface;
    bool needs_redraw;
};

class WindowManager {
public:
    static int create(const char* title, int x, int y, int w, int h, const char* app_id);
    static void close(int id);
    static void minimize(int id);
    static void maximize(int id);
    static void focus(int id);
    static MWindow* get(int id);
    static std::vector<MWindow*> list();
    static void render(SDL_Renderer* renderer);
    static bool handle_event(SDL_Event* event);
    static void set_screen_bounds(int w, int h);
};
