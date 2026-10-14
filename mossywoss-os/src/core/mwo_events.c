#include "mwo_events.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define EVENT_RING_BUFFER_SIZE 256

static MWOEvent s_event_ring[EVENT_RING_BUFFER_SIZE];
static int s_ring_head = 0;
static int s_ring_tail = 0;
static int s_ring_count = 0;

int mwo_events_init(void) {
    if (SDL_InitSubSystem(SDL_INIT_EVENTS) < 0) {
        return -1;
    }
    s_ring_head = 0;
    s_ring_tail = 0;
    s_ring_count = 0;
    return 0;
}

int mwo_events(void) {
    return mwo_events_init();
}

void mwo_events_cleanup(void) {
    s_ring_head = 0;
    s_ring_tail = 0;
    s_ring_count = 0;
    SDL_QuitSubSystem(SDL_INIT_EVENTS);
}

int mwo_events_push(const MWOEvent* evt) {
    if (!evt) return -1;
    if (s_ring_count >= EVENT_RING_BUFFER_SIZE) {
        return -1; // Ring buffer full
    }

    s_event_ring[s_ring_tail] = *evt;
    s_ring_tail = (s_ring_tail + 1) % EVENT_RING_BUFFER_SIZE;
    s_ring_count++;
    return 0;
}

int mwo_events_poll(MWOEvent* out) {
    if (!out) return 0;

    // First check ring buffer for custom/pushed events
    if (s_ring_count > 0) {
        *out = s_event_ring[s_ring_head];
        s_ring_head = (s_ring_head + 1) % EVENT_RING_BUFFER_SIZE;
        s_ring_count--;
        return 1;
    }

    // Poll SDL event
    SDL_Event sdl_evt;
    if (!SDL_PollEvent(&sdl_evt)) {
        return 0;
    }

    memset(out, 0, sizeof(MWOEvent));

    switch (sdl_evt.type) {
        case SDL_QUIT:
            out->type = MWO_EVENT_WINDOW;
            out->data.window.event_id = 0; // CLOSE action
            break;

        case SDL_KEYDOWN:
        case SDL_KEYUP:
            out->type = MWO_EVENT_KEY;
            out->data.key.keycode = sdl_evt.key.keysym.sym;
            out->data.key.scancode = sdl_evt.key.keysym.scancode;
            out->data.key.pressed = (sdl_evt.type == SDL_KEYDOWN);
            out->data.key.mod = sdl_evt.key.keysym.mod;
            break;

        case SDL_MOUSEMOTION:
            out->type = MWO_EVENT_MOUSE;
            out->data.mouse.x = sdl_evt.motion.x;
            out->data.mouse.y = sdl_evt.motion.y;
            out->data.mouse.xrel = sdl_evt.motion.xrel;
            out->data.mouse.yrel = sdl_evt.motion.yrel;
            out->data.mouse.pressed = (sdl_evt.motion.state != 0);
            break;

        case SDL_MOUSEBUTTONDOWN:
        case SDL_MOUSEBUTTONUP:
            out->type = MWO_EVENT_MOUSE;
            out->data.mouse.x = sdl_evt.button.x;
            out->data.mouse.y = sdl_evt.button.y;
            out->data.mouse.button = sdl_evt.button.button;
            out->data.mouse.pressed = (sdl_evt.type == SDL_MOUSEBUTTONDOWN);
            break;

        case SDL_MOUSEWHEEL:
            out->type = MWO_EVENT_MOUSE;
            out->data.mouse.wheel_x = sdl_evt.wheel.x;
            out->data.mouse.wheel_y = sdl_evt.wheel.y;
            break;

        case SDL_FINGERDOWN:
        case SDL_FINGERUP:
        case SDL_FINGERMOTION:
            out->type = MWO_EVENT_TOUCH;
            out->data.touch.id = (int)sdl_evt.tfinger.fingerId;
            out->data.touch.x = sdl_evt.tfinger.x;
            out->data.touch.y = sdl_evt.tfinger.y;
            out->data.touch.dx = sdl_evt.tfinger.dx;
            out->data.touch.dy = sdl_evt.tfinger.dy;
            out->data.touch.pressed = (sdl_evt.type != SDL_FINGERUP);
            break;

        case SDL_WINDOWEVENT:
            out->type = MWO_EVENT_WINDOW;
            out->data.window.event_id = sdl_evt.window.event;
            out->data.window.data1 = sdl_evt.window.data1;
            out->data.window.data2 = sdl_evt.window.data2;
            break;

        default:
            out->type = MWO_EVENT_CUSTOM;
            out->data.custom.code = sdl_evt.type;
            break;
    }

    return 1;
}

int mwo_events_wait(int timeout_ms) {
    if (s_ring_count > 0) {
        return 1;
    }
    return SDL_WaitEventTimeout(NULL, timeout_ms);
}

mwo_event_t mwo_event_from_sdl(const SDL_Event* sdl_evt) {
    mwo_event_t evt = {0};
    if (!sdl_evt) return evt;

    switch (sdl_evt->type) {
        case SDL_QUIT:
            evt.type = MWO_EVENT_QUIT;
            break;
        case SDL_KEYDOWN:
            evt.type = MWO_EVENT_KEY_DOWN;
            evt.keycode = sdl_evt->key.keysym.sym;
            break;
        case SDL_KEYUP:
            evt.type = MWO_EVENT_KEY_UP;
            evt.keycode = sdl_evt->key.keysym.sym;
            break;
        case SDL_MOUSEBUTTONDOWN:
            evt.type = MWO_EVENT_MOUSE_DOWN;
            evt.x = sdl_evt->button.x;
            evt.y = sdl_evt->button.y;
            break;
        case SDL_MOUSEBUTTONUP:
            evt.type = MWO_EVENT_MOUSE_UP;
            evt.x = sdl_evt->button.x;
            evt.y = sdl_evt->button.y;
            break;
        case SDL_MOUSEMOTION:
            evt.type = MWO_EVENT_MOUSE_MOVE;
            evt.x = sdl_evt->motion.x;
            evt.y = sdl_evt->motion.y;
            break;
        case SDL_WINDOWEVENT:
            if (sdl_evt->window.event == SDL_WINDOWEVENT_RESIZED ||
                sdl_evt->window.event == SDL_WINDOWEVENT_SIZE_CHANGED) {
                evt.type = MWO_EVENT_WINDOW_RESIZE;
                evt.width = sdl_evt->window.data1;
                evt.height = sdl_evt->window.data2;
            }
            break;
        default:
            evt.type = MWO_EVENT_NONE;
            break;
    }
    return evt;
}

void mwo_events_dispatch(const mwo_event_t* evt) {
    (void)evt;
}
