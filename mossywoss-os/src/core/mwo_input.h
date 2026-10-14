#ifndef MWO_INPUT_H
#define MWO_INPUT_H

#include <stdbool.h>
#include <SDL2/SDL.h>

#ifdef __cplusplus
extern "C" {
#endif

int mwo_input_init(void);
int mwo_input(void);
void mwo_input_cleanup(void);

#ifdef __cplusplus
void mwo_input_update(const SDL_Event* e = nullptr);
#else
void mwo_input_update(const SDL_Event* e);
#endif

int mwo_input_get_mouse_x(void);
int mwo_input_get_mouse_y(void);
void mwo_input_get_mouse_pos(int* x, int* y);

bool mwo_input_is_button_down(int button);
bool mwo_input_is_key_down(int scancode);
bool mwo_input_is_key_pressed(int keycode);

bool mwo_input_get_touch(int index, float* x, float* y, bool* active);
bool mwo_input_is_touch_device(void);

bool mwo_input_is_stylus_active(void);
float mwo_input_get_stylus_pressure(void);

#ifdef __cplusplus
}
#endif

#endif // MWO_INPUT_H
