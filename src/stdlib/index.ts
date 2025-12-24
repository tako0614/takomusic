import type { ObjectValue } from '../runtime.js';
import { createCoreModule } from './core.js';
import { createTimeModule } from './time.js';
import { createRandomModule } from './random.js';
import { createTransformModule } from './transform.js';
import { createCurvesModule } from './curves.js';
import { createTheoryModule } from './theory.js';
import { createDrumsModule } from './drums.js';
import { createVocalModule } from './vocal.js';

const MODULES: Record<string, () => ObjectValue> = {
  core: createCoreModule,
  time: createTimeModule,
  random: createRandomModule,
  transform: createTransformModule,
  curves: createCurvesModule,
  theory: createTheoryModule,
  drums: createDrumsModule,
  vocal: createVocalModule,
};

export function loadStdlibModule(name: string): ObjectValue {
  const key = name.replace(/^std:/, '');
  const factory = MODULES[key];
  if (!factory) {
    throw new Error(`Unknown stdlib module: ${name}`);
  }
  return factory();
}
