#ifndef MWO_EVENTS_H
#define MWO_EVENTS_H

#include "mwo_types.h"
#include <SDL2/SDL.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    MWO_EVENT_NONE = 0,
    MWO_EVENT_QUIT,
    MWO_EVENT_KEY_DOWN,
    MWO_EVENT_KEY_UP,
    MWO_EVENT_MOUSE_DOWN,
    MWO_EVENT_MOUSE_UP,
    MWO_EVENT_MOUSE_MOVE,
    MWO_EVENT_WINDOW_RESIZE
} mwo_event_type_t;

typedef struct {
    mwo_event_type_t type;
    int x;
    int y;
    int keycode;
    int width;
    int height;
} mwo_event_t;

int mwo_events_init(void);
int mwo_events(void);
void mwo_events_cleanup(void);

int mwo_events_poll(MWOEvent* out);
int mwo_events_push(const MWOEvent* evt);
int mwo_events_wait(int timeout_ms);

mwo_event_t mwo_event_from_sdl(const SDL_Event* sdl_evt);
void mwo_events_dispatch(const mwo_event_t* evt);

#ifdef __cplusplus
}
#endif

#endif // MWO_EVENTS_H
