cmake_minimum_required(VERSION 3.10)
project(MossyWossOS C CXX)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find Package Dependencies
find_package(PkgConfig REQUIRED)

pkg_check_modules(SDL2 REQUIRED sdl2)
pkg_check_modules(SDL2_TTF REQUIRED SDL2_ttf)
pkg_check_modules(SDL2_IMAGE REQUIRED SDL2_image)
pkg_check_modules(SQLITE3 REQUIRED sqlite3)
pkg_check_modules(CURL REQUIRED libcurl)

# Optional: Mono for full C# scripting support
pkg_check_modules(MONO mono-2)
if(MONO_FOUND)
    message(STATUS "Mono found - full C# scripting enabled")
    add_compile_definitions(MWCS_HAS_MONO=1)
else()
    message(STATUS "Mono not found - using built-in C# interpreter")
endif()

# Include Directories
include_directories(
    src
    ${SDL2_INCLUDE_DIRS}
    ${SDL2_TTF_INCLUDE_DIRS}
    ${SDL2_IMAGE_INCLUDE_DIRS}
    ${SQLITE3_INCLUDE_DIRS}
    ${CURL_INCLUDE_DIRS}
    ${MONO_INCLUDE_DIRS}
)

# Collect Source Files (auto-discover)
file(GLOB SRCS_C "src/core/*.c")
file(GLOB SRCS_SHELL "src/shell/*.cpp")
file(GLOB SRCS_APPS "src/apps/*.cpp")

set(ALL_SOURCES
    ${SRCS_C}
    ${SRCS_SHELL}
    ${SRCS_APPS}
    src/main.cpp
)

# Target Executable
add_executable(mossywoss ${ALL_SOURCES})

# Target Link Libraries
set(MWO_LIBS
    ${SDL2_LIBRARIES}
    ${SDL2_TTF_LIBRARIES}
    ${SDL2_IMAGE_LIBRARIES}
    ${SQLITE3_LIBRARIES}
    ${CURL_LIBRARIES}
    m
)

if(MONO_FOUND)
    list(APPEND MWO_LIBS ${MONO_LIBRARIES})
endif()

target_link_libraries(mossywoss PRIVATE ${MWO_LIBS})

# Compiler Warnings & Flags
if(MSVC)
    target_compile_options(mossywoss PRIVATE /W4)
else()
    target_compile_options(mossywoss PRIVATE -Wall -Wextra -O2)
endif()

# Install Target
install(TARGETS mossywoss DESTINATION bin)
install(DIRECTORY assets/ DESTINATION share/mossywoss/assets)
install(DIRECTORY web/ DESTINATION share/mossywoss/web)
