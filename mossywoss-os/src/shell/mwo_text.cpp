#include "mwo_text.h"
#include <iostream>
#include <string>
#include <unordered_map>
#include <cstring>

static bool g_ttf_initialized = false;
static std::string g_font_path = "";
static int g_current_size = 14;
static std::unordered_map<int, TTF_Font*> g_font_cache;

static TTF_Font* get_or_load_font(int size) {
    if (!g_ttf_initialized) {
        if (TTF_Init() == -1) {
            std::cerr << "TTF_Init failed: " << TTF_GetError() << std::endl;
            return NULL;
        }
        g_ttf_initialized = true;
    }

    auto it = g_font_cache.find(size);
    if (it != g_font_cache.end() && it->second) {
        return it->second;
    }

    if (g_font_path.empty()) {
        return NULL;
    }

    TTF_Font* font = TTF_OpenFont(g_font_path.c_str(), size);
    if (font) {
        g_font_cache[size] = font;
    }
    return font;
}

bool Text::init(const char* font_path, int size) {
    if (font_path) {
        g_font_path = font_path;
    }
    g_current_size = size;

    if (!g_ttf_initialized) {
        if (TTF_Init() == -1) {
            return false;
        }
        g_ttf_initialized = true;
    }

    if (!g_font_path.empty()) {
        get_or_load_font(size);
    }
    return true;
}

void Text::set_size(int size) {
    g_current_size = size;
}

void Text::render(SDL_Renderer* renderer, const char* text, int x, int y, SDL_Color color) {
    if (!renderer || !text || text[0] == '\0') return;

    TTF_Font* font = get_or_load_font(g_current_size);
    if (!font) {
        // Fallback simple line rendering if font fails to load
        int len = static_cast<int>(std::strlen(text));
        SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a);
        SDL_Rect fallback = {x, y, len * 8, g_current_size};
        SDL_RenderDrawRect(renderer, &fallback);
        return;
    }

    SDL_Surface* surface = TTF_RenderText_Blended(font, text, color);
    if (!surface) return;

    SDL_Texture* texture = SDL_CreateTextureFromSurface(renderer, surface);
    if (texture) {
        SDL_Rect dst_rect = {x, y, surface->w, surface->h};
        SDL_RenderCopy(renderer, texture, NULL, &dst_rect);
        SDL_DestroyTexture(texture);
    }
    SDL_FreeSurface(surface);
}

void Text::render_wrapped(SDL_Renderer* renderer, const char* text, int x, int y, int max_w, SDL_Color color) {
    if (!renderer || !text || text[0] == '\0') return;

    TTF_Font* font = get_or_load_font(g_current_size);
    if (!font) {
        int len = static_cast<int>(std::strlen(text));
        SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a);
        SDL_Rect fallback = {x, y, std::min(len * 8, max_w), g_current_size * 2};
        SDL_RenderDrawRect(renderer, &fallback);
        return;
    }

    SDL_Surface* surface = TTF_RenderText_Blended_Wrapped(font, text, color, static_cast<uint32_t>(max_w));
    if (!surface) return;

    SDL_Texture* texture = SDL_CreateTextureFromSurface(renderer, surface);
    if (texture) {
        SDL_Rect dst_rect = {x, y, surface->w, surface->h};
        SDL_RenderCopy(renderer, texture, NULL, &dst_rect);
        SDL_DestroyTexture(texture);
    }
    SDL_FreeSurface(surface);
}

void Text::measure(const char* text, int* w, int* h) {
    if (w) *w = 0;
    if (h) *h = 0;
    if (!text) return;

    TTF_Font* font = get_or_load_font(g_current_size);
    if (!font) {
        if (w) *w = static_cast<int>(std::strlen(text)) * 8;
        if (h) *h = g_current_size;
        return;
    }

    TTF_SizeText(font, text, w, h);
}

void Text::cleanup() {
    for (auto& pair : g_font_cache) {
        if (pair.second) {
            TTF_CloseFont(pair.second);
        }
    }
    g_font_cache.clear();

    if (g_ttf_initialized) {
        TTF_Quit();
        g_ttf_initialized = false;
    }
}
