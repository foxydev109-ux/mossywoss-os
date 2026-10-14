#include "mwo_auth.h"
#include "mwo_db.h"
#include "mwo_fs.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <time.h>
#include <strings.h>

static MWOUser s_current_user;
static bool s_logged_in = false;

// SHA-256 implementation (FIPS 180-4)
typedef struct {
    uint32_t state[8];
    uint64_t bitlen;
    uint8_t buffer[64];
    size_t datalen;
} SHA256_CTX;

#define ROTR(x, n) (((x) >> (n)) | ((x) << (32 - (n))))
#define CH(x, y, z) (((x) & (y)) ^ (~(x) & (z)))
#define MAJ(x, y, z) (((x) & (y)) ^ ((x) & (z)) ^ ((y) & (z)))
#define SIGMA0(x) (ROTR(x, 2) ^ ROTR(x, 13) ^ ROTR(x, 22))
#define SIGMA1(x) (ROTR(x, 6) ^ ROTR(x, 11) ^ ROTR(x, 25))
#define sigma0(x) (ROTR(x, 7) ^ ROTR(x, 18) ^ ((x) >> 3))
#define sigma1(x) (ROTR(x, 17) ^ ROTR(x, 19) ^ ((x) >> 10))

static const uint32_t K[64] = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef4a394, 0x47b5481d
};

static void sha256_transform(SHA256_CTX *ctx, const uint8_t data[64]) {
    uint32_t a, b, c, d, e, f, g, h, i, j, t1, t2, m[64];

    for (i = 0, j = 0; i < 16; ++i, j += 4)
        m[i] = ((uint32_t)data[j] << 24) | ((uint32_t)data[j + 1] << 16) |
               ((uint32_t)data[j + 2] << 8) | ((uint32_t)data[j + 3]);
    for (; i < 64; ++i)
        m[i] = sigma1(m[i - 2]) + m[i - 7] + sigma0(m[i - 15]) + m[i - 16];

    a = ctx->state[0];
    b = ctx->state[1];
    c = ctx->state[2];
    d = ctx->state[3];
    e = ctx->state[4];
    f = ctx->state[5];
    g = ctx->state[6];
    h = ctx->state[7];

    for (i = 0; i < 64; ++i) {
        t1 = h + SIGMA1(e) + CH(e, f, g) + K[i] + m[i];
        t2 = SIGMA0(a) + MAJ(a, b, c);
        h = g;
        g = f;
        f = e;
        e = d + t1;
        d = c;
        c = b;
        b = a;
        a = t1 + t2;
    }

    ctx->state[0] += a;
    ctx->state[1] += b;
    ctx->state[2] += c;
    ctx->state[3] += d;
    ctx->state[4] += e;
    ctx->state[5] += f;
    ctx->state[6] += g;
    ctx->state[7] += h;
}

static void sha256_init(SHA256_CTX *ctx) {
    ctx->datalen = 0;
    ctx->bitlen = 0;
    ctx->state[0] = 0x6a09e667;
    ctx->state[1] = 0xbb67ae85;
    ctx->state[2] = 0x3c6ef372;
    ctx->state[3] = 0xa54ff53a;
    ctx->state[4] = 0x510e527f;
    ctx->state[5] = 0x9b05688c;
    ctx->state[6] = 0x1f83d9ab;
    ctx->state[7] = 0x5be0cd19;
}

static void sha256_update(SHA256_CTX *ctx, const uint8_t *data, size_t len) {
    for (size_t i = 0; i < len; ++i) {
        ctx->buffer[ctx->datalen] = data[i];
        ctx->datalen++;
        if (ctx->datalen == 64) {
            sha256_transform(ctx, ctx->buffer);
            ctx->bitlen += 512;
            ctx->datalen = 0;
        }
    }
}

static void sha256_final(SHA256_CTX *ctx, uint8_t hash[32]) {
    size_t i = ctx->datalen;

    if (ctx->datalen < 56) {
        ctx->buffer[i++] = 0x80;
        while (i < 56) ctx->buffer[i++] = 0x00;
    } else {
        ctx->buffer[i++] = 0x80;
        while (i < 64) ctx->buffer[i++] = 0x00;
        sha256_transform(ctx, ctx->buffer);
        memset(ctx->buffer, 0, 56);
    }

    uint64_t total_bits = ctx->bitlen + ctx->datalen * 8;
    ctx->buffer[56] = (total_bits >> 56) & 0xff;
    ctx->buffer[57] = (total_bits >> 48) & 0xff;
    ctx->buffer[58] = (total_bits >> 40) & 0xff;
    ctx->buffer[59] = (total_bits >> 32) & 0xff;
    ctx->buffer[60] = (total_bits >> 24) & 0xff;
    ctx->buffer[61] = (total_bits >> 16) & 0xff;
    ctx->buffer[62] = (total_bits >> 8) & 0xff;
    ctx->buffer[63] = total_bits & 0xff;
    sha256_transform(ctx, ctx->buffer);

    for (i = 0; i < 4; ++i) {
        hash[i]      = (ctx->state[0] >> (24 - i * 8)) & 0xff;
        hash[i + 4]  = (ctx->state[1] >> (24 - i * 8)) & 0xff;
        hash[i + 8]  = (ctx->state[2] >> (24 - i * 8)) & 0xff;
        hash[i + 12] = (ctx->state[3] >> (24 - i * 8)) & 0xff;
        hash[i + 16] = (ctx->state[4] >> (24 - i * 8)) & 0xff;
        hash[i + 20] = (ctx->state[5] >> (24 - i * 8)) & 0xff;
        hash[i + 24] = (ctx->state[6] >> (24 - i * 8)) & 0xff;
        hash[i + 28] = (ctx->state[7] >> (24 - i * 8)) & 0xff;
    }
}

int mwo_auth_hash_pin(const char* pin, char* hash_hex_out) {
    if (!pin || !hash_hex_out) return -1;

    SHA256_CTX ctx;
    sha256_init(&ctx);
    sha256_update(&ctx, (const uint8_t*)pin, strlen(pin));

    uint8_t hash[32];
    sha256_final(&ctx, hash);

    for (int i = 0; i < 32; i++) {
        sprintf(hash_hex_out + (i * 2), "%02x", hash[i]);
    }
    hash_hex_out[64] = '\0';
    return 0;
}

bool mwo_auth_verify_pin(const char* pin, const char* stored_hash) {
    if (!pin || !stored_hash) return false;
    char computed_hash[65];
    if (mwo_auth_hash_pin(pin, computed_hash) != 0) return false;

#ifdef _WIN32
    return (_stricmp(computed_hash, stored_hash) == 0);
#else
    return (strcasecmp(computed_hash, stored_hash) == 0);
#endif
}

int mwo_auth_create_user(const char* username, const char* pin) {
    if (!username || !pin) return -1;

    char pin_hash[65];
    if (mwo_auth_hash_pin(pin, pin_hash) != 0) return -1;

    int rc = mwo_db_user_create(username, pin_hash);
    if (rc == 0) {
        char user_dir[256];
        snprintf(user_dir, sizeof(user_dir), "users/%s", username);
        mwo_fs_mkdir(user_dir);

        const char* subdirs[] = {
            "Desktop", "Documents", "Downloads", "Pictures",
            "Music", "Videos", "Games", "WebApps", "AppData", "Settings"
        };
        for (size_t i = 0; i < sizeof(subdirs)/sizeof(subdirs[0]); i++) {
            char sub[512];
            snprintf(sub, sizeof(sub), "users/%s/%s", username, subdirs[i]);
            mwo_fs_mkdir(sub);
        }
    }
    return rc;
}

int mwo_auth_login(const char* username, const char* pin) {
    if (!username || !pin) return -1;

    char pin_hash[65];
    if (mwo_auth_hash_pin(pin, pin_hash) != 0) return -1;

    if (mwo_db_user_auth(username, pin_hash) == 0) {
        s_logged_in = true;
        s_current_user.id = 1;
        snprintf(s_current_user.username, sizeof(s_current_user.username), "%s", username);
        snprintf(s_current_user.pin_hash, sizeof(s_current_user.pin_hash), "%s", pin_hash);
        s_current_user.created = time(NULL);
        s_current_user.last_login = time(NULL);
        return 0;
    }
    return -1;
}

void mwo_auth_logout(void) {
    s_logged_in = false;
    memset(&s_current_user, 0, sizeof(MWOUser));
}

int mwo_auth_current_user(MWOUser* out) {
    if (!s_logged_in || !out) return -1;
    *out = s_current_user;
    return 0;
}

int mwo_auth(void) {
    // Default admin user if none exists
    mwo_auth_create_user("admin", "1234");
    return 0;
}

void mwo_auth_cleanup(void) {
    mwo_auth_logout();
}

bool mwo_auth_verify_credentials(const char* username, const char* password) {
    return (mwo_auth_login(username, password) == 0);
}
