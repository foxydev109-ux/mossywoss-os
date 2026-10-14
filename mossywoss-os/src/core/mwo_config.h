#ifndef MWO_CONFIG_H
#define MWO_CONFIG_H

#include "mwo_types.h"
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

int mwo_config_init(void);
int mwo_config(void);
void mwo_config_cleanup(void);

const char* mwo_config_get(const char* key, const char* default_val);
int mwo_config_set(const char* key, const char* value);

const char* mwo_config_get_string(const char* key, const char* default_val);
void mwo_config_set_string(const char* key, const char* value);

int mwo_config_get_int(const char* key, int default_val);
int mwo_config_set_int(const char* key, int value);

bool mwo_config_get_bool(const char* key, bool default_val);
int mwo_config_set_bool(const char* key, bool value);

int mwo_config_save(void);
int mwo_config_load(void);

#ifdef __cplusplus
}
#endif

#endif // MWO_CONFIG_H
