#pragma once
#include <SDL2/SDL.h>
#include <SDL2/SDL_ttf.h>
#include "../core/mwo_fs.h"
#include <string>
#include <vector>

enum class FileSortMode {
    Name,
    Size,
    Date
};

struct FileItem {
    std::string name;
    bool is_dir;
    size_t size;
    long mtime;
};

class FilesUI {
public:
    FilesUI();
    ~FilesUI();

    void init(SDL_Renderer* renderer, TTF_Font* font);
    void render(int x, int y, int w, int h);
    void handle_event(SDL_Event* event);
    void navigate(const char* path);
    void refresh();

private:
    SDL_Renderer* m_renderer = nullptr;
    TTF_Font* m_font = nullptr;

    std::string m_current_path = "/";
    std::vector<FileItem> m_items;

    FileSortMode m_sort_mode = FileSortMode::Name;
    bool m_sort_ascending = true;

    int m_selected_index = -1;
    bool m_show_context_menu = false;
    int m_context_x = 0;
    int m_context_y = 0;

    bool m_show_dialog = false;
    std::string m_dialog_title;
    std::string m_dialog_input;
    std::string m_dialog_action;

    std::string m_clipboard_path;
    bool m_is_cut = false;

    int m_last_x = 0;
    int m_last_y = 0;
    int m_last_w = 0;
    int m_last_h = 0;

    void render_sidebar(int x, int y, int w, int h);
    void render_toolbar(int x, int y, int w, int h);
    void render_main_panel(int x, int y, int w, int h);
    void render_context_menu();
    void render_dialog();
    void render_text(const std::string& text, int x, int y, SDL_Color color);
    void sort_items();
    void execute_dialog_action();
};
