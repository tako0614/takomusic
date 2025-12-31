# DAW Integration Guide

This guide explains how to use TakoMusic with popular Digital Audio Workstations (DAWs).

## Supported Workflows

### 1. MIDI Export (Recommended)

TakoMusic generates standard MIDI files that can be imported into any DAW:

```bash
# Build your score
mf build src/main.mf

# Render to MIDI
mf render --profile profiles/midi.mf.profile.json
```

The output MIDI file includes:
- Multi-track arrangement
- Program Change messages for instrument selection
- Control Change automation
- Tempo and meter information

### 2. Importing into Ableton Live

1. **Drag and Drop**: Simply drag the `.mid` file into an Ableton Live set
2. **Multi-track Import**: Live will create separate MIDI tracks for each track in your score
3. **Instrument Assignment**: Assign VST/AU instruments to each track

**Tips for Ableton Live:**
- Use the "Fold" button to see only used notes
- Enable "Groove Pool" for additional humanization
- Map TakoMusic tracks to Live's instrument racks

### 3. Importing into Logic Pro

1. **File > Import > MIDI File**: Import your `.mid` file
2. **Track Assignment**: Logic creates tracks automatically
3. **Software Instruments**: Assign Apple or third-party instruments

**Tips for Logic Pro:**
- Use "Create Track Stack" to organize multi-part compositions
- Enable "Smart Quantize" for additional timing adjustments
- Use "Score Editor" for notation view

### 4. Importing into FL Studio

1. **File > Import > MIDI File**: Select your `.mid` file
2. **Channel Rack**: Each track appears as a separate channel
3. **Piano Roll**: Edit notes in FL Studio's piano roll

### 5. Importing into Reaper

1. **Insert > Media File**: Import the MIDI file
2. **Item Properties**: Configure MIDI item settings
3. **ReaSynth/VSTi**: Add virtual instruments to tracks

## Profile Configuration for DAWs

Create optimized profiles for specific DAWs:

### Ableton Live Profile

```json
{
  "renderer": "midi.standard",
  "output": {
    "path": "output/ableton-ready.mid",
    "ppq": 480
  },
  "humanize": {
    "enabled": true,
    "timing": 5,
    "velocity": 8
  },
  "bindings": [
    {
      "selector": { "role": "Instrument" },
      "config": { "channel": 0, "program": 0 }
    },
    {
      "selector": { "role": "Drums" },
      "config": { "channel": 9 }
    }
  ]
}
```

### Logic Pro Profile

```json
{
  "renderer": "midi.standard",
  "output": {
    "path": "output/logic-ready.mid",
    "ppq": 960
  },
  "humanize": {
    "enabled": true,
    "timing": 3,
    "velocity": 5
  },
  "bindings": [
    {
      "selector": { "role": "Instrument" },
      "config": { "channel": 0, "program": 0 }
    },
    {
      "selector": { "role": "Drums" },
      "config": { "channel": 9 }
    }
  ]
}
```

## General MIDI Program Numbers

For consistent sound across DAWs, use General MIDI program numbers:

| Instrument | Program # |
|------------|-----------|
| Piano | 0 |
| Electric Piano | 4 |
| Harpsichord | 6 |
| Vibraphone | 11 |
| Organ | 16-23 |
| Guitar | 24-31 |
| Bass | 32-39 |
| Strings | 40-47 |
| Brass | 56-63 |
| Synth Lead | 80-87 |
| Synth Pad | 88-95 |

## Automation

TakoMusic automation curves map to MIDI Control Change:

```javascript
// In your .mf file
automation param "volume" {
  at 1:1 cc(7, 0.5);  // CC7 = Volume
  at 2:1 cc(7, 1.0);
}

automation param "pan" {
  at 1:1 cc(10, 0.5);  // CC10 = Pan (center)
}

automation param "expression" {
  at 1:1 cc(11, 1.0);  // CC11 = Expression
}
```

## Troubleshooting

### Notes are on wrong channel
Check your profile's `bindings` section and ensure channels are correctly assigned.

### Tempo is wrong
Ensure your score's `tempo` block is properly defined:
```javascript
tempo { 1:1 -> 120bpm; }
```

### Drums sound wrong
Make sure drums are on MIDI channel 10 (index 9) and use General MIDI drum mapping.

## Future Features

- Ableton Live Set (.als) direct export
- Logic Pro project (.logicx) export
- FL Studio project (.flp) export
- OSC/Ableton Link real-time sync
