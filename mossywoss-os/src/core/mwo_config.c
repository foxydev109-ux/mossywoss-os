#include "mwo_config.h"
#include "mwo_db.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct ConfigNode {
    char key[64];
    char value[256];
    struct ConfigNode* next;
} ConfigNode;

static ConfigNode* g_config_cache = NULL;

static ConfigNode* find_node(const char* key) {
    if (!key) return NULL;
    ConfigNode* curr = g_config_cache;
    while (curr) {
        if (strcmp(curr->key, key) == 0) return curr;
        curr = curr->next;
    }
    return NULL;
}

static void update_or_add_cache(const char* key, const char* value) {
    if (!key || !value) return;
    ConfigNode* node = find_node(key);
    if (node) {
        snprintf(node->value, sizeof(node->value), "%s", value);
    } else {
        ConfigNode* new_node = (ConfigNode*)malloc(sizeof(ConfigNode));
        if (!new_node) return;
        snprintf(new_node->key, sizeof(new_node->key), "%s", key);
        snprintf(new_node->value, sizeof(new_node->value), "%s", value);
        new_node->next = g_config_cache;
        g_config_cache = new_node;
    }
}

int mwo_config_init(void) {
    // Clear old cache
    mwo_config_cleanup();

    // Load defaults into memory cache
    update_or_add_cache("theme", "orange");
    update_or_add_cache("sound", "true");
    update_or_add_cache("vsync", "true");
    update_or_add_cache("resolution", "1280x800");
    update_or_add_cache("perf_mode", "high");

    // Try loading persisted settings from DB
    mwo_config_load();

    return 0;
}

int mwo_config(void) {
    return mwo_config_init();
}

void mwo_config_cleanup(void) {
    ConfigNode* curr = g_config_cache;
    while (curr) {
        ConfigNode* next = curr->next;
        free(curr);
        curr = next;
    }
    g_config_cache = NULL;
}

const char* mwo_config_get(const char* key, const char* default_val) {
    if (!key) return default_val;

    // Check in-memory cache first
    ConfigNode* node = find_node(key);
    if (node) {
        return node->value;
    }

    // Query DB if missing from cache
    char* db_val = mwo_db_setting_get(key, "system", NULL);
    if (db_val) {
        update_or_add_cache(key, db_val);
        free(db_val);
        node = find_node(key);
        return node ? node->value : default_val;
    }

    return default_val;
}

int mwo_config_set(const char* key, const char* value) {
    if (!key || !value) return -1;

    // Update in-memory cache
    update_or_add_cache(key, value);

    // Persist to DB
    return mwo_db_setting_set(key, value, "system");
}

const char* mwo_config_get_string(const char* key, const char* default_val) {
    return mwo_config_get(key, default_val);
}

void mwo_config_set_string(const char* key, const char* value) {
    mwo_config_set(key, value);
}

int mwo_config_get_int(const char* key, int default_val) {
    char def_str[32];
    snprintf(def_str, sizeof(def_str), "%d", default_val);
    const char* val = mwo_config_get(key, def_str);
    return val ? atoi(val) : default_val;
}

int mwo_config_set_int(const char* key, int value) {
    char val_str[32];
    snprintf(val_str, sizeof(val_str), "%d", value);
    return mwo_config_set(key, val_str);
}

bool mwo_config_get_bool(const char* key, bool default_val) {
    const char* def_str = default_val ? "true" : "false";
    const char* val = mwo_config_get(key, def_str);
    if (!val) return default_val;
    return (strcmp(val, "true") == 0 || strcmp(val, "1") == 0 || strcmp(val, "yes") == 0);
}

int mwo_config_set_bool(const char* key, bool value) {
    return mwo_config_set(key, value ? "true" : "false");
}

int mwo_config_save(void) {
    ConfigNode* curr = g_config_cache;
    int err = 0;
    while (curr) {
        if (mwo_db_setting_set(curr->key, curr->value, "system") != 0) {
            err = -1;
        }
        curr = curr->next;
    }
    return err;
}

int mwo_config_load(void) {
    // Queries DB setting for key or loads cached nodes
    ConfigNode* curr = g_config_cache;
    while (curr) {
        char* db_val = mwo_db_setting_get(curr->key, "system", NULL);
        if (db_val) {
            snprintf(curr->value, sizeof(curr->value), "%s", db_val);
            free(db_val);
        }
        curr = curr->next;
    }
    return 0;
}
