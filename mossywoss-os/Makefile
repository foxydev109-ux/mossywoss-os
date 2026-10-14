# MossyWoss OS Makefile
# Build: make | Run: make run | Clean: make clean
# Architecture: C (core) + C++ (shell) + C# (scripting, via Mono or built-in interpreter)

CC       ?= gcc
CXX      ?= g++
CFLAGS   := -Wall -Wextra -O2 -std=c11 -Isrc
CXXFLAGS := -Wall -Wextra -O2 -std=c++17 -Isrc

# Core libraries: SDL2, SDL2_ttf, SDL2_image, SQLite3, libcurl
PKG_CFLAGS := $(shell pkg-config --cflags sdl2 SDL2_ttf SDL2_image sqlite3 libcurl 2>/dev/null)
PKG_LIBS   := $(shell pkg-config --libs sdl2 SDL2_ttf SDL2_image sqlite3 libcurl 2>/dev/null)

CFLAGS   += $(PKG_CFLAGS)
CXXFLAGS += $(PKG_CFLAGS)

# Optional: Mono runtime for full C# scripting support
# If libmono-2.0 is available, full C# execution is enabled
# Otherwise, the built-in C# interpreter is used
MONO_CFLAGS := $(shell pkg-config --cflags mono-2 2>/dev/null)
MONO_LIBS   := $(shell pkg-config --libs mono-2 2>/dev/null)
ifneq ($(MONO_LIBS),)
	CFLAGS   += $(MONO_CFLAGS) -DMWCS_HAS_MONO=1
	CXXFLAGS += $(MONO_CFLAGS) -DMWCS_HAS_MONO=1
	LDFLAGS  += $(MONO_LIBS)
endif

LDFLAGS  := $(PKG_LIBS) -lm $(MONO_LIBS)

TARGET   := build/mossywoss

# Auto-discover all source files
SRCS_C   := $(wildcard src/core/*.c)
SRCS_CXX := $(wildcard src/shell/*.cpp) $(wildcard src/apps/*.cpp) src/main.cpp

OBJS_C   := $(patsubst src/core/%.c, build/core/%.o, $(SRCS_C))
OBJS_CXX := $(patsubst src/shell/%.cpp, build/shell/%.o, $(wildcard src/shell/*.cpp)) \
            $(patsubst src/apps/%.cpp, build/apps/%.o, $(wildcard src/apps/*.cpp)) \
            build/main.o

OBJS     := $(OBJS_C) $(OBJS_CXX)

.PHONY: all clean run debug

all: $(TARGET)

$(TARGET): $(OBJS)
	@mkdir -p build
	$(CXX) $(OBJS) -o $(TARGET) $(LDFLAGS)

build/core/%.o: src/core/%.c
	@mkdir -p build/core
	$(CC) $(CFLAGS) -c $< -o $@

build/shell/%.o: src/shell/%.cpp
	@mkdir -p build/shell
	$(CXX) $(CXXFLAGS) -c $< -o $@

build/apps/%.o: src/apps/%.cpp
	@mkdir -p build/apps
	$(CXX) $(CXXFLAGS) -c $< -o $@

build/main.o: src/main.cpp
	@mkdir -p build
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -rf build/

run: $(TARGET)
	./$(TARGET)

debug: CFLAGS += -g -DDEBUG
debug: CXXFLAGS += -g -DDEBUG
debug: $(TARGET)
	gdb ./$(TARGET)
