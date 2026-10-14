#include "mwo_download.h"
#include "mwo_db.h"
#include "mwo_fs.h"
#include "mwo_log.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <pthread.h>
#include <curl/curl.h>

#define MAX_ACTIVE_DOWNLOADS 32

typedef struct {
    int id;
    char url[1024];
    char destination[512];
    int64_t resume_offset;
    bool pause_requested;
    bool cancel_requested;
    pthread_t thread;
    bool active;
} ActiveTask;

static ActiveTask g_tasks[MAX_ACTIVE_DOWNLOADS];
static pthread_mutex_t g_download_mutex = PTHREAD_MUTEX_INITIALIZER;
static bool g_curl_initialized = false;

void mwo_download_free_list(MWODownload** downloads, int count) {
    if (!downloads) return;
    for (int i = 0; i < count; i++) {
        if (downloads[i]) free(downloads[i]);
    }
    free(downloads);
}

MWResult mwo_download_init(void) {
    pthread_mutex_lock(&g_download_mutex);
    if (!g_curl_initialized) {
        curl_global_init(CURL_GLOBAL_ALL);
        g_curl_initialized = true;
    }
    memset(g_tasks, 0, sizeof(g_tasks));
    pthread_mutex_unlock(&g_download_mutex);

    // Ensure Downloads directory exists
    mwo_fs_mkdir("Downloads");

    mwo_log(LOG_INFO, "Download manager initialized.");
    return MW_OK;
}

static size_t write_data_cb(void *ptr, size_t size, size_t nmemb, void *stream) {
    FILE *f = (FILE*)stream;
    return fwrite(ptr, size, nmemb, f);
}

static int xferinfo_cb(void *clientp, curl_off_t dltotal, curl_off_t dlnow, curl_off_t ultotal, curl_off_t ulnow) {
    (void)ultotal;
    (void)ulnow;
    ActiveTask *task = (ActiveTask*)clientp;
    if (!task) return 0;

    pthread_mutex_lock(&g_download_mutex);
    if (task->cancel_requested || task->pause_requested) {
        pthread_mutex_unlock(&g_download_mutex);
        return 1; // Non-zero aborts transfer
    }
    pthread_mutex_unlock(&g_download_mutex);

    if (dltotal > 0) {
        char sql[256];
        snprintf(sql, sizeof(sql),
                 "UPDATE downloads SET size = %lld, downloaded_bytes = %lld WHERE id = %d;",
                 (long long)(dltotal + task->resume_offset),
                 (long long)(dlnow + task->resume_offset),
                 task->id);
        mwo_db_exec(sql);
    }
    return 0;
}

static void* download_worker_thread(void *arg) {
    ActiveTask *task = (ActiveTask*)arg;

    CURL *curl = curl_easy_init();
    if (!curl) {
        mwo_log(LOG_ERROR, "Failed to initialize curl easy handle for download %d", task->id);
        char sql[256];
        snprintf(sql, sizeof(sql), "UPDATE downloads SET status = %d WHERE id = %d;", MWO_DOWNLOAD_FAILED, task->id);
        mwo_db_exec(sql);

        pthread_mutex_lock(&g_download_mutex);
        task->active = false;
        pthread_mutex_unlock(&g_download_mutex);
        return NULL;
    }

    // Update DB status to DOWNLOADING
    char sql_status[256];
    snprintf(sql_status, sizeof(sql_status), "UPDATE downloads SET status = %d WHERE id = %d;", MWO_DOWNLOAD_DOWNLOADING, task->id);
    mwo_db_exec(sql_status);

    // Resolve target path in base filesystem
    char full_dst[512];
    snprintf(full_dst, sizeof(full_dst), "./mwo_root/%s", task->destination);

    FILE *f = fopen(full_dst, task->resume_offset > 0 ? "ab" : "wb");
    if (!f) {
        mwo_log(LOG_ERROR, "Failed to open destination file: %s", full_dst);
        curl_easy_cleanup(curl);
        snprintf(sql_status, sizeof(sql_status), "UPDATE downloads SET status = %d WHERE id = %d;", MWO_DOWNLOAD_FAILED, task->id);
        mwo_db_exec(sql_status);

        pthread_mutex_lock(&g_download_mutex);
        task->active = false;
        pthread_mutex_unlock(&g_download_mutex);
        return NULL;
    }

    curl_easy_setopt(curl, CURLOPT_URL, task->url);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_data_cb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, f);
    curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 0L);
    curl_easy_setopt(curl, CURLOPT_XFERINFOFUNCTION, xferinfo_cb);
    curl_easy_setopt(curl, CURLOPT_XFERINFODATA, task);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl, CURLOPT_USERAGENT, "MossyWoss-OS/1.0");

    if (task->resume_offset > 0) {
        curl_easy_setopt(curl, CURLOPT_RESUME_FROM_LARGE, (curl_off_t)task->resume_offset);
    }

    CURLcode res = curl_easy_perform(curl);
    fclose(f);
    curl_easy_cleanup(curl);

    pthread_mutex_lock(&g_download_mutex);
    bool canceled = task->cancel_requested;
    bool paused = task->pause_requested;
    pthread_mutex_unlock(&g_download_mutex);

    time_t now = time(NULL);
    if (canceled) {
        snprintf(sql_status, sizeof(sql_status), "UPDATE downloads SET status = %d WHERE id = %d;", MWO_DOWNLOAD_CANCELLED, task->id);
        mwo_log(LOG_INFO, "Download %d cancelled.", task->id);
    } else if (paused) {
        snprintf(sql_status, sizeof(sql_status), "UPDATE downloads SET status = %d WHERE id = %d;", MWO_DOWNLOAD_PAUSED, task->id);
        mwo_log(LOG_INFO, "Download %d paused.", task->id);
    } else if (res == CURLE_OK) {
        snprintf(sql_status, sizeof(sql_status),
                 "UPDATE downloads SET status = %d, completed_time = %lld WHERE id = %d;",
                 MWO_DOWNLOAD_COMPLETED, (long long)now, task->id);
        mwo_log(LOG_INFO, "Download %d completed successfully.", task->id);
    } else {
        snprintf(sql_status, sizeof(sql_status), "UPDATE downloads SET status = %d WHERE id = %d;", MWO_DOWNLOAD_FAILED, task->id);
        mwo_log(LOG_ERROR, "Download %d failed: %s", task->id, curl_easy_strerror(res));
    }
    mwo_db_exec(sql_status);

    pthread_mutex_lock(&g_download_mutex);
    task->active = false;
    pthread_mutex_unlock(&g_download_mutex);

    return NULL;
}

int mwo_download_start(const char* url, const char* destination) {
    if (!url || strlen(url) == 0) return -1;

    char filename[256] = "file.bin";
    const char *last_slash = strrchr(url, '/');
    if (last_slash && strlen(last_slash + 1) > 0) {
        snprintf(filename, sizeof(filename), "%s", last_slash + 1);
    }

    char final_dst[512];
    if (destination && strlen(destination) > 0) {
        snprintf(final_dst, sizeof(final_dst), "%s", destination);
    } else {
        snprintf(final_dst, sizeof(final_dst), "Downloads/%s", filename);
    }

    time_t now = time(NULL);
    char sql[1024];
    snprintf(sql, sizeof(sql),
             "INSERT INTO downloads (url, filename, destination, size, downloaded_bytes, status, created_time, completed_time) "
             "VALUES ('%s', '%s', '%s', 0, 0, %d, %lld, 0);",
             url, filename, final_dst, MWO_DOWNLOAD_QUEUED, (long long)now);

    if (mwo_db_exec(sql) != MW_OK) return -1;

    // Get inserted ID
    int download_id = -1;
    MWOApp *dummy = NULL; int count = 0; // standard call to exec
    sqlite3_stmt *stmt = NULL;
    if (mwo_db_prepare("SELECT MAX(id) FROM downloads;", &stmt) == MW_OK) {
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            download_id = sqlite3_column_int(stmt, 0);
        }
        sqlite3_finalize(stmt);
    }

    if (download_id <= 0) return -1;

    pthread_mutex_lock(&g_download_mutex);
    int slot = -1;
    for (int i = 0; i < MAX_ACTIVE_DOWNLOADS; i++) {
        if (!g_tasks[i].active) {
            slot = i;
            break;
        }
    }

    if (slot != -1) {
        g_tasks[slot].id = download_id;
        snprintf(g_tasks[slot].url, sizeof(g_tasks[slot].url), "%s", url);
        snprintf(g_tasks[slot].destination, sizeof(g_tasks[slot].destination), "%s", final_dst);
        g_tasks[slot].resume_offset = 0;
        g_tasks[slot].pause_requested = false;
        g_tasks[slot].cancel_requested = false;
        g_tasks[slot].active = true;

        pthread_create(&g_tasks[slot].thread, NULL, download_worker_thread, &g_tasks[slot]);
        pthread_detach(g_tasks[slot].thread);
    }
    pthread_mutex_unlock(&g_download_mutex);

    return download_id;
}

MWResult mwo_download_pause(int download_id) {
    pthread_mutex_lock(&g_download_mutex);
    for (int i = 0; i < MAX_ACTIVE_DOWNLOADS; i++) {
        if (g_tasks[i].active && g_tasks[i].id == download_id) {
            g_tasks[i].pause_requested = true;
            pthread_mutex_unlock(&g_download_mutex);
            return MW_OK;
        }
    }
    pthread_mutex_unlock(&g_download_mutex);

    char sql[256];
    snprintf(sql, sizeof(sql), "UPDATE downloads SET status = %d WHERE id = %d;", MWO_DOWNLOAD_PAUSED, download_id);
    return mwo_db_exec(sql);
}

MWResult mwo_download_resume(int download_id) {
    MWODownload info;
    if (mwo_download_get_status(download_id, &info) != MW_OK) return MW_ERR;

    pthread_mutex_lock(&g_download_mutex);
    int slot = -1;
    for (int i = 0; i < MAX_ACTIVE_DOWNLOADS; i++) {
        if (!g_tasks[i].active) {
            slot = i;
            break;
        }
    }

    if (slot != -1) {
        g_tasks[slot].id = download_id;
        snprintf(g_tasks[slot].url, sizeof(g_tasks[slot].url), "%s", info.url);
        snprintf(g_tasks[slot].destination, sizeof(g_tasks[slot].destination), "%s", info.destination);
        g_tasks[slot].resume_offset = info.downloaded_bytes;
        g_tasks[slot].pause_requested = false;
        g_tasks[slot].cancel_requested = false;
        g_tasks[slot].active = true;

        pthread_create(&g_tasks[slot].thread, NULL, download_worker_thread, &g_tasks[slot]);
        pthread_detach(g_tasks[slot].thread);
        pthread_mutex_unlock(&g_download_mutex);
        return MW_OK;
    }
    pthread_mutex_unlock(&g_download_mutex);
    return MW_ERR;
}

MWResult mwo_download_cancel(int download_id) {
    pthread_mutex_lock(&g_download_mutex);
    for (int i = 0; i < MAX_ACTIVE_DOWNLOADS; i++) {
        if (g_tasks[i].active && g_tasks[i].id == download_id) {
            g_tasks[i].cancel_requested = true;
            pthread_mutex_unlock(&g_download_mutex);
            return MW_OK;
        }
    }
    pthread_mutex_unlock(&g_download_mutex);

    char sql[256];
    snprintf(sql, sizeof(sql), "UPDATE downloads SET status = %d WHERE id = %d;", MWO_DOWNLOAD_CANCELLED, download_id);
    return mwo_db_exec(sql);
}

MWResult mwo_download_get_status(int download_id, MWODownload* out) {
    if (!out) return MW_ERR;
    memset(out, 0, sizeof(MWODownload));

    char sql[256];
    snprintf(sql, sizeof(sql),
             "SELECT id, url, filename, destination, size, downloaded_bytes, status, created_time, completed_time "
             "FROM downloads WHERE id = %d;", download_id);

    sqlite3_stmt *stmt = NULL;
    if (mwo_db_prepare(sql, &stmt) != MW_OK) return MW_ERR;

    MWResult res = MW_NOTFOUND;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        out->id = sqlite3_column_int(stmt, 0);
        const char *url = (const char*)sqlite3_column_text(stmt, 1);
        const char *fn = (const char*)sqlite3_column_text(stmt, 2);
        const char *dst = (const char*)sqlite3_column_text(stmt, 3);
        if (url) snprintf(out->url, sizeof(out->url), "%s", url);
        if (fn) snprintf(out->filename, sizeof(out->filename), "%s", fn);
        if (dst) snprintf(out->destination, sizeof(out->destination), "%s", dst);

        out->size = sqlite3_column_int64(stmt, 4);
        out->downloaded_bytes = sqlite3_column_int64(stmt, 5);
        out->status = (MWODownloadStatus)sqlite3_column_int(stmt, 6);
        out->created_time = (time_t)sqlite3_column_int64(stmt, 7);
        out->completed_time = (time_t)sqlite3_column_int64(stmt, 8);
        res = MW_OK;
    }
    sqlite3_finalize(stmt);
    return res;
}

MWResult mwo_download_list(MWODownload*** downloads, int* count) {
    if (!downloads || !count) return MW_ERR;
    *downloads = NULL;
    *count = 0;

    const char *sql = "SELECT id, url, filename, destination, size, downloaded_bytes, status, created_time, completed_time FROM downloads;";
    sqlite3_stmt *stmt = NULL;
    if (mwo_db_prepare(sql, &stmt) != MW_OK) return MW_ERR;

    int capacity = 16;
    int n = 0;
    MWODownload **list = (MWODownload**)malloc(capacity * sizeof(MWODownload*));

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        if (n >= capacity) {
            capacity *= 2;
            list = (MWODownload**)realloc(list, capacity * sizeof(MWODownload*));
        }

        MWODownload *dl = (MWODownload*)calloc(1, sizeof(MWODownload));
        dl->id = sqlite3_column_int(stmt, 0);
        const char *url = (const char*)sqlite3_column_text(stmt, 1);
        const char *fn = (const char*)sqlite3_column_text(stmt, 2);
        const char *dst = (const char*)sqlite3_column_text(stmt, 3);
        if (url) snprintf(dl->url, sizeof(dl->url), "%s", url);
        if (fn) snprintf(dl->filename, sizeof(dl->filename), "%s", fn);
        if (dst) snprintf(dl->destination, sizeof(dl->destination), "%s", dst);

        dl->size = sqlite3_column_int64(stmt, 4);
        dl->downloaded_bytes = sqlite3_column_int64(stmt, 5);
        dl->status = (MWODownloadStatus)sqlite3_column_int(stmt, 6);
        dl->created_time = (time_t)sqlite3_column_int64(stmt, 7);
        dl->completed_time = (time_t)sqlite3_column_int64(stmt, 8);

        list[n++] = dl;
    }
    sqlite3_finalize(stmt);

    *downloads = list;
    *count = n;
    return MW_OK;
}

MWResult mwo_download_delete(int download_id) {
    mwo_download_cancel(download_id);

    char sql[256];
    snprintf(sql, sizeof(sql), "DELETE FROM downloads WHERE id = %d;", download_id);
    return mwo_db_exec(sql);
}
