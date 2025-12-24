export interface Rat {
  n: number;
  d: number;
}

export function makeRat(n: number, d: number): Rat {
  if (!Number.isFinite(n) || !Number.isFinite(d)) {
    throw new Error('Rat requires finite numbers');
  }
  if (d === 0) {
    throw new Error('Rat denominator must be non-zero');
  }
  const sign = d < 0 ? -1 : 1;
  const nn = n * sign;
  const dd = Math.abs(d);
  const g = gcd(Math.abs(nn), dd);
  return { n: nn / g, d: dd / g };
}

export function ratFromInt(n: number): Rat {
  return makeRat(n, 1);
}

export function addRat(a: Rat, b: Rat): Rat {
  return makeRat(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function subRat(a: Rat, b: Rat): Rat {
  return makeRat(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function mulRat(a: Rat, b: Rat): Rat {
  return makeRat(a.n * b.n, a.d * b.d);
}

export function divRat(a: Rat, b: Rat): Rat {
  return makeRat(a.n * b.d, a.d * b.n);
}

export function compareRat(a: Rat, b: Rat): number {
  const left = a.n * b.d;
  const right = b.n * a.d;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function ratToNumber(a: Rat): number {
  return a.n / a.d;
}

export function isIntegerNumber(n: number): boolean {
  return Number.isFinite(n) && Math.floor(n) === n;
}

function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0 ? 1 : x;
}
