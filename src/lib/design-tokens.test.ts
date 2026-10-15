import { describe, expect, it } from 'vitest';
// @ts-expect-error -- tailwind.config.js no tiene tipos
import tailwind from '../../tailwind.config.js';
import { TOKENS } from './design-tokens';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- config JS sin tipos
const c = (tailwind as any).theme.extend.colors;

describe('design tokens de gráficos', () => {
  it('coinciden con tailwind.config.js', () => {
    expect(TOKENS.ink.toLowerCase()).toBe(c.ink.toLowerCase());
    expect(TOKENS.canvas.toLowerCase()).toBe(c.canvas.toLowerCase());
    expect(TOKENS.paper.toLowerCase()).toBe(c.paper.toLowerCase());
    expect(TOKENS.gold.toLowerCase()).toBe(c.gold.toLowerCase());
    expect(TOKENS.rust.toLowerCase()).toBe(c.rust.toLowerCase());
    expect(TOKENS.inkSoft.toLowerCase()).toBe(c['ink-soft'].toLowerCase());
    expect(TOKENS.line.toLowerCase()).toBe(c.line.toLowerCase());
    expect(TOKENS.positive.toLowerCase()).toBe(c.belt.en_revision.toLowerCase());
  });
});
