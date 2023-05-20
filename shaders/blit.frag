#version 300 es

precision mediump float;

uniform sampler2D tex;

in vec2 uv;
out vec4 frag_colour;

void main() {
    frag_colour = texture(tex, uv);
}