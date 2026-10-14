#pragma once

#include "mwo_types.h"
#include <stdbool.h>

MWResult mwo_appreg_init(void);
MWResult mwo_appreg_register(const MWOApp* app);
MWResult mwo_appreg_unregister(const char* app_id);
MWResult mwo_appreg_list(MWOApp*** apps, int* count);
MWResult mwo_appreg_list_by_category(const char* category, MWOApp*** apps, int* count);
MWResult mwo_appreg_find(const char* app_id, MWOApp* out);
MWResult mwo_appreg_enable(const char* app_id);
MWResult mwo_appreg_disable(const char* app_id);
void mwo_appreg_free_list(MWOApp** apps, int count);
