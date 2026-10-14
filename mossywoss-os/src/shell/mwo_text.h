#pragma once

#include <SDL2/SDL.h>
#include <SDL2/SDL_ttf.h>

class Text {
public:
    static bool init(const char* font_path, int size);
    static void render(SDL_Renderer* renderer, const char* text, int x, int y, SDL_Color color);
    static void render_wrapped(SDL_Renderer* renderer, const char* text, int x, int y, int max_w, SDL_Color color);
    static void measure(const char* text, int* w, int* h);
    static void set_size(int size);
    static void cleanup();
};
