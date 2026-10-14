#pragma once

#include "mwo_types.h"
#include <stdarg.h>

typedef enum {
    LOG_DEBUG = 0,
    LOG_INFO,
    LOG_WARN,
    LOG_ERROR,
    LOG_FATAL
} LogLevel;

MWResult mwo_log_init(const char* filepath);
void mwo_log(LogLevel level, const char* fmt, ...);
void mwo_log_v(LogLevel level, const char* fmt, va_list args);
void mwo_log_close(void);
