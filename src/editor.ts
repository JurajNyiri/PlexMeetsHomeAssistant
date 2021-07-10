/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env browser */
import { HomeAssistant } from 'custom-card-helpers';
import { PolymerElement } from '@polymer/polymer';

class PlexMeetsHomeAssistantEditor extends HTMLElement {
	content: any;

	config: Record<string, any> = {};

	fireEvent = (
		node: HTMLElement,
		type: string,
		detail: Record<string, any>,
		options: Record<string, any> = {}
	): Event => {
		// eslint-disable-next-line no-param-reassign
		detail = detail === null || detail === undefined ? {} : detail;
		const event: any = new Event(type, {
			bubbles: options.bubbles === undefined ? true : options.bubbles,
			cancelable: Boolean(options.cancelable),
			composed: options.composed === undefined ? true : options.composed
		});
		event.detail = detail;
		node.dispatchEvent(event);
		return event;
	};

	render = (): void => {
		console.log('render');
		if (this.content) this.content.remove();
		this.content = document.createElement('div');

		const ip: any = document.createElement('paper-input');
		ip.label = 'Plex IP Address';
		ip.value = this.config.ip;
		this.content.appendChild(ip);

		const token: any = document.createElement('paper-input');
		token.label = 'Plex Token';
		token.value = this.config.token;
		this.content.appendChild(token);

		this.appendChild(this.content);

		this.fireEvent(this, 'config-changed', { config: this.config }); // todo remove me
	};

	setConfig = (config: Record<string, any>): void => {
		console.log(config);
		this.config = JSON.parse(JSON.stringify(config));
		this.render();
	};

	configChanged = (newConfig: any): void => {
		const event: any = new Event('config-changed', {
			bubbles: true,
			composed: true
		});
		event.detail = { config: newConfig };
		this.dispatchEvent(event);
	};
}
export default PlexMeetsHomeAssistantEditor;
