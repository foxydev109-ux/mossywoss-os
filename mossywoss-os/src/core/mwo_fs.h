#ifndef MWO_FS_H
#define MWO_FS_H

#include "mwo_types.h"
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <time.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct MWOFsEntry {
    char name[256];
    int is_dir;
    MWOFileType type;
    size_t size;
    time_t mtime;
} MWOFsEntry;

typedef struct MWOFsEntry mwo_fs_entry_t;

#ifdef __cplusplus
int mwo_fs_init(const char* base_path = nullptr);
#else
int mwo_fs_init(const char* base_path);
#endif

void mwo_fs_cleanup(void);
bool mwo_fs_exists(const char* path);
bool mwo_fs_is_dir(const char* path);
char* mwo_fs_read_text(const char* path);
char* mwo_fs_read(const char* path);
bool mwo_fs_write_text(const char* path, const char* content);
size_t mwo_fs_read_binary(const char* path, void* data, size_t size);
bool mwo_fs_write_binary(const char* path, const void* data, size_t size);
int mwo_fs_mkdir(const char* path);
int mwo_fs_delete(const char* path);
int mwo_fs_rm(const char* path);
int mwo_fs_touch(const char* path);
int mwo_fs_list(const char* dir, MWOFsEntry** entries, int* count);
void mwo_fs_free_entries(MWOFsEntry* entries, int count);
int mwo_fs_rename(const char* old_path, const char* new_path);
int mwo_fs_copy(const char* src, const char* dst);
int mwo_fs_cp(const char* src, const char* dst);
int mwo_fs_move(const char* src, const char* dst);
int mwo_fs_mv(const char* src, const char* dst);
int mwo_fs_stat(const char* path, MWOFsEntry* entry);

#ifdef __cplusplus
}
#endif

#endif // MWO_FS_H
