/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				customTurquoise: {
					400: '#00695c',
				},
				background: '#2B2B2B', // example background color
				foreground: 'white', // example text color
				primary: 'white',
				secondary: 'black',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'multi-orbit': {
					'from': {
						transform: 'rotate(var(--angle)) translateY(var(--radius)) rotate(calc(-1 * var(--angle)))'
					},
					'to': {
						transform: 'rotate(calc(var(--angle) + 360deg)) translateY(var(--radius)) rotate(calc(-1 * (var(--angle) + 360deg)))'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'multi-orbit': 'multi-orbit var(--duration) linear infinite',
			}
		},
	},
	plugins: [
	],
}

