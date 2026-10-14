#ifndef MWO_DB_H
#define MWO_DB_H

#include "mwo_types.h"
#include <stdbool.h>
#include <sqlite3.h>

#ifdef __cplusplus
extern "C" {
#endif

#ifdef __cplusplus
int mwo_db_init(const char* path = nullptr);
#else
int mwo_db_init(const char* path);
#endif

void mwo_db_close(void);
void mwo_db_cleanup(void);
int mwo_db_exec(const char* sql);
bool mwo_db_execute(const char* sql);
int mwo_db_prepare(const char* sql, sqlite3_stmt** stmt);

int mwo_db_user_create(const char* username, const char* pin_hash);
int mwo_db_user_auth(const char* username, const char* pin_hash);
int mwo_db_user_list(MWOUser** users, int* count);

int mwo_db_app_register(const MWOApp* app);
int mwo_db_app_list(MWOApp** apps, int* count);
int mwo_db_app_unregister(const char* id);

int mwo_db_setting_set(const char* key, const char* value, const char* user_id);
char* mwo_db_setting_get(const char* key, const char* user_id, const char* default_val);

int mwo_db_download_add(const MWODownload* dl);
int mwo_db_download_update(int id, MWODownloadStatus status, int64_t downloaded);
int mwo_db_download_list(MWODownload** downloads, int* count);
int mwo_db_download_delete(int id);

#ifdef __cplusplus
}
#endif

#endif // MWO_DB_H
