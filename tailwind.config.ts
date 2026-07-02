import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        wm: {
          bg: "#F6F5F0",
          surface: "#FFFFFF",
          ink: "#191823",
          muted: "#6F7080",
          line: "#E6E2D9",
          blue: "#3B39FF",
          lime: "#B8FF34",
          orange: "#F57644",
          soft: "#ECEBFF"
        }
      },
      boxShadow: {
        wm: "0 18px 60px rgba(31, 30, 47, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
