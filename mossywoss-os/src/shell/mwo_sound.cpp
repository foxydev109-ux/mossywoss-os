#include "mwo_sound.h"
#include <SDL2/SDL.h>
#include <cmath>
#include <cstdlib>
#include <cstring>
#include <algorithm>
#include <iostream>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

static const int SAMPLE_RATE = 44100;
static const int MAX_VOICES = 32;

struct Voice {
    bool active;
    WaveformType wave;
    float start_freq;
    float end_freq;
    float total_samples;
    float current_sample;
    float phase;
    float volume;
};

static Voice g_voices[MAX_VOICES];
static bool g_sound_initialized = false;
static bool g_ambient_music_active = false;
static float g_ambient_timer_samples = 0.0f;
static int g_ambient_note_index = 0;

static const float PENTATONIC_FREQS[] = {
    261.63f, // C4
    293.66f, // D4
    329.63f, // E4
    392.00f, // G4
    440.00f, // A4
    523.25f, // C5
    587.33f, // D5
    659.25f  // E5
};
static const int PENTATONIC_COUNT = 8;

static float sample_waveform(WaveformType wave, float phase) {
    switch (wave) {
        case WAVE_SINE:
            return std::sin(2.0f * (float)M_PI * phase);
        case WAVE_TRIANGLE:
            return 4.0f * std::abs(phase - std::floor(phase + 0.5f)) - 1.0f;
        case WAVE_SAWTOOTH:
            return 2.0f * (phase - std::floor(phase + 0.5f));
        case WAVE_SQUARE:
            return (std::fmod(phase, 1.0f) < 0.5f) ? 1.0f : -1.0f;
    }
    return 0.0f;
}

static void audio_callback(void* userdata, uint8_t* stream, int len) {
    (void)userdata;
    int16_t* buffer = reinterpret_cast<int16_t*>(stream);
    int num_samples = len / sizeof(int16_t);

    for (int i = 0; i < num_samples; ++i) {
        float mixed_sample = 0.0f;

        // Ambient music note generator every 600ms (0.600 * 44100 = 26460 samples)
        if (g_ambient_music_active) {
            g_ambient_timer_samples += 1.0f;
            if (g_ambient_timer_samples >= 26460.0f) {
                g_ambient_timer_samples = 0.0f;
                float freq = PENTATONIC_FREQS[g_ambient_note_index % PENTATONIC_COUNT];
                g_ambient_note_index = (g_ambient_note_index + (std::rand() % 3 + 1)) % PENTATONIC_COUNT;
                
                // Add soft ambient note
                for (int v = 0; v < MAX_VOICES; ++v) {
                    if (!g_voices[v].active) {
                        g_voices[v].active = true;
                        g_voices[v].wave = WAVE_SINE;
                        g_voices[v].start_freq = freq;
                        g_voices[v].end_freq = freq;
                        g_voices[v].total_samples = 0.5f * SAMPLE_RATE; // 500ms
                        g_voices[v].current_sample = 0.0f;
                        g_voices[v].phase = 0.0f;
                        g_voices[v].volume = 0.25f;
                        break;
                    }
                }
            }
        }

        // Mix active voices
        for (int v = 0; v < MAX_VOICES; ++v) {
            if (!g_voices[v].active) continue;

            float progress = g_voices[v].current_sample / g_voices[v].total_samples;
            if (progress >= 1.0f) {
                g_voices[v].active = false;
                continue;
            }

            float current_freq = g_voices[v].start_freq + (g_voices[v].end_freq - g_voices[v].start_freq) * progress;
            float phase_inc = current_freq / (float)SAMPLE_RATE;
            g_voices[v].phase = std::fmod(g_voices[v].phase + phase_inc, 1.0f);

            float raw_val = sample_waveform(g_voices[v].wave, g_voices[v].phase);

            // Envelope: smooth fade-out near end
            float env = 1.0f;
            if (progress > 0.8f) {
                env = (1.0f - progress) / 0.2f;
            } else if (progress < 0.05f) {
                env = progress / 0.05f;
            }

            mixed_sample += raw_val * g_voices[v].volume * env;
            g_voices[v].current_sample += 1.0f;
        }

        // Hard clamp to [-1.0, 1.0]
        mixed_sample = std::clamp(mixed_sample, -1.0f, 1.0f);
        buffer[i] = static_cast<int16_t>(mixed_sample * 32767.0f);
    }
}

bool sound_init() {
    if (g_sound_initialized) return true;

    for (int i = 0; i < MAX_VOICES; ++i) {
        g_voices[i].active = false;
    }

    SDL_AudioSpec desired, obtained;
    std::memset(&desired, 0, sizeof(desired));
    desired.freq = SAMPLE_RATE;
    desired.format = AUDIO_S16SYS;
    desired.channels = 1;
    desired.samples = 1024;
    desired.callback = audio_callback;
    desired.userdata = NULL;

    if (SDL_OpenAudio(&desired, &obtained) < 0) {
        std::cerr << "Failed to open SDL Audio: " << SDL_GetError() << std::endl;
        return false;
    }

    SDL_PauseAudio(0); // start audio processing
    g_sound_initialized = true;
    return true;
}

void sound_cleanup() {
    if (g_sound_initialized) {
        SDL_CloseAudio();
        g_sound_initialized = false;
    }
}

void playTone(WaveformType wave, float start_freq, float end_freq, float duration_ms, float volume) {
    if (!g_sound_initialized) {
        sound_init();
    }

    SDL_LockAudio();
    for (int i = 0; i < MAX_VOICES; ++i) {
        if (!g_voices[i].active) {
            g_voices[i].active = true;
            g_voices[i].wave = wave;
            g_voices[i].start_freq = start_freq;
            g_voices[i].end_freq = end_freq;
            g_voices[i].total_samples = (duration_ms / 1000.0f) * (float)SAMPLE_RATE;
            g_voices[i].current_sample = 0.0f;
            g_voices[i].phase = 0.0f;
            g_voices[i].volume = volume;
            break;
        }
    }
    SDL_UnlockAudio();
}

// playClick() — 800→400Hz sine, 30ms
void playClick() {
    playTone(WAVE_SINE, 800.0f, 400.0f, 30.0f, 0.4f);
}

// playPop() — 300→600Hz triangle, 80ms
void playPop() {
    playTone(WAVE_TRIANGLE, 300.0f, 600.0f, 80.0f, 0.5f);
}

// playChime() — C5/E5/G5 major triad
void playChime() {
    // C5 = 523.25 Hz, E5 = 659.25 Hz, G5 = 783.99 Hz
    playTone(WAVE_SINE, 523.25f, 523.25f, 300.0f, 0.3f);
    playTone(WAVE_SINE, 659.25f, 659.25f, 300.0f, 0.3f);
    playTone(WAVE_SINE, 783.99f, 783.99f, 300.0f, 0.3f);
}

// playError() — 200→100Hz sawtooth, 150ms
void playError() {
    playTone(WAVE_SAWTOOTH, 200.0f, 100.0f, 150.0f, 0.5f);
}

// startAmbientMusic() — pentatonic notes every 600ms
void startAmbientMusic() {
    if (!g_sound_initialized) {
        sound_init();
    }
    g_ambient_music_active = true;
    g_ambient_timer_samples = 26450.0f; // trigger immediately
}

void stopAmbientMusic() {
    g_ambient_music_active = false;
}
