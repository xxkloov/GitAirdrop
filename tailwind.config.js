export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      colors: {
        ios: {
          blue: '#0A84FF',
          blueLight: '#5AC8FA',
          gray: '#8E8E93',
          lightGray: '#F5F5F7',
          darkGray: '#000000',
          darkGraySecondary: '#1C1C1E',
          glass: 'rgba(255, 255, 255, 0.7)',
          glassDark: 'rgba(0, 0, 0, 0.4)',
          accent: '#FF375F',
          accentLight: '#FF6B9D'
        },
        'muted-blue': '#4A9EFF'
      },
      borderRadius: {
        ios: '32px',
        'ios-sm': '24px',
        'ios-lg': '40px',
        'ios-xl': '48px'
      },
      boxShadow: {
        ios: '0 4px 20px rgba(0, 0, 0, 0.08)',
        'ios-dark': '0 8px 32px rgba(0, 0, 0, 0.5)',
        'ios-glow': '0 0 40px rgba(10, 132, 255, 0.2), 0 0 12px rgba(10, 132, 255, 0.1)',
        'ios-glow-dark': '0 0 40px rgba(10, 132, 255, 0.15), 0 0 12px rgba(10, 132, 255, 0.08)',
        'ios-glow-soft': '0 0 20px rgba(10, 132, 255, 0.12)'
      },
      backgroundImage: {
        'gradient-ios': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-ios-light': 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        'gradient-ios-dark': 'linear-gradient(135deg, #000000 0%, #1a1a2e 100%)'
      }
    }
  },
  plugins: []
}

