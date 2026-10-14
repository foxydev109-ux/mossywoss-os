#pragma once

/**
 * MWO C# Scripting Engine
 * Provides C# as the application scripting layer for MossyWoss OS.
 * C handles the core, C++ handles the shell, C# handles app/game scripting.
 * Uses Mono runtime if available, otherwise falls back to a minimal interpreter.
 */

#ifdef __cplusplus
extern "C" {
#endif

/** C# script execution result codes */
typedef enum {
    MWCS_OK = 0,
    MWCS_ERR_NO_RUNTIME = -1,
    MWCS_ERR_COMPILE = -2,
    MWCS_ERR_RUNTIME = -3,
    MWCS_ERR_NOT_FOUND = -4
} MWCSResult;

/** C# script context */
typedef struct {
    char* source_path;
    char* source_code;
    void* mono_handle;
    int line_count;
    int error_line;
    char error_msg[512];
} MWCSScript;

/**
 * Initialize the C# scripting engine.
 * Attempts to load the Mono runtime. If Mono is not available,
 * initializes a minimal built-in interpreter for basic scripts.
 * @return MWCS_OK on success, MWCS_ERR_NO_RUNTIME if no runtime available
 */
int mwo_csharp_init(void);

/**
 * Shutdown the C# scripting engine.
 * Unloads Mono runtime if loaded, frees interpreter resources.
 */
void mwo_csharp_cleanup(void);

/**
 * Load a C# script from a file path.
 * @param path File path to the .cs file (VFS path)
 * @param script Output script context
 * @return MWCS_OK on success
 */
int mwo_csharp_load(const char* path, MWCSScript* script);

/**
 * Load a C# script from a source string.
 * @param source C# source code
 * @param script Output script context
 * @return MWCS_OK on success
 */
int mwo_csharp_load_string(const char* source, MWCSScript* script);

/**
 * Execute a loaded C# script.
 * @param script Script context to execute
 * @return MWCS_OK on success, error code on failure
 */
int mwo_csharp_run(MWCSScript* script);

/**
 * Register a C function callable from C# scripts.
 * @param name Function name as seen from C#
 * @param func_ptr Pointer to the C function
 * @param signature Mono-style signature (e.g., "int(string)")
 * @return MWCS_OK on success
 */
int mwo_csharp_register_function(const char* name, void* func_ptr, const char* signature);

/**
 * Get the last error message from a script.
 * @param script Script context
 * @return Error message string, or NULL if no error
 */
const char* mwo_csharp_get_error(MWCSScript* script);

/**
 * Check if the C# runtime is available.
 * @return 1 if Mono runtime loaded, 0 if using fallback interpreter
 */
int mwo_csharp_runtime_available(void);

/**
 * Get the runtime name ("mono" or "interpreter")
 * @return Runtime name string
 */
const char* mwo_csharp_runtime_name(void);

/**
 * Free a script context.
 * @param script Script context to free
 */
void mwo_csharp_free(MWCSScript* script);

#ifdef __cplusplus
}
#endif
