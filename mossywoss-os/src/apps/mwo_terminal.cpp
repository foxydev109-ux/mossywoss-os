#include "mwo_terminal.h"
#include "../core/mwo_fs.h"
#include "../core/mwo_config.h"
#include <sstream>
#include <iomanip>
#include <ctime>
#include <cstring>
#include <algorithm>
#include <cstdlib>

Terminal::Terminal() {
    m_lines.reserve(1000);
}

Terminal::~Terminal() {
}

void Terminal::init(SDL_Renderer* renderer, TTF_Font* font) {
    m_renderer = renderer;
    m_font = font;
    m_lines.clear();
    m_history.clear();
    m_input_buf.clear();
    m_cwd = "/";
    m_scroll_offset = 0;
    m_last_blink_time = SDL_GetTicks();
    m_cursor_visible = true;

    print("MossyWoss OS Terminal v1.0.0");
    print("Type 'help' for available commands.\n");
}

std::string Terminal::resolve_path(const std::string& path) const {
    if (path.empty()) return m_cwd;
    if (path[0] == '/') return path;
    
    std::string res = m_cwd;
    if (res.back() != '/') res += "/";
    res += path;

    // Normalize path
    std::vector<std::string> parts;
    std::stringstream ss(res);
    std::string item;
    while (std::getline(ss, item, '/')) {
        if (item.empty() || item == ".") continue;
        if (item == "..") {
            if (!parts.empty()) parts.pop_back();
        } else {
            parts.push_back(item);
        }
    }
    std::string normalized = "/";
    for (size_t i = 0; i < parts.size(); ++i) {
        normalized += parts[i];
        if (i + 1 < parts.size()) normalized += "/";
    }
    return normalized;
}

void Terminal::append_line(const std::string& line) {
    std::stringstream ss(line);
    std::string item;
    while (std::getline(ss, item, '\n')) {
        m_lines.push_back(item);
        if (m_lines.size() > 1000) {
            m_lines.erase(m_lines.begin());
        }
    }
}

void Terminal::print(const char* text) {
    if (!text) return;
    append_line(std::string(text));
}

std::string Terminal::execute(const char* cmd_str) {
    if (!cmd_str) return "";
    std::string raw(cmd_str);
    size_t start = raw.find_first_not_of(" \t\r\n");
    if (start == std::string::npos) return "";
    size_t end = raw.find_last_not_of(" \t\r\n");
    std::string trimmed = raw.substr(start, end - start + 1);

    std::stringstream ss(trimmed);
    std::string cmd;
    ss >> cmd;

    std::vector<std::string> args;
    std::string arg;
    while (ss >> arg) {
        args.push_back(arg);
    }

    if (cmd == "help") {
        return "Available commands:\n"
               "  ls [path]       - List directory contents\n"
               "  cd <path>       - Change directory\n"
               "  pwd             - Print working directory\n"
               "  mkdir <name>    - Create directory\n"
               "  touch <name>    - Create empty file\n"
               "  cat <file>      - Output file contents\n"
               "  echo <text>     - Print text\n"
               "  rm <path>       - Remove file or directory\n"
               "  mv <old> <new>  - Move / rename file\n"
               "  cp <src> <dst>  - Copy file\n"
               "  clear           - Clear screen output\n"
               "  whoami          - Show current user\n"
               "  date            - Show system date & time\n"
               "  theme <name>    - Set theme (green, amber, matrix, light, dark)\n"
               "  apps            - List installed applications\n"
               "  sysinfo         - Display system info\n"
               "  help            - Display this help message";
    } else if (cmd == "clear") {
        m_lines.clear();
        m_scroll_offset = 0;
        return "";
    } else if (cmd == "pwd") {
        return m_cwd;
    } else if (cmd == "whoami") {
        const char* u = mwo_config_get("username", "mossy_user");
        return u ? std::string(u) : "mossy_user";
    } else if (cmd == "date") {
        std::time_t t = std::time(nullptr);
        char buf[100];
        std::strftime(buf, sizeof(buf), "%c", std::localtime(&t));
        return std::string(buf);
    } else if (cmd == "ls") {
        std::string target = args.empty() ? m_cwd : resolve_path(args[0]);
        mwo_fs_entry_t* entries = nullptr;
        int count = 0;
        if (mwo_fs_list(target.c_str(), &entries, &count) == 0 && entries) {
            std::ostringstream out;
            for (int i = 0; i < count; ++i) {
                if (entries[i].is_dir) {
                    out << "[DIR]  " << entries[i].name << "/\n";
                } else {
                    out << "[FILE] " << entries[i].name << " (" << entries[i].size << " bytes)\n";
                }
            }
            mwo_fs_free_entries(entries, count);
            return out.str();
        } else {
            return "ls: failed to list directory " + target;
        }
    } else if (cmd == "cd") {
        if (args.empty()) {
            m_cwd = "/";
            return "";
        }
        std::string target = resolve_path(args[0]);
        if (mwo_fs_exists(target.c_str()) && mwo_fs_is_dir(target.c_str())) {
            m_cwd = target;
            return "";
        } else {
            return "cd: " + args[0] + ": No such directory";
        }
    } else if (cmd == "mkdir") {
        if (args.empty()) return "usage: mkdir <name>";
        std::string target = resolve_path(args[0]);
        if (mwo_fs_mkdir(target.c_str()) == 0) return "Created directory: " + target;
        return "mkdir: failed to create directory " + args[0];
    } else if (cmd == "touch") {
        if (args.empty()) return "usage: touch <name>";
        std::string target = resolve_path(args[0]);
        if (mwo_fs_touch(target.c_str()) == 0) return "Created file: " + target;
        return "touch: failed to create file " + args[0];
    } else if (cmd == "cat") {
        if (args.empty()) return "usage: cat <file>";
        std::string target = resolve_path(args[0]);
        char* content = mwo_fs_read(target.c_str());
        if (content) {
            std::string res(content);
            free(content);
            return res;
        }
        return "cat: " + args[0] + ": No such file or cannot read";
    } else if (cmd == "echo") {
        std::ostringstream out;
        for (size_t i = 0; i < args.size(); ++i) {
            out << args[i] << (i + 1 < args.size() ? " " : "");
        }
        return out.str();
    } else if (cmd == "rm") {
        if (args.empty()) return "usage: rm <path>";
        std::string target = resolve_path(args[0]);
        if (mwo_fs_rm(target.c_str()) == 0) return "Removed: " + target;
        return "rm: failed to remove " + args[0];
    } else if (cmd == "mv") {
        if (args.size() < 2) return "usage: mv <old> <new>";
        std::string src = resolve_path(args[0]);
        std::string dst = resolve_path(args[1]);
        if (mwo_fs_mv(src.c_str(), dst.c_str()) == 0) return "Moved " + src + " -> " + dst;
        return "mv: failed to move " + args[0];
    } else if (cmd == "cp") {
        if (args.size() < 2) return "usage: cp <src> <dst>";
        std::string src = resolve_path(args[0]);
        std::string dst = resolve_path(args[1]);
        if (mwo_fs_cp(src.c_str(), dst.c_str()) == 0) return "Copied " + src + " -> " + dst;
        return "cp: failed to copy " + args[0];
    } else if (cmd == "theme") {
        if (args.empty()) return "usage: theme <green|amber|matrix|light|dark>";
        std::string t = args[0];
        if (t == "green" || t == "matrix") {
            m_fg_color = {0, 255, 0, 255};
            m_bg_color = {0, 0, 0, 255};
        } else if (t == "amber") {
            m_fg_color = {255, 176, 0, 255};
            m_bg_color = {20, 10, 0, 255};
        } else if (t == "light") {
            m_fg_color = {20, 20, 20, 255};
            m_bg_color = {240, 240, 240, 255};
        } else if (t == "dark") {
            m_fg_color = {220, 220, 220, 255};
            m_bg_color = {30, 30, 30, 255};
        } else {
            return "Unknown theme. Available: green, amber, matrix, light, dark";
        }
        mwo_config_set("theme", t.c_str());
        return "Theme set to " + t;
    } else if (cmd == "apps") {
        return "MossyWoss OS Applications:\n"
               "  - Terminal (mwo_terminal)\n"
               "  - Files UI (mwo_files_ui)\n"
               "  - Calculator (mwo_calculator)\n"
               "  - Paint (mwo_paint)\n"
               "  - Notes (mwo_notes)\n"
               "  - Task Manager (mwo_taskmgr)\n"
               "  - Settings UI (mwo_settings_ui)\n"
               "  - About (mwo_about)";
    } else if (cmd == "sysinfo") {
        SDL_version ver;
        SDL_GetVersion(&ver);
        std::ostringstream out;
        out << "MossyWoss OS 1.0.0-release\n"
            << "Kernel: MW-Kernel v1.0 x86_64\n"
            << "Platform: " << SDL_GetPlatform() << "\n"
            << "CPU Cores: " << SDL_GetCPUCount() << "\n"
            << "System RAM: " << SDL_GetSystemRAM() << " MB\n"
            << "SDL Version: " << (int)ver.major << "." << (int)ver.minor << "." << (int)ver.patch;
        return out.str();
    } else {
        return "Command not found: " + cmd + ". Type 'help' for available commands.";
    }
}

void Terminal::handle_event(SDL_Event* event) {
    if (!event) return;

    if (event->type == SDL_TEXTINPUT) {
        m_input_buf += event->text.text;
    } else if (event->type == SDL_KEYDOWN) {
        if (event->key.keysym.sym == SDLK_RETURN) {
            std::string prompt = "mossy:" + m_cwd + "$ " + m_input_buf;
            print(prompt.c_str());
            if (!m_input_buf.empty()) {
                m_history.push_back(m_input_buf);
                m_history_index = (int)m_history.size();
                std::string res = execute(m_input_buf.c_str());
                if (!res.empty()) {
                    print(res.c_str());
                }
                m_input_buf.clear();
            }
        } else if (event->key.keysym.sym == SDLK_BACKSPACE) {
            if (!m_input_buf.empty()) {
                m_input_buf.pop_back();
            }
        } else if (event->key.keysym.sym == SDLK_UP) {
            if (!m_history.empty() && m_history_index > 0) {
                m_history_index--;
                m_input_buf = m_history[m_history_index];
            }
        } else if (event->key.keysym.sym == SDLK_DOWN) {
            if (!m_history.empty() && m_history_index < (int)m_history.size() - 1) {
                m_history_index++;
                m_input_buf = m_history[m_history_index];
            } else if (m_history_index == (int)m_history.size() - 1) {
                m_history_index = (int)m_history.size();
                m_input_buf.clear();
            }
        }
    }
}

void Terminal::render_text(const std::string& text, int x, int y, SDL_Color color) {
    if (!m_renderer || !m_font || text.empty()) return;
    SDL_Surface* surf = TTF_RenderText_Blended(m_font, text.c_str(), color);
    if (!surf) return;
    SDL_Texture* tex = SDL_CreateTextureFromSurface(m_renderer, surf);
    if (tex) {
        SDL_Rect dst = {x, y, surf->w, surf->h};
        SDL_RenderCopy(m_renderer, tex, nullptr, &dst);
        SDL_DestroyTexture(tex);
    }
    SDL_FreeSurface(surf);
}

void Terminal::render(int x, int y, int w, int h) {
    if (!m_renderer) return;

    // Background
    SDL_SetRenderDrawColor(m_renderer, m_bg_color.r, m_bg_color.g, m_bg_color.b, m_bg_color.a);
    SDL_Rect bg_rect = {x, y, w, h};
    SDL_RenderFillRect(m_renderer, &bg_rect);

    int font_h = 16;
    if (m_font) {
        TTF_SizeText(m_font, "A", nullptr, &font_h);
    }
    if (font_h <= 0) font_h = 16;

    int visible_lines = (h - 24) / font_h;
    if (visible_lines < 1) visible_lines = 1;

    int total_lines = (int)m_lines.size();
    int start_line = total_lines - visible_lines - m_scroll_offset;
    if (start_line < 0) start_line = 0;

    int cur_y = y + 4;
    for (int i = start_line; i < total_lines && cur_y < y + h - font_h - 20; ++i) {
        render_text(m_lines[i], x + 8, cur_y, m_fg_color);
        cur_y += font_h;
    }

    // Input line
    std::string prompt = "mossy:" + m_cwd + "$ ";
    render_text(prompt, x + 8, y + h - font_h - 4, m_prompt_color);

    int prompt_w = 0;
    if (m_font) {
        TTF_SizeText(m_font, prompt.c_str(), &prompt_w, nullptr);
    }
    render_text(m_input_buf, x + 8 + prompt_w, y + h - font_h - 4, m_fg_color);

    // Blinking cursor
    uint32_t now = SDL_GetTicks();
    if (now - m_last_blink_time > 500) {
        m_cursor_visible = !m_cursor_visible;
        m_last_blink_time = now;
    }

    if (m_cursor_visible) {
        int input_w = 0;
        if (m_font && !m_input_buf.empty()) {
            TTF_SizeText(m_font, m_input_buf.c_str(), &input_w, nullptr);
        }
        SDL_Rect cursor_rect = {x + 8 + prompt_w + input_w + 2, y + h - font_h - 2, 8, font_h};
        SDL_SetRenderDrawColor(m_renderer, m_fg_color.r, m_fg_color.g, m_fg_color.b, m_fg_color.a);
        SDL_RenderFillRect(m_renderer, &cursor_rect);
    }
}
