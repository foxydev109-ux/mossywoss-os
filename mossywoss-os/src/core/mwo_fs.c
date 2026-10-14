#include "mwo_fs.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <dirent.h>
#include <unistd.h>
#include <errno.h>
#include <limits.h>

static char g_base_path[512] = "MWO_SYSTEM";
static char g_base_realpath[PATH_MAX] = "";

static bool ensure_parent_dirs(const char* full_path);

static bool resolve_full_path(const char* input_path, char* out_buf, size_t out_size) {
    if (!input_path) {
        snprintf(out_buf, out_size, "%s", g_base_path);
        return true;
    }

    // Reject path traversal attempts
    if (strstr(input_path, "..") != NULL) {
        return false;
    }

    while (*input_path == '/' || *input_path == '\\') {
        input_path++;
    }

    if (strlen(input_path) == 0) {
        snprintf(out_buf, out_size, "%s", g_base_path);
    } else {
        snprintf(out_buf, out_size, "%s/%s", g_base_path, input_path);
    }

    // Optional canonical check if base realpath was resolved
    if (g_base_realpath[0] != '\0') {
        char resolved[PATH_MAX];
        if (realpath(out_buf, resolved) != NULL) {
            if (strncmp(resolved, g_base_realpath, strlen(g_base_realpath)) != 0) {
                return false;
            }
        }
    }

    return true;
}

static int mkdir_p_internal(const char* path) {
    if (!path || strlen(path) == 0) return 0;

    char tmp[PATH_MAX];
    snprintf(tmp, sizeof(tmp), "%s", path);
    size_t len = strlen(tmp);

    for (size_t i = 1; i < len; i++) {
        if (tmp[i] == '/' || tmp[i] == '\\') {
            tmp[i] = '\0';
            struct stat st;
            if (stat(tmp, &st) != 0) {
#ifdef _WIN32
                mkdir(tmp);
#else
                mkdir(tmp, 0755);
#endif
            }
            tmp[i] = '/';
        }
    }

    struct stat st;
    if (stat(tmp, &st) != 0) {
#ifdef _WIN32
        if (mkdir(tmp) != 0 && errno != EEXIST) return -1;
#else
        if (mkdir(tmp, 0755) != 0 && errno != EEXIST) return -1;
#endif
    }
    return 0;
}

static void create_user_tree(const char* base, const char* username) {
    const char* subdirs[] = {
        "Desktop", "Documents", "Downloads", "Pictures",
        "Music", "Videos", "Games", "WebApps", "AppData", "Settings"
    };
    char path[PATH_MAX];
    for (size_t i = 0; i < sizeof(subdirs)/sizeof(subdirs[0]); i++) {
        snprintf(path, sizeof(path), "%s/users/%s/%s", base, username, subdirs[i]);
        mkdir_p_internal(path);
    }
}

int mwo_fs_init(const char* base_path) {
    if (base_path && strlen(base_path) > 0) {
        snprintf(g_base_path, sizeof(g_base_path), "%s", base_path);
    } else {
        snprintf(g_base_path, sizeof(g_base_path), "MWO_SYSTEM");
    }

    // Create base directory
    mkdir_p_internal(g_base_path);

    if (realpath(g_base_path, g_base_realpath) == NULL) {
        snprintf(g_base_realpath, sizeof(g_base_realpath), "%s", g_base_path);
    }

    const char* system_dirs[] = {
        "system", "registry", "database", "settings",
        "applications", "assets", "themes", "cache", "logs", "desktop"
    };

    char full[PATH_MAX];
    for (size_t i = 0; i < sizeof(system_dirs)/sizeof(system_dirs[0]); i++) {
        snprintf(full, sizeof(full), "%s/%s", g_base_path, system_dirs[i]);
        mkdir_p_internal(full);
    }

    create_user_tree(g_base_path, "default");
    create_user_tree(g_base_path, "admin");

    return 0;
}

void mwo_fs_cleanup(void) {
    // Nothing to free
}

bool mwo_fs_exists(const char* path) {
    char full[PATH_MAX];
    if (!resolve_full_path(path, full, sizeof(full))) return false;

    struct stat st;
    return (stat(full, &st) == 0);
}

bool mwo_fs_is_dir(const char* path) {
    char full[PATH_MAX];
    if (!resolve_full_path(path, full, sizeof(full))) return false;

    struct stat st;
    if (stat(full, &st) == 0) {
        return S_ISDIR(st.st_mode);
    }
    return false;
}

char* mwo_fs_read_text(const char* path) {
    char full[PATH_MAX];
    if (!resolve_full_path(path, full, sizeof(full))) return NULL;

    FILE* f = fopen(full, "rb");
    if (!f) return NULL;

    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    fseek(f, 0, SEEK_SET);

    if (sz < 0) {
        fclose(f);
        return NULL;
    }

    char* buf = (char*)malloc((size_t)sz + 1);
    if (!buf) {
        fclose(f);
        return NULL;
    }

    size_t read_bytes = fread(buf, 1, (size_t)sz, f);
    buf[read_bytes] = '\0';
    fclose(f);
    return buf;
}

char* mwo_fs_read(const char* path) {
    return mwo_fs_read_text(path);
}

static bool ensure_parent_dirs(const char* full_path) {
    char parent[PATH_MAX];
    snprintf(parent, sizeof(parent), "%s", full_path);
    char* last_slash = strrchr(parent, '/');
    if (!last_slash) last_slash = strrchr(parent, '\\');
    if (last_slash) {
        *last_slash = '\0';
        return (mkdir_p_internal(parent) == 0);
    }
    return true;
}

bool mwo_fs_write_text(const char* path, const char* content) {
    if (!content) return false;
    char full[PATH_MAX];
    if (!resolve_full_path(path, full, sizeof(full))) return false;

    ensure_parent_dirs(full);

    FILE* f = fopen(full, "wb");
    if (!f) return false;

    fputs(content, f);
    fclose(f);
    return true;
}

size_t mwo_fs_read_binary(const char* path, void* data, size_t size) {
    if (!data || size == 0) return 0;
    char full[PATH_MAX];
    if (!resolve_full_path(path, full, sizeof(full))) return 0;

    FILE* f = fopen(full, "rb");
    if (!f) return 0;

    size_t n = fread(data, 1, size, f);
    fclose(f);
    return n;
}

bool mwo_fs_write_binary(const char* path, const void* data, size_t size) {
    if (!data) return false;
    char full[PATH_MAX];
    if (!resolve_full_path(path, full, sizeof(full))) return false;

    ensure_parent_dirs(full);

    FILE* f = fopen(full, "wb");
    if (!f) return false;

    size_t n = fwrite(data, 1, size, f);
    fclose(f);
    return (n == size);
}

int mwo_fs_mkdir(const char* path) {
    char full[PATH_MAX];
    if (!resolve_full_path(path, full, sizeof(full))) return -1;
    return mkdir_p_internal(full);
}

static int remove_recursive(const char* path) {
    struct stat st;
    if (stat(path, &st) != 0) return -1;

    if (S_ISDIR(st.st_mode)) {
        DIR* d = opendir(path);
        if (!d) return -1;

        struct dirent* dp;
        while ((dp = readdir(d)) != NULL) {
            if (strcmp(dp->d_name, ".") == 0 || strcmp(dp->d_name, "..") == 0)
                continue;
            char sub[PATH_MAX];
            snprintf(sub, sizeof(sub), "%s/%s", path, dp->d_name);
            remove_recursive(sub);
        }
        closedir(d);
        return rmdir(path);
    } else {
        return unlink(path);
    }
}

int mwo_fs_delete(const char* path) {
    char full[PATH_MAX];
    if (!resolve_full_path(path, full, sizeof(full))) return -1;
    return remove_recursive(full);
}

int mwo_fs_rm(const char* path) {
    return mwo_fs_delete(path);
}

int mwo_fs_touch(const char* path) {
    char full[PATH_MAX];
    if (!resolve_full_path(path, full, sizeof(full))) return -1;

    ensure_parent_dirs(full);

    FILE* f = fopen(full, "ab");
    if (!f) return -1;
    fclose(f);
    return 0;
}

int mwo_fs_list(const char* dir, MWOFsEntry** entries, int* count) {
    if (!entries || !count) return -1;
    *entries = NULL;
    *count = 0;

    char full[PATH_MAX];
    if (!resolve_full_path(dir, full, sizeof(full))) return -1;

    DIR* d = opendir(full);
    if (!d) return -1;

    int capacity = 16;
    MWOFsEntry* list = (MWOFsEntry*)malloc(sizeof(MWOFsEntry) * capacity);
    if (!list) {
        closedir(d);
        return -1;
    }

    int n = 0;
    struct dirent* dp;
    while ((dp = readdir(d)) != NULL) {
        if (strcmp(dp->d_name, ".") == 0 || strcmp(dp->d_name, "..") == 0)
            continue;

        if (n >= capacity) {
            capacity *= 2;
            MWOFsEntry* tmp = (MWOFsEntry*)realloc(list, sizeof(MWOFsEntry) * capacity);
            if (!tmp) {
                free(list);
                closedir(d);
                return -1;
            }
            list = tmp;
        }

        snprintf(list[n].name, sizeof(list[n].name), "%s", dp->d_name);

        char child_path[PATH_MAX];
        snprintf(child_path, sizeof(child_path), "%s/%s", full, dp->d_name);

        struct stat st;
        if (stat(child_path, &st) == 0) {
            list[n].is_dir = S_ISDIR(st.st_mode) ? 1 : 0;
            list[n].type = list[n].is_dir ? MWO_FILE_TYPE_DIR : MWO_FILE_TYPE_FILE;
            list[n].size = (size_t)st.st_size;
            list[n].mtime = st.st_mtime;
        } else {
            list[n].is_dir = 0;
            list[n].type = MWO_FILE_TYPE_FILE;
            list[n].size = 0;
            list[n].mtime = 0;
        }
        n++;
    }
    closedir(d);

    *entries = list;
    *count = n;
    return 0;
}

void mwo_fs_free_entries(MWOFsEntry* entries, int count) {
    (void)count;
    if (entries) free(entries);
}

int mwo_fs_rename(const char* old_path, const char* new_path) {
    char old_full[PATH_MAX], new_full[PATH_MAX];
    if (!resolve_full_path(old_path, old_full, sizeof(old_full))) return -1;
    if (!resolve_full_path(new_path, new_full, sizeof(new_full))) return -1;

    ensure_parent_dirs(new_full);
    return rename(old_full, new_full);
}

int mwo_fs_mv(const char* src, const char* dst) {
    return mwo_fs_rename(src, dst);
}

int mwo_fs_move(const char* src, const char* dst) {
    return mwo_fs_rename(src, dst);
}

int mwo_fs_copy(const char* src, const char* dst) {
    char src_full[PATH_MAX], dst_full[PATH_MAX];
    if (!resolve_full_path(src, src_full, sizeof(src_full))) return -1;
    if (!resolve_full_path(dst, dst_full, sizeof(dst_full))) return -1;

    struct stat st;
    if (stat(src_full, &st) != 0) return -1;

    ensure_parent_dirs(dst_full);

    if (S_ISDIR(st.st_mode)) {
        mkdir_p_internal(dst_full);
        DIR* d = opendir(src_full);
        if (!d) return -1;
        struct dirent* dp;
        while ((dp = readdir(d)) != NULL) {
            if (strcmp(dp->d_name, ".") == 0 || strcmp(dp->d_name, "..") == 0) continue;
            char s_sub[PATH_MAX], d_sub[PATH_MAX];
            snprintf(s_sub, sizeof(s_sub), "%s/%s", src, dp->d_name);
            snprintf(d_sub, sizeof(d_sub), "%s/%s", dst, dp->d_name);
            mwo_fs_copy(s_sub, d_sub);
        }
        closedir(d);
        return 0;
    } else {
        FILE* in = fopen(src_full, "rb");
        if (!in) return -1;
        FILE* out = fopen(dst_full, "wb");
        if (!out) { fclose(in); return -1; }

        char buf[8192];
        size_t n;
        while ((n = fread(buf, 1, sizeof(buf), in)) > 0) {
            fwrite(buf, 1, n, out);
        }
        fclose(in);
        fclose(out);
        return 0;
    }
}

int mwo_fs_cp(const char* src, const char* dst) {
    return mwo_fs_copy(src, dst);
}

int mwo_fs_stat(const char* path, MWOFsEntry* entry) {
    if (!entry) return -1;
    char full[PATH_MAX];
    if (!resolve_full_path(path, full, sizeof(full))) return -1;

    struct stat st;
    if (stat(full, &st) != 0) return -1;

    const char* last_slash = strrchr(path, '/');
    if (!last_slash) last_slash = strrchr(path, '\\');
    const char* name = last_slash ? last_slash + 1 : path;

    snprintf(entry->name, sizeof(entry->name), "%s", name);
    entry->is_dir = S_ISDIR(st.st_mode) ? 1 : 0;
    entry->type = entry->is_dir ? MWO_FILE_TYPE_DIR : MWO_FILE_TYPE_FILE;
    entry->size = (size_t)st.st_size;
    entry->mtime = st.st_mtime;

    return 0;
}
