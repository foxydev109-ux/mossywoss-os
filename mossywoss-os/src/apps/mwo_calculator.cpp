#include "mwo_calculator.h"
#include <iostream>
#include <sstream>
#include <cmath>
#include <stack>
#include <queue>
#include <cctype>
#include <iomanip>

Calculator::Calculator() {}

Calculator::~Calculator() {}

void Calculator::init(SDL_Renderer* renderer, TTF_Font* font) {
    m_renderer = renderer;
    m_font = font;
    m_display_text = "0";
    m_expression = "";
    m_evaluated = false;
}

void Calculator::setup_buttons(int x, int y, int w, int h) {
    if (m_last_x == x && m_last_y == y && m_last_w == w && m_last_h == h && !m_buttons.empty()) {
        return;
    }

    m_last_x = x;
    m_last_y = y;
    m_last_w = w;
    m_last_h = h;
    m_buttons.clear();

    int margin = 10;
    int display_height = 80;
    int grid_y = y + margin + display_height + margin;
    int grid_w = w - (margin * 2);
    int grid_h = h - (display_height + margin * 3);

    int cols = 4;
    int rows = 5;
    int gap = 6;

    int btn_w = (grid_w - (gap * (cols - 1))) / cols;
    int btn_h = (grid_h - (gap * (rows - 1))) / rows;

    struct BtnDef {
        std::string label;
        std::string action;
        SDL_Color color;
        bool is_op;
    };

    SDL_Color color_digit = {45, 48, 56, 255};
    SDL_Color color_op = {230, 126, 34, 255};
    SDL_Color color_special = {60, 64, 72, 255};
    SDL_Color color_equals = {46, 204, 113, 255};

    BtnDef grid[5][4] = {
        { {"C", "C", color_special, false}, {"(", "(", color_special, true}, {")", ")", color_special, true}, {"/", "/", color_op, true} },
        { {"7", "7", color_digit, false},   {"8", "8", color_digit, false},   {"9", "9", color_digit, false},   {"*", "*", color_op, true} },
        { {"4", "4", color_digit, false},   {"5", "5", color_digit, false},   {"6", "6", color_digit, false},   {"-", "-", color_op, true} },
        { {"1", "1", color_digit, false},   {"2", "2", color_digit, false},   {"3", "3", color_digit, false},   {"+", "+", color_op, true} },
        { {"0", "0", color_digit, false},   {".", ".", color_digit, false},   {"+/-", "+/-", color_special, false}, {"=", "=", color_equals, true} }
    };

    for (int r = 0; r < rows; ++r) {
        for (int c = 0; c < cols; ++c) {
            CalcButton btn;
            btn.label = grid[r][c].label;
            btn.action = grid[r][c].action;
            btn.bg_color = grid[r][c].color;
            btn.is_operator = grid[r][c].is_op;
            btn.rect.x = x + margin + c * (btn_w + gap);
            btn.rect.y = grid_y + r * (btn_h + gap);
            btn.rect.w = btn_w;
            btn.rect.h = btn_h;
            m_buttons.push_back(btn);
        }
    }
}

void Calculator::render(int x, int y, int w, int h) {
    if (!m_renderer) return;

    setup_buttons(x, y, w, h);

    // Background fill
    SDL_SetRenderDrawColor(m_renderer, 28, 30, 36, 255);
    SDL_Rect app_rect = {x, y, w, h};
    SDL_RenderFillRect(m_renderer, &app_rect);

    // Top Display area
    int margin = 10;
    int display_height = 80;
    SDL_Rect display_rect = {x + margin, y + margin, w - (margin * 2), display_height};

    SDL_SetRenderDrawColor(m_renderer, 18, 20, 24, 255);
    SDL_RenderFillRect(m_renderer, &display_rect);
    SDL_SetRenderDrawColor(m_renderer, 50, 54, 62, 255);
    SDL_RenderDrawRect(m_renderer, &display_rect);

    // Render expression history text at top of display
    SDL_Color expr_color = {160, 160, 170, 255};
    if (!m_expression.empty()) {
        render_text(m_expression, display_rect.x + display_rect.w - 12, display_rect.y + 8, expr_color, true);
    }

    // Render current input/result text in display
    SDL_Color text_color = {255, 255, 255, 255};
    render_text(m_display_text, display_rect.x + display_rect.w - 12, display_rect.y + 40, text_color, true);

    // Render button grid
    for (const auto& btn : m_buttons) {
        SDL_SetRenderDrawColor(m_renderer, btn.bg_color.r, btn.bg_color.g, btn.bg_color.b, btn.bg_color.a);
        SDL_RenderFillRect(m_renderer, &btn.rect);

        // Border around button
        SDL_SetRenderDrawColor(m_renderer, btn.bg_color.r / 2, btn.bg_color.g / 2, btn.bg_color.b / 2, 255);
        SDL_RenderDrawRect(m_renderer, &btn.rect);

        // Button label
        SDL_Color btn_text_color = {255, 255, 255, 255};
        render_text_centered(btn.label, btn.rect, btn_text_color);
    }
}

void Calculator::handle_event(SDL_Event* event) {
    if (!event) return;

    if (event->type == SDL_MOUSEBUTTONDOWN && event->button.button == SDL_BUTTON_LEFT) {
        int mx = event->button.x;
        int my = event->button.y;

        for (const auto& btn : m_buttons) {
            if (mx >= btn.rect.x && mx < btn.rect.x + btn.rect.w &&
                my >= btn.rect.y && my < btn.rect.y + btn.rect.h) {
                process_input(btn.action);
                break;
            }
        }
    } else if (event->type == SDL_KEYDOWN) {
        SDL_Keycode sym = event->key.keysym.sym;
        if (sym >= SDLK_0 && sym <= SDLK_9) {
            std::string digit(1, (char)('0' + (sym - SDLK_0)));
            process_input(digit);
        } else if (sym == SDLK_PERIOD) {
            process_input(".");
        } else if (sym == SDLK_PLUS) {
            process_input("+");
        } else if (sym == SDLK_MINUS) {
            process_input("-");
        } else if (sym == SDLK_ASTERISK) {
            process_input("*");
        } else if (sym == SDLK_SLASH) {
            process_input("/");
        } else if (sym == SDLK_LEFTPAREN) {
            process_input("(");
        } else if (sym == SDLK_RIGHTPAREN) {
            process_input(")");
        } else if (sym == SDLK_RETURN || sym == SDLK_EQUALS) {
            process_input("=");
        } else if (sym == SDLK_ESCAPE || sym == SDLK_c) {
            process_input("C");
        } else if (sym == SDLK_BACKSPACE) {
            backspace();
        }
    }
}

void Calculator::process_input(const std::string& token) {
    if (token == "C") {
        clear();
        return;
    }

    if (token == "+/-") {
        toggle_sign();
        return;
    }

    if (token == "=") {
        calculate_result();
        return;
    }

    if (m_evaluated) {
        if (token == "+" || token == "-" || token == "*" || token == "/") {
            m_expression = m_display_text;
            m_display_text += token;
        } else {
            m_display_text = token;
            m_expression = "";
        }
        m_evaluated = false;
        return;
    }

    if (m_display_text == "0" && (isdigit(token[0]) || token == "(")) {
        m_display_text = token;
    } else {
        m_display_text += token;
    }
}

void Calculator::clear() {
    m_display_text = "0";
    m_expression = "";
    m_evaluated = false;
}

void Calculator::backspace() {
    if (m_evaluated) {
        clear();
        return;
    }
    if (m_display_text.length() > 1) {
        m_display_text.pop_back();
    } else {
        m_display_text = "0";
    }
}

void Calculator::toggle_sign() {
    if (m_display_text == "0" || m_display_text == "Error") return;

    if (!m_display_text.empty() && m_display_text[0] == '-') {
        m_display_text.erase(0, 1);
    } else {
        m_display_text = "-" + m_display_text;
    }
}

void Calculator::calculate_result() {
    if (m_display_text.empty() || m_display_text == "Error") return;

    m_expression = m_display_text;
    bool success = false;
    double val = evaluate_expression(m_expression, success);

    if (!success) {
        m_display_text = "Error";
    } else {
        std::ostringstream ss;
        if (std::abs(val - std::round(val)) < 1e-9) {
            ss << (long long)std::round(val);
        } else {
            ss << std::setprecision(8) << val;
        }
        m_display_text = ss.str();
    }
    m_evaluated = true;
}

// Real Shunting Yard Algorithm Implementation for operator precedence
double Calculator::evaluate_expression(const std::string& expr, bool& success) {
    struct Token {
        enum Type { NUMBER, OPERATOR, PAREN_LEFT, PAREN_RIGHT, UNARY_MINUS } type;
        double value;
        char op;
        int precedence;
    };

    std::vector<Token> tokens;
    size_t i = 0;
    bool expect_operand = true;

    while (i < expr.length()) {
        char c = expr[i];

        if (isspace(c)) {
            i++;
            continue;
        }

        if (isdigit(c) || c == '.') {
            size_t end_idx = i;
            while (end_idx < expr.length() && (isdigit(expr[end_idx]) || expr[end_idx] == '.')) {
                end_idx++;
            }
            std::string num_str = expr.substr(i, end_idx - i);
            try {
                double val = std::stod(num_str);
                tokens.push_back({Token::NUMBER, val, '\0', 0});
            } catch (...) {
                success = false;
                return 0.0;
            }
            i = end_idx;
            expect_operand = false;
            continue;
        }

        if (c == '-' && expect_operand) {
            tokens.push_back({Token::UNARY_MINUS, 0.0, '~', 3});
            i++;
            expect_operand = true;
            continue;
        }

        if (c == '+' || c == '-' || c == '*' || c == '/') {
            int prec = (c == '*' || c == '/') ? 2 : 1;
            tokens.push_back({Token::OPERATOR, 0.0, c, prec});
            i++;
            expect_operand = true;
            continue;
        }

        if (c == '(') {
            tokens.push_back({Token::PAREN_LEFT, 0.0, '(', 0});
            i++;
            expect_operand = true;
            continue;
        }

        if (c == ')') {
            tokens.push_back({Token::PAREN_RIGHT, 0.0, ')', 0});
            i++;
            expect_operand = false;
            continue;
        }

        i++;
    }

    // Shunting Yard -> Output RPN Queue
    std::queue<Token> output_queue;
    std::stack<Token> op_stack;

    for (const auto& tok : tokens) {
        if (tok.type == Token::NUMBER) {
            output_queue.push(tok);
        } else if (tok.type == Token::UNARY_MINUS || tok.type == Token::OPERATOR) {
            while (!op_stack.empty() &&
                   (op_stack.top().type == Token::OPERATOR || op_stack.top().type == Token::UNARY_MINUS) &&
                   op_stack.top().precedence >= tok.precedence) {
                output_queue.push(op_stack.top());
                op_stack.pop();
            }
            op_stack.push(tok);
        } else if (tok.type == Token::PAREN_LEFT) {
            op_stack.push(tok);
        } else if (tok.type == Token::PAREN_RIGHT) {
            bool found_left = false;
            while (!op_stack.empty()) {
                if (op_stack.top().type == Token::PAREN_LEFT) {
                    found_left = true;
                    op_stack.pop();
                    break;
                }
                output_queue.push(op_stack.top());
                op_stack.pop();
            }
            if (!found_left) {
                success = false;
                return 0.0;
            }
        }
    }

    while (!op_stack.empty()) {
        if (op_stack.top().type == Token::PAREN_LEFT || op_stack.top().type == Token::PAREN_RIGHT) {
            success = false;
            return 0.0;
        }
        output_queue.push(op_stack.top());
        op_stack.pop();
    }

    // Evaluate RPN
    std::stack<double> eval_stack;
    while (!output_queue.empty()) {
        Token tok = output_queue.front();
        output_queue.pop();

        if (tok.type == Token::NUMBER) {
            eval_stack.push(tok.value);
        } else if (tok.type == Token::UNARY_MINUS) {
            if (eval_stack.empty()) {
                success = false;
                return 0.0;
            }
            double a = eval_stack.top();
            eval_stack.pop();
            eval_stack.push(-a);
        } else if (tok.type == Token::OPERATOR) {
            if (eval_stack.size() < 2) {
                success = false;
                return 0.0;
            }
            double b = eval_stack.top(); eval_stack.pop();
            double a = eval_stack.top(); eval_stack.pop();

            if (tok.op == '+') eval_stack.push(a + b);
            else if (tok.op == '-') eval_stack.push(a - b);
            else if (tok.op == '*') eval_stack.push(a * b);
            else if (tok.op == '/') {
                if (std::abs(b) < 1e-12) {
                    success = false;
                    return 0.0;
                }
                eval_stack.push(a / b);
            }
        }
    }

    if (eval_stack.size() != 1) {
        success = false;
        return 0.0;
    }

    success = true;
    return eval_stack.top();
}

void Calculator::render_text(const std::string& text, int x, int y, SDL_Color color, bool right_align) {
    if (!m_renderer || !m_font || text.empty()) return;

    SDL_Surface* surf = TTF_RenderText_Blended(m_font, text.c_str(), color);
    if (!surf) return;

    SDL_Texture* tex = SDL_CreateTextureFromSurface(m_renderer, surf);
    if (tex) {
        int render_x = right_align ? (x - surf->w) : x;
        SDL_Rect dst = {render_x, y, surf->w, surf->h};
        SDL_RenderCopy(m_renderer, tex, nullptr, &dst);
        SDL_DestroyTexture(tex);
    }
    SDL_FreeSurface(surf);
}

void Calculator::render_text_centered(const std::string& text, SDL_Rect rect, SDL_Color color) {
    if (!m_renderer || !m_font || text.empty()) return;

    SDL_Surface* surf = TTF_RenderText_Blended(m_font, text.c_str(), color);
    if (!surf) return;

    SDL_Texture* tex = SDL_CreateTextureFromSurface(m_renderer, surf);
    if (tex) {
        SDL_Rect dst = {
            rect.x + (rect.w - surf->w) / 2,
            rect.y + (rect.h - surf->h) / 2,
            surf->w,
            surf->h
        };
        SDL_RenderCopy(m_renderer, tex, nullptr, &dst);
        SDL_DestroyTexture(tex);
    }
    SDL_FreeSurface(surf);
}
