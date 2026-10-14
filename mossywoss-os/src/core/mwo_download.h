#pragma once

#include "mwo_types.h"
#include <stdbool.h>

MWResult mwo_download_init(void);
int mwo_download_start(const char* url, const char* destination);
MWResult mwo_download_pause(int download_id);
MWResult mwo_download_resume(int download_id);
MWResult mwo_download_cancel(int download_id);
MWResult mwo_download_list(MWODownload*** downloads, int* count);
MWResult mwo_download_get_status(int download_id, MWODownload* out);
MWResult mwo_download_delete(int download_id);
void mwo_download_free_list(MWODownload** downloads, int count);
