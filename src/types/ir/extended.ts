// Extended Song IR types

import type { SongIR } from './core.js';
import type { MarkerEvent, CuePointEvent, Pattern, AudioClipEvent, PageBreakEvent, SystemBreakEvent, StaffSpacingEvent, AdditiveTimeSig, PolymetricSection, ProportionalNotation, GraphicNotationEvent, AleatoricBox, CutawayScore, TransposingInstrument } from './notation.js';
import type { AudioEffect, SpectralEdit } from './effects.js';
import type { AudioTrack, TimeStretchEvent, PitchShiftEvent, SampleSlicerEvent, GranularSynthEvent, BusTrack, SendEffect, SpatialFormat, SpatialAudioEvent, FreezeTrack, AudioWarp, WarpMarker, BeatSlice, SpectralRepair, AudioRestoration, VocalAlignment, MidSideProcessing, DynamicEQ, LinearPhaseEQ, ParallelProcessing, AtmosObject, HeadphoneVirtualization, SurroundAutomation } from './audio.js';
import type { AutomationLane, LFOModulation, EnvelopeFollower, ModulationMatrix } from './automation.js';
import type { MIDIMapping, MPEConfig, ArpeggiatorPattern, ChordMemory, MIDILearnMapping, MacroControl } from './midi.js';
import type { TuningEvent, GenerativePattern, ConstraintRule } from './algorithmic.js';
import type { Scene, StepSequencer, FollowAction, ScaleLock, ChordLock, Divisi, ExpressionMap, GrooveTemplate, HumanizeSettings, Randomization } from './sequencing.js';
import type { SamplerInstrument, MultiSampleInstrument } from './sampling.js';
import type { SpectrumAnalyzerConfig, LoudnessMeter, PhaseCorrelationMeter, AnalyzerSnapshot } from './analysis.js';
import type { OSCConfig, OSCMapping, NetworkMIDIConfig, MIDIClockConfig, TimecodeConfig } from './sync.js';
import type { DitheringConfig, LoudnessMatching, ReferenceTrack, ID3Metadata, ISRCCode, SongStructureMarker, StemExport, BatchProcessing, ExportPreset } from './mastering.js';
import type { TakeLane, CompRegion, PunchPoint, LoopRecording, AutomationRecording } from './recording.js';
import type { ProjectNote, Collaborator } from './collaboration.js';

// Song-level additions
export interface SongIRExtended extends SongIR {
  markers?: MarkerEvent[];
  cuePoints?: CuePointEvent[];
  patterns?: Pattern[];
  audioTracks?: AudioTrack[];
}

// Extended song with ALL features
export interface SongIRFull extends SongIRExtended {
  tuning?: TuningEvent;
  generativePatterns?: GenerativePattern[];
  constraints?: ConstraintRule[];
  scenes?: Scene[];
  midiMappings?: MIDIMapping[];
  layoutEvents?: (PageBreakEvent | SystemBreakEvent | StaffSpacingEvent)[];
  // Audio manipulation
  timeStretchEvents?: TimeStretchEvent[];
  pitchShiftEvents?: PitchShiftEvent[];
  sampleSlicers?: SampleSlicerEvent[];
  granularSynths?: GranularSynthEvent[];
  // Advanced automation
  automationLanes?: AutomationLane[];
  lfoModulations?: LFOModulation[];
  envelopeFollowers?: EnvelopeFollower[];
  modulationMatrix?: ModulationMatrix;
  // Mixing/Mastering
  buses?: BusTrack[];
  sends?: SendEffect[];
  spatialConfig?: SpatialFormat;
  spatialEvents?: SpatialAudioEvent[];
  // MIDI extensions
  mpeConfig?: MPEConfig;
  arpeggiators?: ArpeggiatorPattern[];
  chordMemories?: ChordMemory[];
  // Advanced notation
  additiveTimeSigs?: AdditiveTimeSig[];
  polymetricSections?: PolymetricSection[];
  proportionalNotation?: ProportionalNotation[];
  graphicNotation?: GraphicNotationEvent[];
  aleatoricBoxes?: AleatoricBox[];
  cutawayScores?: CutawayScore[];
  transposingInstruments?: TransposingInstrument[];
  // Sampling
  samplerInstruments?: SamplerInstrument[];
  multiSampleInstruments?: MultiSampleInstrument[];
  // Analysis
  spectrumAnalyzer?: SpectrumAnalyzerConfig;
  loudnessMeter?: LoudnessMeter;
  phaseCorrelationMeter?: PhaseCorrelationMeter;
  analyzerSnapshots?: AnalyzerSnapshot[];
  // Advanced audio processing
  spectralEdits?: SpectralEdit[];
  // Sequencing extensions
  stepSequencers?: StepSequencer[];
  followActions?: FollowAction[];
  scaleLocks?: ScaleLock[];
  chordLocks?: ChordLock[];
  divisiSections?: Divisi[];
  expressionMaps?: ExpressionMap[];
  // Sync & communication
  oscConfig?: OSCConfig;
  oscMappings?: OSCMapping[];
  networkMidiConfig?: NetworkMIDIConfig;
  midiClockConfig?: MIDIClockConfig;
  timecodeConfig?: TimecodeConfig;
  // Mastering
  ditheringConfig?: DitheringConfig;
  loudnessMatching?: LoudnessMatching;
  referenceTracks?: ReferenceTrack[];
  // Metadata
  id3Metadata?: ID3Metadata;
  isrcCodes?: ISRCCode[];
  songStructureMarkers?: SongStructureMarker[];
  // Audio editing & restoration
  freezeTracks?: FreezeTrack[];
  audioWarps?: AudioWarp[];
  warpMarkers?: WarpMarker[];
  beatSlices?: BeatSlice[];
  spectralRepairs?: SpectralRepair[];
  audioRestorations?: AudioRestoration[];
  vocalAlignments?: VocalAlignment[];
  // Dynamics processing
  midSideProcessing?: MidSideProcessing[];
  dynamicEQs?: DynamicEQ[];
  linearPhaseEQs?: LinearPhaseEQ[];
  parallelProcessing?: ParallelProcessing[];
  // Recording
  takeLanes?: TakeLane[];
  compRegions?: CompRegion[];
  punchPoints?: PunchPoint[];
  loopRecordings?: LoopRecording[];
  automationRecordings?: AutomationRecording[];
  // Groove & humanize
  grooveTemplates?: GrooveTemplate[];
  humanizeSettings?: HumanizeSettings[];
  randomizations?: Randomization[];
  // Controller & macro
  midiLearnMappings?: MIDILearnMapping[];
  macroControls?: MacroControl[];
  // Export & batch
  stemExports?: StemExport[];
  batchProcessings?: BatchProcessing[];
  exportPresets?: ExportPreset[];
  // Atmos/spatial extension
  atmosObjects?: AtmosObject[];
  headphoneVirtualization?: HeadphoneVirtualization;
  surroundAutomation?: SurroundAutomation[];
  // Collaboration
  projectNotes?: ProjectNote[];
  collaborators?: Collaborator[];
}
