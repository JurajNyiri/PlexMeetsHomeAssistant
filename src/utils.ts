const escapeHtml = (unsafe: string): string => {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
};

// eslint-disable-next-line import/prefer-default-export
export { escapeHtml };
