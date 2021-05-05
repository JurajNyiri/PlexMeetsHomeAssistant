// eslint-disable-next-line @typescript-eslint/no-explicit-any
const escapeHtml = (unsafe: any): string => {
	return unsafe
		.toString()
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;') 
		.replace(/'/g, '&#039;');
};

// eslint-disable-next-line import/prefer-default-export
export { escapeHtml };
