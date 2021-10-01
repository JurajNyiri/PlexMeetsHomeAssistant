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

	maxRows: any = document.createElement('paper-input');

	minWidth: any = document.createElement('paper-input');

	minEpisodeWidth: any = document.createElement('paper-input');

	minExpandedWidth: any = document.createElement('paper-input');

	minExpandedHeight: any = document.createElement('paper-input');

	fontSize1: any = document.createElement('paper-input');

	fontSize2: any = document.createElement('paper-input');

	fontSize3: any = document.createElement('paper-input');

	fontSize4: any = document.createElement('paper-input');

	cardTitle: any = document.createElement('paper-input');

	libraryName: any = document.createElement('paper-dropdown-menu');

	protocol: any = document.createElement('paper-dropdown-menu');

	tabs: any = document.createElement('paper-tabs');

	sort: any = document.createElement('paper-dropdown-menu');

	sortOrder: any = document.createElement('paper-dropdown-menu');

	playTrailer: any = document.createElement('paper-dropdown-menu');

	showExtras: any = document.createElement('paper-dropdown-menu');

	showSearch: any = document.createElement('paper-dropdown-menu');

	runBefore: any = document.createElement('paper-dropdown-menu');

	runAfter: any = document.createElement('paper-dropdown-menu');

	entitiesSection: any = document.createElement('div');

	devicesTabs = 0;

	hassObj: HomeAssistant | undefined;

	entities: Array<any> = [];

	scriptEntities: Array<string> = [];

	sections: Array<Record<string, any>> = [];

	collections: Array<Record<string, any>> = [];

	playlists: Array<Record<string, any>> = [];

	clients: Record<string, any> = {};

	entitiesRegistry: false | Array<Record<string, any>> = false;

	plexValidSection = document.createElement('div');

	loaded = false;

	livetv: Record<string, any> = {};

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
		const originalConfig = _.clone(this.config);
		this.config.protocol = this.protocol.value;
		this.config.ip = this.ip.value.replace(/^https?\:\/\//i, '').replace(/\/$/, '');
		this.config.token = this.token.value;
		this.config.port = this.port.value;
		if (this.loaded) {
			if (!this.config.entity) {
				this.config.entity = [];
			}
			if (!_.isEmpty(this.libraryName.value)) {
				this.config.libraryName = this.libraryName.value;

				let sortOrderValue = '';
				if (_.isEqual(this.sortOrder.value, 'Ascending')) {
					sortOrderValue = 'asc';
				} else if (_.isEqual(this.sortOrder.value, 'Descending')) {
					sortOrderValue = 'desc';
				}
				if (!_.isEmpty(sortOrderValue) && !_.isEmpty(this.sort.value)) {
					this.config.sort = `${this.sort.value}:${sortOrderValue}`;
				} else {
					this.config.sort = ``;
				}

				if (_.isEmpty(this.maxCount.value)) {
					this.config.maxCount = '';
				} else {
					this.config.maxCount = this.maxCount.value;
				}

				if (_.isEmpty(this.maxRows.value)) {
					this.config.maxRows = '';
				} else {
					this.config.maxRows = this.maxRows.value;
				}

				if (_.isEmpty(this.minWidth.value)) {
					this.config.minWidth = '';
				} else {
					this.config.minWidth = this.minWidth.value;
				}

				if (_.isEmpty(this.minEpisodeWidth.value)) {
					this.config.minEpisodeWidth = '';
				} else {
					this.config.minEpisodeWidth = this.minEpisodeWidth.value;
				}

				if (_.isEmpty(this.minExpandedWidth.value)) {
					this.config.minExpandedWidth = '';
				} else {
					this.config.minExpandedWidth = this.minExpandedWidth.value;
				}

				if (_.isEmpty(this.fontSize1.value)) {
					this.config.fontSize1 = '';
				} else {
					this.config.fontSize1 = this.fontSize1.value;
				}

				if (_.isEmpty(this.fontSize2.value)) {
					this.config.fontSize2 = '';
				} else {
					this.config.fontSize2 = this.fontSize2.value;
				}

				if (_.isEmpty(this.fontSize3.value)) {
					this.config.fontSize3 = '';
				} else {
					this.config.fontSize3 = this.fontSize3.value;
				}

				if (_.isEmpty(this.fontSize4.value)) {
					this.config.fontSize4 = '';
				} else {
					this.config.fontSize4 = this.fontSize4.value;
				}

				if (_.isEmpty(this.minExpandedHeight.value)) {
					this.config.minExpandedHeight = '';
				} else {
					this.config.minExpandedHeight = this.minExpandedHeight.value;
				}

				if (_.isEmpty(this.cardTitle.value)) {
					this.config.title = '';
				} else {
					this.config.title = this.cardTitle.value;
				}

				if (!_.isEmpty(this.entities)) {
					this.config.entity = [];
					_.forEach(this.entities, entity => {
						if (!_.isEmpty(entity.value) && !_.includes(this.config.entity, entity.value)) {
							this.config.entity.push(entity.value);
						}
					});
				}
				if (_.isEqual(this.playTrailer.value, 'Yes')) {
					this.config.playTrailer = true;
				} else if (_.isEqual(this.playTrailer.value, 'No')) {
					this.config.playTrailer = false;
				} else if (_.isEqual(this.playTrailer.value, 'Muted')) {
					this.config.playTrailer = 'muted';
				}
				if (_.isEqual(this.showExtras.value, 'Yes')) {
					this.config.showExtras = true;
				} else if (_.isEqual(this.showExtras.value, 'No')) {
					this.config.showExtras = false;
				}
				if (_.isEqual(this.showSearch.value, 'Yes')) {
					this.config.showSearch = true;
				} else if (_.isEqual(this.showSearch.value, 'No')) {
					this.config.showSearch = false;
				}
				this.config.runBefore = this.runBefore.value;
				this.config.runAfter = this.runAfter.value;
			}
		}
		if (!_.isEqual(this.config, originalConfig)) {
			this.fireEvent(this, 'config-changed', { config: this.config });
		}
	};

	render = async (): Promise<void> => {
		const addDropdownItem = (text: string, disabled = false): HTMLElement => {
			const libraryItem: any = document.createElement('paper-item');
			libraryItem.innerHTML = text.replace(/ /g, '&nbsp;');
			libraryItem.label = text;
			if (disabled) {
				libraryItem.disabled = true;
			}
			return libraryItem;
		};
		const createEntitiesDropdown = (selected: string, changeHandler: Function): HTMLElement | false => {
			if (this.entitiesRegistry) {
				const entitiesDropDown: any = document.createElement('paper-dropdown-menu');
				const entities: any = document.createElement('paper-listbox');

				entities.appendChild(addDropdownItem(''));
				const addedEntityStrings: Array<string> = [];
				_.forEach(this.entitiesRegistry, entityRegistry => {
					if (
						_.isEqual(entityRegistry.platform, 'cast') ||
						_.isEqual(entityRegistry.platform, 'kodi') ||
						_.isEqual(entityRegistry.platform, 'androidtv')
					) {
						const entityName = `${entityRegistry.platform} | ${entityRegistry.entity_id}`;
						entities.appendChild(addDropdownItem(entityName));
						addedEntityStrings.push(entityName);
					}
				});
				_.forEach(this.clients, value => {
					const entityName = `plexPlayer | ${value.name} | ${value.address} | ${value.machineIdentifier}`;
					entities.appendChild(addDropdownItem(entityName));
					addedEntityStrings.push(entityName);
				});

				if (_.isArray(this.config.entity)) {
					_.forEach(this.config.entity, value => {
						if (!_.includes(addedEntityStrings, value)) {
							entities.appendChild(addDropdownItem(value));
							addedEntityStrings.push(value);
						}
					});
				}

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
			_.forOwn(this.hassObj.states, (value, key) => {
				if (_.startsWith(key, 'script.')) {
					this.scriptEntities.push(key);
				}
			});
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
		// eslint-disable-next-line no-restricted-globals
		const pageProtocol = location.protocol;
		if (_.isEqual(pageProtocol, 'http:')) {
			protocolItems.appendChild(addDropdownItem('http'));
		}
		protocolItems.appendChild(addDropdownItem('https'));
		protocolItems.slot = 'dropdown-content';
		this.protocol.label = 'Plex Protocol';
		this.protocol.appendChild(protocolItems);
		this.protocol.style.width = '100%';
		this.protocol.addEventListener('value-changed', this.valueUpdated);
		if (_.isEmpty(this.config.protocol)) {
			if (_.isEqual(pageProtocol, 'http:')) {
				this.protocol.value = 'http';
			} else {
				this.protocol.value = 'https';
			}
		} else {
			this.protocol.value = this.config.protocol;
		}
		this.content.appendChild(this.protocol);

		this.ip.label = 'Plex IP Address / Hostname';
		if (this.config.ip) {
			this.ip.value = this.config.ip.replace(/^https?\:\/\//i, '').replace(/\/$/, '');
		} else {
			this.ip.value = this.config.ip;
		}

		this.ip.addEventListener('change', this.valueUpdated);
		this.content.appendChild(this.ip);

		this.port.label = 'Plex Port (Optional)';
		this.port.value = this.config.port;
		this.port.type = 'number';
		this.port.addEventListener('change', this.valueUpdated);
		this.content.appendChild(this.port);

		this.token.label = 'Plex Token';
		this.token.value = this.config.token;
		this.token.addEventListener('change', this.valueUpdated);
		this.content.appendChild(this.token);

		this.libraryName.innerHTML = '';
		const libraryItems: any = document.createElement('paper-listbox');

		libraryItems.appendChild(addDropdownItem('Smart Libraries', true));
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

		const warningLibrary = document.createElement('div');
		warningLibrary.style.color = 'red';
		this.content.appendChild(this.libraryName);
		this.content.appendChild(warningLibrary);

		this.appendChild(this.content);

		this.plex = new Plex(
			this.config.ip.replace(/^https?\:\/\//i, '').replace(/\/$/, ''),
			this.plexPort,
			this.config.token,
			this.plexProtocol,
			this.config.sort
		);

		this.sections = await this.plex.getSections();
		this.livetv = await this.plex.getLiveTV();
		this.collections = await this.plex.getCollections();
		this.playlists = await this.plex.getPlaylists();
		this.clients = await this.plex.getClients();

		this.plexValidSection.style.display = 'none';
		this.plexValidSection.innerHTML = '';

		let hasUIConfig = true;
		let canConvert = true;
		if (_.isArray(this.config.entity)) {
			// eslint-disable-next-line consistent-return
			_.forEach(this.config.entity, entity => {
				if (_.isObjectLike(entity)) {
					canConvert = !_.includes(_.keys(this.config.entity), 'plexPlayer');
					hasUIConfig = false;
					return false;
				}
			});
		} else if (_.isObjectLike(this.config.entity)) {
			canConvert = !_.includes(_.keys(this.config.entity), 'plexPlayer');
			hasUIConfig = false;
			if (canConvert) {
				const convertedEntities: Array<string> = [];
				hasUIConfig = true;
				if (_.isObjectLike(this.config.entity)) {
					_.forOwn(this.config.entity, value => {
						if (_.isString(value)) {
							convertedEntities.push(value);
						} else if (_.isArray(value)) {
							_.forEach(value, valueStr => {
								convertedEntities.push(valueStr);
							});
						}
					});
				}
				this.config.entity = convertedEntities;
			}
		}

		const devicesTitle = document.createElement('h2');
		devicesTitle.innerHTML = `Devices Configuration`;
		devicesTitle.style.lineHeight = '29px';
		devicesTitle.style.marginBottom = '0px';
		devicesTitle.style.marginTop = '20px';
		if (hasUIConfig) {
			const addDeviceButton = document.createElement('button');
			addDeviceButton.style.float = 'right';
			addDeviceButton.style.fontSize = '20px';
			addDeviceButton.style.cursor = 'pointer';
			addDeviceButton.innerHTML = '+';
			addDeviceButton.addEventListener('click', () => {
				const entitiesDropdown = createEntitiesDropdown('', this.valueUpdated);
				if (entitiesDropdown) {
					this.entitiesSection.appendChild(entitiesDropdown);
				}
			});
			devicesTitle.appendChild(addDeviceButton);
		}

		this.plexValidSection.appendChild(devicesTitle);
		this.entitiesSection.innerHTML = '';
		this.plexValidSection.appendChild(this.entitiesSection);
		if (hasUIConfig) {
			if (_.isString(this.config.entity)) {
				this.config.entity = [this.config.entity];
			}
			if (_.isArray(this.config.entity)) {
				_.forEach(this.config.entity, entity => {
					if (_.isString(entity)) {
						const entitiesDropdown = createEntitiesDropdown(entity, this.valueUpdated);
						if (entitiesDropdown) {
							this.entitiesSection.appendChild(entitiesDropdown);
						}
					}
				});
			}
		} else {
			const entitiesUINotAvailable = document.createElement('div');
			entitiesUINotAvailable.innerHTML =
				'Devices configuration is not available when using plexPlayer client device.<br/>You can edit any other settings through UI and use <b>Show code editor</b> to edit entities.<br/><br/>If you are not using server settings for plexPlayer with <b>identifier</b> and <b>server</b> key, you can migrate your settings to UI by removing plexPlayer section and readd through UI.';
			this.plexValidSection.appendChild(entitiesUINotAvailable);
		}

		const viewTitle = document.createElement('h2');
		viewTitle.innerHTML = `View Configuration`;
		viewTitle.style.lineHeight = '29px';
		viewTitle.style.marginBottom = '0px';
		viewTitle.style.marginTop = '20px';
		this.plexValidSection.appendChild(viewTitle);

		this.cardTitle.label = 'Card title (Optional)';
		this.cardTitle.value = this.config.title;
		this.cardTitle.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.cardTitle);

		this.maxCount.label = 'Maximum number of items to display (Optional)';
		this.maxCount.value = this.config.maxCount;
		this.maxCount.type = 'number';
		this.maxCount.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.maxCount);

		this.maxRows.label = 'Maximum number of rows to display (Optional)';
		this.maxRows.value = this.config.maxRows;
		this.maxRows.type = 'number';
		this.maxRows.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.maxRows);

		this.sort.innerHTML = '';

		const sortItems: any = document.createElement('paper-listbox');
		sortItems.slot = 'dropdown-content';
		this.sort.label = 'Sort';
		this.sort.appendChild(sortItems);
		this.sort.style.width = '100%';
		this.sort.addEventListener('value-changed', this.valueUpdated);
		this.plexValidSection.appendChild(this.sort);

		this.sortOrder.innerHTML = '';
		const sortOrderItems: any = document.createElement('paper-listbox');
		sortOrderItems.appendChild(addDropdownItem('Ascending'));
		sortOrderItems.appendChild(addDropdownItem('Descending'));
		sortOrderItems.slot = 'dropdown-content';
		this.sortOrder.label = 'Sort Order';
		this.sortOrder.appendChild(sortOrderItems);
		this.sortOrder.style.width = '100%';
		this.sortOrder.addEventListener('value-changed', this.valueUpdated);
		if (_.isEmpty(this.config.sort)) {
			this.sortOrder.value = 'Ascending';
		} else {
			const sortOrder = this.config.sort.split(':')[1];
			if (_.isEmpty(sortOrder)) {
				this.sortOrder.value = 'Ascending';
			} else if (_.isEqual(sortOrder, 'asc')) {
				this.sortOrder.value = 'Ascending';
			} else if (_.isEqual(sortOrder, 'desc')) {
				this.sortOrder.value = 'Descending';
			}
		}
		this.plexValidSection.appendChild(this.sortOrder);

		this.playTrailer.innerHTML = '';
		const playTrailerItems: any = document.createElement('paper-listbox');
		playTrailerItems.appendChild(addDropdownItem('Yes'));
		playTrailerItems.appendChild(addDropdownItem('Muted'));
		playTrailerItems.appendChild(addDropdownItem('No'));
		playTrailerItems.slot = 'dropdown-content';
		this.playTrailer.label = 'Play Trailer';
		this.playTrailer.appendChild(playTrailerItems);
		this.playTrailer.style.width = '100%';
		this.playTrailer.addEventListener('value-changed', this.valueUpdated);
		let playTrailerValue = 'Yes';
		if (_.isEqual(this.config.playTrailer, 'muted')) {
			playTrailerValue = 'Muted';
		} else if (!this.config.playTrailer) {
			playTrailerValue = 'No';
		}
		this.playTrailer.value = playTrailerValue;
		this.plexValidSection.appendChild(this.playTrailer);

		this.showExtras.innerHTML = '';
		const showExtrasItems: any = document.createElement('paper-listbox');
		showExtrasItems.appendChild(addDropdownItem('Yes'));
		showExtrasItems.appendChild(addDropdownItem('No'));
		showExtrasItems.slot = 'dropdown-content';
		this.showExtras.label = 'Show Extras';
		this.showExtras.appendChild(showExtrasItems);
		this.showExtras.style.width = '100%';
		this.showExtras.addEventListener('value-changed', this.valueUpdated);
		let showExtrasValue = 'Yes';
		if (!this.config.showExtras) {
			showExtrasValue = 'No';
		}
		this.showExtras.value = showExtrasValue;
		this.plexValidSection.appendChild(this.showExtras);

		this.showSearch.innerHTML = '';
		const showSearchItems: any = document.createElement('paper-listbox');
		showSearchItems.appendChild(addDropdownItem('Yes'));
		showSearchItems.appendChild(addDropdownItem('No'));
		showSearchItems.slot = 'dropdown-content';
		this.showSearch.label = 'Show Search';
		this.showSearch.appendChild(showSearchItems);
		this.showSearch.style.width = '100%';
		this.showSearch.addEventListener('value-changed', this.valueUpdated);
		let showSearchValue = 'Yes';
		if (!this.config.showSearch) {
			showSearchValue = 'No';
		}
		this.showSearch.value = showSearchValue;
		this.plexValidSection.appendChild(this.showSearch);

		this.runBefore.innerHTML = '';
		const runBeforeItems: any = document.createElement('paper-listbox');
		runBeforeItems.appendChild(addDropdownItem(''));
		_.forEach(this.scriptEntities, entity => {
			runBeforeItems.appendChild(addDropdownItem(entity));
		});
		runBeforeItems.slot = 'dropdown-content';
		this.runBefore.label = 'Script to execute before starting the media (Optional)';
		this.runBefore.appendChild(runBeforeItems);
		this.runBefore.style.width = '100%';
		this.runBefore.addEventListener('value-changed', this.valueUpdated);
		this.runBefore.value = this.config.runBefore;
		this.plexValidSection.appendChild(this.runBefore);

		this.runAfter.innerHTML = '';
		const runAfterItems: any = document.createElement('paper-listbox');
		runAfterItems.appendChild(addDropdownItem(''));
		_.forEach(this.scriptEntities, entity => {
			runAfterItems.appendChild(addDropdownItem(entity));
		});
		runAfterItems.slot = 'dropdown-content';
		this.runAfter.label = 'Script to execute after starting the media (Optional)';
		this.runAfter.appendChild(runAfterItems);
		this.runAfter.style.width = '100%';
		this.runAfter.addEventListener('value-changed', this.valueUpdated);
		this.runAfter.value = this.config.runAfter;
		this.plexValidSection.appendChild(this.runAfter);

		const styleTitle = document.createElement('h2');
		styleTitle.innerHTML = `Style Configuration`;
		styleTitle.style.lineHeight = '29px';
		styleTitle.style.marginBottom = '0px';
		styleTitle.style.marginTop = '20px';
		this.plexValidSection.appendChild(styleTitle);

		this.minWidth.label = 'Minimum width of the card';
		this.minWidth.value = this.config.minWidth;
		this.minWidth.type = 'number';
		this.minWidth.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.minWidth);

		this.minExpandedWidth.label = 'Expanded width of the card';
		this.minExpandedWidth.value = this.config.minExpandedWidth;
		this.minExpandedWidth.type = 'number';
		this.minExpandedWidth.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.minExpandedWidth);

		this.minExpandedHeight.label = 'Expanded height of the card';
		this.minExpandedHeight.value = this.config.minExpandedHeight;
		this.minExpandedHeight.type = 'number';
		this.minExpandedHeight.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.minExpandedHeight);

		this.minEpisodeWidth.label = 'Minimum width of the episode card';
		this.minEpisodeWidth.value = this.config.minEpisodeWidth;
		this.minEpisodeWidth.type = 'number';
		this.minEpisodeWidth.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.minEpisodeWidth);

		this.fontSize1.label = 'Font size used in titles under cards';
		this.fontSize1.value = this.config.fontSize1;
		this.fontSize1.type = 'number';
		this.fontSize1.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.fontSize1);

		this.fontSize2.label = 'Font size used in sub-titles under cards';
		this.fontSize2.value = this.config.fontSize2;
		this.fontSize2.type = 'number';
		this.fontSize2.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.fontSize2);

		this.fontSize3.label = 'Font size used in title of the opened content';
		this.fontSize3.value = this.config.fontSize3;
		this.fontSize3.type = 'number';
		this.fontSize3.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.fontSize3);

		this.fontSize4.label = 'Font size used in sub-titles, to-view count and description of the opened content';
		this.fontSize4.value = this.config.fontSize4;
		this.fontSize4.type = 'number';
		this.fontSize4.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.fontSize4);

		if (!_.isEmpty(this.livetv)) {
			libraryItems.appendChild(addDropdownItem('Live TV', true));
			_.forEach(_.keys(this.livetv), (livetv: string) => {
				if (_.isEqual(this.config.libraryName, livetv)) {
					warningLibrary.innerHTML = `Warning: ${this.config.libraryName} play action currently only supported with Kodi.<br/>You might also need custom build of kodi-media-sensors, see <a href="https://github.com/JurajNyiri/PlexMeetsHomeAssistant/blob/main/DETAILED_CONFIGURATION.md#kodi" target="_blank">detailed configuration</a> for more information.`;
				}
				libraryItems.appendChild(addDropdownItem(livetv));
			});
		}
		if (!_.isEmpty(this.sections)) {
			libraryItems.appendChild(addDropdownItem('Libraries', true));
			_.forEach(this.sections, (section: Record<string, any>) => {
				libraryItems.appendChild(addDropdownItem(section.title));
			});
			if (!_.isEmpty(this.collections)) {
				libraryItems.appendChild(addDropdownItem('Collections', true));
				_.forEach(this.collections, (collection: Record<string, any>) => {
					libraryItems.appendChild(addDropdownItem(collection.title));
				});
			}
			if (!_.isEmpty(this.playlists)) {
				libraryItems.appendChild(addDropdownItem('Playlists', true));
				_.forEach(this.playlists, (playlist: Record<string, any>) => {
					libraryItems.appendChild(addDropdownItem(playlist.title));
				});
			}

			this.libraryName.disabled = false;
			this.libraryName.value = this.config.libraryName;

			let libraryType = '';
			// eslint-disable-next-line consistent-return
			_.forEach(this.sections, section => {
				if (_.isEqual(section.title, this.libraryName.value)) {
					libraryType = section.type;
					return false;
				}
			});
			if (_.isEqual(libraryType, 'show')) {
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
				this.sort.style.display = 'block';
				this.sortOrder.style.display = 'block';
			} else if (_.isEqual(libraryType, 'movie')) {
				sortItems.appendChild(addDropdownItem('titleSort'));
				sortItems.appendChild(addDropdownItem('title'));
				sortItems.appendChild(addDropdownItem('originallyAvailableAt'));
				sortItems.appendChild(addDropdownItem('rating'));
				sortItems.appendChild(addDropdownItem('audienceRating'));
				sortItems.appendChild(addDropdownItem('userRating'));
				sortItems.appendChild(addDropdownItem('duration'));
				sortItems.appendChild(addDropdownItem('viewOffset'));
				sortItems.appendChild(addDropdownItem('viewCount'));
				sortItems.appendChild(addDropdownItem('addedAt'));
				sortItems.appendChild(addDropdownItem('lastViewedAt'));
				sortItems.appendChild(addDropdownItem('mediaHeight'));
				sortItems.appendChild(addDropdownItem('mediaBitrate'));
				this.sort.style.display = 'block';
				this.sortOrder.style.display = 'block';
			} else {
				this.sort.style.display = 'none';
				this.sortOrder.style.display = 'none';
				this.config.sort = '';
			}

			if (_.isEmpty(this.config.sort)) {
				this.sort.value = '';
				this.sortOrder.value = '';
			} else {
				// eslint-disable-next-line prefer-destructuring
				this.sort.value = this.config.sort.split(':')[0];
				const sortOrder = this.config.sort.split(':')[1];
				if (_.isEmpty(sortOrder)) {
					this.sortOrder.value = 'Ascending';
				} else if (_.isEqual(sortOrder, 'asc')) {
					this.sortOrder.value = 'Ascending';
				} else if (_.isEqual(sortOrder, 'desc')) {
					this.sortOrder.value = 'Descending';
				}
			}

			this.plexValidSection.style.display = 'block';
		}
		this.loaded = true;
		this.content.appendChild(this.plexValidSection);
	};

	setConfig = (config: Record<string, any>): void => {
		this.config = JSON.parse(JSON.stringify(config));

		if (config.port && !_.isEqual(config.port, '')) {
			this.plexPort = config.port;
		} else {
			this.plexPort = false;
		}

		// eslint-disable-next-line no-restricted-globals
		const pageProtocol = location.protocol;
		if (config.protocol) {
			this.plexProtocol = config.protocol;
		} else if (_.isEqual(pageProtocol, 'http:')) {
			this.config.protocol = 'http';
		} else {
			this.config.protocol = 'https';
		}

		if (!config.sort) {
			this.config.sort = 'titleSort:asc';
		}

		if (!_.isNil(config.playTrailer)) {
			this.config.playTrailer = config.playTrailer;
		} else {
			this.config.playTrailer = true;
		}

		if (!_.isNil(config.showExtras)) {
			this.config.showExtras = config.showExtras;
		} else {
			this.config.showExtras = true;
		}

		if (!_.isNil(config.showSearch)) {
			this.config.showSearch = config.showSearch;
		} else {
			this.config.showSearch = true;
		}

		if (!_.isNil(config.runBefore)) {
			this.config.runBefore = config.runBefore;
		}

		if (!_.isNil(config.runAfter)) {
			this.config.runAfter = config.runAfter;
		}

		if (!_.isNil(config.title)) {
			this.config.title = config.title;
		}

		if (_.isNumber(this.config.maxCount)) {
			this.config.maxCount = `${this.config.maxCount}`;
		}

		if (_.isNumber(this.config.maxRows)) {
			this.config.maxRows = `${this.config.maxRows}`;
		}

		if (_.isNumber(this.config.minWidth)) {
			this.config.minWidth = `${this.config.minWidth}`;
		}

		if (_.isNumber(this.config.minEpisodeWidth)) {
			this.config.minEpisodeWidth = `${this.config.minEpisodeWidth}`;
		}

		if (_.isNumber(this.config.minExpandedWidth)) {
			this.config.minExpandedWidth = `${this.config.minExpandedWidth}`;
		}

		if (_.isNumber(this.config.fontSize1)) {
			this.config.fontSize1 = `${this.config.fontSize1}`;
		}

		if (_.isNumber(this.config.fontSize2)) {
			this.config.fontSize2 = `${this.config.fontSize2}`;
		}

		if (_.isNumber(this.config.fontSize3)) {
			this.config.fontSize3 = `${this.config.fontSize3}`;
		}

		if (_.isNumber(this.config.fontSize4)) {
			this.config.fontSize4 = `${this.config.fontSize4}`;
		}

		if (_.isNumber(this.config.minExpandedHeight)) {
			this.config.minExpandedHeight = `${this.config.minExpandedHeight}`;
		}

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
