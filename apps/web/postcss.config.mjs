/** PostCSS config — loads Tailwind 4 via the official PostCSS plugin.
 *  Format compatible with both Next.js (Turbopack) and Vitest. */
import tailwindcss from '@tailwindcss/postcss';

const config = {
  plugins: [tailwindcss],
};

export default config;
