export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { colors: { orange: {50:'#fff1ee',100:'#ffe1da',200:'#ffc4b8',300:'#ff9d8a',400:'#ff7a62',500:'#ff5a3c',600:'#f23d2b',700:'#c9301f',800:'#992417',900:'#4a1a12'}, pink: {50:'#f5f3ff',100:'#ede9fe',200:'#ddd6fe',300:'#c4b5fd',400:'#a78bfa',500:'#8b5cf6',600:'#7c3aed',700:'#6d28d9',800:'#5b21b6',900:'#2e1065'} }, boxShadow: { input: '0px 2px 3px -1px rgba(0,0,0,0.1), 0px 1px 0px 0px rgba(25,28,33,0.02), 0px 0px 0px 1px rgba(25,28,33,0.08)' } } },
  plugins: [],
};
