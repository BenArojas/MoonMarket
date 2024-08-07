/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors:{
        customTurquoise:{
          400: '#077e5d',
        },
        background: '#2B2B2B', // example background color
        foreground: 'white', // example text color
        primary: 'white',
        secondary: 'black',
      }
    },
  },
  plugins: [
 ],
}

