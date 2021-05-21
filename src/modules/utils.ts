/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env browser */
import _ from 'lodash';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const escapeHtml = (unsafe: any): string => {
	if (unsafe) {
		return unsafe
			.toString()
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}
	return '';
};

const getHeight = (el: HTMLElement): number => {
	const height = Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight, el.scrollHeight, el.offsetHeight);
	return height;
};

const getOffset = (el: Element): Record<string, any> => {
	let x = 0;
	let y = 0;
	while (
		el &&
		(el as HTMLElement).offsetParent &&
		!_.isNaN((el as HTMLElement).offsetLeft) &&
		!_.isNaN((el as HTMLElement).offsetTop)
	) {
		x += (el as HTMLElement).offsetLeft - (el as HTMLElement).scrollLeft;
		y += (el as HTMLElement).offsetTop - (el as HTMLElement).scrollTop;
		const tmp = (el as HTMLElement).offsetParent;
		if (tmp) {
			// eslint-disable-next-line no-param-reassign
			el = tmp;
		}
	}
	return { top: y, left: x };
};

const isScrolledIntoView = (elem: HTMLElement): boolean => {
	const rect = elem.getBoundingClientRect();
	const elemTop = rect.top;
	const elemBottom = rect.bottom;

	// Only completely visible elements return true:
	const isVisible = elemTop >= 0 && elemBottom <= window.innerHeight;
	// Partially visible elements return true:
	// isVisible = elemTop < window.innerHeight && elemBottom >= 0;
	return isVisible;
};

// eslint-disable-next-line import/prefer-default-export
export { escapeHtml, getOffset, isScrolledIntoView, getHeight };
