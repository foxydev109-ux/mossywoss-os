#pragma once
#include <SDL2/SDL.h>
#include <SDL2/SDL_ttf.h>
#include <string>
#include <vector>

class Terminal {
public:
    Terminal();
    ~Terminal();

    void init(SDL_Renderer* renderer, TTF_Font* font);
    void render(int x, int y, int w, int h);
    void handle_event(SDL_Event* event);
    std::string execute(const char* cmd);
    void print(const char* text);

private:
    SDL_Renderer* m_renderer = nullptr;
    TTF_Font* m_font = nullptr;
    std::vector<std::string> m_lines;
    std::vector<std::string> m_history;
    int m_history_index = -1;
    std::string m_input_buf;
    std::string m_cwd = "/";
    int m_scroll_offset = 0;
    uint32_t m_last_blink_time = 0;
    bool m_cursor_visible = true;

    SDL_Color m_fg_color = {0, 255, 0, 255};
    SDL_Color m_bg_color = {0, 0, 0, 255};
    SDL_Color m_prompt_color = {0, 200, 255, 255};

    void append_line(const std::string& line);
    void render_text(const std::string& text, int x, int y, SDL_Color color);
    std::string resolve_path(const std::string& path) const;
};
