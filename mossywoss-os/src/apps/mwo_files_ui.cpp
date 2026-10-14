#include "mwo_files_ui.h"
#include "../core/mwo_fs.h"
#include <algorithm>
#include <sstream>
#include <iomanip>
#include <ctime>
#include <cstring>

static const std::vector<std::string> SIDEBAR_SHORTCUTS = {
    "Desktop", "Documents", "Downloads", "Pictures",
    "Music", "Videos", "Games", "WebApps", "AppData"
};

FilesUI::FilesUI() {
}

FilesUI::~FilesUI() {
}

void FilesUI::init(SDL_Renderer* renderer, TTF_Font* font) {
    m_renderer = renderer;
    m_font = font;
    m_current_path = "/";
    m_selected_index = -1;
    m_show_context_menu = false;
    m_show_dialog = false;
    m_clipboard_path.clear();
    refresh();
}

void FilesUI::navigate(const char* path) {
    if (!path) return;
    m_current_path = path;
    if (m_current_path.empty()) m_current_path = "/";
    m_selected_index = -1;
    m_show_context_menu = false;
    refresh();
}

void FilesUI::refresh() {
    m_items.clear();
    mwo_fs_entry_t* entries = nullptr;
    int count = 0;
    if (mwo_fs_list(m_current_path.c_str(), &entries, &count) == 0 && entries) {
        for (int i = 0; i < count; ++i) {
            FileItem item;
            item.name = entries[i].name;
            item.is_dir = entries[i].is_dir != 0;
            item.size = entries[i].size;
            item.mtime = entries[i].mtime;
            m_items.push_back(item);
        }
        mwo_fs_free_entries(entries, count);
    }
    sort_items();
}

void FilesUI::sort_items() {
    std::sort(m_items.begin(), m_items.end(), [this](const FileItem& a, const FileItem& b) {
        if (a.is_dir != b.is_dir) return a.is_dir > b.is_dir; // Folders first
        if (m_sort_mode == FileSortMode::Name) {
            return m_sort_ascending ? (a.name < b.name) : (a.name > b.name);
        } else if (m_sort_mode == FileSortMode::Size) {
            return m_sort_ascending ? (a.size < b.size) : (a.size > b.size);
        } else {
            return m_sort_ascending ? (a.mtime < b.mtime) : (a.mtime > b.mtime);
        }
    });
}

void FilesUI::render_text(const std::string& text, int x, int y, SDL_Color color) {
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

void FilesUI::render_sidebar(int x, int y, int w, int h) {
    // Sidebar background
    SDL_SetRenderDrawColor(m_renderer, 35, 39, 46, 255);
    SDL_Rect rect = {x, y, w, h};
    SDL_RenderFillRect(m_renderer, &rect);

    render_text("Shortcuts", x + 12, y + 10, {150, 160, 175, 255});

    int item_h = 32;
    int cur_y = y + 36;
    for (size_t i = 0; i < SIDEBAR_SHORTCUTS.size(); ++i) {
        std::string shortcut_path = "/" + SIDEBAR_SHORTCUTS[i];
        bool is_active = (m_current_path == shortcut_path);
        if (is_active) {
            SDL_SetRenderDrawColor(m_renderer, 50, 70, 100, 255);
            SDL_Rect sel = {x + 4, cur_y, w - 8, item_h - 4};
            SDL_RenderFillRect(m_renderer, &sel);
        }
        render_text(SIDEBAR_SHORTCUTS[i], x + 16, cur_y + 6, is_active ? SDL_Color{255, 255, 255, 255} : SDL_Color{200, 205, 215, 255});
        cur_y += item_h;
    }
}

void FilesUI::render_toolbar(int x, int y, int w, int h) {
    SDL_SetRenderDrawColor(m_renderer, 45, 49, 58, 255);
    SDL_Rect rect = {x, y, w, h};
    SDL_RenderFillRect(m_renderer, &rect);

    std::vector<std::string> buttons = {"New File", "New Folder", "Rename", "Delete", "Copy", "Move"};
    int bx = x + 10;
    int bw = 85;
    int bh = 28;
    int by = y + (h - bh) / 2;

    for (const auto& btn : buttons) {
        SDL_SetRenderDrawColor(m_renderer, 60, 66, 78, 255);
        SDL_Rect b_rect = {bx, by, bw, bh};
        SDL_RenderFillRect(m_renderer, &b_rect);
        SDL_SetRenderDrawColor(m_renderer, 90, 98, 114, 255);
        SDL_RenderDrawRect(m_renderer, &b_rect);

        render_text(btn, bx + 8, by + 5, {230, 235, 240, 255});
        bx += bw + 8;
    }

    // Path display
    std::string path_lbl = "Path: " + m_current_path;
    render_text(path_lbl, bx + 10, by + 5, {180, 190, 200, 255});
}

void FilesUI::render_main_panel(int x, int y, int w, int h) {
    SDL_SetRenderDrawColor(m_renderer, 24, 26, 31, 255);
    SDL_Rect rect = {x, y, w, h};
    SDL_RenderFillRect(m_renderer, &rect);

    // Table Header
    SDL_SetRenderDrawColor(m_renderer, 32, 36, 44, 255);
    SDL_Rect hdr = {x, y, w, 28};
    SDL_RenderFillRect(m_renderer, &hdr);

    render_text("Name " + std::string(m_sort_mode == FileSortMode::Name ? (m_sort_ascending ? "v" : "^") : ""), x + 40, y + 5, {180, 180, 180, 255});
    render_text("Size " + std::string(m_sort_mode == FileSortMode::Size ? (m_sort_ascending ? "v" : "^") : ""), x + w - 220, y + 5, {180, 180, 180, 255});
    render_text("Modified " + std::string(m_sort_mode == FileSortMode::Date ? (m_sort_ascending ? "v" : "^") : ""), x + w - 120, y + 5, {180, 180, 180, 255});

    // Parent dir option if not at root
    int cur_y = y + 32;
    if (m_current_path != "/") {
        render_text("[..] Up to Parent", x + 40, cur_y, {120, 200, 255, 255});
        cur_y += 28;
    }

    for (size_t i = 0; i < m_items.size() && cur_y < y + h - 30; ++i) {
        bool is_sel = ((int)i == m_selected_index);
        if (is_sel) {
            SDL_SetRenderDrawColor(m_renderer, 45, 65, 95, 255);
            SDL_Rect sel_r = {x + 2, cur_y - 2, w - 4, 26};
            SDL_RenderFillRect(m_renderer, &sel_r);
        }

        // Draw Icon
        if (m_items[i].is_dir) {
            // Folder icon (rect)
            SDL_SetRenderDrawColor(m_renderer, 230, 180, 60, 255);
            SDL_Rect f_icon = {x + 12, cur_y + 2, 18, 14};
            SDL_RenderFillRect(m_renderer, &f_icon);
        } else {
            // File icon (page shape)
            SDL_SetRenderDrawColor(m_renderer, 180, 200, 220, 255);
            SDL_Rect file_icon = {x + 14, cur_y + 1, 14, 16};
            SDL_RenderFillRect(m_renderer, &file_icon);
        }

        render_text(m_items[i].name, x + 40, cur_y, m_items[i].is_dir ? SDL_Color{255, 220, 120, 255} : SDL_Color{220, 225, 230, 255});

        std::string sz_str = m_items[i].is_dir ? "<DIR>" : std::to_string(m_items[i].size) + " B";
        render_text(sz_str, x + w - 220, cur_y, {160, 170, 180, 255});

        std::time_t t = (std::time_t)m_items[i].mtime;
        char date_buf[32] = "N/A";
        if (t > 0) {
            std::strftime(date_buf, sizeof(date_buf), "%Y-%m-%d", std::localtime(&t));
        }
        render_text(date_buf, x + w - 120, cur_y, {140, 150, 160, 255});

        cur_y += 28;
    }
}

void FilesUI::render_context_menu() {
    if (!m_show_context_menu) return;
    int menu_w = 120;
    int menu_h = 135;
    SDL_SetRenderDrawColor(m_renderer, 40, 44, 52, 255);
    SDL_Rect rect = {m_context_x, m_context_y, menu_w, menu_h};
    SDL_RenderFillRect(m_renderer, &rect);
    SDL_SetRenderDrawColor(m_renderer, 80, 88, 100, 255);
    SDL_RenderDrawRect(m_renderer, &rect);

    std::vector<std::string> opts = {"Open", "Rename", "Delete", "Copy", "Move"};
    int cur_y = m_context_y + 5;
    for (const auto& opt : opts) {
        render_text(opt, m_context_x + 10, cur_y, {220, 225, 230, 255});
        cur_y += 25;
    }
}

void FilesUI::render_dialog() {
    if (!m_show_dialog) return;
    int dlg_w = 340;
    int dlg_h = 140;
    int dlg_x = m_last_x + (m_last_w - dlg_w) / 2;
    int dlg_y = m_last_y + (m_last_h - dlg_h) / 2;

    SDL_SetRenderDrawColor(m_renderer, 30, 34, 42, 255);
    SDL_Rect rect = {dlg_x, dlg_y, dlg_w, dlg_h};
    SDL_RenderFillRect(m_renderer, &rect);
    SDL_SetRenderDrawColor(m_renderer, 100, 110, 130, 255);
    SDL_RenderDrawRect(m_renderer, &rect);

    render_text(m_dialog_title, dlg_x + 15, dlg_y + 15, {255, 255, 255, 255});

    // Input box
    SDL_SetRenderDrawColor(m_renderer, 20, 22, 26, 255);
    SDL_Rect in_r = {dlg_x + 15, dlg_y + 45, dlg_w - 30, 30};
    SDL_RenderFillRect(m_renderer, &in_r);
    SDL_SetRenderDrawColor(m_renderer, 70, 80, 95, 255);
    SDL_RenderDrawRect(m_renderer, &in_r);

    render_text(m_dialog_input, dlg_x + 20, dlg_y + 50, {0, 255, 200, 255});

    // OK / Cancel buttons
    SDL_SetRenderDrawColor(m_renderer, 50, 90, 150, 255);
    SDL_Rect ok_r = {dlg_x + dlg_w - 150, dlg_y + 90, 60, 28};
    SDL_RenderFillRect(m_renderer, &ok_r);
    render_text("OK", ok_r.x + 18, ok_r.y + 5, {255, 255, 255, 255});

    SDL_SetRenderDrawColor(m_renderer, 80, 85, 95, 255);
    SDL_Rect cancel_r = {dlg_x + dlg_w - 80, dlg_y + 90, 65, 28};
    SDL_RenderFillRect(m_renderer, &cancel_r);
    render_text("Cancel", cancel_r.x + 10, cancel_r.y + 5, {255, 255, 255, 255});
}

void FilesUI::execute_dialog_action() {
    if (m_dialog_input.empty()) {
        m_show_dialog = false;
        return;
    }
    std::string full_target = m_current_path;
    if (full_target.back() != '/') full_target += "/";
    full_target += m_dialog_input;

    if (m_dialog_action == "new_file") {
        mwo_fs_touch(full_target.c_str());
    } else if (m_dialog_action == "new_folder") {
        mwo_fs_mkdir(full_target.c_str());
    } else if (m_dialog_action == "rename" && m_selected_index >= 0 && m_selected_index < (int)m_items.size()) {
        std::string old_path = m_current_path;
        if (old_path.back() != '/') old_path += "/";
        old_path += m_items[m_selected_index].name;
        mwo_fs_mv(old_path.c_str(), full_target.c_str());
    }
    m_show_dialog = false;
    refresh();
}

void FilesUI::handle_event(SDL_Event* event) {
    if (!event) return;

    if (m_show_dialog) {
        if (event->type == SDL_TEXTINPUT) {
            m_dialog_input += event->text.text;
        } else if (event->type == SDL_KEYDOWN) {
            if (event->key.keysym.sym == SDLK_RETURN) {
                execute_dialog_action();
            } else if (event->key.keysym.sym == SDLK_BACKSPACE) {
                if (!m_dialog_input.empty()) m_dialog_input.pop_back();
            } else if (event->key.keysym.sym == SDLK_ESCAPE) {
                m_show_dialog = false;
            }
        } else if (event->type == SDL_MOUSEBUTTONDOWN) {
            int mx = event->button.x;
            int my = event->button.y;
            int dlg_w = 340;
            int dlg_h = 140;
            int dlg_x = m_last_x + (m_last_w - dlg_w) / 2;
            int dlg_y = m_last_y + (m_last_h - dlg_h) / 2;
            SDL_Rect ok_r = {dlg_x + dlg_w - 150, dlg_y + 90, 60, 28};
            SDL_Rect cancel_r = {dlg_x + dlg_w - 80, dlg_y + 90, 65, 28};

            if (mx >= ok_r.x && mx <= ok_r.x + ok_r.w && my >= ok_r.y && my <= ok_r.y + ok_r.h) {
                execute_dialog_action();
            } else if (mx >= cancel_r.x && mx <= cancel_r.x + cancel_r.w && my >= cancel_r.y && my <= cancel_r.y + cancel_r.h) {
                m_show_dialog = false;
            }
        }
        return;
    }

    if (event->type == SDL_MOUSEBUTTONDOWN) {
        int mx = event->button.x;
        int my = event->button.y;

        if (m_show_context_menu) {
            m_show_context_menu = false;
            if (mx >= m_context_x && mx <= m_context_x + 120 && my >= m_context_y && my <= m_context_y + 135) {
                int item = (my - m_context_y - 5) / 25;
                if (item == 0) { // Open
                    if (m_selected_index >= 0 && m_selected_index < (int)m_items.size()) {
                        if (m_items[m_selected_index].is_dir) {
                            std::string next_p = m_current_path;
                            if (next_p.back() != '/') next_p += "/";
                            next_p += m_items[m_selected_index].name;
                            navigate(next_p.c_str());
                        }
                    }
                } else if (item == 1) { // Rename
                    if (m_selected_index >= 0 && m_selected_index < (int)m_items.size()) {
                        m_show_dialog = true;
                        m_dialog_title = "Rename item:";
                        m_dialog_input = m_items[m_selected_index].name;
                        m_dialog_action = "rename";
                    }
                } else if (item == 2) { // Delete
                    if (m_selected_index >= 0 && m_selected_index < (int)m_items.size()) {
                        std::string target = m_current_path;
                        if (target.back() != '/') target += "/";
                        target += m_items[m_selected_index].name;
                        mwo_fs_rm(target.c_str());
                        refresh();
                    }
                } else if (item == 3 || item == 4) { // Copy / Move
                    if (m_selected_index >= 0 && m_selected_index < (int)m_items.size()) {
                        m_clipboard_path = m_current_path;
                        if (m_clipboard_path.back() != '/') m_clipboard_path += "/";
                        m_clipboard_path += m_items[m_selected_index].name;
                        m_is_cut = (item == 4);
                    }
                }
            }
            return;
        }

        // Sidebar click
        int sidebar_w = 160;
        if (mx >= m_last_x && mx < m_last_x + sidebar_w) {
            int item_h = 32;
            int start_y = m_last_y + 36;
            if (my >= start_y) {
                int idx = (my - start_y) / item_h;
                if (idx >= 0 && idx < (int)SIDEBAR_SHORTCUTS.size()) {
                    navigate(("/" + SIDEBAR_SHORTCUTS[idx]).c_str());
                }
            }
            return;
        }

        // Toolbar click
        int toolbar_h = 40;
        if (my >= m_last_y && my < m_last_y + toolbar_h && mx >= m_last_x + sidebar_w) {
            int bx = m_last_x + sidebar_w + 10;
            int bw = 85;
            int bh = 28;
            int by = m_last_y + (toolbar_h - bh) / 2;
            std::vector<std::string> buttons = {"New File", "New Folder", "Rename", "Delete", "Copy", "Move"};
            for (size_t i = 0; i < buttons.size(); ++i) {
                if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
                    if (i == 0) { // New File
                        m_show_dialog = true;
                        m_dialog_title = "Enter New File Name:";
                        m_dialog_input = "new_file.txt";
                        m_dialog_action = "new_file";
                    } else if (i == 1) { // New Folder
                        m_show_dialog = true;
                        m_dialog_title = "Enter New Directory Name:";
                        m_dialog_input = "new_folder";
                        m_dialog_action = "new_folder";
                    } else if (i == 2 && m_selected_index >= 0) { // Rename
                        m_show_dialog = true;
                        m_dialog_title = "Rename Item:";
                        m_dialog_input = m_items[m_selected_index].name;
                        m_dialog_action = "rename";
                    } else if (i == 3 && m_selected_index >= 0) { // Delete
                        std::string target = m_current_path;
                        if (target.back() != '/') target += "/";
                        target += m_items[m_selected_index].name;
                        mwo_fs_rm(target.c_str());
                        refresh();
                    } else if (i == 4 && m_selected_index >= 0) { // Copy
                        m_clipboard_path = m_current_path;
                        if (m_clipboard_path.back() != '/') m_clipboard_path += "/";
                        m_clipboard_path += m_items[m_selected_index].name;
                        m_is_cut = false;
                    } else if (i == 5 && m_selected_index >= 0) { // Move
                        m_clipboard_path = m_current_path;
                        if (m_clipboard_path.back() != '/') m_clipboard_path += "/";
                        m_clipboard_path += m_items[m_selected_index].name;
                        m_is_cut = true;
                    }
                    return;
                }
                bx += bw + 8;
            }
            return;
        }

        // Main panel headers click for sorting
        int main_y = m_last_y + toolbar_h;
        if (my >= main_y && my < main_y + 28 && mx >= m_last_x + sidebar_w) {
            int rel_x = mx - (m_last_x + sidebar_w);
            int total_w = m_last_w - sidebar_w;
            if (rel_x < total_w - 240) {
                m_sort_mode = FileSortMode::Name;
            } else if (rel_x < total_w - 130) {
                m_sort_mode = FileSortMode::Size;
            } else {
                m_sort_mode = FileSortMode::Date;
            }
            m_sort_ascending = !m_sort_ascending;
            sort_items();
            return;
        }

        // Main panel item click
        if (my >= main_y + 28 && mx >= m_last_x + sidebar_w) {
            int cur_y = main_y + 32;
            if (m_current_path != "/") {
                if (my >= cur_y - 4 && my < cur_y + 24) { // Clicked Up
                    size_t pos = m_current_path.find_last_of('/');
                    if (pos != std::string::npos && pos > 0) {
                        navigate(m_current_path.substr(0, pos).c_str());
                    } else {
                        navigate("/");
                    }
                    return;
                }
                cur_y += 28;
            }

            int item_idx = (my - cur_y) / 28;
            if (item_idx >= 0 && item_idx < (int)m_items.size()) {
                m_selected_index = item_idx;
                if (event->button.button == SDL_BUTTON_RIGHT) {
                    m_show_context_menu = true;
                    m_context_x = mx;
                    m_context_y = my;
                } else if (event->button.button == SDL_BUTTON_LEFT) {
                    if (m_items[item_idx].is_dir) {
                        std::string target = m_current_path;
                        if (target.back() != '/') target += "/";
                        target += m_items[item_idx].name;
                        navigate(target.c_str());
                    }
                }
            }
        }
    }
}

void FilesUI::render(int x, int y, int w, int h) {
    m_last_x = x;
    m_last_y = y;
    m_last_w = w;
    m_last_h = h;

    int sidebar_w = 160;
    int toolbar_h = 40;

    render_sidebar(x, y, sidebar_w, h);
    render_toolbar(x + sidebar_w, y, w - sidebar_w, toolbar_h);
    render_main_panel(x + sidebar_w, y + toolbar_h, w - sidebar_w, h - toolbar_h);
    render_context_menu();
    render_dialog();
}
