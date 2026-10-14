#pragma once

#include <SDL2/SDL.h>
#include <SDL2/SDL_ttf.h>
#include <string>
#include <vector>

struct CalcButton {
    std::string label;
    std::string action;
    SDL_Rect rect;
    SDL_Color bg_color;
    bool is_operator;
};

class Calculator {
public:
    Calculator();
    ~Calculator();

    void init(SDL_Renderer* renderer, TTF_Font* font);
    void render(int x, int y, int w, int h);
    void handle_event(SDL_Event* event);

    double evaluate_expression(const std::string& expr, bool& success);

private:
    SDL_Renderer* m_renderer = nullptr;
    TTF_Font* m_font = nullptr;

    std::string m_display_text = "0";
    std::string m_expression = "";
    bool m_evaluated = false;

    std::vector<CalcButton> m_buttons;
    int m_last_x = 0;
    int m_last_y = 0;
    int m_last_w = 0;
    int m_last_h = 0;

    void setup_buttons(int x, int y, int w, int h);
    void process_input(const std::string& token);
    void clear();
    void backspace();
    void toggle_sign();
    void calculate_result();
    void render_text(const std::string& text, int x, int y, SDL_Color color, bool right_align = false);
    void render_text_centered(const std::string& text, SDL_Rect rect, SDL_Color color);
};
