#include "mwo_input.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <SDL2/SDL.h>

static int s_mouse_x = 0;
static int s_mouse_y = 0;
static bool s_mouse_buttons[5] = {false};
static bool s_key_state[512] = {false};

typedef struct {
    float x;
    float y;
    bool active;
} TouchPointState;

static TouchPointState s_touch_points[10] = {0};
static bool s_stylus_active = false;
static float s_stylus_pressure = 0.0f;

int mwo_input_init(void) {
    s_mouse_x = 0;
    s_mouse_y = 0;
    memset(s_mouse_buttons, 0, sizeof(s_mouse_buttons));
    memset(s_key_state, 0, sizeof(s_key_state));
    memset(s_touch_points, 0, sizeof(s_touch_points));
    s_stylus_active = false;
    s_stylus_pressure = 0.0f;
    return 0;
}

int mwo_input(void) {
    return mwo_input_init();
}

void mwo_input_cleanup(void) {
    mwo_input_init();
}

void mwo_input_update(const SDL_Event* e) {
    if (!e) {
        uint32_t btn_state = SDL_GetMouseState(&s_mouse_x, &s_mouse_y);
        s_mouse_buttons[0] = (btn_state & SDL_BUTTON(SDL_BUTTON_LEFT)) != 0;
        s_mouse_buttons[1] = (btn_state & SDL_BUTTON(SDL_BUTTON_MIDDLE)) != 0;
        s_mouse_buttons[2] = (btn_state & SDL_BUTTON(SDL_BUTTON_RIGHT)) != 0;
        s_mouse_buttons[3] = (btn_state & SDL_BUTTON(SDL_BUTTON_X1)) != 0;
        s_mouse_buttons[4] = (btn_state & SDL_BUTTON(SDL_BUTTON_X2)) != 0;

        const uint8_t* keyboard = SDL_GetKeyboardState(NULL);
        if (keyboard) {
            for (int i = 0; i < 512; i++) {
                s_key_state[i] = (keyboard[i] != 0);
            }
        }
        return;
    }

    switch (e->type) {
        case SDL_MOUSEMOTION:
            s_mouse_x = e->motion.x;
            s_mouse_y = e->motion.y;
            break;

        case SDL_MOUSEBUTTONDOWN:
        case SDL_MOUSEBUTTONUP: {
            int b = e->button.button - 1; // 1-indexed to 0-indexed
            if (b >= 0 && b < 5) {
                s_mouse_buttons[b] = (e->type == SDL_MOUSEBUTTONDOWN);
            }
            s_mouse_x = e->button.x;
            s_mouse_y = e->button.y;
            break;
        }

        case SDL_KEYDOWN:
        case SDL_KEYUP: {
            int sc = (int)e->key.keysym.scancode;
            if (sc >= 0 && sc < 512) {
                s_key_state[sc] = (e->type == SDL_KEYDOWN);
            }
            break;
        }

        case SDL_FINGERDOWN:
        case SDL_FINGERMOTION: {
            int idx = (int)(e->tfinger.fingerId % 10);
            if (idx >= 0 && idx < 10) {
                s_touch_points[idx].x = e->tfinger.x;
                s_touch_points[idx].y = e->tfinger.y;
                s_touch_points[idx].active = true;
            }
            if (e->tfinger.pressure > 0.0f) {
                s_stylus_active = true;
                s_stylus_pressure = e->tfinger.pressure;
            }
            break;
        }

        case SDL_FINGERUP: {
            int idx = (int)(e->tfinger.fingerId % 10);
            if (idx >= 0 && idx < 10) {
                s_touch_points[idx].active = false;
            }
            break;
        }

        default:
            break;
    }
}

int mwo_input_get_mouse_x(void) {
    return s_mouse_x;
}

int mwo_input_get_mouse_y(void) {
    return s_mouse_y;
}

void mwo_input_get_mouse_pos(int* x, int* y) {
    if (x) *x = s_mouse_x;
    if (y) *y = s_mouse_y;
}

bool mwo_input_is_button_down(int button) {
    // Support 0-based and 1-based button indexing
    int idx = (button >= 1 && button <= 5) ? button - 1 : button;
    if (idx >= 0 && idx < 5) {
        return s_mouse_buttons[idx];
    }
    return false;
}

bool mwo_input_is_key_down(int scancode) {
    if (scancode >= 0 && scancode < 512) {
        return s_key_state[scancode];
    }
    return false;
}

bool mwo_input_is_key_pressed(int keycode) {
    return mwo_input_is_key_down(keycode);
}

bool mwo_input_get_touch(int index, float* x, float* y, bool* active) {
    if (index < 0 || index >= 10) {
        if (active) *active = false;
        return false;
    }
    if (x) *x = s_touch_points[index].x;
    if (y) *y = s_touch_points[index].y;
    if (active) *active = s_touch_points[index].active;
    return s_touch_points[index].active;
}

bool mwo_input_is_touch_device(void) {
    if (SDL_GetNumTouchDevices() > 0) return true;
    if (SDL_GetNumTouchFingers(0) > 0) return true;
    const char* hint = SDL_GetHint(SDL_HINT_TOUCH_MOUSE_EVENTS);
    if (hint && strcmp(hint, "1") == 0) return true;
    return false;
}

bool mwo_input_is_stylus_active(void) {
    return s_stylus_active;
}

float mwo_input_get_stylus_pressure(void) {
    return s_stylus_pressure;
}
