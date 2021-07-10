/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env browser */
import _ from 'lodash';
import { HomeAssistant } from 'custom-card-helpers';
import Plex from './modules/Plex';
import { fetchEntityRegistry } from './modules/utils';

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

	tabs: any = document.createElement('paper-tabs');

	devicesTabs = 0;

	hassObj: HomeAssistant | undefined;

	entities: Array<any> = [];

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

	valueUpdated = (): void => {
		if (!_.isEmpty(this.libraryName.value)) {
			this.config.ip = this.ip.value;
			this.config.token = this.token.value;
			this.config.port = this.port.value;
			this.config.libraryName = this.libraryName.value;
			this.config.entity = [];
			_.forEach(this.entities, entity => {
				this.config.entity.push(entity.value);
			});
			this.fireEvent(this, 'config-changed', { config: this.config });
		}
	};

	render = async (): Promise<void> => {
		const addDropdownItem = (text: string): HTMLElement => {
			const libraryItem: any = document.createElement('paper-item');
			libraryItem.innerHTML = text;
			return libraryItem;
		};
		const createEntitiesDropdown = (
			entitiesRegistry: Array<Record<string, any>>,
			selected: string,
			changeHandler: Function
		): HTMLElement => {
			const entitiesDropDown: any = document.createElement('paper-dropdown-menu');
			const entities: any = document.createElement('paper-listbox');

			_.forEach(entitiesRegistry, entityRegistry => {
				if (
					_.isEqual(entityRegistry.platform, 'cast') ||
					_.isEqual(entityRegistry.platform, 'kodi') ||
					_.isEqual(entityRegistry.platform, 'androidtv')
				) {
					entities.appendChild(addDropdownItem(entityRegistry.entity_id));
				}
			});
			entities.slot = 'dropdown-content';
			entitiesDropDown.label = 'Entity';
			entitiesDropDown.value = selected;
			entitiesDropDown.appendChild(entities);
			entitiesDropDown.style.width = '100%';
			entitiesDropDown.className = 'entitiesDropDown';
			entitiesDropDown.addEventListener('value-changed', changeHandler);
			this.entities.push(entitiesDropDown);
			return entitiesDropDown;
		};
		if (this.content) this.content.remove();
		let entitiesRegistry: false | Array<Record<string, any>> = false;
		if (this.hassObj) {
			entitiesRegistry = await fetchEntityRegistry(this.hassObj.connection);
		}

		this.entities = [];
		this.content = document.createElement('div');

		const plexTitle = document.createElement('h2');
		plexTitle.innerHTML = 'Plex Configuration';
		plexTitle.style.margin = '0px';
		plexTitle.style.padding = '0px';
		this.content.appendChild(plexTitle);

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

		this.libraryName.innerHTML = '';
		const libraryItems: any = document.createElement('paper-listbox');
		libraryItems.appendChild(addDropdownItem('Continue Watching'));
		libraryItems.appendChild(addDropdownItem('Deck'));
		libraryItems.appendChild(addDropdownItem('Recently Added'));
		libraryItems.appendChild(addDropdownItem('Watch Next'));
		libraryItems.slot = 'dropdown-content';
		this.libraryName.label = 'Plex Library';
		this.libraryName.disabled = true;
		this.libraryName.appendChild(libraryItems);
		this.libraryName.style.width = '100%';
		this.libraryName.addEventListener('value-changed', this.valueUpdated);
		this.content.appendChild(this.libraryName);

		const devicesTitle = document.createElement('h2');
		devicesTitle.innerHTML = `Devices Configuration`;
		devicesTitle.style.lineHeight = '29px';
		devicesTitle.style.marginBottom = '0px';
		devicesTitle.style.marginTop = '20px';

		const addDeviceButton = document.createElement('button');
		addDeviceButton.style.float = 'right';
		addDeviceButton.style.fontSize = '20px';
		addDeviceButton.style.cursor = 'pointer';
		addDeviceButton.innerHTML = '+';
		addDeviceButton.addEventListener('click', () => {
			if (entitiesRegistry) {
				this.content.appendChild(createEntitiesDropdown(entitiesRegistry, '', this.valueUpdated));
				this.scrollTop = this.scrollHeight - this.clientHeight;
			}
		});
		devicesTitle.appendChild(addDeviceButton);

		this.content.appendChild(devicesTitle);
		if (_.isString(this.config.entity)) {
			this.config.entity = [this.config.entity];
		}
		if (_.isArray(this.config.entity)) {
			_.forEach(this.config.entity, entity => {
				if (entitiesRegistry && _.isString(entity)) {
					this.content.appendChild(createEntitiesDropdown(entitiesRegistry, entity, this.valueUpdated));
				}
			});
		}

		this.appendChild(this.content);

		if (this.plex) {
			try {
				const sections = await this.plex.getSections();
				_.forEach(sections, (section: Record<string, any>) => {
					libraryItems.appendChild(addDropdownItem(section.title));
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

	set hass(hass: HomeAssistant) {
		this.hassObj = hass;
	}
}
export default PlexMeetsHomeAssistantEditor;
