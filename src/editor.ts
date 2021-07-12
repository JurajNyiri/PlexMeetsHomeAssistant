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

	maxCount: any = document.createElement('paper-input');

	libraryName: any = document.createElement('paper-dropdown-menu');

	protocol: any = document.createElement('paper-dropdown-menu');

	tabs: any = document.createElement('paper-tabs');

	sort: any = document.createElement('paper-dropdown-menu');

	sortOrder: any = document.createElement('paper-dropdown-menu');

	devicesTabs = 0;

	hassObj: HomeAssistant | undefined;

	entities: Array<any> = [];

	sections: Array<Record<string, any>> = [];

	entitiesRegistry: false | Array<Record<string, any>> = false;

	plexValidSection = document.createElement('div');

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
		console.log('valueUpdated');
		const originalConfig = _.clone(this.config);
		this.config.protocol = this.protocol.value;
		this.config.ip = this.ip.value;
		this.config.token = this.token.value;
		this.config.port = this.port.value;
		if (!_.isEmpty(this.libraryName.value)) {
			this.config.libraryName = this.libraryName.value;

			this.config.sort = `${this.sort.value}:${this.sortOrder.value}`;
			if (_.isEmpty(this.maxCount.value)) {
				this.config.maxCount = '';
			} else {
				this.config.maxCount = this.maxCount.value;
			}

			if (!_.isEmpty(this.entities)) {
				this.config.entity = [];
				_.forEach(this.entities, entity => {
					if (!_.isEmpty(entity.value) && !_.includes(this.config.entity, entity.value)) {
						this.config.entity.push(entity.value);
					}
				});
			}
		}
		if (!_.isEqual(this.config, originalConfig)) {
			console.log(this.config);
			console.log(originalConfig);
			this.fireEvent(this, 'config-changed', { config: this.config });
		}
	};

	render = async (): Promise<void> => {
		const addDropdownItem = (text: string): HTMLElement => {
			const libraryItem: any = document.createElement('paper-item');
			libraryItem.innerHTML = text;
			return libraryItem;
		};
		const createEntitiesDropdown = (selected: string, changeHandler: Function): HTMLElement | false => {
			if (this.entitiesRegistry) {
				const entitiesDropDown: any = document.createElement('paper-dropdown-menu');
				const entities: any = document.createElement('paper-listbox');

				entities.appendChild(addDropdownItem(''));
				_.forEach(this.entitiesRegistry, entityRegistry => {
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
			}
			return false;
		};
		if (this.content) this.content.remove();
		if (this.hassObj && !this.entitiesRegistry) {
			this.entitiesRegistry = await fetchEntityRegistry(this.hassObj.connection);
		}

		this.entities = [];
		this.content = document.createElement('div');

		const plexTitle = document.createElement('h2');
		plexTitle.innerHTML = 'Plex Configuration';
		plexTitle.style.margin = '0px';
		plexTitle.style.padding = '0px';
		this.content.appendChild(plexTitle);

		this.protocol.innerHTML = '';
		const protocolItems: any = document.createElement('paper-listbox');
		protocolItems.appendChild(addDropdownItem('http'));
		protocolItems.appendChild(addDropdownItem('https'));
		protocolItems.slot = 'dropdown-content';
		this.protocol.label = 'Plex Protocol';
		this.protocol.appendChild(protocolItems);
		this.protocol.style.width = '100%';
		this.protocol.addEventListener('value-changed', this.valueUpdated);
		if (_.isEmpty(this.config.protocol)) {
			this.protocol.value = 'http';
		} else {
			this.protocol.value = this.config.protocol;
		}
		this.content.appendChild(this.protocol);

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

		this.appendChild(this.content);

		// todo: do verify better, do not query plex every time
		this.sections = [];
		if (this.plex) {
			try {
				this.sections = await this.plex.getSections();
			} catch (err) {
				// pass
			}
		}

		this.plexValidSection.style.display = 'none';
		this.plexValidSection.innerHTML = '';

		const viewTitle = document.createElement('h2');
		viewTitle.innerHTML = `View Configuration`;
		viewTitle.style.lineHeight = '29px';
		viewTitle.style.marginBottom = '0px';
		viewTitle.style.marginTop = '20px';
		this.plexValidSection.appendChild(viewTitle);

		this.maxCount.label = 'Maximum number of items to display';
		this.maxCount.value = this.config.maxCount;
		this.maxCount.type = 'number';
		this.maxCount.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.maxCount);

		this.sort.innerHTML = '';
		const sortItems: any = document.createElement('paper-listbox');
		sortItems.appendChild(addDropdownItem('titleSort'));
		sortItems.appendChild(addDropdownItem('title'));
		sortItems.appendChild(addDropdownItem('year'));
		sortItems.appendChild(addDropdownItem('originallyAvailableAt'));
		sortItems.appendChild(addDropdownItem('rating'));
		sortItems.appendChild(addDropdownItem('audienceRating'));
		sortItems.appendChild(addDropdownItem('userRating'));
		sortItems.appendChild(addDropdownItem('contentRating'));
		sortItems.appendChild(addDropdownItem('unviewedLeafCount'));
		sortItems.appendChild(addDropdownItem('episode.addedAt'));
		sortItems.appendChild(addDropdownItem('addedAt'));
		sortItems.appendChild(addDropdownItem('lastViewedAt'));
		sortItems.slot = 'dropdown-content';
		this.sort.label = 'Sort';
		this.sort.appendChild(sortItems);
		this.sort.style.width = '100%';
		this.sort.addEventListener('value-changed', this.valueUpdated);
		if (_.isEmpty(this.config.sort)) {
			this.sort.value = 'title';
		} else {
			// eslint-disable-next-line prefer-destructuring
			this.sort.value = this.config.sort.split(':')[0];
		}
		this.plexValidSection.appendChild(this.sort);

		this.sortOrder.innerHTML = '';
		const sortOrderItems: any = document.createElement('paper-listbox');
		sortOrderItems.appendChild(addDropdownItem('asc'));
		sortOrderItems.appendChild(addDropdownItem('desc'));
		sortOrderItems.slot = 'dropdown-content';
		this.sortOrder.label = 'Sort Order';
		this.sortOrder.appendChild(sortOrderItems);
		this.sortOrder.style.width = '100%';
		this.sortOrder.addEventListener('value-changed', this.valueUpdated);
		if (_.isEmpty(this.config.sort)) {
			this.sortOrder.value = 'asc';
		} else {
			const sortOrder = this.config.sort.split(':')[1];
			if (_.isEmpty(sortOrder)) {
				this.sortOrder.value = 'asc';
			} else {
				this.sortOrder.value = sortOrder;
			}
		}
		this.plexValidSection.appendChild(this.sortOrder);

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
			const entitiesDropdown = createEntitiesDropdown('', this.valueUpdated);
			if (entitiesDropdown) {
				this.content.appendChild(entitiesDropdown);
			}
		});
		devicesTitle.appendChild(addDeviceButton);

		this.plexValidSection.appendChild(devicesTitle);
		if (_.isString(this.config.entity)) {
			this.config.entity = [this.config.entity];
		}
		if (_.isArray(this.config.entity)) {
			_.forEach(this.config.entity, entity => {
				if (_.isString(entity)) {
					const entitiesDropdown = createEntitiesDropdown(entity, this.valueUpdated);
					if (entitiesDropdown) {
						this.plexValidSection.appendChild(entitiesDropdown);
					}
				}
			});
		}
		if (!_.isEmpty(this.sections)) {
			_.forEach(this.sections, (section: Record<string, any>) => {
				libraryItems.appendChild(addDropdownItem(section.title));
			});
			this.libraryName.disabled = false;
			this.libraryName.value = this.config.libraryName;
			this.plexValidSection.style.display = 'block';
		}
		this.content.appendChild(this.plexValidSection);
	};

	setConfig = (config: Record<string, any>): void => {
		this.config = JSON.parse(JSON.stringify(config));

		if (config.port) {
			this.plexPort = config.port;
		}

		if (config.protocol) {
			this.plexProtocol = config.protocol;
		} else {
			this.config.protocol = 'http';
		}

		if (!config.sort) {
			this.config.sort = 'titleSort:asc';
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
