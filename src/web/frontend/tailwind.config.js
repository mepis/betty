/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js}"],
  theme: {
    extend: {
      screens: {
        xs: "475px",
      },
    },
  },
  plugins: [],
};
