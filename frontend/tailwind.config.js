/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Channel form so Tailwind opacity modifiers (bg-ink/4, text-ink/70)
        // resolve correctly. Solid hex equivalents live in index.css :root.
        snow: {
          DEFAULT: "rgb(var(--snow-rgb) / <alpha-value>)",
          deep: "rgb(var(--snow-deep-rgb) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink-rgb) / <alpha-value>)",
          soft: "rgb(var(--ink-soft-rgb) / <alpha-value>)",
        },
        azure: {
          200: "rgb(var(--azure-200-rgb) / <alpha-value>)",
          500: "rgb(var(--azure-500-rgb) / <alpha-value>)",
          600: "rgb(var(--azure-600-rgb) / <alpha-value>)",
        },
        signal: {
          green: "rgb(var(--signal-green-rgb) / <alpha-value>)",
          amber: "rgb(var(--signal-amber-rgb) / <alpha-value>)",
          coral: "rgb(var(--signal-coral-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "display-xl": ["56px", { lineHeight: "60px", letterSpacing: "-0.02em" }],
        "display-lg": ["40px", { lineHeight: "46px", letterSpacing: "-0.015em" }],
        heading: ["28px", { lineHeight: "34px", letterSpacing: "-0.01em" }],
        body: ["16px", { lineHeight: "24px" }],
        caption: ["13px", { lineHeight: "18px" }],
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        6: "24px",
        8: "32px",
        12: "48px",
        16: "64px",
        24: "96px",
      },
      borderRadius: {
        sm: "10px",
        md: "16px",
        lg: "28px",
      },
      boxShadow: {
        "glass-strong":
          "0 20px 40px -12px rgba(45,111,224,0.25), 0 8px 16px -8px rgba(17,32,59,0.15)",
        "glass-quiet": "0 8px 24px -8px rgba(17,32,59,0.10)",
        "glass-lift":
          "0 28px 50px -12px rgba(45,111,224,0.30), 0 12px 20px -8px rgba(17,32,59,0.18)",
      },
      keyframes: {
        "count-fade": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "message-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "typing-bounce": {
          "0%, 80%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "40%": { transform: "translateY(-4px)", opacity: "1" },
        },
        "coral-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(192,71,61,0.45)" },
          "50%": { boxShadow: "0 0 0 6px rgba(192,71,61,0)" },
        },
        "blob-drift": {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(24px, -18px) scale(1.04)" },
          "66%": { transform: "translate(-18px, 22px) scale(0.98)" },
        },
        "specular-shift": {
          "0%, 100%": { transform: "translateX(-12%) translateY(-8%)", opacity: "0.5" },
          "50%": { transform: "translateX(12%) translateY(8%)", opacity: "0.85" },
        },
      },
      animation: {
        "count-fade": "count-fade 0.5s ease-out both",
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "message-in": "message-in 0.32s cubic-bezier(0.22,1,0.36,1) both",
        "typing-bounce": "typing-bounce 1.2s ease-in-out infinite",
        "coral-pulse": "coral-pulse 2.2s ease-in-out infinite",
        "blob-drift": "blob-drift 20s ease-in-out infinite",
        "specular-shift": "specular-shift 9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
