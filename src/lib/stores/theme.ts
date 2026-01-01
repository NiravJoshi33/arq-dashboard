import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createThemeStore() {
	const defaultDark = browser
		? window.matchMedia('(prefers-color-scheme: dark)').matches
		: true;

	const stored = browser ? localStorage.getItem('theme') : null;
	const initial = stored ? stored === 'dark' : defaultDark;

	const { subscribe, set, update } = writable(initial);

	function toggle() {
		update((dark) => {
			const newValue = !dark;
			if (browser) {
				localStorage.setItem('theme', newValue ? 'dark' : 'light');
				document.documentElement.classList.toggle('light', !newValue);
			}
			return newValue;
		});
	}

	function init() {
		if (browser) {
			const dark = localStorage.getItem('theme') !== 'light';
			document.documentElement.classList.toggle('light', !dark);
			set(dark);
		}
	}

	return {
		subscribe,
		toggle,
		init
	};
}

export const darkMode = createThemeStore();

