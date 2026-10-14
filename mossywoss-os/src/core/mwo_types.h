#pragma once

#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
#include <time.h>

typedef enum {
    MW_OK = 0,
    MW_ERR = -1,
    MW_NOTFOUND = -2,
    MW_PERM = -3
} MWResult;

typedef enum {
    MWO_FILE_TYPE_FILE = 0,
    MWO_FILE_TYPE_DIR = 1
} MWOFileType;

typedef struct {
    char path[512];
    char name[256];
    char parent[512];
    MWOFileType type;
    void *content;
    size_t size;
    time_t created;
    time_t modified;
    int permissions;
} MWOFile;

typedef struct {
    int id;
    char username[64];
    char pin_hash[128];
    time_t created;
    time_t last_login;
} MWOUser;

typedef enum {
    MWO_APP_NATIVE_C = 0,
    MWO_APP_NATIVE_CPP,
    MWO_APP_MWO_INTERNAL,
    MWO_APP_WEB_APP,
    MWO_APP_WEB_GAME,
    MWO_APP_WEBSITE,
    MWO_APP_DOCUMENT,
    NATIVE_C = MWO_APP_NATIVE_C,
    NATIVE_CPP = MWO_APP_NATIVE_CPP,
    MWO_INTERNAL = MWO_APP_MWO_INTERNAL,
    WEB_APP = MWO_APP_WEB_APP,
    WEB_GAME = MWO_APP_WEB_GAME,
    WEBSITE = MWO_APP_WEBSITE,
    DOCUMENT = MWO_APP_DOCUMENT
} MWOAppType;

typedef struct {
    char id[64];
    char name[128];
    char version[32];
    MWOAppType type;
    char entry_file[256];
    char icon[256];
    char category[64];
    bool enabled;
} MWOApp;

typedef enum {
    MWO_DOWNLOAD_QUEUED = 0,
    MWO_DOWNLOAD_DOWNLOADING,
    MWO_DOWNLOAD_PAUSED,
    MWO_DOWNLOAD_COMPLETED,
    MWO_DOWNLOAD_FAILED,
    MWO_DOWNLOAD_CANCELLED,
    QUEUED = MWO_DOWNLOAD_QUEUED,
    DOWNLOADING = MWO_DOWNLOAD_DOWNLOADING,
    PAUSED = MWO_DOWNLOAD_PAUSED,
    COMPLETED = MWO_DOWNLOAD_COMPLETED,
    FAILED = MWO_DOWNLOAD_FAILED,
    CANCELLED = MWO_DOWNLOAD_CANCELLED
} MWODownloadStatus;

typedef struct {
    int id;
    char url[1024];
    char filename[256];
    char destination[512];
    int64_t size;
    int64_t downloaded_bytes;
    MWODownloadStatus status;
    time_t created_time;
    time_t completed_time;
} MWODownload;

typedef enum {
    MWO_EVENT_KEY = 0,
    MWO_EVENT_MOUSE,
    MWO_EVENT_TOUCH,
    MWO_EVENT_WINDOW,
    MWO_EVENT_CUSTOM,
    KEY = MWO_EVENT_KEY,
    MOUSE = MWO_EVENT_MOUSE,
    TOUCH = MWO_EVENT_TOUCH,
    WINDOW = MWO_EVENT_WINDOW,
    CUSTOM = MWO_EVENT_CUSTOM
} MWOEventType;

typedef struct {
    MWOEventType type;
    union {
        struct {
            int keycode;
            int scancode;
            bool pressed;
            uint16_t mod;
        } key;
        struct {
            int x;
            int y;
            int xrel;
            int yrel;
            uint8_t button;
            bool pressed;
            int wheel_x;
            int wheel_y;
        } mouse;
        struct {
            int id;
            float x;
            float y;
            float dx;
            float dy;
            bool pressed;
        } touch;
        struct {
            int event_id;
            int data1;
            int data2;
        } window;
        struct {
            int code;
            void *data1;
            void *data2;
        } custom;
    } data;
} MWOEvent;
