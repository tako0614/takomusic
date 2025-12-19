// Track state interface for interpreter

import type {
  TrackEvent,
  VocaloidParamEvent,
  NotationEvents,
  TupletInfo,
  GraceNoteEvent,
  RepeatEvent,
  FermataEvent,
  OttavaEvent,
  GrandStaffInfo,
  TablatureInfo,
  ChordSymbolEvent,
  FiguredBassEvent,
  MarkerEvent,
  PatternInstance,
  AudioClipEvent,
  AudioEffect,
  TuningEvent,
  GenerativePattern,
  ConstraintRule,
  MultiVerseLyricEvent,
  OssiaEvent,
  CueNoteEvent,
  StringTechniqueEvent,
  WindTechniqueEvent,
  GuitarBendEvent,
  HarpPedalEvent,
  PercussionNotehead,
  Scene,
  MIDIMapping,
  PageBreakEvent,
  SystemBreakEvent,
  StaffSpacingEvent,
  TextAnnotation,
  RehearsalMark,
  DirectionText,
  TimeStretchEvent,
  PitchShiftEvent,
  SampleSlicerEvent,
  GranularSynthEvent,
  AutomationLane,
  LFOModulation,
  EnvelopeFollower,
  ModulationMatrix,
  BusTrack,
  SendEffect,
  StereoWidthEvent,
  SpatialAudioEvent,
  SurroundPanEvent,
  MPEConfig,
  ArpeggiatorPattern,
  ChordMemory,
  ChordTrigger,
  AdditiveTimeSig,
  PolymetricSection,
  ProportionalNotation,
  GraphicNotationEvent,
  AleatoricBox,
  CutawayScore,
  TransposingInstrument,
  SamplerInstrument,
  MultiSampleInstrument,
  SpectrumAnalyzerConfig,
  LoudnessMeter,
  PhaseCorrelationMeter,
  AnalyzerSnapshot,
  SpectralEdit,
  StepSequencer,
  FollowAction,
  ScaleLock,
  ChordLock,
  Divisi,
  ExpressionMap,
  OSCConfig,
  OSCMapping,
  NetworkMIDIConfig,
  MIDIClockConfig,
  TimecodeConfig,
  DitheringConfig,
  LoudnessMatching,
  ReferenceTrack,
  ID3Metadata,
  ISRCCode,
  SongStructureMarker,
  FreezeTrack,
  AudioWarp,
  WarpMarker,
  BeatSlice,
  SpectralRepair,
  AudioRestoration,
  VocalAlignment,
  MidSideProcessing,
  DynamicEQ,
  LinearPhaseEQ,
  ParallelProcessing,
  TakeLane,
  CompRegion,
  PunchPoint,
  LoopRecording,
  AutomationRecording,
  GrooveTemplate,
  HumanizeSettings,
  Randomization,
  MIDILearnMapping,
  MacroControl,
  StemExport,
  BatchProcessing,
  ExportPreset,
  AtmosObject,
  HeadphoneVirtualization,
  SurroundAutomation,
  ProjectNote,
  Collaborator,
  // New notation types
  ClefChangeEvent,
  KeySignatureEvent,
  FingeringEvent,
  MultiRestEvent,
  SlashNotationEvent,
  BarlineEvent,
  TempoTextEvent,
  HideEmptyStavesEvent,
  VocalStyleEvent,
  NoteEnvelopeEvent,
  VocalTensionEvent,
  MelismaEvent,
  StackedArticulationEvent,
  // Ornaments and extended notation
  TrillEvent,
  MordentEvent,
  TurnEvent,
  ArpeggioEvent,
  GlissandoEvent,
  TremoloEvent,
  HarmonicEvent,
  PedalEvent,
  SwingEvent,
  ProbabilityEvent,
  FeatheredBeamEvent,
  QuarterToneEvent,
  ClusterEvent,
  SprechstimmeEvent,
  CustomNoteheadEvent,
  BracketGroupEvent,
  CueStaffEvent,
  NoteColorEvent,
  // Fourth batch notation types
  VoltaEvent,
  CadenzaEvent,
  DivisiMarkEvent,
  MetricModulationEvent,
  ConductorCueEvent,
  EditorialEvent,
  BrassMuteEvent,
  StringPositionEvent,
  MultiphonicEvent,
  ElectronicsCueEvent,
  BendCurveEvent,
  SlideEvent,
  TapEvent,
  ArrangerSection,
  ChordTrackEvent,
  ScaleLockEvent,
  StepInputEvent,
  MeasureCommentEvent,
  VersionCheckpointEvent,
  // Fifth batch types
  ChordDiagramEvent,
  ScaleDiagramEvent,
  HarpPedalDiagramEvent,
  PartExtractionConfig,
  TranspositionDisplayEvent,
  MeasureNumberConfig,
  WavetableSynthEvent,
  FMSynthEvent,
  AdditiveSynthEvent,
  SubtractiveSynthEvent,
  PhysicalModelEvent,
  VocoderEvent,
  PitchCorrectionEvent,
  FormantShiftEvent,
  ConvolutionReverbEvent,
  AmpSimEvent,
  CabinetSimEvent,
  VideoSyncEvent,
  HitPointEvent,
  TimecodeDisplayConfig,
  ProjectTemplate,
  TrackFolderEvent,
  CollaboratorSession,
  VersionDiffEvent,
} from '../types/ir.js';

export interface TrackState {
  id: string;
  kind: 'vocal' | 'midi';
  cursor: number; // tick position
  events: TrackEvent[];
  meta: Record<string, string | number>;
  channel?: number;
  program?: number;
  defaultVel?: number;
  // Vocaloid parameters
  vocaloidParams?: VocaloidParamEvent[];
  // Notation events
  notation?: NotationEvents;
  // Current slur tracking
  currentSlurStart?: number;
  // Extended notation state
  currentTuplet?: TupletInfo;
  tupletStack?: TupletInfo[];  // Stack for nested tuplets
  currentVoice?: number;
  currentOttava?: { startTick: number; shift: number };
  graceNotes?: GraceNoteEvent[];
  repeats?: RepeatEvent[];
  fermatas?: FermataEvent[];
  ottavas?: OttavaEvent[];
  // Extended features
  grandStaff?: GrandStaffInfo;
  tablature?: TablatureInfo;
  chordSymbols?: ChordSymbolEvent[];
  figuredBass?: FiguredBassEvent[];
  markers?: MarkerEvent[];
  patterns?: PatternInstance[];
  audioClips?: AudioClipEvent[];
  effects?: AudioEffect[];
  // Microtonality
  tuning?: TuningEvent;
  centsDeviation?: number;
  // Algorithmic composition
  generativePatterns?: GenerativePattern[];
  constraints?: ConstraintRule[];
  randomSeed?: number;
  // Advanced notation
  multiVerseLyrics?: MultiVerseLyricEvent[];
  ossias?: OssiaEvent[];
  cueNotes?: CueNoteEvent[];
  stringTechniques?: StringTechniqueEvent[];
  windTechniques?: WindTechniqueEvent[];
  guitarBends?: GuitarBendEvent[];
  harpPedals?: HarpPedalEvent[];
  percussionNoteheads?: Map<number, PercussionNotehead>;
  // Live performance
  scenes?: Scene[];
  midiMappings?: MIDIMapping[];
  // Score layout
  layoutEvents?: (PageBreakEvent | SystemBreakEvent | StaffSpacingEvent)[];
  textAnnotations?: TextAnnotation[];
  rehearsalMarks?: RehearsalMark[];
  directionTexts?: DirectionText[];
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
  stereoWidthEvents?: StereoWidthEvent[];
  spatialEvents?: SpatialAudioEvent[];
  surroundPans?: SurroundPanEvent[];
  // MIDI extensions
  mpeConfig?: MPEConfig;
  arpeggiators?: ArpeggiatorPattern[];
  chordMemories?: ChordMemory[];
  chordTriggers?: ChordTrigger[];
  // Advanced notation
  additiveTimeSigs?: AdditiveTimeSig[];
  polymetricSections?: PolymetricSection[];
  proportionalNotation?: ProportionalNotation[];
  graphicNotation?: GraphicNotationEvent[];
  aleatoricBoxes?: AleatoricBox[];
  cutawayScores?: CutawayScore[];
  transposingInstrument?: TransposingInstrument;
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
  loudnessMatchingConfig?: LoudnessMatching;
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
  // Atmos/spatial
  atmosObjects?: AtmosObject[];
  headphoneVirtualization?: HeadphoneVirtualization;
  surroundAutomation?: SurroundAutomation[];
  // Collaboration
  projectNotes?: ProjectNote[];
  collaborators?: Collaborator[];
  // New notation features
  clefChanges?: ClefChangeEvent[];
  keySignatures?: KeySignatureEvent[];
  fingerings?: FingeringEvent[];
  multiRests?: MultiRestEvent[];
  slashNotations?: SlashNotationEvent[];
  barlines?: BarlineEvent[];
  tempoTexts?: TempoTextEvent[];
  hideEmptyStaves?: HideEmptyStavesEvent;
  vocalStyles?: VocalStyleEvent[];
  noteEnvelopes?: NoteEnvelopeEvent[];
  vocalTensions?: VocalTensionEvent[];
  melismas?: MelismaEvent[];
  stackedArticulations?: StackedArticulationEvent[];
  // Ornaments
  trills?: TrillEvent[];
  mordents?: MordentEvent[];
  turns?: TurnEvent[];
  arpeggios?: ArpeggioEvent[];
  glissandos?: GlissandoEvent[];
  tremolos?: TremoloEvent[];
  harmonics?: HarmonicEvent[];
  // Piano pedals
  pedals?: PedalEvent[];
  // Rhythm/timing
  swingSettings?: SwingEvent[];
  probabilities?: ProbabilityEvent[];
  featheredBeams?: FeatheredBeamEvent[];
  // Modern notation
  quarterTones?: QuarterToneEvent[];
  clusters?: ClusterEvent[];
  sprechstimmes?: SprechstimmeEvent[];
  customNoteheads?: CustomNoteheadEvent[];
  // Score display
  bracketGroups?: BracketGroupEvent[];
  cueStaffs?: CueStaffEvent[];
  noteColors?: NoteColorEvent[];
  // Fourth batch: Score structure
  voltas?: VoltaEvent[];
  cadenzas?: CadenzaEvent[];
  divisiMarks?: DivisiMarkEvent[];
  metricModulations?: MetricModulationEvent[];
  conductorCues?: ConductorCueEvent[];
  editorials?: EditorialEvent[];
  // Fourth batch: Instrument techniques
  brassMutes?: BrassMuteEvent[];
  stringPositions?: StringPositionEvent[];
  multiphonics?: MultiphonicEvent[];
  electronicsCues?: ElectronicsCueEvent[];
  // Fourth batch: Guitar techniques
  bendCurves?: BendCurveEvent[];
  slides?: SlideEvent[];
  taps?: TapEvent[];
  // Fourth batch: DAW features
  arrangerSections?: ArrangerSection[];
  chordTrack?: ChordTrackEvent;
  scaleLockSettings?: ScaleLockEvent[];
  stepInputSettings?: StepInputEvent[];
  // Fourth batch: Collaboration
  measureComments?: MeasureCommentEvent[];
  versionCheckpoints?: VersionCheckpointEvent[];
  // Fifth batch: Notation/diagrams
  chordDiagrams?: ChordDiagramEvent[];
  scaleDiagrams?: ScaleDiagramEvent[];
  harpPedalDiagrams?: HarpPedalDiagramEvent[];
  partExtractions?: PartExtractionConfig[];
  transpositionDisplay?: TranspositionDisplayEvent;
  measureNumberConfig?: MeasureNumberConfig;
  // Fifth batch: Synthesis
  wavetableSynths?: WavetableSynthEvent[];
  fmSynths?: FMSynthEvent[];
  additiveSynths?: AdditiveSynthEvent[];
  subtractiveSynths?: SubtractiveSynthEvent[];
  physicalModels?: PhysicalModelEvent[];
  // Fifth batch: Audio processing
  vocoders?: VocoderEvent[];
  pitchCorrections?: PitchCorrectionEvent[];
  formantShifts?: FormantShiftEvent[];
  convolutionReverbs?: ConvolutionReverbEvent[];
  ampSims?: AmpSimEvent[];
  cabinetSims?: CabinetSimEvent[];
  // Fifth batch: Video
  videoSyncs?: VideoSyncEvent[];
  hitPoints?: HitPointEvent[];
  timecodeDisplay?: TimecodeDisplayConfig;
  // Fifth batch: Workflow
  projectTemplate?: ProjectTemplate;
  trackFolders?: TrackFolderEvent[];
  collaboratorSession?: CollaboratorSession;
  versionDiffs?: VersionDiffEvent[];
}

// Drum name to MIDI note mapping
export const DRUM_MAP: Record<string, number> = {
  kick: 36,
  snare: 38,
  hhc: 42,
  hho: 46,
  tom1: 50,
  crash: 49,
  ride: 51,
};
