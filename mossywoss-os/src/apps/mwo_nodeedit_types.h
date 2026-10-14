#pragma once

/**
 * mwo_nodeedit_types.h — Node type definitions, colors, and default pin setup
 * for the Unreal Engine 5 + Unity hybrid visual node editor.
 */

#include <SDL2/SDL.h>
#include <string.h>
#include <stdio.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Node type names for display */
static const char* ne_node_type_name(NodeType type) {
    switch (type) {
        case NE_NODE_EVENT:    return "Event";
        case NE_NODE_ACTION:   return "Action";
        case NE_NODE_VARIABLE: return "Variable";
        case NE_NODE_MATH:     return "Math";
        case NE_NODE_FLOW:     return "Flow";
        case NE_NODE_3D:      return "3D";
        case NE_NODE_RENDER:  return "Render";
        case NE_NODE_COMMENT: return "Comment";
        default:               return "Unknown";
    }
}

/* Node header colors by type (Unreal-style color coding) */
static SDL_Color ne_node_color(NodeType type) {
    switch (type) {
        case NE_NODE_EVENT:    return (SDL_Color){180, 40, 40, 255};   /* Red */
        case NE_NODE_ACTION:   return (SDL_Color){40, 80, 180, 255};  /* Blue */
        case NE_NODE_VARIABLE: return (SDL_Color){40, 140, 40, 255};  /* Green */
        case NE_NODE_MATH:     return (SDL_Color){140, 40, 180, 255}; /* Purple */
        case NE_NODE_FLOW:     return (SDL_Color){200, 120, 30, 255}; /* Orange */
        case NE_NODE_3D:      return (SDL_Color){30, 160, 180, 255};  /* Cyan */
        case NE_NODE_RENDER:  return (SDL_Color){180, 60, 140, 255};  /* Pink */
        case NE_NODE_COMMENT:  return (SDL_Color){100, 100, 100, 255};/* Grey */
        default:               return (SDL_Color){80, 80, 80, 255};
    }
}

/* Pin colors by data type */
typedef enum {
    NE_DATA_EXEC,
    NE_DATA_FLOAT,
    NE_DATA_INT,
    NE_DATA_STRING,
    NE_DATA_BOOL,
    NE_DATA_VECTOR3
} NEDataType;

static SDL_Color ne_pin_color(int data_type) {
    switch (data_type) {
        case NE_DATA_EXEC:    return (SDL_Color){255, 255, 255, 255}; /* White */
        case NE_DATA_FLOAT:   return (SDL_Color){60, 180, 60, 255};  /* Green */
        case NE_DATA_INT:     return (SDL_Color){60, 100, 220, 255}; /* Blue */
        case NE_DATA_STRING:  return (SDL_Color){220, 200, 60, 255}; /* Yellow */
        case NE_DATA_BOOL:    return (SDL_Color){220, 60, 60, 255};  /* Red */
        case NE_DATA_VECTOR3: return (SDL_Color){60, 200, 220, 255}; /* Cyan */
        default:              return (SDL_Color){180, 180, 180, 255}; /* Grey */
    }
}

/**
 * Create default pins for a node based on its type.
 * Fills the node's pins array with appropriate inputs/outputs.
 */
static void ne_create_default_pins(NENode* node, NodeType type) {
    node->pin_count = 0;

    switch (type) {
        case NE_NODE_EVENT: {
            /* Events have exec out only */
            node->pins[0].id = 0;
            node->pins[0].type = NE_PIN_EXEC_OUT;
            node->pins[0].node_id = node->id;
            strcpy(node->pins[0].name, "Exec");
            node->pins[0].connected_to = -1;
            node->pin_count = 1;
            break;
        }
        case NE_NODE_ACTION: {
            /* Actions have exec in, exec out, and data inputs */
            node->pins[0].id = 0;
            node->pins[0].type = NE_PIN_EXEC_IN;
            node->pins[0].node_id = node->id;
            strcpy(node->pins[0].name, "Exec");
            node->pins[0].connected_to = -1;

            node->pins[1].id = 1;
            node->pins[1].type = NE_PIN_EXEC_OUT;
            node->pins[1].node_id = node->id;
            strcpy(node->pins[1].name, "Done");
            node->pins[1].connected_to = -1;

            /* Print: string input */
            node->pins[2].id = 2;
            node->pins[2].type = NE_PIN_INPUT;
            node->pins[2].node_id = node->id;
            strcpy(node->pins[2].name, "Message");
            node->pins[2].connected_to = -1;
            node->pins[2].value_str[0] = '\0';
            node->pin_count = 3;
            break;
        }
        case NE_NODE_VARIABLE: {
            /* Variables have value input and output */
            node->pins[0].id = 0;
            node->pins[0].type = NE_PIN_INPUT;
            node->pins[0].node_id = node->id;
            strcpy(node->pins[0].name, "Value");
            node->pins[0].connected_to = -1;
            node->pins[0].value_float = 0;

            node->pins[1].id = 1;
            node->pins[1].type = NE_PIN_OUTPUT;
            node->pins[1].node_id = node->id;
            strcpy(node->pins[1].name, "Out");
            node->pins[1].connected_to = -1;
            node->pins[1].value_float = 0;
            node->pin_count = 2;
            break;
        }
        case NE_NODE_MATH: {
            /* Math: A in, B in, Result out */
            node->pins[0].id = 0;
            node->pins[0].type = NE_PIN_INPUT;
            node->pins[0].node_id = node->id;
            strcpy(node->pins[0].name, "A");
            node->pins[0].connected_to = -1;
            node->pins[0].value_float = 0;

            node->pins[1].id = 1;
            node->pins[1].type = NE_PIN_INPUT;
            node->pins[1].node_id = node->id;
            strcpy(node->pins[1].name, "B");
            node->pins[1].connected_to = -1;
            node->pins[1].value_float = 0;

            node->pins[2].id = 2;
            node->pins[2].type = NE_PIN_OUTPUT;
            node->pins[2].node_id = node->id;
            strcpy(node->pins[2].name, "Result");
            node->pins[2].connected_to = -1;
            node->pin_count = 3;
            break;
        }
        case NE_NODE_FLOW: {
            /* Flow: exec in, exec out, condition in */
            node->pins[0].id = 0;
            node->pins[0].type = NE_PIN_EXEC_IN;
            node->pins[0].node_id = node->id;
            strcpy(node->pins[0].name, "Exec");
            node->pins[0].connected_to = -1;

            node->pins[1].id = 1;
            node->pins[1].type = NE_PIN_EXEC_OUT;
            node->pins[1].node_id = node->id;
            strcpy(node->pins[1].name, "True");
            node->pins[1].connected_to = -1;

            node->pins[2].id = 2;
            node->pins[2].type = NE_PIN_EXEC_OUT;
            node->pins[2].node_id = node->id;
            strcpy(node->pins[2].name, "False");
            node->pins[2].connected_to = -1;

            node->pins[3].id = 3;
            node->pins[3].type = NE_PIN_INPUT;
            node->pins[3].node_id = node->id;
            strcpy(node->pins[3].name, "Condition");
            node->pins[3].connected_to = -1;
            node->pins[3].value_bool = false;
            node->pin_count = 4;
            break;
        }
        case NE_NODE_3D: {
            /* 3D: exec in/out, mesh name in, position in */
            node->pins[0].id = 0;
            node->pins[0].type = NE_PIN_EXEC_IN;
            node->pins[0].node_id = node->id;
            strcpy(node->pins[0].name, "Exec");
            node->pins[0].connected_to = -1;

            node->pins[1].id = 1;
            node->pins[1].type = NE_PIN_EXEC_OUT;
            node->pins[1].node_id = node->id;
            strcpy(node->pins[1].name, "Done");
            node->pins[1].connected_to = -1;

            node->pins[2].id = 2;
            node->pins[2].type = NE_PIN_INPUT;
            node->pins[2].node_id = node->id;
            strcpy(node->pins[2].name, "MeshName");
            node->pins[2].connected_to = -1;

            node->pins[3].id = 3;
            node->pins[3].type = NE_PIN_INPUT;
            node->pins[3].node_id = node->id;
            strcpy(node->pins[3].name, "Position");
            node->pins[3].connected_to = -1;
            node->pin_count = 4;
            break;
        }
        case NE_NODE_RENDER: {
            /* Render: exec in/out, color in */
            node->pins[0].id = 0;
            node->pins[0].type = NE_PIN_EXEC_IN;
            node->pins[0].node_id = node->id;
            strcpy(node->pins[0].name, "Exec");
            node->pins[0].connected_to = -1;

            node->pins[1].id = 1;
            node->pins[1].type = NE_PIN_EXEC_OUT;
            node->pins[1].node_id = node->id;
            strcpy(node->pins[1].name, "Done");
            node->pins[1].connected_to = -1;

            node->pins[2].id = 2;
            node->pins[2].type = NE_PIN_INPUT;
            node->pins[2].node_id = node->id;
            strcpy(node->pins[2].name, "Color");
            node->pins[2].connected_to = -1;
            node->pin_count = 3;
            break;
        }
        case NE_NODE_COMMENT: {
            /* Comment: no pins */
            node->pin_count = 0;
            break;
        }
    }
}

/**
 * Get the node title string for a specific node subtype.
 * The subtype is encoded in the title field.
 */
static const char* ne_default_title(NodeType type) {
    switch (type) {
        case NE_NODE_EVENT:    return "OnStart";
        case NE_NODE_ACTION:   return "Print";
        case NE_NODE_VARIABLE: return "Get Float";
        case NE_NODE_MATH:     return "Add";
        case NE_NODE_FLOW:     return "Branch";
        case NE_NODE_3D:      return "CreateMesh";
        case NE_NODE_RENDER:  return "SetColor";
        case NE_NODE_COMMENT:  return "Comment";
        default:               return "Node";
    }
}

#ifdef __cplusplus
}
#endif
