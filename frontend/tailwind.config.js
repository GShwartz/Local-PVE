module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}', // Covers your React files
    './*.css', // Includes index.css in the root
  ],
  theme: { extend: {} },
  plugins: [],
};