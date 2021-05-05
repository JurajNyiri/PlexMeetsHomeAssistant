/* eslint-disable @typescript-eslint/no-explicit-any */
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

// eslint-disable-next-line import/prefer-default-export
export { escapeHtml, getOffset };
