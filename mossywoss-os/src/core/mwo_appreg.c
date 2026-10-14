#include "mwo_appreg.h"
#include "mwo_db.h"
#include "mwo_log.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void mwo_appreg_free_list(MWOApp** apps, int count) {
    if (!apps) return;
    for (int i = 0; i < count; i++) {
        if (apps[i]) free(apps[i]);
    }
    free(apps);
}

MWResult mwo_appreg_init(void) {
    MWOApp *existing = NULL;
    int count = 0;
    if (mwo_db_app_list(&existing, &count) == MW_OK) {
        if (count == 0) {
            // Seed default apps across required categories
            MWOApp default_apps[] = {
                { "sys.settings", "Settings", "1.0.0", MWO_APP_MWO_INTERNAL, "/system/settings.elf", "settings.png", "Settings", true },
                { "sys.files", "File Manager", "1.0.0", MWO_APP_MWO_INTERNAL, "/system/files.elf", "files.png", "Files", true },
                { "sys.terminal", "Terminal", "1.0.0", MWO_APP_NATIVE_C, "/system/term.elf", "terminal.png", "Development", true },
                { "web.browser", "Web Browser", "1.0.0", MWO_APP_WEB_APP, "https://browser.mossywoss.os", "browser.png", "Internet", true },
                { "media.player", "Media Player", "1.0.0", MWO_APP_NATIVE_CPP, "/system/media.elf", "media.png", "Media", true },
                { "games.snake", "Snake Game", "1.0.0", MWO_APP_WEB_GAME, "/applications/snake/index.html", "snake.png", "Games", true },
                { "creative.paint", "Paint Studio", "1.0.0", MWO_APP_NATIVE_C, "/applications/paint/paint.elf", "paint.png", "Creative", true },
                { "util.calculator", "Calculator", "1.0.0", MWO_APP_MWO_INTERNAL, "/applications/calc/calc.elf", "calc.png", "Utilities", true },
                { "edu.wiki", "Encyclopedia", "1.0.0", MWO_APP_DOCUMENT, "/applications/wiki/doc.pdf", "wiki.png", "Education", true }
            };

            size_t num_defaults = sizeof(default_apps) / sizeof(default_apps[0]);
            for (size_t i = 0; i < num_defaults; i++) {
                mwo_db_app_register(&default_apps[i]);
            }
            mwo_log(LOG_INFO, "Registered %size_t default system applications.", num_defaults);
        } else {
            free(existing);
        }
    }
    mwo_log(LOG_INFO, "Application registry initialized.");
    return MW_OK;
}

MWResult mwo_appreg_register(const MWOApp* app) {
    if (!app) return MW_ERR;
    MWResult res = mwo_db_app_register(app);
    if (res == MW_OK) {
        mwo_log(LOG_INFO, "App registered: %s (%s)", app->name, app->id);
    }
    return res;
}

MWResult mwo_appreg_unregister(const char* app_id) {
    if (!app_id) return MW_ERR;

    char sql[256];
    snprintf(sql, sizeof(sql), "DELETE FROM apps WHERE id = '%s';", app_id);
    MWResult res = mwo_db_exec(sql);
    if (res == MW_OK) {
        mwo_log(LOG_INFO, "App unregistered: %s", app_id);
    }
    return res;
}

MWResult mwo_appreg_list(MWOApp*** apps, int* count) {
    if (!apps || !count) return MW_ERR;

    MWOApp *db_apps = NULL;
    int db_count = 0;
    MWResult res = mwo_db_app_list(&db_apps, &db_count);
    if (res != MW_OK) return res;

    MWOApp **list = (MWOApp**)malloc(db_count * sizeof(MWOApp*));
    for (int i = 0; i < db_count; i++) {
        list[i] = (MWOApp*)malloc(sizeof(MWOApp));
        memcpy(list[i], &db_apps[i], sizeof(MWOApp));
    }
    free(db_apps);

    *apps = list;
    *count = db_count;
    return MW_OK;
}

MWResult mwo_appreg_list_by_category(const char* category, MWOApp*** apps, int* count) {
    if (!category || !apps || !count) return MW_ERR;

    MWOApp **all_apps = NULL;
    int total_count = 0;
    MWResult res = mwo_appreg_list(&all_apps, &total_count);
    if (res != MW_OK) return res;

    MWOApp **filtered = (MWOApp**)malloc(total_count * sizeof(MWOApp*));
    int match_count = 0;

    for (int i = 0; i < total_count; i++) {
        if (strcmp(all_apps[i]->category, category) == 0) {
            filtered[match_count++] = all_apps[i];
        } else {
            free(all_apps[i]);
        }
    }
    free(all_apps);

    *apps = filtered;
    *count = match_count;
    return MW_OK;
}

MWResult mwo_appreg_find(const char* app_id, MWOApp* out) {
    if (!app_id || !out) return MW_ERR;

    MWOApp *db_apps = NULL;
    int db_count = 0;
    if (mwo_db_app_list(&db_apps, &db_count) != MW_OK) return MW_ERR;

    MWResult res = MW_NOTFOUND;
    for (int i = 0; i < db_count; i++) {
        if (strcmp(db_apps[i].id, app_id) == 0) {
            memcpy(out, &db_apps[i], sizeof(MWOApp));
            res = MW_OK;
            break;
        }
    }
    free(db_apps);
    return res;
}

MWResult mwo_appreg_enable(const char* app_id) {
    if (!app_id) return MW_ERR;
    char sql[256];
    snprintf(sql, sizeof(sql), "UPDATE apps SET enabled = 1 WHERE id = '%s';", app_id);
    return mwo_db_exec(sql);
}

MWResult mwo_appreg_disable(const char* app_id) {
    if (!app_id) return MW_ERR;
    char sql[256];
    snprintf(sql, sizeof(sql), "UPDATE apps SET enabled = 0 WHERE id = '%s';", app_id);
    return mwo_db_exec(sql);
}
