/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Blackbelt design system palette ──────────────────────────────
        ink:        '#15130F',
        canvas:     '#F6F3EC',
        paper:      '#FFFFFF',
        gold:       '#C79A3A',
        rust:       '#B0532A',
        'ink-soft': '#6B6659',
        'ink-muted':'#55504A',
        line:       '#E4DFD3',
        // ── Belt-stripe status colors ─────────────────────────────────────
        belt: {
          backlog:    '#E4DFD3',
          por_hacer:  '#D8B13A',
          en_curso:   '#C9742E',
          en_revision:'#6E8B55',
          hecho:      '#15130F',
          // map project statuses to belt colors
          activo:     '#6E8B55',
          finalizado: '#15130F',
          cancelado:  '#B0532A',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body:    ['"IBM Plex Sans"', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        card: '4px',
      },
    },
  },
  plugins: [],
};
