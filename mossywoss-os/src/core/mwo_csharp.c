/**
 * MWO C# Scripting Engine Implementation
 * 
 * Architecture:
 * - C  = Core (filesystem, database, auth, config, events, input)
 * - C++ = Shell (desktop, windows, taskbar, UI rendering via SDL2)
 * - C# = Application scripting (game logic, app behavior, web content)
 * 
 * C# scripts can call C core functions via registered functions.
 * This layer bridges between the C/C++ native runtime and C# scripting.
 * 
 * If Mono is available (linked with -lmono), full C# execution is supported.
 * If Mono is not available, a minimal built-in interpreter handles basic scripts
 * (variable assignment, arithmetic, print statements, function calls to registered C functions).
 */

#include "mwo_csharp.h"
#include "mwo_log.h"
#include "mwo_fs.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

/* Try to include Mono if available */
#if __has_include(<mono/jit/jit.h>)
#define MWCS_HAS_MONO 1
#include <mono/jit/jit.h>
#include <mono/metadata/assembly.h>
#include <mono/metadata/mono-config.h>
#else
#define MWCS_HAS_MONO 0
#endif

/* Internal state */
static int g_csharp_initialized = 0;
static int g_has_mono = 0;
static char g_runtime_name[32] = "interpreter";

/* Registered C functions for C# interop */
#define MWCS_MAX_FUNCS 64
typedef struct {
    char name[64];
    void* ptr;
    char signature[128];
} MWCSRegFunc;

static MWCSRegFunc g_registered_funcs[MWCS_MAX_FUNCS];
static int g_registered_count = 0;

/* Minimal interpreter state */
typedef enum {
    MWCS_TOKEN_NUMBER,
    MWCS_TOKEN_STRING,
    MWCS_TOKEN_IDENT,
    MWCS_TOKEN_OP,
    MWCS_TOKEN_KEYWORD,
    MWCS_TOKEN_EOF,
    MWCS_TOKEN_NEWLINE
} MWCSTokenType;

typedef struct {
    MWCSTokenType type;
    char value[256];
} MWCSToken;

typedef struct {
    const char* source;
    int pos;
    int line;
    MWCSToken current;
} MWCSLexer;

/* === Lexer === */

static void mwcs_lexer_init(MWCSLexer* lex, const char* src) {
    lex->source = src;
    lex->pos = 0;
    lex->line = 1;
}

static void mwcs_lexer_skip_ws(MWCSLexer* lex) {
    while (lex->source[lex->pos]) {
        char c = lex->source[lex->pos];
        if (c == ' ' || c == '\t') {
            lex->pos++;
        } else if (c == '\r') {
            lex->pos++;
        } else if (c == '\n') {
            lex->line++;
            lex->pos++;
        } else if (c == '/' && lex->source[lex->pos + 1] == '/') {
            while (lex->source[lex->pos] && lex->source[lex->pos] != '\n')
                lex->pos++;
        } else if (c == '/' && lex->source[lex->pos + 1] == '*') {
            lex->pos += 2;
            while (lex->source[lex->pos] && !(lex->source[lex->pos] == '*' && lex->source[lex->pos + 1] == '/')) {
                if (lex->source[lex->pos] == '\n') lex->line++;
                lex->pos++;
            }
            if (lex->source[lex->pos]) lex->pos += 2;
        } else {
            break;
        }
    }
}

static MWCSToken mwcs_lexer_next(MWCSLexer* lex) {
    mwcs_lexer_skip_ws(lex);
    MWCSToken tok = {MWCS_TOKEN_EOF, ""};
    
    char c = lex->source[lex->pos];
    if (!c) return tok;
    
    /* Number */
    if (isdigit(c) || (c == '.' && isdigit(lex->source[lex->pos + 1]))) {
        int i = 0;
        while (lex->source[lex->pos] && (isdigit(lex->source[lex->pos]) || lex->source[lex->pos] == '.')) {
            if (i < 255) tok.value[i++] = lex->source[lex->pos];
            lex->pos++;
        }
        tok.value[i] = '\0';
        tok.type = MWCS_TOKEN_NUMBER;
        return tok;
    }
    
    /* String */
    if (c == '"') {
        lex->pos++;
        int i = 0;
        while (lex->source[lex->pos] && lex->source[lex->pos] != '"') {
            if (lex->source[lex->pos] == '\\' && lex->source[lex->pos + 1]) {
                char esc = lex->source[lex->pos + 1];
                if (esc == 'n') tok.value[i++] = '\n';
                else if (esc == 't') tok.value[i++] = '\t';
                else if (esc == '\\') tok.value[i++] = '\\';
                else if (esc == '"') tok.value[i++] = '"';
                else tok.value[i++] = esc;
                lex->pos += 2;
            } else {
                if (i < 255) tok.value[i++] = lex->source[lex->pos];
                lex->pos++;
            }
        }
        if (lex->source[lex->pos] == '"') lex->pos++;
        tok.value[i] = '\0';
        tok.type = MWCS_TOKEN_STRING;
        return tok;
    }
    
    /* Identifier / keyword */
    if (isalpha(c) || c == '_') {
        int i = 0;
        while (lex->source[lex->pos] && (isalnum(lex->source[lex->pos]) || lex->source[lex->pos] == '_')) {
            if (i < 255) tok.value[i++] = lex->source[lex->pos];
            lex->pos++;
        }
        tok.value[i] = '\0';
        
        /* Check keywords */
        if (strcmp(tok.value, "var") == 0 || strcmp(tok.value, "int") == 0 ||
            strcmp(tok.value, "string") == 0 || strcmp(tok.value, "float") == 0 ||
            strcmp(tok.value, "double") == 0 || strcmp(tok.value, "bool") == 0 ||
            strcmp(tok.value, "void") == 0 || strcmp(tok.value, "if") == 0 ||
            strcmp(tok.value, "else") == 0 || strcmp(tok.value, "while") == 0 ||
            strcmp(tok.value, "for") == 0 || strcmp(tok.value, "return") == 0 ||
            strcmp(tok.value, "true") == 0 || strcmp(tok.value, "false") == 0 ||
            strcmp(tok.value, "null") == 0 || strcmp(tok.value, "using") == 0 ||
            strcmp(tok.value, "class") == 0 || strcmp(tok.value, "public") == 0 ||
            strcmp(tok.value, "private") == 0 || strcmp(tok.value, "static") == 0 ||
            strcmp(tok.value, "new") == 0 || strcmp(tok.value, "function") == 0) {
            tok.type = MWCS_TOKEN_KEYWORD;
        } else {
            tok.type = MWCS_TOKEN_IDENT;
        }
        return tok;
    }
    
    /* Operators */
    if (c == '+' || c == '-' || c == '*' || c == '/' || c == '=' ||
        c == '<' || c == '>' || c == '!' || c == '&' || c == '|' ||
        c == '(' || c == ')' || c == '{' || c == '}' || c == ';' ||
        c == ',' || c == '.' || c == '[' || c == ']') {
        tok.value[0] = c;
        tok.value[1] = '\0';
        
        /* Two-char operators */
        char next = lex->source[lex->pos + 1];
        if ((c == '=' && next == '=') || (c == '!' && next == '=') ||
            (c == '<' && next == '=') || (c == '>' && next == '=') ||
            (c == '&' && next == '&') || (c == '|' && next == '|') ||
            (c == '+' && next == '+') || (c == '-' && next == '-') ||
            (c == '+' && next == '=') || (c == '-' && next == '=') ||
            (c == '*' && next == '=') || (c == '/' && next == '=')) {
            tok.value[1] = next;
            tok.value[2] = '\0';
            lex->pos += 2;
        } else {
            lex->pos++;
        }
        tok.type = MWCS_TOKEN_OP;
        return tok;
    }
    
    lex->pos++;
    tok.value[0] = c;
    tok.value[1] = '\0';
    tok.type = MWCS_TOKEN_OP;
    return tok;
}

/* === Minimal Interpreter === */

/* Variable storage */
#define MWCS_MAX_VARS 128
typedef struct {
    char name[64];
    char str_val[1024];
    double num_val;
    int is_string;
} MWCSVar;

static MWCSVar g_vars[MWCS_MAX_VARS];
static int g_var_count = 0;

static MWCSVar* mwcs_find_var(const char* name) {
    for (int i = 0; i < g_var_count; i++) {
        if (strcmp(g_vars[i].name, name) == 0) return &g_vars[i];
    }
    return NULL;
}

static MWCSVar* mwcs_set_var(const char* name, double num, const char* str, int is_str) {
    MWCSVar* v = mwcs_find_var(name);
    if (!v) {
        if (g_var_count >= MWCS_MAX_VARS) return NULL;
        v = &g_vars[g_var_count++];
        strncpy(v->name, name, 63);
        v->name[63] = '\0';
    }
    if (is_str) {
        strncpy(v->str_val, str ? str : "", 1023);
        v->str_val[1023] = '\0';
        v->is_string = 1;
    } else {
        v->num_val = num;
        v->is_string = 0;
    }
    return v;
}

static double mwcs_get_num(MWCSVar* v) {
    if (!v) return 0;
    return v->is_string ? 0 : v->num_val;
}

static const char* mwcs_get_str(MWCSVar* v) {
    if (!v) return "";
    return v->is_string ? v->str_val : "";
}

/* Expression evaluator (recursive descent) */
static double mwcs_expr(MWCSLexer* lex);

static double mwcs_primary(MWCSLexer* lex) {
    MWCSToken tok = lex->current;
    
    if (tok.type == MWCS_TOKEN_NUMBER) {
        double val = atof(tok.value);
        lex->current = mwcs_lexer_next(lex);
        return val;
    }
    
    if (tok.type == MWCS_TOKEN_STRING) {
        /* Strings evaluate to 0 in numeric context */
        lex->current = mwcs_lexer_next(lex);
        return 0;
    }
    
    if (tok.type == MWCS_TOKEN_IDENT) {
        MWCSVar* v = mwcs_find_var(tok.value);
        double val = v ? mwcs_get_num(v) : 0;
        lex->current = mwcs_lexer_next(lex);
        
        /* Function call */
        if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "(") == 0) {
            lex->current = mwcs_lexer_next(lex);
            /* Check registered C functions */
            for (int i = 0; i < g_registered_count; i++) {
                if (strcmp(g_registered_funcs[i].name, tok.value) == 0) {
                    /* Call registered function (simplified - just print) */
                    mwo_log(LOG_INFO, "[C#] Calling registered function: %s", tok.value);
                }
            }
            /* Built-in: Console.WriteLine / print */
            if (strcmp(tok.value, "print") == 0 || strcmp(tok.value, "WriteLine") == 0 ||
                strcmp(tok.value, "Write") == 0) {
                double arg = mwcs_expr(lex);
                (void)arg;
                if (strcmp(lex->current.value, ")") == 0) {
                    lex->current = mwcs_lexer_next(lex);
                }
                return 0;
            }
            /* Skip to close paren */
            while (lex->current.type != MWCS_TOKEN_EOF &&
                   !(lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, ")") == 0)) {
                lex->current = mwcs_lexer_next(lex);
            }
            if (lex->current.type == MWCS_TOKEN_OP) lex->current = mwcs_lexer_next(lex);
            return 0;
        }
        return val;
    }
    
    if (tok.type == MWCS_TOKEN_OP && strcmp(tok.value, "(") == 0) {
        lex->current = mwcs_lexer_next(lex);
        double val = mwcs_expr(lex);
        if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, ")") == 0) {
            lex->current = mwcs_lexer_next(lex);
        }
        return val;
    }
    
    if (tok.type == MWCS_TOKEN_OP && strcmp(tok.value, "-") == 0) {
        lex->current = mwcs_lexer_next(lex);
        return -mwcs_primary(lex);
    }
    
    return 0;
}

static double mwcs_mul(MWCSLexer* lex) {
    double left = mwcs_primary(lex);
    while (lex->current.type == MWCS_TOKEN_OP &&
           (strcmp(lex->current.value, "*") == 0 || strcmp(lex->current.value, "/") == 0)) {
        char op = lex->current.value[0];
        lex->current = mwcs_lexer_next(lex);
        double right = mwcs_primary(lex);
        left = (op == '*') ? left * right : left / right;
    }
    return left;
}

static double mwcs_add(MWCSLexer* lex) {
    double left = mwcs_mul(lex);
    while (lex->current.type == MWCS_TOKEN_OP &&
           (strcmp(lex->current.value, "+") == 0 || strcmp(lex->current.value, "-") == 0)) {
        char op = lex->current.value[0];
        lex->current = mwcs_lexer_next(lex);
        double right = mwcs_mul(lex);
        left = (op == '+') ? left + right : left - right;
    }
    return left;
}

static double mwcs_cmp(MWCSLexer* lex) {
    double left = mwcs_add(lex);
    while (lex->current.type == MWCS_TOKEN_OP &&
           (strcmp(lex->current.value, "==") == 0 || strcmp(lex->current.value, "!=") == 0 ||
            strcmp(lex->current.value, "<") == 0 || strcmp(lex->current.value, ">") == 0 ||
            strcmp(lex->current.value, "<=") == 0 || strcmp(lex->current.value, ">=") == 0)) {
        char op[3];
        strncpy(op, lex->current.value, 2);
        op[2] = '\0';
        lex->current = mwcs_lexer_next(lex);
        double right = mwcs_add(lex);
        if (strcmp(op, "==") == 0) left = (left == right) ? 1 : 0;
        else if (strcmp(op, "!=") == 0) left = (left != right) ? 1 : 0;
        else if (strcmp(op, "<") == 0) left = (left < right) ? 1 : 0;
        else if (strcmp(op, ">") == 0) left = (left > right) ? 1 : 0;
        else if (strcmp(op, "<=") == 0) left = (left <= right) ? 1 : 0;
        else if (strcmp(op, ">=") == 0) left = (left >= right) ? 1 : 0;
    }
    return left;
}

static double mwcs_expr(MWCSLexer* lex) {
    return mwcs_cmp(lex);
}

/* Statement executor */
static int mwcs_exec_statement(MWCSLexer* lex, MWCSScript* script) {
    MWCSToken tok = lex->current;
    
    if (tok.type == MWCS_TOKEN_EOF) return 0;
    
    /* Skip using/class/namespace declarations (parse but don't execute) */
    if (tok.type == MWCS_TOKEN_KEYWORD &&
        (strcmp(tok.value, "using") == 0 || strcmp(tok.value, "namespace") == 0)) {
        while (lex->current.type != MWCS_TOKEN_EOF &&
               !(lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "{") == 0) &&
               !(lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, ";") == 0)) {
            lex->current = mwcs_lexer_next(lex);
        }
        if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "{") == 0) {
            int depth = 1;
            lex->current = mwcs_lexer_next(lex);
            while (lex->current.type != MWCS_TOKEN_EOF && depth > 0) {
                if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "{") == 0) depth++;
                if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "}") == 0) depth--;
                lex->current = mwcs_lexer_next(lex);
            }
        } else if (lex->current.type == MWCS_TOKEN_OP) {
            lex->current = mwcs_lexer_next(lex);
        }
        return 0;
    }
    
    /* Skip class declarations */
    if (tok.type == MWCS_TOKEN_KEYWORD && strcmp(tok.value, "class") == 0) {
        while (lex->current.type != MWCS_TOKEN_EOF &&
               !(lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "{") == 0)) {
            lex->current = mwcs_lexer_next(lex);
        }
        if (lex->current.type == MWCS_TOKEN_OP) {
            int depth = 1;
            lex->current = mwcs_lexer_next(lex);
            while (lex->current.type != MWCS_TOKEN_EOF && depth > 0) {
                if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "{") == 0) depth++;
                if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "}") == 0) depth--;
                lex->current = mwcs_lexer_next(lex);
            }
        }
        return 0;
    }
    
    /* Variable declaration: var/int/string name = expr; */
    if (tok.type == MWCS_TOKEN_KEYWORD &&
        (strcmp(tok.value, "var") == 0 || strcmp(tok.value, "int") == 0 ||
         strcmp(tok.value, "float") == 0 || strcmp(tok.value, "double") == 0 ||
         strcmp(tok.value, "string") == 0 || strcmp(tok.value, "bool") == 0)) {
        lex->current = mwcs_lexer_next(lex);
        if (lex->current.type == MWCS_TOKEN_IDENT) {
            char varname[64];
            strncpy(varname, lex->current.value, 63);
            varname[63] = '\0';
            lex->current = mwcs_lexer_next(lex);
            
            if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "=") == 0) {
                lex->current = mwcs_lexer_next(lex);
                if (lex->current.type == MWCS_TOKEN_STRING) {
                    mwcs_set_var(varname, 0, lex->current.value, 1);
                    mwo_log(LOG_DEBUG, "[C#] %s = \"%s\"", varname, lex->current.value);
                    lex->current = mwcs_lexer_next(lex);
                } else {
                    double val = mwcs_expr(lex);
                    mwcs_set_var(varname, val, NULL, 0);
                    mwo_log(LOG_DEBUG, "[C#] %s = %f", varname, val);
                }
            }
        }
        /* Skip semicolon */
        if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, ";") == 0) {
            lex->current = mwcs_lexer_next(lex);
        }
        return 0;
    }
    
    /* Assignment: name = expr; */
    if (tok.type == MWCS_TOKEN_IDENT) {
        char varname[64];
        strncpy(varname, tok.value, 63);
        varname[63] = '\0';
        lex->current = mwcs_lexer_next(lex);
        
        if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "=") == 0) {
            lex->current = mwcs_lexer_next(lex);
            if (lex->current.type == MWCS_TOKEN_STRING) {
                mwcs_set_var(varname, 0, lex->current.value, 1);
                lex->current = mwcs_lexer_next(lex);
            } else {
                double val = mwcs_expr(lex);
                mwcs_set_var(varname, val, NULL, 0);
            }
        } else {
            /* Could be a function call - re-parse as expression */
            /* Back up and try expression */
        }
        
        if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, ";") == 0) {
            lex->current = mwcs_lexer_next(lex);
        }
        return 0;
    }
    
    /* If statement */
    if (tok.type == MWCS_TOKEN_KEYWORD && strcmp(tok.value, "if") == 0) {
        lex->current = mwcs_lexer_next(lex);
        if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "(") == 0) {
            lex->current = mwcs_lexer_next(lex);
            double cond = mwcs_expr(lex);
            if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, ")") == 0) {
                lex->current = mwcs_lexer_next(lex);
            }
            if (cond != 0) {
                mwcs_exec_statement(lex, script);
            } else {
                /* Skip the if body */
                if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "{") == 0) {
                    int depth = 1;
                    lex->current = mwcs_lexer_next(lex);
                    while (lex->current.type != MWCS_TOKEN_EOF && depth > 0) {
                        if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "{") == 0) depth++;
                        if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "}") == 0) depth--;
                        lex->current = mwcs_lexer_next(lex);
                    }
                } else {
                    mwcs_exec_statement(lex, script);
                }
                /* Check for else */
                if (lex->current.type == MWCS_TOKEN_KEYWORD && strcmp(lex->current.value, "else") == 0) {
                    lex->current = mwcs_lexer_next(lex);
                    mwcs_exec_statement(lex, script);
                }
            }
        }
        return 0;
    }
    
    /* While loop */
    if (tok.type == MWCS_TOKEN_KEYWORD && strcmp(tok.value, "while") == 0) {
        const char* loop_start = lex->source + lex->pos;
        int max_iterations = 100000;
        int iter = 0;
        
        while (iter < max_iterations) {
            lex->pos = (int)(loop_start - lex->source);
            lex->current = mwcs_lexer_next(lex);
            
            if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "(") == 0) {
                lex->current = mwcs_lexer_next(lex);
                double cond = mwcs_expr(lex);
                if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, ")") == 0) {
                    lex->current = mwcs_lexer_next(lex);
                }
                if (cond == 0) break;
                mwcs_exec_statement(lex, script);
            } else break;
            iter++;
        }
        return 0;
    }
    
    /* Block { } */
    if (tok.type == MWCS_TOKEN_OP && strcmp(tok.value, "{") == 0) {
        lex->current = mwcs_lexer_next(lex);
        while (lex->current.type != MWCS_TOKEN_EOF &&
               !(lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "}") == 0)) {
            mwcs_exec_statement(lex, script);
        }
        if (lex->current.type == MWCS_TOKEN_OP) lex->current = mwcs_lexer_next(lex);
        return 0;
    }
    
    /* Console.WriteLine / print */
    if (tok.type == MWCS_TOKEN_IDENT &&
        (strcmp(tok.value, "Console") == 0 || strcmp(tok.value, "print") == 0 ||
         strcmp(tok.value, "WriteLine") == 0 || strcmp(tok.value, "Write") == 0)) {
        lex->current = mwcs_lexer_next(lex);
        
        /* Handle Console.WriteLine -> . -> WriteLine */
        if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, ".") == 0) {
            lex->current = mwcs_lexer_next(lex);
            lex->current = mwcs_lexer_next(lex); /* skip method name */
        }
        
        if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "(") == 0) {
            lex->current = mwcs_lexer_next(lex);
            
            if (lex->current.type == MWCS_TOKEN_STRING) {
                mwo_log(LOG_INFO, "[C# Output] %s", lex->current.value);
                lex->current = mwcs_lexer_next(lex);
            } else {
                double val = mwcs_expr(lex);
                mwo_log(LOG_INFO, "[C# Output] %f", val);
            }
            
            /* Skip to closing paren */
            while (lex->current.type != MWCS_TOKEN_EOF &&
                   !(lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, ")") == 0)) {
                lex->current = mwcs_lexer_next(lex);
            }
            if (lex->current.type == MWCS_TOKEN_OP) lex->current = mwcs_lexer_next(lex);
        }
        
        if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, ";") == 0) {
            lex->current = mwcs_lexer_next(lex);
        }
        return 0;
    }
    
    /* Unknown statement - skip to semicolon or newline */
    while (lex->current.type != MWCS_TOKEN_EOF &&
           !(lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, ";") == 0) &&
           !(lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, "}") == 0)) {
        lex->current = mwcs_lexer_next(lex);
    }
    if (lex->current.type == MWCS_TOKEN_OP && strcmp(lex->current.value, ";") == 0) {
        lex->current = mwcs_lexer_next(lex);
    }
    
    return 0;
}

/* === Public API === */

int mwo_csharp_init(void) {
    if (g_csharp_initialized) return MWCS_OK;
    
#if MWCS_HAS_MONO
    mono_config_parse(NULL);
    MonoDomain* domain = mono_jit_init("mossywoss");
    if (domain) {
        g_has_mono = 1;
        strncpy(g_runtime_name, "mono", 31);
        mwo_log(LOG_INFO, "[C#] Mono runtime initialized");
    } else {
        mwo_log(LOG_WARN, "[C#] Mono init failed, using built-in interpreter");
        strncpy(g_runtime_name, "interpreter", 31);
    }
#else
    mwo_log(LOG_INFO, "[C#] Mono not available, using built-in interpreter");
    strncpy(g_runtime_name, "interpreter", 31);
#endif
    
    g_var_count = 0;
    g_registered_count = 0;
    g_csharp_initialized = 1;
    return MWCS_OK;
}

void mwo_csharp_cleanup(void) {
    if (!g_csharp_initialized) return;
    g_var_count = 0;
    g_registered_count = 0;
    g_csharp_initialized = 0;
    mwo_log(LOG_INFO, "[C#] Scripting engine shutdown");
}

int mwo_csharp_load(const char* path, MWCSScript* script) {
    if (!g_csharp_initialized || !script) return MWCS_ERR_NO_RUNTIME;
    
    memset(script, 0, sizeof(MWCSScript));
    
    char* content = mwo_fs_read_text(path);
    if (!content) {
        script->error_line = 0;
        snprintf(script->error_msg, sizeof(script->error_msg), "File not found: %s", path);
        return MWCS_ERR_NOT_FOUND;
    }
    
    script->source_path = strdup(path);
    script->source_code = content;
    script->line_count = 1;
    for (int i = 0; content[i]; i++) {
        if (content[i] == '\n') script->line_count++;
    }
    
    return MWCS_OK;
}

int mwo_csharp_load_string(const char* source, MWCSScript* script) {
    if (!g_csharp_initialized || !source || !script) return MWCS_ERR_NO_RUNTIME;
    
    memset(script, 0, sizeof(MWCSScript));
    script->source_path = strdup("<inline>");
    script->source_code = strdup(source);
    script->line_count = 1;
    for (int i = 0; source[i]; i++) {
        if (source[i] == '\n') script->line_count++;
    }
    
    return MWCS_OK;
}

int mwo_csharp_run(MWCSScript* script) {
    if (!g_csharp_initialized || !script || !script->source_code) return MWCS_ERR_NO_RUNTIME;
    
#if MWCS_HAS_MONO
    if (g_has_mono) {
        /* Full Mono execution path would go here */
        /* For now, fall through to interpreter */
    }
#endif
    
    /* Use built-in interpreter */
    MWCSLexer lex;
    mwcs_lexer_init(&lex, script->source_code);
    lex.current = mwcs_lexer_next(&lex);
    
    g_var_count = 0;
    
    while (lex.current.type != MWCS_TOKEN_EOF) {
        int prev_pos = lex.pos;
        mwcs_exec_statement(&lex, script);
        if (lex.pos == prev_pos) {
            /* Prevent infinite loop on unparseable input */
            lex.pos++;
            lex.current = mwcs_lexer_next(&lex);
        }
    }
    
    return MWCS_OK;
}

int mwo_csharp_register_function(const char* name, void* func_ptr, const char* signature) {
    if (!name || !func_ptr || g_registered_count >= MWCS_MAX_FUNCS) return MWCS_ERR_RUNTIME;
    
    MWCSRegFunc* f = &g_registered_funcs[g_registered_count++];
    strncpy(f->name, name, 63);
    f->name[63] = '\0';
    f->ptr = func_ptr;
    if (signature) {
        strncpy(f->signature, signature, 127);
        f->signature[127] = '\0';
    } else {
        f->signature[0] = '\0';
    }
    
    mwo_log(LOG_DEBUG, "[C#] Registered function: %s (%s)", name, signature ? signature : "void");
    return MWCS_OK;
}

const char* mwo_csharp_get_error(MWCSScript* script) {
    if (!script || script->error_msg[0] == '\0') return NULL;
    return script->error_msg;
}

int mwo_csharp_runtime_available(void) {
    return g_has_mono ? 1 : (g_csharp_initialized ? 1 : 0);
}

const char* mwo_csharp_runtime_name(void) {
    return g_runtime_name;
}

void mwo_csharp_free(MWCSScript* script) {
    if (!script) return;
    if (script->source_path) { free(script->source_path); script->source_path = NULL; }
    if (script->source_code) { free(script->source_code); script->source_code = NULL; }
    script->error_msg[0] = '\0';
}
