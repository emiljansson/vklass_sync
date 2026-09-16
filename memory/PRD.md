# Lyssna – Product Requirements

## Overview
**App Name:** Lyssna  
**Purpose:** Help Swedish speakers learn pronunciation of the most common English words by hearing each word spoken aloud three times while seeing the English word and Swedish translation.

## Core Requirements
- Display English word + Swedish translation
- Speak each English word aloud using browser TTS
- Repeat each word **3 times** before advancing
- Include **2000+** common English words
- Simple controls: start, play/pause, next/previous, speech rate
- Persist progress in localStorage

## Tech
- React frontend (existing CRA/craco stack)
- Web Speech API (client-side, no backend required for core flow)
- Static JSON word list
