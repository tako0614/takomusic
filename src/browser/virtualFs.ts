/**
 * Virtual File System for browser-based TakoMusic compiler
 *
 * Provides an in-memory file system with bundled standard library modules.
 * Allows the compiler to resolve imports without Node.js fs dependencies.
 */

// Standard library modules bundled as strings
// These are embedded at build time to avoid Node.js fs dependencies

export const STDLIB_CORE = `// std:core (v4)

fn posToRat(pos) {
  if (pos == null) {
    return null;
  }
  if (pos.kind == "rat") {
    return pos.rat;
  }
  if (pos.kind != null) {
    return null;
  }
  if (pos.n != null && pos.d != null) {
    return pos;
  }
  return null;
}

fn eventStartRat(ev) {
  if (ev.type == "marker") {
    return posToRat(ev.pos);
  }
  if (ev.type == "automation") {
    return posToRat(ev.start);
  }
  return posToRat(ev.start);
}

fn eventEndRat(ev) {
  if (ev.type == "note" || ev.type == "chord" || ev.type == "drumHit" || ev.type == "breath") {
    const start = posToRat(ev.start);
    if (start == null) {
      return null;
    }
    return start + ev.dur;
  }
  if (ev.type == "control") {
    return posToRat(ev.start);
  }
  if (ev.type == "automation") {
    return posToRat(ev.end);
  }
  if (ev.type == "marker") {
    return posToRat(ev.pos);
  }
  return null;
}

fn clipLength(c) {
  if (c.length != null) {
    return c.length;
  }
  let max = null;
  for (ev in c.events) {
    const end = eventEndRat(ev);
    if (end == null) {
      return null;
    }
    if (max == null || end > max) {
      max = end;
    }
  }
  if (max == null) {
    return 0 / 1;
  }
  return max;
}

fn shiftPos(pos, offset) {
  if (pos == null) {
    return pos;
  }
  return pos + offset;
}

fn shiftEvent(ev, offset) {
  if (ev.type == "note") {
    return {
      type: "note",
      start: shiftPos(ev.start, offset),
      dur: ev.dur,
      pitch: ev.pitch,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      lyric: ev.lyric,
      ext: ev.ext
    };
  }
  if (ev.type == "chord") {
    return {
      type: "chord",
      start: shiftPos(ev.start, offset),
      dur: ev.dur,
      pitches: ev.pitches,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "drumHit") {
    return {
      type: "drumHit",
      start: shiftPos(ev.start, offset),
      dur: ev.dur,
      key: ev.key,
      velocity: ev.velocity,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "control") {
    return {
      type: "control",
      start: shiftPos(ev.start, offset),
      kind: ev.kind,
      data: ev.data,
      ext: ev.ext
    };
  }
  if (ev.type == "automation") {
    return {
      type: "automation",
      param: ev.param,
      start: shiftPos(ev.start, offset),
      end: shiftPos(ev.end, offset),
      curve: ev.curve,
      ext: ev.ext
    };
  }
  if (ev.type == "marker") {
    return {
      type: "marker",
      pos: shiftPos(ev.pos, offset),
      kind: ev.kind,
      label: ev.label
    };
  }
  if (ev.type == "breath") {
    return {
      type: "breath",
      start: shiftPos(ev.start, offset),
      dur: ev.dur,
      intensity: ev.intensity,
      ext: ev.ext
    };
  }
  return ev;
}

export fn concat(a, b) {
  const offset = clipLength(a);
  const zero = 0 / 1;
  let events = [];
  for (ev in a.events) {
    events[events.length] = shiftEvent(ev, zero);
  }
  for (ev in b.events) {
    events[events.length] = shiftEvent(ev, offset);
  }
  const length = clipLength({ events: events });
  return { events: events, length: length };
}

export fn overlay(a, b) {
  const zero = 0 / 1;
  let events = [];
  for (ev in a.events) {
    events[events.length] = shiftEvent(ev, zero);
  }
  for (ev in b.events) {
    events[events.length] = shiftEvent(ev, zero);
  }
  let length = null;
  if (a.length != null && b.length != null) {
    length = a.length;
    if (b.length > a.length) {
      length = b.length;
    }
  } else if (a.length != null) {
    length = a.length;
  } else if (b.length != null) {
    length = b.length;
  } else {
    length = clipLength({ events: events });
  }
  return { events: events, length: length };
}

export fn repeat(c, count) {
  if (count <= 0) {
    return { events: [], length: 0 / 1 };
  }
  const len = clipLength(c);
  let events = [];
  for (i in 0..(count - 1)) {
    const offset = len * i;
    for (ev in c.events) {
      events[events.length] = shiftEvent(ev, offset);
    }
  }
  return { events: events, length: len * count };
}

export fn slice(c, startPos, endPos) {
  const start = posToRat(startPos);
  const end = posToRat(endPos);
  let events = [];
  for (ev in c.events) {
    const pos = eventStartRat(ev);
    if (pos == null) {
      continue;
    }
    if (pos < start || pos >= end) {
      continue;
    }
    events[events.length] = shiftEvent(ev, 0 / 1 - start);
  }
  return { events: events, length: end - start };
}

export fn mapEvents(c, f) {
  let events = [];
  for (ev in c.events) {
    const mapped = f(ev);
    if (mapped != null) {
      events[events.length] = mapped;
    }
  }
  const length = clipLength({ events: events });
  return { events: events, length: length };
}

fn copyTracks(tracks) {
  let out = [];
  for (trk in tracks) {
    out[out.length] = trk;
  }
  return out;
}

export fn withTrack(sc, trk) {
  const tracks = copyTracks(sc.tracks);
  tracks[tracks.length] = trk;
  return {
    meta: sc.meta,
    tempoMap: sc.tempoMap,
    meterMap: sc.meterMap,
    sounds: sc.sounds,
    tracks: tracks,
    markers: sc.markers
  };
}

export fn mapTracks(sc, f) {
  let tracks = [];
  for (trk in sc.tracks) {
    tracks[tracks.length] = f(trk);
  }
  return {
    meta: sc.meta,
    tempoMap: sc.tempoMap,
    meterMap: sc.meterMap,
    sounds: sc.sounds,
    tracks: tracks,
    markers: sc.markers
  };
}

export fn getTracks(sc) {
  if (sc == null) {
    return [];
  }
  if (sc.tracks != null) {
    return sc.tracks;
  }
  return [];
}

export fn shift(c, offset) {
  let events = [];
  for (ev in c.events) {
    events[events.length] = shiftEvent(ev, offset);
  }
  let length = null;
  if (c.length != null) {
    length = c.length;
  }
  return { events: events, length: length };
}

export fn padTo(c, endPos) {
  const currentLen = clipLength(c);
  const target = posToRat(endPos);
  let newLength = currentLen;
  if (target != null && (currentLen == null || target > currentLen)) {
    newLength = target;
  }
  return { events: c.events, length: newLength };
}

fn getOrDefault(newVal, oldVal) {
  if (newVal != null) {
    return newVal;
  }
  return oldVal;
}

export fn updateEvent(ev, upd) {
  if (ev.type == "note") {
    return {
      type: "note",
      start: getOrDefault(upd.start, ev.start),
      dur: getOrDefault(upd.dur, ev.dur),
      pitch: getOrDefault(upd.pitch, ev.pitch),
      velocity: getOrDefault(upd.velocity, ev.velocity),
      voice: getOrDefault(upd.voice, ev.voice),
      techniques: getOrDefault(upd.techniques, ev.techniques),
      lyric: getOrDefault(upd.lyric, ev.lyric),
      ext: ev.ext
    };
  }
  if (ev.type == "chord") {
    return {
      type: "chord",
      start: getOrDefault(upd.start, ev.start),
      dur: getOrDefault(upd.dur, ev.dur),
      pitches: getOrDefault(upd.pitches, ev.pitches),
      velocity: getOrDefault(upd.velocity, ev.velocity),
      voice: getOrDefault(upd.voice, ev.voice),
      techniques: getOrDefault(upd.techniques, ev.techniques),
      ext: ev.ext
    };
  }
  if (ev.type == "drumHit") {
    return {
      type: "drumHit",
      start: getOrDefault(upd.start, ev.start),
      dur: getOrDefault(upd.dur, ev.dur),
      key: getOrDefault(upd.key, ev.key),
      velocity: getOrDefault(upd.velocity, ev.velocity),
      techniques: getOrDefault(upd.techniques, ev.techniques),
      ext: ev.ext
    };
  }
  if (ev.type == "breath") {
    return {
      type: "breath",
      start: getOrDefault(upd.start, ev.start),
      dur: getOrDefault(upd.dur, ev.dur),
      intensity: getOrDefault(upd.intensity, ev.intensity),
      ext: ev.ext
    };
  }
  if (ev.type == "control") {
    return {
      type: "control",
      start: getOrDefault(upd.start, ev.start),
      kind: getOrDefault(upd.kind, ev.kind),
      data: getOrDefault(upd.data, ev.data),
      ext: ev.ext
    };
  }
  if (ev.type == "automation") {
    return {
      type: "automation",
      param: getOrDefault(upd.param, ev.param),
      start: getOrDefault(upd.start, ev.start),
      end: getOrDefault(upd.end, ev.end),
      curve: getOrDefault(upd.curve, ev.curve),
      ext: ev.ext
    };
  }
  if (ev.type == "marker") {
    return {
      type: "marker",
      pos: getOrDefault(upd.start, ev.pos),
      kind: getOrDefault(upd.kind, ev.kind),
      label: getOrDefault(upd.label, ev.label)
    };
  }
  return ev;
}

export fn max(a, b) {
  if (a > b) {
    return a;
  }
  return b;
}

export fn min(a, b) {
  if (a < b) {
    return a;
  }
  return b;
}

export fn abs(a) {
  if (a < 0) {
    return 0 - a;
  }
  return a;
}

fn floorNum(value) {
  return value - (value % 1);
}

export fn floor(a) {
  if (a.n != null && a.d != null) {
    const num = a.n / a.d;
    return floorNum(num);
  }
  return floorNum(a);
}

export fn ceil(a) {
  const f = floor(a);
  if (a.n != null && a.d != null) {
    const num = a.n / a.d;
    if (num > f) {
      return f + 1;
    }
    return f;
  }
  if (a > f) {
    return f + 1;
  }
  return f;
}

export fn length(c) {
  return clipLength(c);
}

// ============================================
// Generic Array Functions
// ============================================

// map - apply function to each element
export fn map(items, f) {
  let out = [];
  for (item in items) {
    out[out.length] = f(item);
  }
  return out;
}

// filter - keep elements matching predicate
export fn filter(items, pred) {
  let out = [];
  for (item in items) {
    if (pred(item)) {
      out[out.length] = item;
    }
  }
  return out;
}

// fold - reduce array to single value
export fn fold(items, init, f) {
  let acc = init;
  for (item in items) {
    acc = f(acc, item);
  }
  return acc;
}

// flatMap - map and flatten results
export fn flatMap(items, f) {
  let out = [];
  for (item in items) {
    const result = f(item);
    for (r in result) {
      out[out.length] = r;
    }
  }
  return out;
}

// zip - combine two arrays into array of pairs
export fn zip(a, b) {
  let out = [];
  let len = a.length;
  if (b.length < len) {
    len = b.length;
  }
  for (i in 0..(len - 1)) {
    out[out.length] = [a[i], b[i]];
  }
  return out;
}

// enumerate - add indices to elements
export fn enumerate(items) {
  let out = [];
  let i = 0;
  for (item in items) {
    out[out.length] = [i, item];
    i = i + 1;
  }
  return out;
}

// range - generate sequence of integers
export fn range(start, end, step) {
  let stepVal = step;
  if (stepVal == null) {
    stepVal = 1;
  }
  let out = [];
  if (stepVal > 0) {
    let idx = start;
    for (_ in 0..10000) {
      if (idx >= end) {
        return out;
      }
      out[out.length] = idx;
      idx = idx + stepVal;
    }
  } else if (stepVal < 0) {
    let idx = start;
    for (_ in 0..10000) {
      if (idx <= end) {
        return out;
      }
      out[out.length] = idx;
      idx = idx + stepVal;
    }
  }
  return out;
}

// find - find first element matching predicate
export fn find(items, pred) {
  for (item in items) {
    if (pred(item)) {
      return item;
    }
  }
  return null;
}

// findIndex - find index of first matching element
export fn findIndex(items, pred) {
  let i = 0;
  for (item in items) {
    if (pred(item)) {
      return i;
    }
    i = i + 1;
  }
  return -1;
}

// every - check if all elements match predicate
export fn every(items, pred) {
  for (item in items) {
    if (!pred(item)) {
      return false;
    }
  }
  return true;
}

// some - check if any element matches predicate
export fn some(items, pred) {
  for (item in items) {
    if (pred(item)) {
      return true;
    }
  }
  return false;
}

// includes - check if array contains value
export fn includes(items, value) {
  for (item in items) {
    if (item == value) {
      return true;
    }
  }
  return false;
}

// take - take first n elements
export fn take(items, n) {
  let out = [];
  let count = 0;
  for (item in items) {
    if (count >= n) {
      return out;
    }
    out[out.length] = item;
    count = count + 1;
  }
  return out;
}

// drop - drop first n elements
export fn drop(items, n) {
  let out = [];
  let count = 0;
  for (item in items) {
    if (count >= n) {
      out[out.length] = item;
    }
    count = count + 1;
  }
  return out;
}

// ============================================
// Extended Clip Operations
// ============================================

// merge - overlay multiple clips at once
export fn merge(clips) {
  if (clips.length == 0) {
    return { events: [], length: 0 / 1 };
  }
  let result = clips[0];
  for (i in 1..(clips.length - 1)) {
    result = overlay(result, clips[i]);
  }
  return result;
}

// reverse - reverse the temporal order of events
export fn reverse(c) {
  const len = clipLength(c);
  if (len == null) {
    return c;
  }
  let events = [];
  for (ev in c.events) {
    const start = eventStartRat(ev);
    const evEnd = eventEndRat(ev);
    if (start == null || evEnd == null) {
      events[events.length] = ev;
      continue;
    }
    const dur = evEnd - start;
    const newStart = len - evEnd;
    events[events.length] = shiftEvent(updateEvent(ev, { start: newStart }), 0 / 1);
  }
  return { events: events, length: len };
}

// invert - invert pitches around an axis
export fn invert(c, axis) {
  let events = [];
  for (ev in c.events) {
    if (ev.type == "note") {
      const newPitch = axis * 2 - ev.pitch;
      events[events.length] = updateEvent(ev, { pitch: newPitch });
    } else if (ev.type == "chord") {
      let newPitches = [];
      for (p in ev.pitches) {
        newPitches[newPitches.length] = axis * 2 - p;
      }
      events[events.length] = updateEvent(ev, { pitches: newPitches });
    } else {
      events[events.length] = ev;
    }
  }
  return { events: events, length: c.length };
}

// retrograde - alias for reverse (music theory term)
export fn retrograde(c) {
  return reverse(c);
}

// split - split clip at given positions into multiple clips
export fn split(c, positions) {
  if (positions.length == 0) {
    return [c];
  }
  let sorted = [];
  for (p in positions) {
    sorted[sorted.length] = posToRat(p);
  }
  for (i in 0..(sorted.length - 1)) {
    for (j in 0..(sorted.length - i - 2)) {
      if (sorted[j] > sorted[j + 1]) {
        const tmp = sorted[j];
        sorted[j] = sorted[j + 1];
        sorted[j + 1] = tmp;
      }
    }
  }
  let result = [];
  let prevPos = 0 / 1;
  for (pos in sorted) {
    if (pos > prevPos) {
      result[result.length] = slice(c, prevPos, pos);
    }
    prevPos = pos;
  }
  const len = clipLength(c);
  if (len != null && prevPos < len) {
    result[result.length] = slice(c, prevPos, len);
  }
  return result;
}

// augment - double all durations (augmentation in music theory)
export fn augment(c, factor) {
  let f = factor;
  if (f == null) {
    f = 2;
  }
  let events = [];
  for (ev in c.events) {
    if (ev.type == "note" || ev.type == "chord" || ev.type == "drumHit" || ev.type == "breath") {
      const newStart = eventStartRat(ev) * f;
      const newDur = ev.dur * f;
      events[events.length] = updateEvent(ev, { start: newStart, dur: newDur });
    } else if (ev.type == "automation") {
      const newStart = eventStartRat(ev) * f;
      const newEnd = posToRat(ev.end) * f;
      events[events.length] = updateEvent(ev, { start: newStart, end: newEnd });
    } else if (ev.type == "marker") {
      const newPos = posToRat(ev.pos) * f;
      events[events.length] = { type: "marker", pos: newPos, kind: ev.kind, label: ev.label };
    } else if (ev.type == "control") {
      const newStart = eventStartRat(ev) * f;
      events[events.length] = updateEvent(ev, { start: newStart });
    } else {
      events[events.length] = ev;
    }
  }
  let newLen = null;
  if (c.length != null) {
    newLen = c.length * f;
  }
  return { events: events, length: newLen };
}

// diminish - halve all durations (diminution in music theory)
export fn diminish(c, factor) {
  let f = factor;
  if (f == null) {
    f = 2;
  }
  return augment(c, 1 / f);
}
`;

export const STDLIB_DRUMS = `// std:drums (v4)

export const kick = "kick";
export const snare = "snare";
export const hhc = "hhc";
export const hho = "hho";
export const crash = "crash";
export const ride = "ride";
export const tom1 = "tom1";
export const tom2 = "tom2";
export const tom3 = "tom3";
export const clap = "clap";
export const perc1 = "perc1";
export const perc2 = "perc2";

fn cloneEvent(ev) {
  if (ev.type == "note") {
    return {
      type: "note",
      start: ev.start,
      dur: ev.dur,
      pitch: ev.pitch,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      lyric: ev.lyric,
      ext: ev.ext
    };
  }
  if (ev.type == "chord") {
    return {
      type: "chord",
      start: ev.start,
      dur: ev.dur,
      pitches: ev.pitches,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "drumHit") {
    return {
      type: "drumHit",
      start: ev.start,
      dur: ev.dur,
      key: ev.key,
      velocity: ev.velocity,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "control") {
    return {
      type: "control",
      start: ev.start,
      kind: ev.kind,
      data: ev.data,
      ext: ev.ext
    };
  }
  if (ev.type == "automation") {
    return {
      type: "automation",
      param: ev.param,
      start: ev.start,
      end: ev.end,
      curve: ev.curve,
      ext: ev.ext
    };
  }
  if (ev.type == "marker") {
    return {
      type: "marker",
      pos: ev.pos,
      kind: ev.kind,
      label: ev.label
    };
  }
  return ev;
}

export fn fourOnFloor(bars, unit) {
  let count = bars;
  if (count < 1) {
    count = 1;
  }
  const beats = count * 4;
  let events = [];
  for (i in 0..(beats - 1)) {
    events[events.length] = {
      type: "drumHit",
      start: unit * i,
      dur: unit,
      key: "kick",
      velocity: 0.9
    };
  }
  return { events: events, length: unit * beats };
}

export fn basicRock(bars, unit) {
  let count = bars;
  if (count < 1) {
    count = 1;
  }
  let events = [];
  for (bar in 0..(count - 1)) {
    const base = unit * (bar * 4);
    const beats = [0, 1, 2, 3];
    for (b in beats) {
      events[events.length] = {
        type: "drumHit",
        start: base + unit * b,
        dur: unit,
        key: "hhc",
        velocity: 0.5
      };
    }
    events[events.length] = {
      type: "drumHit",
      start: base + (0 / 1),
      dur: unit,
      key: "kick",
      velocity: 0.9
    };
    events[events.length] = {
      type: "drumHit",
      start: base + unit,
      dur: unit,
      key: "snare",
      velocity: 0.8
    };
    events[events.length] = {
      type: "drumHit",
      start: base + unit * 2,
      dur: unit,
      key: "kick",
      velocity: 0.9
    };
    events[events.length] = {
      type: "drumHit",
      start: base + unit * 3,
      dur: unit,
      key: "snare",
      velocity: 0.8
    };
  }
  return { events: events, length: unit * (count * 4) };
}

export fn fill(drumKind, len) {
  let key = drumKind;
  if (key == null) {
    key = "snare";
  }
  const hits = 4;
  const unit = len / hits;
  let events = [];
  for (i in 0..(hits - 1)) {
    events[events.length] = {
      type: "drumHit",
      start: unit * i,
      dur: unit,
      key: key,
      velocity: 0.7
    };
  }
  return { events: events, length: len };
}

export fn ghost(c, amount) {
  let events = [];
  for (ev in c.events) {
    if (ev.type == "drumHit" || ev.type == "note" || ev.type == "chord") {
      let out = cloneEvent(ev);
      let vel = out.velocity;
      if (vel == null) {
        vel = 1;
      }
      out.velocity = vel * amount;
      events[events.length] = out;
    } else {
      events[events.length] = cloneEvent(ev);
    }
  }
  return { events: events, length: c.length };
}
`;

export const STDLIB_THEORY = `// std:theory (v4)

fn applyIntervals(root, intervals) {
  let out = [];
  for (step in intervals) {
    out[out.length] = root + step;
  }
  return out;
}

export fn majorTriad(root) {
  return [root, root + 4, root + 7];
}

export fn minorTriad(root) {
  return [root, root + 3, root + 7];
}

export fn diminished(root) {
  return [root, root + 3, root + 6];
}

export fn augmented(root) {
  return [root, root + 4, root + 8];
}

export fn sus2(root) {
  return [root, root + 2, root + 7];
}

export fn sus4(root) {
  return [root, root + 5, root + 7];
}

export fn major7(root) {
  return [root, root + 4, root + 7, root + 11];
}

export fn minor7(root) {
  return [root, root + 3, root + 7, root + 10];
}

export fn dominant7(root) {
  return [root, root + 4, root + 7, root + 10];
}

export fn diminished7(root) {
  return [root, root + 3, root + 6, root + 9];
}

export fn halfDiminished7(root) {
  return [root, root + 3, root + 6, root + 10];
}

export fn minorMajor7(root) {
  return [root, root + 3, root + 7, root + 11];
}

export fn augmented7(root) {
  return [root, root + 4, root + 8, root + 10];
}

export fn augmentedMajor7(root) {
  return [root, root + 4, root + 8, root + 11];
}

export fn add9(root) {
  return [root, root + 4, root + 7, root + 14];
}

export fn add11(root) {
  return [root, root + 4, root + 7, root + 17];
}

export fn major9(root) {
  return [root, root + 4, root + 7, root + 11, root + 14];
}

export fn minor9(root) {
  return [root, root + 3, root + 7, root + 10, root + 14];
}

export fn dominant9(root) {
  return [root, root + 4, root + 7, root + 10, root + 14];
}

export fn major11(root) {
  return [root, root + 4, root + 7, root + 11, root + 14, root + 17];
}

export fn minor11(root) {
  return [root, root + 3, root + 7, root + 10, root + 14, root + 17];
}

export fn dominant11(root) {
  return [root, root + 4, root + 7, root + 10, root + 14, root + 17];
}

export fn major13(root) {
  return [root, root + 4, root + 7, root + 11, root + 14, root + 17, root + 21];
}

export fn minor13(root) {
  return [root, root + 3, root + 7, root + 10, root + 14, root + 17, root + 21];
}

export fn dominant13(root) {
  return [root, root + 4, root + 7, root + 10, root + 14, root + 17, root + 21];
}

export fn power(root) {
  return [root, root + 7];
}

export fn power5(root) {
  return [root, root + 7, root + 12];
}

export fn invert1(chord) {
  if (chord.length < 2) {
    return chord;
  }
  let out = [];
  for (i in 1..(chord.length - 1)) {
    out[out.length] = chord[i];
  }
  out[out.length] = chord[0] + 12;
  return out;
}

export fn invert2(chord) {
  return invert1(invert1(chord));
}

export fn invert3(chord) {
  return invert1(invert2(chord));
}

export fn scaleMajor(root) {
  return applyIntervals(root, [0, 2, 4, 5, 7, 9, 11, 12]);
}

export fn ionian(root) {
  return scaleMajor(root);
}

export fn dorian(root) {
  return applyIntervals(root, [0, 2, 3, 5, 7, 9, 10, 12]);
}

export fn phrygian(root) {
  return applyIntervals(root, [0, 1, 3, 5, 7, 8, 10, 12]);
}

export fn lydian(root) {
  return applyIntervals(root, [0, 2, 4, 6, 7, 9, 11, 12]);
}

export fn mixolydian(root) {
  return applyIntervals(root, [0, 2, 4, 5, 7, 9, 10, 12]);
}

export fn aeolian(root) {
  return scaleMinor(root);
}

export fn locrian(root) {
  return applyIntervals(root, [0, 1, 3, 5, 6, 8, 10, 12]);
}

export fn scaleMinor(root) {
  return applyIntervals(root, [0, 2, 3, 5, 7, 8, 10, 12]);
}

export fn harmonicMinor(root) {
  return applyIntervals(root, [0, 2, 3, 5, 7, 8, 11, 12]);
}

export fn melodicMinor(root) {
  return applyIntervals(root, [0, 2, 3, 5, 7, 9, 11, 12]);
}

export fn majorPentatonic(root) {
  return applyIntervals(root, [0, 2, 4, 7, 9, 12]);
}

export fn minorPentatonic(root) {
  return applyIntervals(root, [0, 3, 5, 7, 10, 12]);
}

export fn blues(root) {
  return applyIntervals(root, [0, 3, 5, 6, 7, 10, 12]);
}

export fn bebop(root) {
  return applyIntervals(root, [0, 2, 4, 5, 7, 9, 10, 11, 12]);
}

export fn wholeTone(root) {
  return applyIntervals(root, [0, 2, 4, 6, 8, 10, 12]);
}

export fn diminishedHalfWhole(root) {
  return applyIntervals(root, [0, 1, 3, 4, 6, 7, 9, 10, 12]);
}

export fn diminishedWholeHalf(root) {
  return applyIntervals(root, [0, 2, 3, 5, 6, 8, 9, 11, 12]);
}

export fn japanese(root) {
  return applyIntervals(root, [0, 1, 5, 7, 8, 12]);
}

export fn hirajoshi(root) {
  return applyIntervals(root, [0, 2, 3, 7, 8, 12]);
}

export fn hungarian(root) {
  return applyIntervals(root, [0, 2, 3, 6, 7, 8, 11, 12]);
}

export fn gypsy(root) {
  return applyIntervals(root, [0, 1, 4, 5, 7, 8, 10, 12]);
}

export fn arabian(root) {
  return applyIntervals(root, [0, 2, 4, 5, 6, 8, 10, 12]);
}

export fn chromatic(root) {
  return applyIntervals(root, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
}

export fn unison(pitch) {
  return pitch;
}

export fn minorSecond(pitch) {
  return pitch + 1;
}

export fn majorSecond(pitch) {
  return pitch + 2;
}

export fn minorThird(pitch) {
  return pitch + 3;
}

export fn majorThird(pitch) {
  return pitch + 4;
}

export fn perfectFourth(pitch) {
  return pitch + 5;
}

export fn tritone(pitch) {
  return pitch + 6;
}

export fn perfectFifth(pitch) {
  return pitch + 7;
}

export fn minorSixth(pitch) {
  return pitch + 8;
}

export fn majorSixth(pitch) {
  return pitch + 9;
}

export fn minorSeventh(pitch) {
  return pitch + 10;
}

export fn majorSeventh(pitch) {
  return pitch + 11;
}

export fn octave(pitch) {
  return pitch + 12;
}

export fn transposeUp(pitch, semitones) {
  return pitch + semitones;
}

export fn transposeDown(pitch, semitones) {
  return pitch - semitones;
}

export fn transposeOctave(pitch, octaves) {
  return pitch + (octaves * 12);
}

export fn pitchClass(pitch) {
  return pitch % 12;
}

export fn octaveOf(pitch) {
  const result = (pitch / 12) - 1;
  return result - (result % 1);
}

export fn makePitch(class, oct) {
  return (oct + 1) * 12 + class;
}

export fn chordRoot(chord) {
  if (chord.length == 0) {
    return null;
  }
  return chord[0];
}

export fn chordIntervals(chord) {
  if (chord.length == 0) {
    return [];
  }
  const root = chord[0];
  let out = [];
  for (p in chord) {
    out[out.length] = p - root;
  }
  return out;
}

export fn arpeggioUp(chord) {
  return chord;
}

export fn arpeggioDown(chord) {
  let out = [];
  let i = chord.length - 1;
  for (_ in chord) {
    out[out.length] = chord[i];
    i = i - 1;
  }
  return out;
}

export fn arpeggioUpDown(chord) {
  let up = chord;
  let down = arpeggioDown(chord);
  let out = [];
  for (p in up) {
    out[out.length] = p;
  }
  let i = 1;
  for (_ in 1..(down.length - 1)) {
    out[out.length] = down[i];
    i = i + 1;
  }
  return out;
}

export fn arpeggioDownUp(chord) {
  let down = arpeggioDown(chord);
  let up = chord;
  let out = [];
  for (p in down) {
    out[out.length] = p;
  }
  let i = 1;
  for (_ in 1..(up.length - 1)) {
    out[out.length] = up[i];
    i = i + 1;
  }
  return out;
}

export fn arpeggioAlberti(chord) {
  if (chord.length < 3) {
    return chord;
  }
  return [chord[0], chord[2], chord[1], chord[2]];
}

export fn arpeggioBroken(chord) {
  if (chord.length < 3) {
    return chord;
  }
  return [chord[0], chord[1], chord[2], chord[1]];
}

export fn arpeggioWithOctave(chord) {
  let out = [];
  for (p in chord) {
    out[out.length] = p;
  }
  out[out.length] = chord[0] + 12;
  return out;
}

export fn arpeggioDouble(chord) {
  let out = [];
  for (p in chord) {
    out[out.length] = p;
  }
  for (p in chord) {
    out[out.length] = p + 12;
  }
  return out;
}

export fn progressionTwoFiveOne(root) {
  return [
    minorTriad(root + 2),
    majorTriad(root + 7),
    majorTriad(root)
  ];
}

export fn progressionTwoFiveOneJazz(root) {
  return [
    minor7(root + 2),
    dominant7(root + 7),
    major7(root)
  ];
}

export fn progressionOneFourFive(root) {
  return [
    majorTriad(root),
    majorTriad(root + 5),
    majorTriad(root + 7),
    majorTriad(root)
  ];
}

export fn progressionPopCanon(root) {
  return [
    majorTriad(root),
    majorTriad(root + 7),
    minorTriad(root + 9),
    majorTriad(root + 5)
  ];
}

export fn progressionSixFourOneFive(root) {
  return [
    minorTriad(root + 9),
    majorTriad(root + 5),
    majorTriad(root),
    majorTriad(root + 7)
  ];
}

export fn progressionFifties(root) {
  return [
    majorTriad(root),
    minorTriad(root + 9),
    majorTriad(root + 5),
    majorTriad(root + 7)
  ];
}

export fn progressionMinorRock(root) {
  return [
    minorTriad(root),
    majorTriad(root + 10),
    majorTriad(root + 8),
    majorTriad(root + 10)
  ];
}

export fn progressionCircleOfFifths(root) {
  return [
    majorTriad(root),
    majorTriad(root + 7),
    majorTriad(root + 2),
    majorTriad(root + 9),
    majorTriad(root + 4),
    majorTriad(root + 11),
    majorTriad(root + 6)
  ];
}

export fn progressionBlues(root) {
  return [
    dominant7(root),
    dominant7(root + 5),
    dominant7(root + 7)
  ];
}

export fn progressionTurnaround(root) {
  return [
    major7(root),
    minor7(root + 9),
    minor7(root + 2),
    dominant7(root + 7)
  ];
}

export fn progressionAndalusian(root) {
  return [
    minorTriad(root),
    majorTriad(root + 10),
    majorTriad(root + 8),
    majorTriad(root + 7)
  ];
}

export fn progressionRoyalRoad(root) {
  return [
    majorTriad(root + 5),
    majorTriad(root + 7),
    minorTriad(root + 4),
    minorTriad(root + 9)
  ];
}

export const ppp = 0.15;
export const pp = 0.25;
export const p = 0.4;
export const mp = 0.55;
export const mf = 0.65;
export const f = 0.75;
export const ff = 0.85;
export const fff = 0.95;

export fn velocityRamp(startVel, endVel, count) {
  if (count <= 1) {
    return [startVel];
  }
  let out = [];
  const step = (endVel - startVel) / (count - 1);
  let current = startVel;
  let i = 0;
  for (_ in 0..(count - 1)) {
    out[out.length] = current;
    current = current + step;
    i = i + 1;
  }
  return out;
}

export fn crescendo(startVel, endVel, count) {
  return velocityRamp(startVel, endVel, count);
}

export fn decrescendo(startVel, endVel, count) {
  return velocityRamp(startVel, endVel, count);
}

export fn accentPattern(baseVel, accentVel, count, accentEvery) {
  let out = [];
  let i = 0;
  for (_ in 0..(count - 1)) {
    if (i % accentEvery == 0) {
      out[out.length] = accentVel;
    } else {
      out[out.length] = baseVel;
    }
    i = i + 1;
  }
  return out;
}

export fn swingVelocities(strongVel, weakVel, count) {
  let out = [];
  let i = 0;
  for (_ in 0..(count - 1)) {
    if (i % 2 == 0) {
      out[out.length] = strongVel;
    } else {
      out[out.length] = weakVel;
    }
    i = i + 1;
  }
  return out;
}

export fn humanizeVelocity(baseVel, variation, count, seed) {
  let out = [];
  for (i in 0..(count - 1)) {
    const factor = ((seed + i * 7919) % 1000) / 1000.0;
    const delta = (factor - 0.5) * 2 * variation;
    let vel = baseVel + delta;
    if (vel < 0.0) {
      vel = 0.0;
    }
    if (vel > 1.0) {
      vel = 1.0;
    }
    out[i] = vel;
  }
  return out;
}

export fn rhythmPattern(pattern) {
  let durations = [];
  let i = 0;
  const len = pattern.length;
  for (_ in 0..(len - 1)) {
    const c = pattern[i];
    if (c == "w") {
      durations[durations.length] = w;
    } else if (c == "h") {
      durations[durations.length] = h;
    } else if (c == "q") {
      durations[durations.length] = q;
    } else if (c == "e") {
      durations[durations.length] = e;
    } else if (c == "s") {
      durations[durations.length] = s;
    }
    i = i + 1;
  }
  return durations;
}

export fn rhythmStraightFour() {
  return [q, q, q, q];
}

export fn rhythmStraightEight() {
  return [e, e, e, e, e, e, e, e];
}

export fn rhythmSyncopated() {
  return [e, q, e, q, e, e];
}

export fn rhythmDotted() {
  return [q., e, q., e];
}

export fn rhythmTriplet() {
  return [e, e, e];
}

export fn maj(root) { return majorTriad(root); }
export fn min(root) { return minorTriad(root); }
export fn dim(root) { return diminished(root); }
export fn aug(root) { return augmented(root); }
export fn maj7(root) { return major7(root); }
export fn min7(root) { return minor7(root); }
export fn dom7(root) { return dominant7(root); }
export fn dim7(root) { return diminished7(root); }
export fn maj9(root) { return major9(root); }
export fn min9(root) { return minor9(root); }
export fn dom9(root) { return dominant9(root); }
export fn major(root) { return scaleMajor(root); }
export fn minor(root) { return scaleMinor(root); }
export fn progressionSixFourOneFlve(root) { return progressionSixFourOneFive(root); }

// ============================================
// Advanced Chord Analysis
// ============================================

fn containsInterval(intervals, target) {
  for (iv in intervals) {
    if (iv == target) {
      return true;
    }
  }
  return false;
}

export fn analyze(pitches) {
  if (pitches.length == 0) {
    return null;
  }
  const root = pitches[0];
  let intervals = [];
  for (p in pitches) {
    intervals[intervals.length] = (p - root) % 12;
  }
  let unique = [];
  for (iv in intervals) {
    let found = false;
    for (u in unique) {
      if (u == iv) { found = true; }
    }
    if (!found) { unique[unique.length] = iv; }
  }
  for (i in 0..(unique.length - 1)) {
    for (j in 0..(unique.length - i - 2)) {
      if (unique[j] > unique[j + 1]) {
        const tmp = unique[j];
        unique[j] = unique[j + 1];
        unique[j + 1] = tmp;
      }
    }
  }
  let quality = "unknown";
  const hasMinor3 = containsInterval(unique, 3);
  const hasMajor3 = containsInterval(unique, 4);
  const hasDim5 = containsInterval(unique, 6);
  const hasPerfect5 = containsInterval(unique, 7);
  const hasAug5 = containsInterval(unique, 8);
  const hasMinor7 = containsInterval(unique, 10);
  const hasMajor7 = containsInterval(unique, 11);
  if (hasMajor3 && hasPerfect5 && hasMajor7) { quality = "maj7"; }
  else if (hasMinor3 && hasPerfect5 && hasMinor7) { quality = "min7"; }
  else if (hasMajor3 && hasPerfect5 && hasMinor7) { quality = "dom7"; }
  else if (hasMinor3 && hasDim5 && hasMinor7) { quality = "m7b5"; }
  else if (hasMinor3 && hasDim5) { quality = "dim"; }
  else if (hasMajor3 && hasAug5) { quality = "aug"; }
  else if (hasMajor3 && hasPerfect5) { quality = "maj"; }
  else if (hasMinor3 && hasPerfect5) { quality = "min"; }
  else if (containsInterval(unique, 2) && hasPerfect5) { quality = "sus2"; }
  else if (containsInterval(unique, 5) && hasPerfect5) { quality = "sus4"; }
  return { root: root, quality: quality, intervals: unique };
}

export fn commonTones(a, b) {
  let common = [];
  for (pa in a) {
    const pcA = pa % 12;
    for (pb in b) {
      const pcB = pb % 12;
      if (pcA == pcB) { common[common.length] = pa; }
    }
  }
  return common;
}

export fn voiceLead(source, target) {
  if (source.length == 0 || target.length == 0) { return target; }
  let result = [];
  for (tgtPitch in target) {
    const targetPC = tgtPitch % 12;
    let bestPitch = tgtPitch;
    let bestDistance = 1000;
    for (octave in 0..8) {
      const candidate = targetPC + (octave * 12);
      for (srcPitch in source) {
        let dist = candidate - srcPitch;
        if (dist < 0) { dist = 0 - dist; }
        if (dist < bestDistance) {
          bestDistance = dist;
          bestPitch = candidate;
        }
      }
    }
    result[result.length] = bestPitch;
  }
  return result;
}

export fn degreeToChord(scale, degree, chordType) {
  if (scale.length == 0 || degree < 1) { return []; }
  const idx = (degree - 1) % scale.length;
  const root = scale[idx];
  if (chordType == "maj" || chordType == "major") { return majorTriad(root); }
  else if (chordType == "min" || chordType == "minor") { return minorTriad(root); }
  else if (chordType == "dim" || chordType == "diminished") { return diminished(root); }
  else if (chordType == "aug" || chordType == "augmented") { return augmented(root); }
  else if (chordType == "maj7") { return major7(root); }
  else if (chordType == "min7") { return minor7(root); }
  else if (chordType == "dom7") { return dominant7(root); }
  return majorTriad(root);
}

export fn add2(root) { return [root, root + 2, root + 4, root + 7]; }
export fn add4(root) { return [root, root + 4, root + 5, root + 7]; }
export fn six(root) { return [root, root + 4, root + 7, root + 9]; }
export fn sixNine(root) { return [root, root + 4, root + 7, root + 9, root + 14]; }
export fn minorSix(root) { return [root, root + 3, root + 7, root + 9]; }

export fn sharpFive(chord) {
  let result = [];
  for (p in chord) {
    const interval = (p - chord[0]) % 12;
    if (interval == 7) { result[result.length] = p + 1; }
    else { result[result.length] = p; }
  }
  return result;
}

export fn flatFive(chord) {
  let result = [];
  for (p in chord) {
    const interval = (p - chord[0]) % 12;
    if (interval == 7) { result[result.length] = p - 1; }
    else { result[result.length] = p; }
  }
  return result;
}

export fn sharpNine(chord) {
  let result = [];
  for (p in chord) { result[result.length] = p; }
  result[result.length] = chord[0] + 15;
  return result;
}

export fn flatNine(chord) {
  let result = [];
  for (p in chord) { result[result.length] = p; }
  result[result.length] = chord[0] + 13;
  return result;
}

export fn modulate(progression, fromRoot, toRoot) {
  const interval = toRoot - fromRoot;
  let result = [];
  for (chord in progression) {
    let transposed = [];
    for (p in chord) { transposed[transposed.length] = p + interval; }
    result[result.length] = transposed;
  }
  return result;
}
`;

export const STDLIB_VOCAL = `// std:vocal (v4)

export const Strict = "Strict";
export const BestEffort = "BestEffort";
export const MelismaHeuristic = "MelismaHeuristic";

fn syllable(text) {
  return { kind: "syllable", text: text };
}

export fn S(text) {
  return syllable(text);
}

export fn ext() {
  return { kind: "extend" };
}

export const Ext = ext();

fn containsSpace(text) {
  for (i in 0..(text.length - 1)) {
    if (text[i] == " ") {
      return true;
    }
  }
  return false;
}

export fn text(text, lang) {
  let useLang = lang;
  if (useLang == null) {
    useLang = "und";
  }
  let src = text;
  if (src == null) {
    src = "";
  }
  let tokens = [];
  if (containsSpace(src)) {
    let current = "";
    for (i in 0..(src.length - 1)) {
      const ch = src[i];
      if (ch == " ") {
        if (current != "") {
          tokens[tokens.length] = syllable(current);
          current = "";
        }
      } else {
        current = current + ch;
      }
    }
    if (current != "") {
      tokens[tokens.length] = syllable(current);
    }
  } else {
    for (i in 0..(src.length - 1)) {
      tokens[tokens.length] = syllable(src[i]);
    }
  }
  return { kind: "text", tokens: tokens, lang: useLang };
}

export fn syllables(tokens, lang, words) {
  let useLang = lang;
  if (useLang == null) {
    useLang = "und";
  }
  let out = [];
  let items = tokens;
  if (items == null) {
    items = [];
  }
  for (item in items) {
    if (item.kind == "extend") {
      out[out.length] = item;
    } else if (item.kind == "syllable") {
      out[out.length] = item;
    } else {
      out[out.length] = syllable(item);
    }
  }
  let result = { kind: "syllables", tokens: out, lang: useLang };
  if (words != null) {
    result.words = words;
  }
  return result;
}

fn joinGroup(group) {
  let out = "";
  if (group == null) {
    return out;
  }
  for (i in 0..(group.length - 1)) {
    if (i > 0) {
      out = out + " ";
    }
    out = out + group[i];
  }
  return out;
}

export fn phonemes(groups, lang, alphabet, words) {
  let useLang = lang;
  if (useLang == null) {
    useLang = "und";
  }
  let out = [];
  let list = groups;
  if (list == null) {
    list = [];
  }
  for (g in list) {
    out[out.length] = syllable(joinGroup(g));
  }
  let result = { kind: "phonemes", tokens: out, lang: useLang };
  if (alphabet != null) {
    result.alphabet = alphabet;
  }
  if (words != null) {
    result.words = words;
  }
  return result;
}

fn cloneEvent(ev) {
  if (ev.type == "note") {
    return {
      type: "note",
      start: ev.start,
      dur: ev.dur,
      pitch: ev.pitch,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      lyric: ev.lyric,
      ext: ev.ext
    };
  }
  if (ev.type == "chord") {
    return {
      type: "chord",
      start: ev.start,
      dur: ev.dur,
      pitches: ev.pitches,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "drumHit") {
    return {
      type: "drumHit",
      start: ev.start,
      dur: ev.dur,
      key: ev.key,
      velocity: ev.velocity,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "control") {
    return {
      type: "control",
      start: ev.start,
      kind: ev.kind,
      data: ev.data,
      ext: ev.ext
    };
  }
  if (ev.type == "automation") {
    return {
      type: "automation",
      param: ev.param,
      start: ev.start,
      end: ev.end,
      curve: ev.curve,
      ext: ev.ext
    };
  }
  if (ev.type == "marker") {
    return {
      type: "marker",
      pos: ev.pos,
      kind: ev.kind,
      label: ev.label
    };
  }
  if (ev.type == "breath") {
    return {
      type: "breath",
      start: ev.start,
      dur: ev.dur,
      intensity: ev.intensity,
      ext: ev.ext
    };
  }
  return ev;
}

export fn align(c, lyric, policy) {
  let tokens = lyric.tokens;
  if (tokens == null) {
    tokens = [];
  }
  let idx = 0;
  let events = [];
  for (ev in c.events) {
    if (ev.type == "note") {
      let out = cloneEvent(ev);
      const token = tokens[idx];
      if (token != null) {
        out.lyric = token;
        idx = idx + 1;
      }
      events[events.length] = out;
    } else {
      events[events.length] = cloneEvent(ev);
    }
  }
  return { events: events, length: c.length };
}

fn posToRat(pos) {
  if (pos == null) {
    return null;
  }
  if (pos.kind == "rat") {
    return pos.rat;
  }
  if (pos.kind != null) {
    return null;
  }
  if (pos.n != null && pos.d != null) {
    return pos;
  }
  return null;
}

fn eventEndRat(ev) {
  if (ev.type == "note" || ev.type == "chord" || ev.type == "drumHit" || ev.type == "breath") {
    const start = posToRat(ev.start);
    if (start == null) {
      return null;
    }
    return start + ev.dur;
  }
  if (ev.type == "control") {
    return posToRat(ev.start);
  }
  if (ev.type == "automation") {
    return posToRat(ev.end);
  }
  if (ev.type == "marker") {
    return posToRat(ev.pos);
  }
  return null;
}

fn clipLength(c) {
  if (c.length != null) {
    return c.length;
  }
  let max = null;
  for (ev in c.events) {
    const end = eventEndRat(ev);
    if (end == null) {
      return null;
    }
    if (max == null || end > max) {
      max = end;
    }
  }
  if (max == null) {
    return 0 / 1;
  }
  return max;
}

fn defaultEnd(c) {
  const len = clipLength(c);
  if (len == null) {
    return 0 / 1;
  }
  return len;
}

fn flatCurve(amount) {
  return {
    kind: "piecewiseLinear",
    points: [
      { t: 0, v: amount },
      { t: 1, v: amount }
    ]
  };
}

fn addAutomation(c, param, amount, start, end) {
  let depth = amount;
  if (depth == null) {
    depth = 1;
  }
  let startPos = start;
  if (startPos == null) {
    startPos = 0 / 1;
  }
  let endPos = end;
  if (endPos == null) {
    endPos = defaultEnd(c);
  }
  let events = [];
  for (ev in c.events) {
    events[events.length] = cloneEvent(ev);
  }
  events[events.length] = {
    type: "automation",
    param: param,
    start: startPos,
    end: endPos,
    curve: flatCurve(depth)
  };
  return { events: events, length: c.length };
}

export fn vibrato(c, depth, rate, start, end) {
  let out = addAutomation(c, "vocal:vibratoDepth", depth, start, end);
  if (rate != null) {
    out = addAutomation(out, "vocal:vibratoRate", rate, start, end);
  }
  return out;
}

export fn portamento(c, amount, start, end) {
  return addAutomation(c, "vocal:portamento", amount, start, end);
}

export fn breathiness(c, amount, start, end) {
  return addAutomation(c, "vocal:breathiness", amount, start, end);
}

export fn loudness(c, curve, start, end) {
  let startPos = start;
  if (startPos == null) {
    startPos = 0 / 1;
  }
  let endPos = end;
  if (endPos == null) {
    endPos = defaultEnd(c);
  }
  let events = [];
  for (ev in c.events) {
    events[events.length] = cloneEvent(ev);
  }
  events[events.length] = {
    type: "automation",
    param: "vocal:loudness",
    start: startPos,
    end: endPos,
    curve: curve
  };
  return { events: events, length: c.length };
}

export fn autoBreath(c, opts) {
  let minGap = 1 / 16;
  let breathDur = 1 / 16;
  let intensity = 0.6;
  let shortenPrev = true;

  if (opts != null) {
    if (opts.minGap != null) {
      minGap = opts.minGap;
    }
    if (opts.breathDur != null) {
      breathDur = opts.breathDur;
    }
    if (opts.intensity != null) {
      intensity = opts.intensity;
    }
    if (opts.shortenPrev != null) {
      shortenPrev = opts.shortenPrev;
    }
  }

  let notes = [];
  let otherEvents = [];

  for (ev in c.events) {
    if (ev.type == "note") {
      const start = posToRat(ev.start);
      if (start != null) {
        notes[notes.length] = {
          event: cloneEvent(ev),
          start: start,
          end: start + ev.dur
        };
      } else {
        otherEvents[otherEvents.length] = cloneEvent(ev);
      }
    } else {
      otherEvents[otherEvents.length] = cloneEvent(ev);
    }
  }

  for (i in 0..(notes.length - 1)) {
    for (j in 0..(notes.length - i - 2)) {
      if (notes[j].start > notes[j + 1].start) {
        const tmp = notes[j];
        notes[j] = notes[j + 1];
        notes[j + 1] = tmp;
      }
    }
  }

  let result = [];
  let breaths = [];

  if (notes.length > 0) {
    const firstStart = notes[0].start;
    if (firstStart >= breathDur) {
      breaths[breaths.length] = {
        type: "breath",
        start: firstStart - breathDur,
        dur: breathDur,
        intensity: intensity
      };
    }
  }

  for (i in 0..(notes.length - 2)) {
    const current = notes[i];
    const next = notes[i + 1];
    const gap = next.start - current.end;

    if (gap >= minGap) {
      let breathStart = next.start - breathDur;

      if (shortenPrev && breathStart < current.end) {
        const newEnd = breathStart;
        const newDur = newEnd - current.start;
        if (newDur > 0 / 1) {
          current.event.dur = newDur;
          current.end = newEnd;
          breathStart = newEnd;
        }
      }

      if (breathStart >= current.end && breathStart + breathDur <= next.start) {
        breaths[breaths.length] = {
          type: "breath",
          start: breathStart,
          dur: breathDur,
          intensity: intensity
        };
      }
    }
  }

  for (ev in otherEvents) {
    result[result.length] = ev;
  }
  for (n in notes) {
    result[result.length] = n.event;
  }
  for (b in breaths) {
    result[result.length] = b;
  }

  return { events: result, length: c.length };
}
`;

export const STDLIB_TRANSFORM = `// std:transform (v4)

fn posToRat(pos) {
  if (pos == null) {
    return null;
  }
  if (pos.kind == "rat") {
    return pos.rat;
  }
  if (pos.kind != null) {
    return null;
  }
  if (pos.n != null && pos.d != null) {
    return pos;
  }
  return null;
}

fn ratToNumber(r) {
  return r.n / r.d;
}

fn floor(value) {
  return value - (value % 1);
}

fn round(value) {
  return floor(value + 0.5);
}

fn ratFromNumber(value) {
  const scaled = round(value * 1000);
  return scaled / 1000;
}

fn scalePos(pos, factor) {
  const r = posToRat(pos);
  if (r == null) {
    return pos;
  }
  return r * factor;
}

fn quantizePos(pos, grid, strength) {
  const r = posToRat(pos);
  if (r == null) {
    return pos;
  }
  const ratio = ratToNumber(r) / ratToNumber(grid);
  const snapped = round(ratio) * ratToNumber(grid);
  if (strength >= 1) {
    return ratFromNumber(snapped);
  }
  const blended = ratToNumber(r) + (snapped - ratToNumber(r)) * strength;
  return ratFromNumber(blended);
}

fn swingPos(pos, grid, amount) {
  const r = posToRat(pos);
  if (r == null) {
    return pos;
  }
  const ratio = ratToNumber(r) / ratToNumber(grid);
  const idx = floor(ratio);
  const isOff = (idx % 2) == 1;
  if (!isOff) {
    return pos;
  }
  const offset = ratToNumber(grid) * amount * 0.5;
  return ratFromNumber(ratToNumber(r) + offset);
}

fn offsetPos(pos, offset) {
  const r = posToRat(pos);
  if (r == null) {
    return pos;
  }
  return ratFromNumber(ratToNumber(r) + offset);
}

fn cloneEvent(ev) {
  if (ev.type == "note") {
    return {
      type: "note",
      start: ev.start,
      dur: ev.dur,
      pitch: ev.pitch,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      lyric: ev.lyric,
      ext: ev.ext
    };
  }
  if (ev.type == "chord") {
    return {
      type: "chord",
      start: ev.start,
      dur: ev.dur,
      pitches: ev.pitches,
      velocity: ev.velocity,
      voice: ev.voice,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "drumHit") {
    return {
      type: "drumHit",
      start: ev.start,
      dur: ev.dur,
      key: ev.key,
      velocity: ev.velocity,
      techniques: ev.techniques,
      ext: ev.ext
    };
  }
  if (ev.type == "control") {
    return {
      type: "control",
      start: ev.start,
      kind: ev.kind,
      data: ev.data,
      ext: ev.ext
    };
  }
  if (ev.type == "automation") {
    return {
      type: "automation",
      param: ev.param,
      start: ev.start,
      end: ev.end,
      curve: ev.curve,
      ext: ev.ext
    };
  }
  if (ev.type == "marker") {
    return {
      type: "marker",
      pos: ev.pos,
      kind: ev.kind,
      label: ev.label
    };
  }
  return ev;
}

fn transposeEvent(ev, semitones) {
  let out = cloneEvent(ev);
  if (out.type == "note") {
    out.pitch = out.pitch + semitones;
  }
  if (out.type == "chord") {
    let pitches = [];
    for (p in out.pitches) {
      pitches[pitches.length] = p + semitones;
    }
    out.pitches = pitches;
  }
  return out;
}

fn stretchEvent(ev, factor) {
  let out = cloneEvent(ev);
  if (out.type == "marker") {
    out.pos = scalePos(out.pos, factor);
    return out;
  }
  if (out.type == "automation") {
    out.start = scalePos(out.start, factor);
    out.end = scalePos(out.end, factor);
    return out;
  }
  if (out.type == "note" || out.type == "chord" || out.type == "drumHit") {
    out.start = scalePos(out.start, factor);
    out.dur = out.dur * factor;
    return out;
  }
  if (out.type == "control") {
    out.start = scalePos(out.start, factor);
    return out;
  }
  return out;
}

fn quantizeEvent(ev, grid, strength) {
  let out = cloneEvent(ev);
  if (out.type == "marker") {
    out.pos = quantizePos(out.pos, grid, strength);
    return out;
  }
  if (out.type == "automation") {
    out.start = quantizePos(out.start, grid, strength);
    out.end = quantizePos(out.end, grid, strength);
    return out;
  }
  if (out.start != null) {
    out.start = quantizePos(out.start, grid, strength);
  }
  return out;
}

fn swingEvent(ev, grid, amount) {
  let out = cloneEvent(ev);
  if (out.type == "marker") {
    out.pos = swingPos(out.pos, grid, amount);
    return out;
  }
  if (out.type == "automation") {
    out.start = swingPos(out.start, grid, amount);
    out.end = swingPos(out.end, grid, amount);
    return out;
  }
  if (out.start != null) {
    out.start = swingPos(out.start, grid, amount);
  }
  return out;
}

fn hashFloat(rng, seed) {
  let base = 123456789;
  if (rng != null && rng.state != null) {
    base = rng.state;
  }
  const hashed = (base + seed * 2654435761) % 4294967296;
  return (hashed % 10000) / 10000;
}

fn humanizeEvent(ev, rng, timing, velocity, idx) {
  let out = cloneEvent(ev);
  const jitter = timing * (hashFloat(rng, idx) - 0.5) * 2;
  if (out.type == "marker") {
    out.pos = offsetPos(out.pos, jitter);
    return out;
  }
  if (out.type == "automation") {
    out.start = offsetPos(out.start, jitter);
    out.end = offsetPos(out.end, jitter);
    return out;
  }
  if (out.start != null) {
    out.start = offsetPos(out.start, jitter);
    if (out.velocity != null) {
      const vel = out.velocity;
      out.velocity = vel * (1 + velocity * (hashFloat(rng, idx + 1) - 0.5));
    }
  }
  return out;
}

export fn transpose(c, semitones) {
  let events = [];
  for (ev in c.events) {
    events[events.length] = transposeEvent(ev, semitones);
  }
  return { events: events, length: c.length };
}

export fn stretch(c, factor) {
  let events = [];
  for (ev in c.events) {
    events[events.length] = stretchEvent(ev, factor);
  }
  let length = null;
  if (c.length != null) {
    length = c.length * factor;
  }
  return { events: events, length: length };
}

export fn quantize(c, grid, strength) {
  let amount = strength;
  if (amount == null) {
    amount = 1;
  }
  let events = [];
  for (ev in c.events) {
    events[events.length] = quantizeEvent(ev, grid, amount);
  }
  return { events: events, length: c.length };
}

export fn swing(c, grid, amount) {
  let swingAmount = amount;
  if (swingAmount == null) {
    swingAmount = 0.5;
  }
  let events = [];
  for (ev in c.events) {
    events[events.length] = swingEvent(ev, grid, swingAmount);
  }
  return { events: events, length: c.length };
}

export fn humanize(c, rng, timing, velocity) {
  let timingAmount = timing;
  let v = velocity;
  if (timingAmount == null) {
    timingAmount = 0;
  }
  if (v == null) {
    v = 0;
  }
  let events = [];
  let idx = 0;
  for (ev in c.events) {
    events[events.length] = humanizeEvent(ev, rng, timingAmount, v, idx);
    idx = idx + 1;
  }
  let newState = 123456789;
  if (rng != null && rng.state != null) {
    newState = rng.state;
  }
  const finalState = (newState + idx * 2654435761) % 4294967296;
  const newRng = { state: finalState };
  const result = { events: events, length: c.length };
  return [newRng, result];
}
`;

export const STDLIB_CURVES = `// std:curves (v4)

fn makeCurve(points) {
  return { kind: "piecewiseLinear", points: points };
}

export fn linear(a, b, steps) {
  let count = steps;
  if (count < 2) {
    count = 2;
  }
  let points = [];
  for (i in 0..(count - 1)) {
    const ratio = i / (count - 1);
    const v = a + (b - a) * ratio;
    points[points.length] = { t: ratio, v: v };
  }
  return makeCurve(points);
}

export fn easeInOut(a, b, steps) {
  let count = steps;
  if (count < 2) {
    count = 2;
  }
  let points = [];
  for (i in 0..(count - 1)) {
    const ratio = i / (count - 1);
    const eased = ratio * ratio * (3 - 2 * ratio);
    const v = a + (b - a) * eased;
    points[points.length] = { t: ratio, v: v };
  }
  return makeCurve(points);
}

export fn piecewise(points) {
  let out = [];
  for (p in points) {
    if (p.length != null) {
      const ratio = p[0];
      const v = p[1];
      out[out.length] = { t: ratio, v: v };
    } else if (p.t != null && p.v != null) {
      out[out.length] = { t: p.t, v: p.v };
    }
  }
  return makeCurve(out);
}
`;

export const STDLIB_TIME = `// std:time (v4)

export fn barBeat(bar, beat) {
  return { kind: "posref", bar: bar, beat: beat };
}

fn parseMeterMap(value) {
  if (value == null) {
    return [];
  }
  if (value.meterMap != null) {
    return value.meterMap;
  }
  return value;
}

fn resolveMeterMap(events) {
  let resolved = [];
  for (ev in events) {
    const at = resolvePosAgainst(ev.at, resolved);
    resolved[resolved.length] = {
      at: at,
      numerator: ev.numerator,
      denominator: ev.denominator
    };
  }
  return resolved;
}

fn resolvePosAgainst(pos, meterMap) {
  if (pos.kind == "rat") {
    return pos.rat;
  }
  if (pos.kind == "posexpr") {
    return resolvePosAgainst(pos.base, meterMap) + pos.offset;
  }
  if (pos.kind == "posref") {
    return resolvePosRef(pos, meterMap);
  }
  if (pos.n != null && pos.d != null) {
    return pos;
  }
  return 0 / 1;
}

fn resolvePosRef(ref, meterMap) {
  if (meterMap.length == 0) {
    if (ref.bar == 1 && ref.beat == 1) {
      return 0 / 1;
    }
    return 0 / 1;
  }
  let current = meterMap[0];
  let currentPos = 0 / 1;
  let idx = 0;
  const bars = ref.bar - 1;
  for (step in 0..(bars - 1)) {
    const barLen = current.numerator / current.denominator;
    currentPos = currentPos + barLen;
    for (scan in 0..(meterMap.length - 1)) {
      if (idx + 1 < meterMap.length && meterMap[idx + 1].at == currentPos) {
        idx = idx + 1;
        current = meterMap[idx];
      }
    }
  }
  const beatLen = 1 / current.denominator;
  const offset = beatLen * (ref.beat - 1);
  return currentPos + offset;
}

export fn resolvePos(pos, meterMap) {
  const events = parseMeterMap(meterMap);
  const resolved = resolveMeterMap(events);
  return resolvePosAgainst(pos, resolved);
}

export fn dur(n, d) {
  return n / d;
}

export fn dot(d) {
  return d + (d / 2);
}

export const w = 1 / 1;
export const h = 1 / 2;
export const q = 1 / 4;
export const e = 1 / 8;
export const s = 1 / 16;
export const t = 1 / 32;
export const x = 1 / 64;

export const whole = w;
export const half = h;
export const quarter = q;
export const eighth = e;
export const sixteenth = s;
export const thirtySecond = t;
export const sixtyFourth = x;

export fn getMeterMap(score) {
  if (score == null) {
    return [];
  }
  if (score.meterMap != null) {
    return score.meterMap;
  }
  return [];
}
`;

export const STDLIB_RANDOM = `// std:random (v4)

const RNG_A = 1664525;
const RNG_C = 1013904223;
const RNG_M = 4294967296;

fn nextState(state) {
  return (state * RNG_A + RNG_C) % RNG_M;
}

export fn rng(seed) {
  let state = seed % RNG_M;
  if (state < 0) {
    state = state + RNG_M;
  }
  return { state: state };
}

export fn nextFloat(r) {
  const next = nextState(r.state);
  const value = next / RNG_M;
  return [{ state: next }, value];
}

export fn nextInt(r, lo, hi) {
  const span = hi - lo;
  if (span <= 0) {
    return [{ state: r.state }, lo];
  }
  const next = nextState(r.state);
  const value = lo + (next % span);
  return [{ state: next }, value];
}
`;

export const STDLIB_RESULT = `// std:result (v4)

export fn Ok(value) {
  return { kind: "Ok", value: value };
}

export fn Err(error) {
  return { kind: "Err", error: error };
}

export fn isOk(result) {
  return result.kind == "Ok";
}

export fn isErr(result) {
  return result.kind == "Err";
}

export fn unwrap(result) {
  if (result.kind == "Ok") {
    return result.value;
  }
  return null;
}

export fn unwrapErr(result) {
  if (result.kind == "Err") {
    return result.error;
  }
  return null;
}

export fn unwrapOr(result, defaultValue) {
  if (result.kind == "Ok") {
    return result.value;
  }
  return defaultValue;
}

export fn map(result, f) {
  if (result.kind == "Ok") {
    return Ok(f(result.value));
  }
  return result;
}

export fn mapErr(result, f) {
  if (result.kind == "Err") {
    return Err(f(result.error));
  }
  return result;
}

export fn andThen(result, f) {
  if (result.kind == "Ok") {
    return f(result.value);
  }
  return result;
}

export fn orElse(result, f) {
  if (result.kind == "Err") {
    return f(result.error);
  }
  return result;
}
`;

export const STDLIB_RHYTHM = `// std:rhythm (v4)
// Rhythmic pattern generation utilities

// euclidean - generate Euclidean rhythm pattern
export fn euclidean(hits, steps, rotation) {
  if (hits <= 0 || steps <= 0) {
    return [];
  }
  if (hits >= steps) {
    let out = [];
    for (i in 0..(steps - 1)) {
      out[out.length] = true;
    }
    return out;
  }
  let pattern = [];
  for (i in 0..(steps - 1)) {
    if (i < hits) {
      pattern[pattern.length] = [true];
    } else {
      pattern[pattern.length] = [false];
    }
  }
  let divisor = steps - hits;
  for (_ in 0..100) {
    if (divisor <= 1) {
      let out = [];
      for (seq in pattern) {
        for (v in seq) {
          out[out.length] = v;
        }
      }
      if (rotation != null && rotation != 0) {
        let rotated = [];
        const len = out.length;
        let r = rotation % len;
        if (r < 0) { r = r + len; }
        for (i in 0..(len - 1)) {
          rotated[rotated.length] = out[(i + r) % len];
        }
        return rotated;
      }
      return out;
    }
    let newPattern = [];
    const minLen = pattern.length - divisor;
    if (minLen <= 0) {
      let out = [];
      for (seq in pattern) {
        for (v in seq) { out[out.length] = v; }
      }
      return out;
    }
    for (i in 0..(minLen - 1)) {
      let combined = [];
      for (v in pattern[i]) { combined[combined.length] = v; }
      const tailIdx = pattern.length - 1 - i;
      if (tailIdx >= minLen) {
        for (v in pattern[tailIdx]) { combined[combined.length] = v; }
      }
      newPattern[newPattern.length] = combined;
    }
    for (i in minLen..(pattern.length - divisor - 1)) {
      newPattern[newPattern.length] = pattern[i];
    }
    pattern = newPattern;
    divisor = pattern.length - minLen;
    if (divisor < 0) { divisor = 0; }
  }
  let out = [];
  for (seq in pattern) {
    for (v in seq) { out[out.length] = v; }
  }
  return out;
}

export fn euclideanClip(hits, steps, stepDur, key, vel, rotation) {
  const pattern = euclidean(hits, steps, rotation);
  let velocity = vel;
  if (velocity == null) { velocity = 0.8; }
  let events = [];
  let pos = 0 / 1;
  for (hit in pattern) {
    if (hit) {
      events[events.length] = { type: "drumHit", start: pos, dur: stepDur, key: key, velocity: velocity };
    }
    pos = pos + stepDur;
  }
  return { events: events, length: pos };
}

export fn polyrhythm(a, b, totalDur) {
  const durA = totalDur / a;
  const durB = totalDur / b;
  let events = [];
  for (i in 0..(a - 1)) {
    events[events.length] = { type: "note", start: durA * i, dur: durA, pitch: 60, velocity: 0.8, voice: 0 };
  }
  for (i in 0..(b - 1)) {
    events[events.length] = { type: "note", start: durB * i, dur: durB, pitch: 64, velocity: 0.7, voice: 1 };
  }
  return { events: events, length: totalDur };
}

export fn groove(name, intensity) {
  let intens = intensity;
  if (intens == null) { intens = 0.5; }
  if (name == "swing") {
    return { name: "swing", intensity: intens, offsets: [0, intens * 0.33, 0, intens * 0.33] };
  }
  if (name == "shuffle") {
    return { name: "shuffle", intensity: intens, offsets: [0, intens * 0.5, 0, intens * 0.5] };
  }
  if (name == "lazy") {
    return { name: "lazy", intensity: intens, offsets: [0, intens * 0.1, intens * 0.05, intens * 0.15] };
  }
  if (name == "push") {
    return { name: "push", intensity: intens, offsets: [0, 0 - intens * 0.1, 0, 0 - intens * 0.1] };
  }
  return { name: "straight", intensity: 0, offsets: [0, 0, 0, 0] };
}

export fn clave(style, dur) {
  let stepDur = dur;
  if (stepDur == null) { stepDur = 1 / 8; }
  let pattern = [];
  if (style == "son" || style == "3-2") {
    pattern = [true, false, false, true, false, false, true, false, false, false, true, false, true, false, false, false];
  } else if (style == "rumba" || style == "rumba-3-2") {
    pattern = [true, false, false, true, false, false, false, true, false, false, true, false, true, false, false, false];
  } else if (style == "2-3") {
    pattern = [false, false, true, false, true, false, false, false, true, false, false, true, false, false, true, false];
  } else if (style == "bossa") {
    pattern = [true, false, false, true, false, false, true, false, false, true, false, false, true, false, false, false];
  } else {
    pattern = [true, false, false, true, false, false, true, false, false, false, true, false, true, false, false, false];
  }
  let events = [];
  let pos = 0 / 1;
  for (hit in pattern) {
    if (hit) {
      events[events.length] = { type: "drumHit", start: pos, dur: stepDur, key: "clave", velocity: 0.9 };
    }
    pos = pos + stepDur;
  }
  return { events: events, length: pos };
}

// crossRhythm - create cross-rhythm pattern from duration array
export fn crossRhythm(durations, against) {
  let events = [];
  let pos = 0 / 1;
  let voice = 0;
  for (dur in durations) {
    events[events.length] = { type: "note", start: pos, dur: dur, pitch: 60, velocity: 0.8, voice: voice };
    pos = pos + dur;
    voice = (voice + 1) % 2;
  }
  return { events: events, length: pos };
}

// accent - create accent pattern
export fn accent(pattern, strongVel, weakVel) {
  let strong = strongVel;
  let weak = weakVel;
  if (strong == null) { strong = 1.0; }
  if (weak == null) { weak = 0.6; }
  let velocities = [];
  for (isStrong in pattern) {
    if (isStrong) {
      velocities[velocities.length] = strong;
    } else {
      velocities[velocities.length] = weak;
    }
  }
  return velocities;
}
`;

/**
 * Map of stdlib module names to their source code
 */
export const STDLIB_MODULES: Record<string, string> = {
  core: STDLIB_CORE,
  drums: STDLIB_DRUMS,
  theory: STDLIB_THEORY,
  vocal: STDLIB_VOCAL,
  transform: STDLIB_TRANSFORM,
  curves: STDLIB_CURVES,
  time: STDLIB_TIME,
  random: STDLIB_RANDOM,
  result: STDLIB_RESULT,
  rhythm: STDLIB_RHYTHM,
};

/**
 * Virtual file system for browser-based compilation
 */
export class VirtualFileSystem {
  private files = new Map<string, string>();

  constructor() {
    // Initialize with stdlib
    for (const [name, source] of Object.entries(STDLIB_MODULES)) {
      this.files.set(`/stdlib/${name}.mf`, source);
    }
  }

  /**
   * Read a file from the virtual file system
   */
  readFile(path: string): string | null {
    return this.files.get(path) ?? null;
  }

  /**
   * Write a file to the virtual file system
   */
  writeFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  /**
   * Check if a file exists
   */
  exists(path: string): boolean {
    return this.files.has(path);
  }

  /**
   * Resolve stdlib import path
   */
  resolveStdlib(importPath: string): string | null {
    if (!importPath.startsWith('std:')) {
      return null;
    }
    const moduleName = importPath.slice(4);
    const stdlibPath = `/stdlib/${moduleName}.mf`;
    return this.exists(stdlibPath) ? stdlibPath : null;
  }

  /**
   * Get stdlib module source directly
   */
  getStdlibSource(moduleName: string): string | null {
    return STDLIB_MODULES[moduleName] ?? null;
  }

  /**
   * Clear all user files (keeps stdlib)
   */
  clearUserFiles(): void {
    for (const path of this.files.keys()) {
      if (!path.startsWith('/stdlib/')) {
        this.files.delete(path);
      }
    }
  }
}

/**
 * Default virtual file system instance
 */
export const virtualFs = new VirtualFileSystem();
