import { Scope } from './scope.js';
import type { RuntimeValue } from './runtime.js';
import { createCoreModule } from './stdlib/core.js';
import { createTimeModule } from './stdlib/time.js';
import { createRandomModule } from './stdlib/random.js';
import { createTransformModule } from './stdlib/transform.js';
import { createCurvesModule } from './stdlib/curves.js';
import { createTheoryModule } from './stdlib/theory.js';
import { createDrumsModule } from './stdlib/drums.js';
import { createVocalModule } from './stdlib/vocal.js';

const INTRINSIC_FACTORIES: Record<string, () => RuntimeValue> = {
  __core: createCoreModule,
  __time: createTimeModule,
  __random: createRandomModule,
  __transform: createTransformModule,
  __curves: createCurvesModule,
  __theory: createTheoryModule,
  __drums: createDrumsModule,
  __vocal: createVocalModule,
};

export function applyIntrinsics(scope: Scope): void {
  for (const [name, factory] of Object.entries(INTRINSIC_FACTORIES)) {
    scope.define(name, factory(), false);
  }
}
