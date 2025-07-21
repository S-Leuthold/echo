module.exports = {
  darkMode: 'media',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'accent-blue': 'var(--accent-blue)',
        background: {
          primary: '#0D1117',   // bg-background-primary
          secondary: '#161B22', // bg-background-secondary
        },
        text: {
          primary: '#E6EDF3',   // text-text-primary
          secondary: '#8B949E', // text-text-secondary
          accent: '#58A6FF',    // text-text-accent
        },
      },
      spacing: {
        sidebar: '16rem', // 256px
      },
    },
  },
  plugins: [],
}; 