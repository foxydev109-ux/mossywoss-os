#pragma once

#include <SDL2/SDL.h>
#include <cmath>

enum WaveformType {
    WAVE_SINE = 0,
    WAVE_TRIANGLE,
    WAVE_SAWTOOTH,
    WAVE_SQUARE
};

bool sound_init();
void sound_cleanup();

void playClick();
void playPop();
void playChime();
void playError();
void startAmbientMusic();
void stopAmbientMusic();

void playTone(WaveformType wave, float start_freq, float end_freq, float duration_ms, float volume = 0.5f);
