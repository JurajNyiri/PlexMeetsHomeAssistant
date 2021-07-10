/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env browser */
import _ from 'lodash';
import Plex from './modules/Plex';

class PlexMeetsHomeAssistantEditor extends HTMLElement {
	content: any;

	plexPort: number | false = false;

	plexProtocol: 'http' | 'https' = 'http';

	plex: Plex | undefined;

	config: Record<string, any> = {};

	ip: any = document.createElement('paper-input');

	token: any = document.createElement('paper-input');

	port: any = document.createElement('paper-input');

	libraryName: any = document.createElement('paper-dropdown-menu');

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

	valueUpdated = () => {
		this.config.ip = this.ip.value;
		this.config.token = this.token.value;
		this.config.port = this.port.value;
		this.config.libraryName = this.libraryName.value;
		this.fireEvent(this, 'config-changed', { config: this.config }); // todo remove me
	};

	render = async (): Promise<void> => {
		console.log('render');
		if (this.content) this.content.remove();
		this.content = document.createElement('div');

		this.ip.label = 'Plex IP Address';
		this.ip.value = this.config.ip;
		this.ip.addEventListener('change', this.valueUpdated);
		this.content.appendChild(this.ip);

		this.token.label = 'Plex Token';
		this.token.value = this.config.token;
		this.token.addEventListener('change', this.valueUpdated);
		this.content.appendChild(this.token);

		this.port.label = 'Plex Port';
		this.port.value = this.config.port;
		this.port.type = 'number';
		this.port.addEventListener('change', this.valueUpdated);
		this.content.appendChild(this.port);

		const addLibraryItem = (text: string): HTMLElement => {
			const libraryItem: any = document.createElement('paper-item');
			libraryItem.innerHTML = text;
			return libraryItem;
		};
		const libraryItems: any = document.createElement('paper-listbox');
		libraryItems.appendChild(addLibraryItem('Continue Watching'));
		libraryItems.appendChild(addLibraryItem('Deck'));
		libraryItems.appendChild(addLibraryItem('Recently Added'));
		libraryItems.appendChild(addLibraryItem('Watch Next'));
		libraryItems.slot = 'dropdown-content';
		this.libraryName.label = 'Plex Library';
		this.libraryName.disabled = true;
		this.libraryName.appendChild(libraryItems);
		this.libraryName.style.width = '100%';
		this.libraryName.addEventListener('value-changed', this.valueUpdated);
		this.content.appendChild(this.libraryName);

		this.appendChild(this.content);

		if (this.plex) {
			try {
				const sections = await this.plex.getSections();
				_.forEach(sections, (section: Record<string, any>) => {
					libraryItems.appendChild(addLibraryItem(section.title));
				});
				this.libraryName.disabled = false;
				this.libraryName.value = this.config.libraryName;
			} catch (err) {
				// pass
			}
		}
	};

	setConfig = (config: Record<string, any>): void => {
		console.log(config);
		this.config = JSON.parse(JSON.stringify(config));

		if (config.port) {
			this.plexPort = config.port;
		}

		if (config.protocol) {
			this.plexProtocol = config.protocol;
		}

		this.plex = new Plex(this.config.ip, this.plexPort, this.config.token, this.plexProtocol, this.config.sort);
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
