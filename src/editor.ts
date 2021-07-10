/* eslint-env browser */
class ContentCardEditor extends HTMLElement {
	setConfig = (config: any): void => {
		console.log(config);
	};

	configChanged = (newConfig: any) => {
		const event: any = new Event('config-changed', {
			bubbles: true,
			composed: true
		});
		event.detail = { config: newConfig };
		this.dispatchEvent(event);
	};
}
export default ContentCardEditor;
