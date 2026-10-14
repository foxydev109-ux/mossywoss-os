#include "mwo_db.h"
#include "mwo_fs.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

static sqlite3* g_db = NULL;

int mwo_db_init(const char* path) {
    if (g_db) {
        return 0; // Already initialized
    }

    const char* db_path = path;
    if (!db_path || strlen(db_path) == 0) {
        db_path = "MWO_SYSTEM/database/mossywoss.db";
    }

    // Ensure database directory exists
    mwo_fs_mkdir("database");

    int rc = sqlite3_open(db_path, &g_db);
    if (rc != SQLITE_OK) {
        if (g_db) {
            sqlite3_close(g_db);
            g_db = NULL;
        }
        return -1;
    }

    // Create required tables
    const char* sql_users =
        "CREATE TABLE IF NOT EXISTS users ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "username TEXT UNIQUE NOT NULL, "
        "pin_hash TEXT NOT NULL, "
        "created INTEGER, "
        "last_login INTEGER"
        ");";

    const char* sql_apps =
        "CREATE TABLE IF NOT EXISTS apps ("
        "id TEXT PRIMARY KEY, "
        "name TEXT, "
        "version TEXT, "
        "type INTEGER, "
        "entry_file TEXT, "
        "icon TEXT, "
        "category TEXT, "
        "enabled INTEGER"
        ");";

    const char* sql_downloads =
        "CREATE TABLE IF NOT EXISTS downloads ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "url TEXT, "
        "filename TEXT, "
        "destination TEXT, "
        "size INTEGER, "
        "downloaded_bytes INTEGER, "
        "status INTEGER, "
        "created_time INTEGER, "
        "completed_time INTEGER"
        ");";

    const char* sql_settings =
        "CREATE TABLE IF NOT EXISTS settings ("
        "key TEXT NOT NULL, "
        "user_id TEXT NOT NULL DEFAULT 'system', "
        "value TEXT, "
        "PRIMARY KEY (key, user_id)"
        ");";

    if (mwo_db_exec(sql_users) != 0) return -1;
    if (mwo_db_exec(sql_apps) != 0) return -1;
    if (mwo_db_exec(sql_downloads) != 0) return -1;
    if (mwo_db_exec(sql_settings) != 0) return -1;

    return 0;
}

void mwo_db_close(void) {
    if (g_db) {
        sqlite3_close(g_db);
        g_db = NULL;
    }
}

void mwo_db_cleanup(void) {
    mwo_db_close();
}

int mwo_db_exec(const char* sql) {
    if (!g_db || !sql) return -1;
    char* err_msg = NULL;
    int rc = sqlite3_exec(g_db, sql, NULL, NULL, &err_msg);
    if (rc != SQLITE_OK) {
        if (err_msg) sqlite3_free(err_msg);
        return -1;
    }
    return 0;
}

bool mwo_db_execute(const char* sql) {
    return (mwo_db_exec(sql) == 0);
}

int mwo_db_prepare(const char* sql, sqlite3_stmt** stmt) {
    if (!g_db || !sql || !stmt) return -1;
    int rc = sqlite3_prepare_v2(g_db, sql, -1, stmt, NULL);
    return (rc == SQLITE_OK) ? 0 : -1;
}

int mwo_db_user_create(const char* username, const char* pin_hash) {
    if (!g_db || !username || !pin_hash) return -1;

    const char* sql = "INSERT INTO users (username, pin_hash, created, last_login) VALUES (?, ?, ?, ?);";
    sqlite3_stmt* stmt = NULL;
    if (sqlite3_prepare_v2(g_db, sql, -1, &stmt, NULL) != SQLITE_OK) return -1;

    time_t now = time(NULL);
    sqlite3_bind_text(stmt, 1, username, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, pin_hash, -1, SQLITE_STATIC);
    sqlite3_bind_int64(stmt, 3, (sqlite3_int64)now);
    sqlite3_bind_int64(stmt, 4, (sqlite3_int64)now);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE) ? 0 : -1;
}

int mwo_db_user_auth(const char* username, const char* pin_hash) {
    if (!g_db || !username || !pin_hash) return -1;

    const char* sql = "SELECT id FROM users WHERE username = ? AND pin_hash = ?;";
    sqlite3_stmt* stmt = NULL;
    if (sqlite3_prepare_v2(g_db, sql, -1, &stmt, NULL) != SQLITE_OK) return -1;

    sqlite3_bind_text(stmt, 1, username, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, pin_hash, -1, SQLITE_STATIC);

    int rc = sqlite3_step(stmt);
    int user_id = -1;
    if (rc == SQLITE_ROW) {
        user_id = sqlite3_column_int(stmt, 0);
    }
    sqlite3_finalize(stmt);

    if (user_id >= 0) {
        const char* sql_upd = "UPDATE users SET last_login = ? WHERE id = ?;";
        sqlite3_stmt* stmt_upd = NULL;
        if (sqlite3_prepare_v2(g_db, sql_upd, -1, &stmt_upd, NULL) == SQLITE_OK) {
            sqlite3_bind_int64(stmt_upd, 1, (sqlite3_int64)time(NULL));
            sqlite3_bind_int(stmt_upd, 2, user_id);
            sqlite3_step(stmt_upd);
            sqlite3_finalize(stmt_upd);
        }
        return 0;
    }
    return -1;
}

int mwo_db_user_list(MWOUser** users, int* count) {
    if (!g_db || !count) return -1;
    if (users) *users = NULL;
    *count = 0;

    const char* sql = "SELECT id, username, pin_hash, created, last_login FROM users;";
    sqlite3_stmt* stmt = NULL;
    if (sqlite3_prepare_v2(g_db, sql, -1, &stmt, NULL) != SQLITE_OK) return -1;

    int capacity = 8;
    MWOUser* list = (MWOUser*)malloc(sizeof(MWOUser) * capacity);
    if (!list) {
        sqlite3_finalize(stmt);
        return -1;
    }

    int n = 0;
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        if (n >= capacity) {
            capacity *= 2;
            MWOUser* tmp = (MWOUser*)realloc(list, sizeof(MWOUser) * capacity);
            if (!tmp) {
                free(list);
                sqlite3_finalize(stmt);
                return -1;
            }
            list = tmp;
        }

        list[n].id = sqlite3_column_int(stmt, 0);
        const unsigned char* u = sqlite3_column_text(stmt, 1);
        const unsigned char* p = sqlite3_column_text(stmt, 2);
        snprintf(list[n].username, sizeof(list[n].username), "%s", u ? (const char*)u : "");
        snprintf(list[n].pin_hash, sizeof(list[n].pin_hash), "%s", p ? (const char*)p : "");
        list[n].created = (time_t)sqlite3_column_int64(stmt, 3);
        list[n].last_login = (time_t)sqlite3_column_int64(stmt, 4);
        n++;
    }
    sqlite3_finalize(stmt);

    *count = n;
    if (users) {
        *users = list;
    } else {
        free(list);
    }
    return 0;
}

int mwo_db_app_register(const MWOApp* app) {
    if (!g_db || !app) return -1;

    const char* sql = "INSERT OR REPLACE INTO apps (id, name, version, type, entry_file, icon, category, enabled) "
                      "VALUES (?, ?, ?, ?, ?, ?, ?, ?);";
    sqlite3_stmt* stmt = NULL;
    if (sqlite3_prepare_v2(g_db, sql, -1, &stmt, NULL) != SQLITE_OK) return -1;

    sqlite3_bind_text(stmt, 1, app->id, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, app->name, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 3, app->version, -1, SQLITE_STATIC);
    sqlite3_bind_int(stmt, 4, (int)app->type);
    sqlite3_bind_text(stmt, 5, app->entry_file, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 6, app->icon, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 7, app->category, -1, SQLITE_STATIC);
    sqlite3_bind_int(stmt, 8, app->enabled ? 1 : 0);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE) ? 0 : -1;
}

int mwo_db_app_list(MWOApp** apps, int* count) {
    if (!g_db || !apps || !count) return -1;
    *apps = NULL;
    *count = 0;

    const char* sql = "SELECT id, name, version, type, entry_file, icon, category, enabled FROM apps;";
    sqlite3_stmt* stmt = NULL;
    if (sqlite3_prepare_v2(g_db, sql, -1, &stmt, NULL) != SQLITE_OK) return -1;

    int capacity = 16;
    MWOApp* list = (MWOApp*)malloc(sizeof(MWOApp) * capacity);
    if (!list) {
        sqlite3_finalize(stmt);
        return -1;
    }

    int n = 0;
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        if (n >= capacity) {
            capacity *= 2;
            MWOApp* tmp = (MWOApp*)realloc(list, sizeof(MWOApp) * capacity);
            if (!tmp) {
                free(list);
                sqlite3_finalize(stmt);
                return -1;
            }
            list = tmp;
        }

        const unsigned char* id = sqlite3_column_text(stmt, 0);
        const unsigned char* name = sqlite3_column_text(stmt, 1);
        const unsigned char* version = sqlite3_column_text(stmt, 2);
        int type = sqlite3_column_int(stmt, 3);
        const unsigned char* entry = sqlite3_column_text(stmt, 4);
        const unsigned char* icon = sqlite3_column_text(stmt, 5);
        const unsigned char* category = sqlite3_column_text(stmt, 6);
        int enabled = sqlite3_column_int(stmt, 7);

        snprintf(list[n].id, sizeof(list[n].id), "%s", id ? (const char*)id : "");
        snprintf(list[n].name, sizeof(list[n].name), "%s", name ? (const char*)name : "");
        snprintf(list[n].version, sizeof(list[n].version), "%s", version ? (const char*)version : "");
        list[n].type = (MWOAppType)type;
        snprintf(list[n].entry_file, sizeof(list[n].entry_file), "%s", entry ? (const char*)entry : "");
        snprintf(list[n].icon, sizeof(list[n].icon), "%s", icon ? (const char*)icon : "");
        snprintf(list[n].category, sizeof(list[n].category), "%s", category ? (const char*)category : "");
        list[n].enabled = (enabled != 0);
        n++;
    }
    sqlite3_finalize(stmt);

    *apps = list;
    *count = n;
    return 0;
}

int mwo_db_app_unregister(const char* id) {
    if (!g_db || !id) return -1;

    const char* sql = "DELETE FROM apps WHERE id = ?;";
    sqlite3_stmt* stmt = NULL;
    if (sqlite3_prepare_v2(g_db, sql, -1, &stmt, NULL) != SQLITE_OK) return -1;

    sqlite3_bind_text(stmt, 1, id, -1, SQLITE_STATIC);
    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE) ? 0 : -1;
}

int mwo_db_setting_set(const char* key, const char* value, const char* user_id) {
    if (!g_db || !key) return -1;

    const char* uid = (user_id && strlen(user_id) > 0) ? user_id : "system";
    const char* val = value ? value : "";

    const char* sql = "INSERT OR REPLACE INTO settings (key, user_id, value) VALUES (?, ?, ?);";
    sqlite3_stmt* stmt = NULL;
    if (sqlite3_prepare_v2(g_db, sql, -1, &stmt, NULL) != SQLITE_OK) return -1;

    sqlite3_bind_text(stmt, 1, key, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, uid, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 3, val, -1, SQLITE_STATIC);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE) ? 0 : -1;
}

char* mwo_db_setting_get(const char* key, const char* user_id, const char* default_val) {
    if (!g_db || !key) {
        return default_val ? strdup(default_val) : NULL;
    }

    const char* uid = (user_id && strlen(user_id) > 0) ? user_id : "system";

    const char* sql = "SELECT value FROM settings WHERE key = ? AND user_id = ?;";
    sqlite3_stmt* stmt = NULL;
    if (sqlite3_prepare_v2(g_db, sql, -1, &stmt, NULL) != SQLITE_OK) {
        return default_val ? strdup(default_val) : NULL;
    }

    sqlite3_bind_text(stmt, 1, key, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, uid, -1, SQLITE_STATIC);

    char* result = NULL;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        const unsigned char* val = sqlite3_column_text(stmt, 0);
        if (val) {
            result = strdup((const char*)val);
        }
    }
    sqlite3_finalize(stmt);

    if (!result && default_val) {
        result = strdup(default_val);
    }
    return result;
}

int mwo_db_download_add(const MWODownload* dl) {
    if (!g_db || !dl) return -1;

    const char* sql = "INSERT INTO downloads (url, filename, destination, size, downloaded_bytes, status, created_time, completed_time) "
                      "VALUES (?, ?, ?, ?, ?, ?, ?, ?);";
    sqlite3_stmt* stmt = NULL;
    if (sqlite3_prepare_v2(g_db, sql, -1, &stmt, NULL) != SQLITE_OK) return -1;

    sqlite3_bind_text(stmt, 1, dl->url, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, dl->filename, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 3, dl->destination, -1, SQLITE_STATIC);
    sqlite3_bind_int64(stmt, 4, dl->size);
    sqlite3_bind_int64(stmt, 5, dl->downloaded_bytes);
    sqlite3_bind_int(stmt, 6, (int)dl->status);
    sqlite3_bind_int64(stmt, 7, (sqlite3_int64)dl->created_time);
    sqlite3_bind_int64(stmt, 8, (sqlite3_int64)dl->completed_time);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE) ? 0 : -1;
}

int mwo_db_download_update(int id, MWODownloadStatus status, int64_t downloaded) {
    if (!g_db) return -1;

    const char* sql = "UPDATE downloads SET status = ?, downloaded_bytes = ? WHERE id = ?;";
    sqlite3_stmt* stmt = NULL;
    if (sqlite3_prepare_v2(g_db, sql, -1, &stmt, NULL) != SQLITE_OK) return -1;

    sqlite3_bind_int(stmt, 1, (int)status);
    sqlite3_bind_int64(stmt, 2, downloaded);
    sqlite3_bind_int(stmt, 3, id);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE) ? 0 : -1;
}

int mwo_db_download_list(MWODownload** downloads, int* count) {
    if (!g_db || !downloads || !count) return -1;
    *downloads = NULL;
    *count = 0;

    const char* sql = "SELECT id, url, filename, destination, size, downloaded_bytes, status, created_time, completed_time FROM downloads;";
    sqlite3_stmt* stmt = NULL;
    if (sqlite3_prepare_v2(g_db, sql, -1, &stmt, NULL) != SQLITE_OK) return -1;

    int capacity = 16;
    MWODownload* list = (MWODownload*)malloc(sizeof(MWODownload) * capacity);
    if (!list) {
        sqlite3_finalize(stmt);
        return -1;
    }

    int n = 0;
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        if (n >= capacity) {
            capacity *= 2;
            MWODownload* tmp = (MWODownload*)realloc(list, sizeof(MWODownload) * capacity);
            if (!tmp) {
                free(list);
                sqlite3_finalize(stmt);
                return -1;
            }
            list = tmp;
        }

        list[n].id = sqlite3_column_int(stmt, 0);
        const unsigned char* url = sqlite3_column_text(stmt, 1);
        const unsigned char* fn = sqlite3_column_text(stmt, 2);
        const unsigned char* dst = sqlite3_column_text(stmt, 3);
        snprintf(list[n].url, sizeof(list[n].url), "%s", url ? (const char*)url : "");
        snprintf(list[n].filename, sizeof(list[n].filename), "%s", fn ? (const char*)fn : "");
        snprintf(list[n].destination, sizeof(list[n].destination), "%s", dst ? (const char*)dst : "");
        list[n].size = sqlite3_column_int64(stmt, 4);
        list[n].downloaded_bytes = sqlite3_column_int64(stmt, 5);
        list[n].status = (MWODownloadStatus)sqlite3_column_int(stmt, 6);
        list[n].created_time = (time_t)sqlite3_column_int64(stmt, 7);
        list[n].completed_time = (time_t)sqlite3_column_int64(stmt, 8);
        n++;
    }
    sqlite3_finalize(stmt);

    *downloads = list;
    *count = n;
    return 0;
}

int mwo_db_download_delete(int id) {
    if (!g_db) return -1;

    const char* sql = "DELETE FROM downloads WHERE id = ?;";
    sqlite3_stmt* stmt = NULL;
    if (sqlite3_prepare_v2(g_db, sql, -1, &stmt, NULL) != SQLITE_OK) return -1;

    sqlite3_bind_int(stmt, 1, id);
    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE) ? 0 : -1;
}
