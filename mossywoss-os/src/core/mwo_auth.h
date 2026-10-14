#ifndef MWO_AUTH_H
#define MWO_AUTH_H

#include "mwo_types.h"
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

int mwo_auth(void);
void mwo_auth_cleanup(void);
bool mwo_auth_verify_credentials(const char* username, const char* password);

int mwo_auth_hash_pin(const char* pin, char* hash_hex_out);
bool mwo_auth_verify_pin(const char* pin, const char* stored_hash);
int mwo_auth_create_user(const char* username, const char* pin);
int mwo_auth_login(const char* username, const char* pin);
void mwo_auth_logout(void);
int mwo_auth_current_user(MWOUser* out);

#ifdef __cplusplus
}
#endif

#endif // MWO_AUTH_H
