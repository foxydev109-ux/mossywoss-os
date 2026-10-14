#include "mwo_theme.h"
#include <cstring>
#include <cstdlib>
#include <cstdio>
#include <fstream>
#include <iostream>

static const int NUM_PRESET_THEMES = 13;

static Theme g_preset_themes[NUM_PRESET_THEMES] = {
    // 1. Lavender (#E6E6FA accent)
    {
        "Lavender",
        {40, 35, 55, 255},    // desktop_bg
        {25, 20, 38, 255},    // taskbar_bg
        {48, 43, 64, 255},    // window_bg
        {180, 170, 220, 255}, // window_border
        {60, 52, 82, 255},    // title_bar
        {75, 66, 102, 255},   // button_bg
        {95, 84, 128, 255},   // button_hover
        {115, 102, 154, 255}, // button_pressed
        {240, 240, 250, 255}, // text_primary
        {180, 180, 205, 255}, // text_secondary
        {230, 230, 250, 255}, // accent #E6E6FA
        {140, 130, 190, 255}, // selection
        {76, 175, 80, 255},   // success
        {255, 152, 0, 255},   // warning
        {244, 67, 54, 255},   // error
        {30, 25, 42, 255},    // input_bg
        {100, 90, 130, 255}   // input_border
    },
    // 2. Orange (#FF8C00 accent)
    {
        "Orange",
        {35, 30, 25, 255},    // desktop_bg
        {20, 18, 15, 255},    // taskbar_bg
        {45, 38, 32, 255},    // window_bg
        {255, 140, 0, 255},   // window_border
        {60, 48, 38, 255},    // title_bar
        {80, 60, 45, 255},    // button_bg
        {110, 80, 55, 255},   // button_hover
        {140, 100, 65, 255},  // button_pressed
        {255, 245, 235, 255}, // text_primary
        {200, 180, 160, 255}, // text_secondary
        {255, 140, 0, 255},   // accent #FF8C00
        {200, 110, 0, 255},   // selection
        {76, 175, 80, 255},   // success
        {255, 193, 7, 255},   // warning
        {244, 67, 54, 255},   // error
        {28, 22, 18, 255},    // input_bg
        {130, 80, 30, 255}    // input_border
    },
    // 3. Light Pink (#FFB6C1 accent)
    {
        "Light Pink",
        {45, 35, 40, 255},    // desktop_bg
        {30, 20, 25, 255},    // taskbar_bg
        {55, 42, 48, 255},    // window_bg
        {255, 182, 193, 255}, // window_border
        {72, 50, 60, 255},    // title_bar
        {92, 65, 78, 255},    // button_bg
        {120, 82, 98, 255},   // button_hover
        {150, 100, 120, 255}, // button_pressed
        {255, 240, 245, 255}, // text_primary
        {210, 185, 195, 255}, // text_secondary
        {255, 182, 193, 255}, // accent #FFB6C1
        {200, 130, 150, 255}, // selection
        {76, 175, 80, 255},   // success
        {255, 152, 0, 255},   // warning
        {244, 67, 54, 255},   // error
        {35, 25, 30, 255},    // input_bg
        {130, 85, 100, 255}   // input_border
    },
    // 4. Green (#4CAF50 accent)
    {
        "Green",
        {25, 40, 30, 255},    // desktop_bg
        {15, 28, 20, 255},    // taskbar_bg
        {32, 50, 38, 255},    // window_bg
        {76, 175, 80, 255},   // window_border
        {40, 65, 48, 255},    // title_bar
        {52, 85, 62, 255},    // button_bg
        {68, 110, 80, 255},   // button_hover
        {85, 135, 100, 255},  // button_pressed
        {240, 255, 242, 255}, // text_primary
        {180, 210, 185, 255}, // text_secondary
        {76, 175, 80, 255},   // accent #4CAF50
        {50, 130, 60, 255},   // selection
        {76, 175, 80, 255},   // success
        {255, 152, 0, 255},   // warning
        {244, 67, 54, 255},   // error
        {20, 32, 24, 255},    // input_bg
        {60, 110, 70, 255}    // input_border
    },
    // 5. Mint Green (#98FF98 accent)
    {
        "Mint Green",
        {28, 42, 36, 255},    // desktop_bg
        {18, 30, 25, 255},    // taskbar_bg
        {35, 52, 45, 255},    // window_bg
        {152, 255, 152, 255}, // window_border
        {45, 70, 60, 255},    // title_bar
        {60, 92, 78, 255},    // button_bg
        {80, 120, 100, 255},  // button_hover
        {100, 150, 125, 255}, // button_pressed
        {242, 255, 245, 255}, // text_primary
        {185, 220, 200, 255}, // text_secondary
        {152, 255, 152, 255}, // accent #98FF98
        {90, 180, 130, 255},  // selection
        {76, 175, 80, 255},   // success
        {255, 152, 0, 255},   // warning
        {244, 67, 54, 255},   // error
        {22, 35, 30, 255},    // input_bg
        {70, 125, 100, 255}   // input_border
    },
    // 6. Forest Green (#228B22 accent)
    {
        "Forest Green",
        {18, 32, 20, 255},    // desktop_bg
        {12, 22, 14, 255},    // taskbar_bg
        {25, 42, 28, 255},    // window_bg
        {34, 139, 34, 255},   // window_border
        {30, 56, 34, 255},    // title_bar
        {40, 75, 45, 255},    // button_bg
        {55, 100, 60, 255},   // button_hover
        {70, 125, 75, 255},   // button_pressed
        {235, 250, 238, 255}, // text_primary
        {170, 205, 175, 255}, // text_secondary
        {34, 139, 34, 255},   // accent #228B22
        {28, 110, 28, 255},   // selection
        {76, 175, 80, 255},   // success
        {255, 152, 0, 255},   // warning
        {244, 67, 54, 255},   // error
        {15, 26, 18, 255},    // input_bg
        {45, 90, 50, 255}     // input_border
    },
    // 7. Silver (#C0C0C0 accent)
    {
        "Silver",
        {45, 48, 52, 255},    // desktop_bg
        {28, 30, 34, 255},    // taskbar_bg
        {55, 58, 64, 255},    // window_bg
        {192, 192, 192, 255}, // window_border
        {70, 74, 82, 255},    // title_bar
        {88, 92, 102, 255},   // button_bg
        {112, 118, 130, 255}, // button_hover
        {138, 144, 158, 255}, // button_pressed
        {245, 245, 250, 255}, // text_primary
        {190, 192, 200, 255}, // text_secondary
        {192, 192, 192, 255}, // accent #C0C0C0
        {130, 135, 145, 255}, // selection
        {76, 175, 80, 255},   // success
        {255, 152, 0, 255},   // warning
        {244, 67, 54, 255},   // error
        {34, 36, 40, 255},    // input_bg
        {110, 115, 125, 255}  // input_border
    },
    // 8. Gold (#FFD700 accent)
    {
        "Gold",
        {40, 36, 22, 255},    // desktop_bg
        {25, 22, 12, 255},    // taskbar_bg
        {52, 46, 28, 255},    // window_bg
        {255, 215, 0, 255},   // window_border
        {68, 60, 34, 255},    // title_bar
        {88, 78, 42, 255},    // button_bg
        {115, 102, 54, 255},  // button_hover
        {142, 126, 65, 255},  // button_pressed
        {255, 250, 230, 255}, // text_primary
        {210, 195, 150, 255}, // text_secondary
        {255, 215, 0, 255},   // accent #FFD700
        {190, 158, 0, 255},   // selection
        {76, 175, 80, 255},   // success
        {255, 152, 0, 255},   // warning
        {244, 67, 54, 255},   // error
        {30, 26, 16, 255},    // input_bg
        {130, 110, 30, 255}   // input_border
    },
    // 9. White (#FFFFFF accent)
    {
        "White",
        {240, 242, 245, 255}, // desktop_bg
        {220, 224, 230, 255}, // taskbar_bg
        {255, 255, 255, 255}, // window_bg
        {200, 205, 210, 255}, // window_border
        {230, 234, 240, 255}, // title_bar
        {215, 220, 228, 255}, // button_bg
        {195, 202, 212, 255}, // button_hover
        {175, 184, 196, 255}, // button_pressed
        {20, 24, 30, 255},    // text_primary
        {90, 98, 110, 255},   // text_secondary
        {255, 255, 255, 255}, // accent #FFFFFF
        {180, 200, 230, 255}, // selection
        {76, 175, 80, 255},   // success
        {255, 152, 0, 255},   // warning
        {244, 67, 54, 255},   // error
        {248, 249, 250, 255}, // input_bg
        {180, 185, 195, 255}  // input_border
    },
    // 10. Light Grey (#D3D3D3 accent)
    {
        "Light Grey",
        {215, 218, 222, 255}, // desktop_bg
        {190, 194, 200, 255}, // taskbar_bg
        {230, 233, 238, 255}, // window_bg
        {211, 211, 211, 255}, // window_border
        {205, 209, 216, 255}, // title_bar
        {188, 193, 201, 255}, // button_bg
        {168, 174, 184, 255}, // button_hover
        {148, 155, 167, 255}, // button_pressed
        {30, 32, 36, 255},    // text_primary
        {100, 105, 115, 255}, // text_secondary
        {211, 211, 211, 255}, // accent #D3D3D3
        {160, 175, 195, 255}, // selection
        {76, 175, 80, 255},   // success
        {255, 152, 0, 255},   // warning
        {244, 67, 54, 255},   // error
        {222, 225, 230, 255}, // input_bg
        {160, 165, 175, 255}  // input_border
    },
    // 11. Medium Grey (#939393 accent)
    {
        "Medium Grey",
        {60, 62, 66, 255},    // desktop_bg
        {42, 44, 48, 255},    // taskbar_bg
        {72, 75, 80, 255},    // window_bg
        {147, 147, 147, 255}, // window_border
        {88, 92, 98, 255},    // title_bar
        {105, 110, 118, 255}, // button_bg
        {128, 134, 144, 255}, // button_hover
        {150, 158, 170, 255}, // button_pressed
        {240, 242, 245, 255}, // text_primary
        {180, 184, 192, 255}, // text_secondary
        {147, 147, 147, 255}, // accent #939393
        {110, 115, 125, 255}, // selection
        {76, 175, 80, 255},   // success
        {255, 152, 0, 255},   // warning
        {244, 67, 54, 255},   // error
        {48, 50, 54, 255},    // input_bg
        {120, 124, 132, 255}  // input_border
    },
    // 12. Dark Grey (#424242 accent)
    {
        "Dark Grey",
        {28, 28, 28, 255},    // desktop_bg
        {18, 18, 18, 255},    // taskbar_bg
        {38, 38, 38, 255},    // window_bg
        {66, 66, 66, 255},    // window_border
        {50, 50, 50, 255},    // title_bar
        {65, 65, 65, 255},    // button_bg
        {85, 85, 85, 255},    // button_hover
        {105, 105, 105, 255}, // button_pressed
        {235, 235, 235, 255}, // text_primary
        {160, 160, 160, 255}, // text_secondary
        {66, 66, 66, 255},    // accent #424242
        {90, 90, 90, 255},    // selection
        {76, 175, 80, 255},   // success
        {255, 152, 0, 255},   // warning
        {244, 67, 54, 255},   // error
        {22, 22, 22, 255},    // input_bg
        {80, 80, 80, 255}     // input_border
    },
    // 13. Black (#0A0A0A accent)
    {
        "Black",
        {15, 15, 15, 255},    // desktop_bg
        {8, 8, 8, 255},       // taskbar_bg
        {22, 22, 22, 255},    // window_bg
        {10, 10, 10, 255},    // window_border
        {32, 32, 32, 255},    // title_bar
        {45, 45, 45, 255},    // button_bg
        {65, 65, 65, 255},    // button_hover
        {85, 85, 85, 255},    // button_pressed
        {245, 245, 245, 255}, // text_primary
        {165, 165, 165, 255}, // text_secondary
        {10, 10, 10, 255},    // accent #0A0A0A
        {70, 70, 70, 255},    // selection
        {76, 175, 80, 255},   // success
        {255, 152, 0, 255},   // warning
        {244, 67, 54, 255},   // error
        {12, 12, 12, 255},    // input_bg
        {55, 55, 55, 255}     // input_border
    }
};

static Theme g_current_theme = g_preset_themes[0];
static bool g_theme_initialized = false;

static void ensure_initialized() {
    if (!g_theme_initialized) {
        g_theme_initialized = true;
        std::ifstream config("mwo_theme.cfg");
        if (config.is_open()) {
            char name[64];
            if (config.getline(name, sizeof(name))) {
                Theme* t = theme_get(name);
                if (t) {
                    g_current_theme = *t;
                }
            }
        }
    }
}

void theme_init() {
    ensure_initialized();
}

Theme* theme_get(const char* name) {
    if (!name) return NULL;
    for (int i = 0; i < NUM_PRESET_THEMES; ++i) {
        if (strcasecmp(g_preset_themes[i].name, name) == 0) {
            return &g_preset_themes[i];
        }
    }
    return NULL;
}

void theme_apply(Theme* t) {
    if (t) {
        g_current_theme = *t;
    }
}

Theme* theme_current() {
    ensure_initialized();
    return &g_current_theme;
}

void theme_list(char*** names, int* count) {
    if (!names || !count) return;
    *count = NUM_PRESET_THEMES;
    *names = (char**)malloc(sizeof(char*) * NUM_PRESET_THEMES);
    for (int i = 0; i < NUM_PRESET_THEMES; ++i) {
        (*names)[i] = strdup(g_preset_themes[i].name);
    }
}

void theme_save(const char* name) {
    Theme* t = theme_get(name);
    if (t) {
        theme_apply(t);
    }
    std::ofstream config("mwo_theme.cfg");
    if (config.is_open()) {
        config << g_current_theme.name << std::endl;
    }
}

const char* theme_get_current_name() {
    ensure_initialized();
    return g_current_theme.name;
}
