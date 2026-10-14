#pragma once

#include <SDL2/SDL.h>
#include <string>
#include <vector>

struct TaskbarApp {
    std::string title;
    int window_id;
    bool active;
};

class Taskbar {
public:
    static void init(SDL_Renderer* renderer, int screen_w, int y);
    static void render();
    static bool handle_event(SDL_Event* event);
    static void add_app(const char* title, int window_id);
    static void remove_app(int window_id);
    static void update_active(int window_id);
    static void update_clock();
    static bool is_start_button_clicked(int x, int y);
};
