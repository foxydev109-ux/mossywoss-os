#include "mwo_log.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <pthread.h>

static FILE *g_log_file = NULL;
static pthread_mutex_t g_log_mutex = PTHREAD_MUTEX_INITIALIZER;

static const char *level_to_string(LogLevel level) {
    switch (level) {
        case LOG_DEBUG: return "DEBUG";
        case LOG_INFO:  return "INFO";
        case LOG_WARN:  return "WARN";
        case LOG_ERROR: return "ERROR";
        case LOG_FATAL: return "FATAL";
        default:        return "UNKNOWN";
    }
}

MWResult mwo_log_init(const char* filepath) {
    pthread_mutex_lock(&g_log_mutex);
    if (g_log_file != NULL) {
        fclose(g_log_file);
        g_log_file = NULL;
    }
    if (filepath != NULL && strlen(filepath) > 0) {
        g_log_file = fopen(filepath, "a");
        if (g_log_file == NULL) {
            pthread_mutex_unlock(&g_log_mutex);
            fprintf(stderr, "[LOG_ERROR] Failed to open log file: %s\n", filepath);
            return MW_ERR;
        }
    }
    pthread_mutex_unlock(&g_log_mutex);
    return MW_OK;
}

void mwo_log_v(LogLevel level, const char* fmt, va_list args) {
    pthread_mutex_lock(&g_log_mutex);

    time_t now = time(NULL);
    struct tm tm_now;
#if defined(_WIN32) || defined(_WIN64)
    localtime_s(&tm_now, &now);
#else
    localtime_r(&now, &tm_now);
#endif

    char time_buf[32];
    strftime(time_buf, sizeof(time_buf), "%Y-%m-%d %H:%M:%S", &tm_now);

    char msg_buf[2048];
    vsnprintf(msg_buf, sizeof(msg_buf), fmt, args);

    const char *lvl_str = level_to_string(level);

    // Output to stderr
    fprintf(stderr, "[%s] [%s] %s\n", time_buf, lvl_str, msg_buf);
    fflush(stderr);

    // Output to file if available
    if (g_log_file != NULL) {
        fprintf(g_log_file, "[%s] [%s] %s\n", time_buf, lvl_str, msg_buf);
        fflush(g_log_file);
    }

    pthread_mutex_unlock(&g_log_mutex);
}

void mwo_log(LogLevel level, const char* fmt, ...) {
    va_list args;
    va_start(args, fmt);
    mwo_log_v(level, fmt, args);
    va_end(args);
}

void mwo_log_close(void) {
    pthread_mutex_lock(&g_log_mutex);
    if (g_log_file != NULL) {
        fclose(g_log_file);
        g_log_file = NULL;
    }
    pthread_mutex_unlock(&g_log_mutex);
}
