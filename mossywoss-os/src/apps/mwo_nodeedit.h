#pragma once
#include <SDL2/SDL.h>
#include <SDL2/SDL_ttf.h>
#include <stdbool.h>
#include <string>

typedef enum {
    NE_NODE_EVENT,      // OnStart, OnUpdate, OnClick, OnCollision
    NE_NODE_ACTION,     // Print, Spawn, Destroy, PlaySound, Move, Rotate
    NE_NODE_VARIABLE,   // Get, Set, Float, Int, String, Bool, Vector3
    NE_NODE_MATH,       // Add, Sub, Mul, Div, Sin, Cos, Compare
    NE_NODE_FLOW,      // Branch, ForLoop, While, Sequence
    NE_NODE_3D,        // CreateMesh, SetMaterial, SetPosition, Camera
    NE_NODE_RENDER,    // SetColor, DrawText, DrawShape
    NE_NODE_COMMENT     // Comment box
} NodeType;

typedef enum {
    NE_PIN_INPUT,
    NE_PIN_OUTPUT,
    NE_PIN_EXEC_IN,
    NE_PIN_EXEC_OUT
} PinType;

typedef struct {
    int id;
    PinType type;
    char name[32];
    int node_id;
    int connected_to;  // pin id of connected pin, -1 if none
    float x, y;        // screen position (computed from node position)
    SDL_Rect hitbox;
    float value_float;
    char value_str[256];
    int value_int;
    bool value_bool;
} NENodePin;

typedef struct {
    int id;
    NodeType type;
    char title[64];
    float x, y;         // node position on canvas
    float w, h;          // node size
    bool selected;
    bool collapsed;
    NENodePin pins[16];
    int pin_count;
    SDL_Color color;     // node header color by type
} NENode;

typedef struct {
    int from_pin;
    int to_pin;
    int from_node;
    int to_node;
} NEConnection;

typedef struct {
    NENode nodes[256];
    int node_count;
    NEConnection connections[512];
    int connection_count;
    float pan_x, pan_y;   // canvas pan offset
    float zoom;           // 1.0 = normal
    int next_node_id;
    int next_pin_id;
    int selected_node;    // -1 if none
    int dragging_node;    // -1 if none
    int connecting_pin;   // -1 if not dragging a connection
    float drag_offset_x, drag_offset_y;
    char search_query[128];
    bool search_active;
    bool show_context_menu;
    float context_menu_x, context_menu_y;
    int context_menu_item;
} NEGraph;

class NodeEdit {
public:
    NodeEdit();
    ~NodeEdit();

    void init(SDL_Renderer* renderer, TTF_Font* font);
    void render(int x, int y, int w, int h);
    void handle_event(SDL_Event* event);

    int create_node(NodeType type, float x, float y);
    bool connect_pins(int from_pin, int to_pin);
    void delete_selected();
    void clear_graph();
    std::string export_json();
    bool import_json(const std::string& json_str);
    NEGraph* get_graph();

    // VFS Integration helpers
    bool save_to_vfs(const char* filepath);
    bool load_from_vfs(const char* filepath);

private:
    SDL_Renderer* m_renderer = nullptr;
    TTF_Font* m_font = nullptr;
    NEGraph m_graph;

    // Viewport bounds
    int m_view_x = 0;
    int m_view_y = 0;
    int m_view_w = 800;
    int m_view_h = 600;

    // Canvas navigation state
    bool m_is_panning = false;
    float m_pan_start_x = 0.0f;
    float m_pan_start_y = 0.0f;
    float m_initial_pan_x = 0.0f;
    float m_initial_pan_y = 0.0f;

    // Mouse tracking
    float m_mouse_x = 0.0f;
    float m_mouse_y = 0.0f;

    // Touch support (Samsung Galaxy Tab S10 Lite, iPad 9th Gen, tablets/phones)
    struct TouchState {
        SDL_FingerID id;
        float x, y;
    };
    TouchState m_touches[10];
    int m_touch_count = 0;
    float m_pinch_start_dist = 0.0f;
    float m_pinch_start_zoom = 1.0f;

    // Context menu state
    int m_hovered_category = -1;
    int m_hovered_subitem = -1;

    // Property panel inline editor state
    int m_editing_pin_id = -1;
    bool m_editing_text = false;
    char m_edit_buffer[256] = {0};

    // Coordinate transformations
    void world_to_screen(float wx, float wy, float* sx, float* sy) const;
    void screen_to_world(float sx, float sy, float* wx, float* wy) const;

    // Hit testing and pin lookup
    void update_pin_positions();
    NENodePin* find_pin_by_id(int pin_id);
    NENode* find_node_by_id(int node_id);
    NENodePin* get_pin_at_screen(float sx, float sy);
    int get_node_at_screen(float sx, float sy);
    int get_node_header_at_screen(float sx, float sy);
    bool disconnect_pin(int pin_id);

    // Render passes
    void render_grid();
    void render_nodes();
    void render_connections();
    void render_active_connection();
    void render_context_menu();
    void render_property_panel();

    // Primitive renderers
    void render_text(const char* text, int x, int y, SDL_Color color);
    void render_filled_circle(int cx, int cy, int radius, SDL_Color color);
    void render_triangle(int cx, int cy, int size, bool points_right, SDL_Color color);
    void render_bezier_curve(float x1, float y1, float x2, float y2, SDL_Color color);

    // Touch gesture handlers
    void handle_touch_down(const SDL_TouchFingerEvent& tfinger);
    void handle_touch_motion(const SDL_TouchFingerEvent& tfinger);
    void handle_touch_up(const SDL_TouchFingerEvent& tfinger);
};
