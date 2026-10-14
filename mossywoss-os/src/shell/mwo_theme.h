#pragma once

#include <SDL2/SDL.h>

struct Theme {
    char name[32];
    SDL_Color desktop_bg;
    SDL_Color taskbar_bg;
    SDL_Color window_bg;
    SDL_Color window_border;
    SDL_Color title_bar;
    SDL_Color button_bg;
    SDL_Color button_hover;
    SDL_Color button_pressed;
    SDL_Color text_primary;
    SDL_Color text_secondary;
    SDL_Color accent;
    SDL_Color selection;
    SDL_Color success;
    SDL_Color warning;
    SDL_Color error;
    SDL_Color input_bg;
    SDL_Color input_border;
};

void theme_init();
Theme* theme_get(const char* name);
void theme_apply(Theme* t);
Theme* theme_current();
void theme_list(char*** names, int* count);
void theme_save(const char* name);
const char* theme_get_current_name();
