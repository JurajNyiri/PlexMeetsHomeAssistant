/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env browser */
import _ from 'lodash';
import { HomeAssistant } from 'custom-card-helpers';
import Plex from './modules/Plex';
import { fetchEntityRegistry, createTextElement, setTextElementValue } from './modules/utils';

class PlexMeetsHomeAssistantEditor extends HTMLElement {
	content: any;

	plexPort: number | false = false;

	plexProtocol: 'http' | 'https' = 'http';

	plex: Plex | undefined;

	config: Record<string, any> = {};

	ip: any = createTextElement();

	token: any = createTextElement();

	port: any = createTextElement();

	maxCount: any = createTextElement();

	maxRows: any = createTextElement();

	displayTitleMain: any = document.createElement('select');

	displaySubtitleMain: any = document.createElement('select');

	useHorizontalScroll: any = document.createElement('select');

	useShuffle: any = document.createElement('select');

	minWidth: any = createTextElement();

	minEpisodeWidth: any = createTextElement();

	minExpandedWidth: any = createTextElement();

	minExpandedHeight: any = createTextElement();

	fontSize1: any = createTextElement();

	fontSize2: any = createTextElement();

	fontSize3: any = createTextElement();

	fontSize4: any = createTextElement();

	cardTitle: any = createTextElement();

	libraryName: any = document.createElement('select');

	protocol: any = document.createElement('select');

	tabs: any = document.createElement('paper-tabs');

	sort: any = document.createElement('select');

	displayTypeData: Record<string, any> = {};

	displayType: any = document.createElement('select');

	sortOrder: any = document.createElement('select');

	playTrailer: any = document.createElement('select');

	showExtras: any = document.createElement('select');

	showSearch: any = document.createElement('select');

	runBefore: any = document.createElement('select');

	runAfter: any = document.createElement('select');

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

	generateTitle = (titleText: string): any => {
		const title = document.createElement('h4');
		title.innerText = titleText;
		title.style.marginBottom = '0';
		title.style.marginTop = '0';
		title.style.paddingTop = '0';
		title.style.paddingBottom = '0';
		title.style.color = 'rgb(225, 225, 225)';
		title.style.fontWeight = '300';
		title.style.fontSize = '12px';
		return title;
	};

	valueUpdated = (): void => {
		const originalConfig = _.clone(this.config);
		this.config.protocol = this.protocol.value;
		this.config.ip = this.ip.value.replace(/^https?:\/\//i, '').replace(/\/$/, '');
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

				this.config.displayType = this.displayTypeData[this.displayType.value];

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

				if (_.isEmpty(this.useHorizontalScroll.value)) {
					this.config.useHorizontalScroll = 'No';
				} else {
					this.config.useHorizontalScroll = this.useHorizontalScroll.value;
				}

				if (_.isEmpty(this.useShuffle.value)) {
					this.config.useShuffle = 'No';
				} else {
					this.config.useShuffle = this.useShuffle.value;
				}

				if (_.isEmpty(this.displayTitleMain.value)) {
					this.config.displayTitleMain = 'Yes';
				} else {
					this.config.displayTitleMain = this.displayTitleMain.value;
				}

				if (_.isEmpty(this.displaySubtitleMain.value)) {
					this.config.displaySubtitleMain = 'Yes';
				} else {
					this.config.displaySubtitleMain = this.displaySubtitleMain.value;
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
		const addDropdownItem = (value: string, text = '', disabled = false): HTMLElement => {
			if (_.isEmpty(text)) {
				// eslint-disable-next-line no-param-reassign
				text = value;
			}
			const libraryItem: any = document.createElement('option');
			libraryItem.innerHTML = text.replace(/ /g, '&nbsp;');
			libraryItem.label = value;
			libraryItem.value = value;
			if (disabled) {
				libraryItem.disabled = true;
			}
			return libraryItem;
		};
		const createEntitiesDropdown = (selected: string, changeHandler: Function): HTMLElement | false => {
			if (this.entitiesRegistry) {
				const container: any = document.createElement('div');
				const entitiesDropDown: any = document.createElement('select');

				entitiesDropDown.appendChild(addDropdownItem(''));
				const addedEntityStrings: Array<string> = [];
				_.forEach(this.entitiesRegistry, entityRegistry => {
					if (
						_.isEqual(entityRegistry.platform, 'cast') ||
						_.isEqual(entityRegistry.platform, 'kodi') ||
						_.isEqual(entityRegistry.platform, 'androidtv') ||
						_.isEqual(entityRegistry.platform, 'input_select') ||
						_.isEqual(entityRegistry.platform, 'input_text') ||
						_.isEqual(entityRegistry.platform, 'vlc_telnet') ||
						_.isEqual(entityRegistry.platform, 'sonos')
					) {
						const entityName = `${entityRegistry.platform} | ${entityRegistry.entity_id}`;
						entitiesDropDown.appendChild(addDropdownItem(entityName));
						addedEntityStrings.push(entityName);
					}
				});
				_.forEach(this.clients, value => {
					const entityName = `plexPlayer | ${value.name} | ${value.address} | ${value.machineIdentifier}`;
					entitiesDropDown.appendChild(addDropdownItem(entityName));
					addedEntityStrings.push(entityName);
				});

				if (_.isArray(this.config.entity)) {
					_.forEach(this.config.entity, value => {
						if (!_.includes(addedEntityStrings, value)) {
							entitiesDropDown.appendChild(addDropdownItem(value));
							addedEntityStrings.push(value);
						}
					});
				}

				entitiesDropDown.label = 'Entity';
				entitiesDropDown.value = selected;
				entitiesDropDown.style.width = '100%';
				entitiesDropDown.style.height = '40px';
				entitiesDropDown.className = 'entitiesDropDown';
				entitiesDropDown.addEventListener('change', changeHandler);
				this.entities.push(entitiesDropDown);
				container.appendChild(this.generateTitle('Entity'));
				container.appendChild(entitiesDropDown);

				return container;
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

		this.content.appendChild(this.generateTitle('Plex Protocol'));
		this.protocol.innerHTML = '';
		// eslint-disable-next-line no-restricted-globals
		const pageProtocol = location.protocol;
		if (_.isEqual(pageProtocol, 'http:')) {
			this.protocol.appendChild(addDropdownItem('http'));
		}
		this.protocol.appendChild(addDropdownItem('https'));
		this.protocol.style.width = '100%';
		this.protocol.style.height = '40px';
		this.protocol.addEventListener('change', this.valueUpdated);
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

		this.ip.style.width = '100%';
		this.ip.style.marginTop = '10px';
		this.ip.style.marginBottom = '10px';
		this.ip.label = 'Plex IP Address / Hostname';
		if (this.config.ip) {
			setTextElementValue(this.ip, this.config.ip.replace(/^https?:\/\//i, '').replace(/\/$/, ''));
		} else {
			setTextElementValue(this.ip, this.config.ip);
		}

		this.ip.addEventListener('change', this.valueUpdated);
		this.content.appendChild(this.ip);

		this.port.label = 'Plex Port (Optional)';
		setTextElementValue(this.port, this.config.port);
		this.port.type = 'number';
		this.port.addEventListener('change', this.valueUpdated);
		this.content.appendChild(this.port);

		this.token.label = 'Plex Token';
		setTextElementValue(this.token, this.token.value);
		this.token.addEventListener('change', this.valueUpdated);
		this.content.appendChild(this.token);

		this.content.appendChild(this.generateTitle('Plex Library'));
		this.libraryName.innerHTML = '';
		this.libraryName.appendChild(addDropdownItem('Smart Libraries', '', true));
		this.libraryName.appendChild(addDropdownItem('Continue Watching'));
		this.libraryName.appendChild(addDropdownItem('Deck'));
		this.libraryName.appendChild(addDropdownItem('Recently Added'));
		this.libraryName.appendChild(addDropdownItem('Watch Next'));
		this.libraryName.disabled = true;
		this.libraryName.style.width = '100%';
		this.libraryName.style.height = '40px';
		this.libraryName.addEventListener('change', this.valueUpdated);

		const warningLibrary = document.createElement('div');
		warningLibrary.style.color = 'red';
		this.content.appendChild(this.libraryName);

		this.content.appendChild(warningLibrary);

		this.appendChild(this.content);

		this.plex = new Plex(
			this.config.ip.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
			this.plexPort,
			this.config.token,
			this.plexProtocol,
			this.config.sort
		);

		this.sections = await this.plex.getSections();
		_.forEach(this.sections, section => {
			if (_.isEqual(section.title, this.config.libraryName) && _.isEqual(section.type, 'artist')) {
				this.content.appendChild(this.generateTitle('Use shuffle when playing'));
				this.useShuffle.innerHTML = '';
				this.useShuffle.appendChild(addDropdownItem('Yes'));
				this.useShuffle.appendChild(addDropdownItem('No'));
				this.useShuffle.slot = 'dropdown-content';
				this.useShuffle.label = 'Use shuffle when playing';
				this.useShuffle.style.width = '100%';
				this.useShuffle.style.height = '40px';
				this.useShuffle.addEventListener('change', this.valueUpdated);
				if (_.isEmpty(this.config.useShuffle)) {
					this.useShuffle.value = 'No';
				} else {
					this.useShuffle.value = this.config.useShuffle;
				}
				this.content.appendChild(this.useShuffle);
				return false;
			}
			return true;
		});
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

		this.displayType.innerHTML = '';
		this.displayType.style.width = '100%';
		this.displayType.style.height = '40px';
		this.displayType.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.generateTitle('Display Type (Optional)'));
		this.plexValidSection.appendChild(this.displayType);

		this.cardTitle.label = 'Card title (Optional)';
		setTextElementValue(this.cardTitle, this.config.title);
		this.cardTitle.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.cardTitle);

		this.maxCount.label = 'Maximum number of items to display (Optional)';
		setTextElementValue(this.maxCount, this.config.maxCount);
		this.maxCount.type = 'number';
		this.maxCount.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.maxCount);

		this.useHorizontalScroll.innerHTML = '';
		this.plexValidSection.appendChild(this.generateTitle('Use horizontal scroll'));
		this.useHorizontalScroll.appendChild(addDropdownItem('Yes'));
		this.useHorizontalScroll.appendChild(addDropdownItem('No'));
		this.useHorizontalScroll.style.width = '100%';
		this.useHorizontalScroll.style.height = '40px';
		this.useHorizontalScroll.addEventListener('change', this.valueUpdated);
		if (_.isEmpty(this.config.useHorizontalScroll)) {
			this.useHorizontalScroll.value = 'No';
		} else {
			this.useHorizontalScroll.value = this.config.useHorizontalScroll;
		}
		this.plexValidSection.appendChild(this.useHorizontalScroll);

		this.maxRows.label = 'Maximum number of rows to display (Optional)';
		setTextElementValue(this.maxRows, this.config.maxRows);
		this.maxRows.type = 'number';
		this.maxRows.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.maxRows);

		this.sort.innerHTML = '';

		this.sort.style.width = '100%';
		this.sort.style.height = '40px';
		this.sort.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.generateTitle('Sort'));
		this.plexValidSection.appendChild(this.sort);

		this.sortOrder.innerHTML = '';
		this.sortOrder.appendChild(addDropdownItem('Ascending'));
		this.sortOrder.appendChild(addDropdownItem('Descending'));
		this.plexValidSection.appendChild(this.generateTitle('Sort Order'));
		this.sortOrder.style.width = '100%';
		this.sortOrder.style.height = '40px';
		this.sortOrder.addEventListener('change', this.valueUpdated);
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

		this.plexValidSection.appendChild(this.generateTitle('Play Trailer'));
		this.playTrailer.innerHTML = '';
		this.playTrailer.appendChild(addDropdownItem('Yes'));
		this.playTrailer.appendChild(addDropdownItem('Muted'));
		this.playTrailer.appendChild(addDropdownItem('No'));
		this.playTrailer.style.width = '100%';
		this.playTrailer.style.height = '40px';
		this.playTrailer.addEventListener('change', this.valueUpdated);
		let playTrailerValue = 'Yes';
		if (_.isEqual(this.config.playTrailer, 'muted')) {
			playTrailerValue = 'Muted';
		} else if (!this.config.playTrailer) {
			playTrailerValue = 'No';
		}
		this.playTrailer.value = playTrailerValue;
		this.plexValidSection.appendChild(this.playTrailer);

		this.showExtras.innerHTML = '';
		this.showExtras.appendChild(addDropdownItem('Yes'));
		this.showExtras.appendChild(addDropdownItem('No'));
		this.plexValidSection.appendChild(this.generateTitle('Show Extras'));
		this.showExtras.style.width = '100%';
		this.showExtras.style.height = '40px';
		this.showExtras.addEventListener('change', this.valueUpdated);
		let showExtrasValue = 'Yes';
		if (!this.config.showExtras) {
			showExtrasValue = 'No';
		}
		this.showExtras.value = showExtrasValue;
		this.plexValidSection.appendChild(this.showExtras);

		this.showSearch.innerHTML = '';
		this.showSearch.appendChild(addDropdownItem('Yes'));
		this.showSearch.appendChild(addDropdownItem('No'));
		this.plexValidSection.appendChild(this.generateTitle('Show Search'));
		this.showSearch.style.width = '100%';
		this.showSearch.style.height = '40px';
		this.showSearch.addEventListener('change', this.valueUpdated);
		let showSearchValue = 'Yes';
		if (!this.config.showSearch) {
			showSearchValue = 'No';
		}
		this.showSearch.value = showSearchValue;
		this.plexValidSection.appendChild(this.showSearch);

		this.runBefore.innerHTML = '';
		this.runBefore.appendChild(addDropdownItem(''));
		_.forEach(this.scriptEntities, entity => {
			this.runBefore.appendChild(addDropdownItem(entity));
		});
		this.plexValidSection.appendChild(this.generateTitle('Script to execute before starting the media (Optional)'));
		this.runBefore.style.width = '100%';
		this.runBefore.style.height = '40px';
		this.runBefore.addEventListener('change', this.valueUpdated);
		setTextElementValue(this.runBefore, this.config.runBefore);
		this.plexValidSection.appendChild(this.runBefore);

		this.runAfter.innerHTML = '';
		this.runAfter.appendChild(addDropdownItem(''));
		_.forEach(this.scriptEntities, entity => {
			this.runAfter.appendChild(addDropdownItem(entity));
		});
		this.plexValidSection.appendChild(this.generateTitle('Script to execute after starting the media (Optional)'));
		this.runAfter.style.width = '100%';
		this.runAfter.style.height = '40px';
		this.runAfter.addEventListener('change', this.valueUpdated);
		setTextElementValue(this.runAfter, this.config.runAfter);
		this.plexValidSection.appendChild(this.runAfter);

		const styleTitle = document.createElement('h2');
		styleTitle.innerHTML = `Style Configuration`;
		styleTitle.style.lineHeight = '29px';
		styleTitle.style.marginBottom = '0px';
		styleTitle.style.marginTop = '20px';
		this.plexValidSection.appendChild(styleTitle);

		this.minWidth.label = 'Minimum width of the card (Optional)';
		setTextElementValue(this.minWidth, this.config.minWidth);
		this.minWidth.type = 'number';
		this.minWidth.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.minWidth);

		this.minExpandedWidth.label = 'Expanded width of the card (Optional)';
		setTextElementValue(this.minExpandedWidth, this.config.minExpandedWidth);
		this.minExpandedWidth.type = 'number';
		this.minExpandedWidth.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.minExpandedWidth);

		this.minExpandedHeight.label = 'Expanded height of the card (Optional)';
		setTextElementValue(this.minExpandedHeight, this.config.minExpandedHeight);
		this.minExpandedHeight.type = 'number';
		this.minExpandedHeight.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.minExpandedHeight);

		this.minEpisodeWidth.label = 'Minimum width of the episode card (Optional)';
		setTextElementValue(this.minEpisodeWidth, this.config.minEpisodeWidth);
		this.minEpisodeWidth.type = 'number';
		this.minEpisodeWidth.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.minEpisodeWidth);

		this.displayTitleMain.innerHTML = '';
		this.displayTitleMain.appendChild(addDropdownItem('Yes'));
		this.displayTitleMain.appendChild(addDropdownItem('No'));
		this.plexValidSection.appendChild(this.generateTitle('Display title under poster'));
		this.displayTitleMain.style.width = '100%';
		this.displayTitleMain.style.height = '40px';
		this.displayTitleMain.addEventListener('change', this.valueUpdated);
		if (_.isEmpty(this.config.displayTitleMain)) {
			this.displayTitleMain.value = 'Yes';
		} else {
			setTextElementValue(this.displayTitleMain, this.config.displayTitleMain);
		}
		this.plexValidSection.appendChild(this.displayTitleMain);

		this.fontSize1.label = 'Font size used in titles under cards (Optional)';
		setTextElementValue(this.fontSize1, this.config.fontSize1);
		this.fontSize1.type = 'number';
		this.fontSize1.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.fontSize1);

		this.displaySubtitleMain.innerHTML = '';
		this.displaySubtitleMain.appendChild(addDropdownItem('Yes'));
		this.displaySubtitleMain.appendChild(addDropdownItem('No'));
		this.plexValidSection.appendChild(this.generateTitle('Display sub-title under poster'));
		this.displaySubtitleMain.style.width = '100%';
		this.displaySubtitleMain.style.height = '40px';
		this.displaySubtitleMain.addEventListener('change', this.valueUpdated);
		if (_.isEmpty(this.config.displaySubtitleMain)) {
			this.displaySubtitleMain.value = 'Yes';
		} else {
			setTextElementValue(this.displaySubtitleMain, this.config.displaySubtitleMain);
		}
		this.plexValidSection.appendChild(this.displaySubtitleMain);

		this.fontSize2.label = 'Font size used in sub-titles under cards (Optional)';
		setTextElementValue(this.fontSize2, this.config.fontSize2);
		this.fontSize2.type = 'number';
		this.fontSize2.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.fontSize2);

		this.fontSize3.label = 'Font size used in title of the opened content (Optional)';
		setTextElementValue(this.fontSize3, this.config.fontSize3);
		this.fontSize3.type = 'number';
		this.fontSize3.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.fontSize3);

		this.fontSize4.label =
			'Font size used in sub-titles, to-view count and description of the opened content (Optional)';
		setTextElementValue(this.fontSize4, this.config.fontSize4);
		this.fontSize4.type = 'number';
		this.fontSize4.addEventListener('change', this.valueUpdated);
		this.plexValidSection.appendChild(this.fontSize4);

		if (!_.isEmpty(this.livetv)) {
			this.libraryName.appendChild(addDropdownItem('Live TV', '', true));
			_.forEach(_.keys(this.livetv), (livetv: string) => {
				if (_.isEqual(this.config.libraryName, livetv)) {
					warningLibrary.innerHTML = `Warning: ${this.config.libraryName} play action currently only supported with Kodi.<br/>You might also need custom build of kodi-media-sensors, see <a href="https://github.com/JurajNyiri/PlexMeetsHomeAssistant/blob/main/DETAILED_CONFIGURATION.md#kodi" target="_blank">detailed configuration</a> for more information.`;
				}
				this.libraryName.appendChild(addDropdownItem(livetv));
			});
		}
		if (!_.isEmpty(this.sections)) {
			this.libraryName.appendChild(addDropdownItem('Libraries', '', true));
			_.forEach(this.sections, (section: Record<string, any>) => {
				this.libraryName.appendChild(addDropdownItem(section.title));
			});
			if (!_.isEmpty(this.collections)) {
				this.libraryName.appendChild(addDropdownItem('Collections', '', true));
				_.forEach(this.collections, (collection: Record<string, any>) => {
					this.libraryName.appendChild(addDropdownItem(collection.title));
				});
			}
			if (!_.isEmpty(this.playlists)) {
				this.libraryName.appendChild(addDropdownItem('Playlists', '', true));
				_.forEach(this.playlists, (playlist: Record<string, any>) => {
					this.libraryName.appendChild(addDropdownItem(playlist.title));
				});
			}

			this.libraryName.disabled = false;
			this.libraryName.value = this.config.libraryName;

			let libraryKey = '';
			// eslint-disable-next-line consistent-return
			_.forEach(this.sections, section => {
				if (_.isEqual(section.title, this.libraryName.value)) {
					libraryKey = section.key;
					return false;
				}
			});
			if (!_.isEmpty(libraryKey)) {
				const libraryData = await this.plex.getSectionData(libraryKey);
				const types = _.get(libraryData, '[0].Meta.Type');
				if (!_.isNil(types) && types.length > 1) {
					let addedTypes = 0;
					this.displayType.appendChild(addDropdownItem('', ''));
					let typeAvailable = false;
					_.forEach(types, (sectionType: Record<string, any>) => {
						if (
							sectionType.type !== 'track' &&
							sectionType.type !== 'episode' &&
							(sectionType.type !== 'folder' ||
								(sectionType.type === 'folder' && _.isEqual(_.get(libraryData, '[0].viewGroup'), 'artist')))
						) {
							let key = sectionType.key.split('type=')[1];
							if (sectionType.type === 'folder') {
								key = 'folder';
							}
							if (_.isEqual(key, this.config.displayType)) {
								typeAvailable = true;
							}
							this.displayTypeData[sectionType.title] = key;
							this.displayType.appendChild(addDropdownItem(sectionType.title));
							addedTypes += 1;
						}
					});
					if (addedTypes > 1) {
						this.displayType.style.display = 'block';

						if (_.isEmpty(this.config.displayType) || !typeAvailable) {
							this.displayType.value = '';
						} else {
							_.forEach(this.displayTypeData, (value, key) => {
								if (_.isEqual(value, this.config.displayType)) {
									this.displayType.value = key;
								}
							});
						}
					} else {
						this.displayType.style.display = 'none';
						this.config.displayType = '';
						this.displayType.value = '';
					}
				} else {
					this.displayType.style.display = 'none';
					this.config.displayType = '';
					this.displayType.value = '';
				}

				let displayTypeIndex = 0;
				if (this.config.displayType) {
					_.forEach(types, (sectionType: Record<string, any>, sectionKey) => {
						const key = sectionType.key.split('type=')[1];
						if (key === parseInt(this.config.displayType, 10)) {
							displayTypeIndex = parseInt(sectionKey, 10);
						}
					});
				}
				const sortFields = _.get(libraryData, `[0].Meta.Type[${displayTypeIndex}].Sort`);
				if (!_.isNil(sortFields) && sortFields.length > 0 && this.config.displayType !== 'folder') {
					_.forEach(sortFields, (sortField: Record<string, any>) => {
						this.sort.appendChild(addDropdownItem(sortField.key));
					});
					this.sort.style.display = 'block';
					this.sortOrder.style.display = 'block';
				} else {
					this.sort.style.display = 'none';
					this.sortOrder.style.display = 'none';
					this.config.sort = '';
				}
			} else {
				this.displayType.style.display = 'none';
				this.config.displayType = '';
				this.displayType.value = '';
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

		if (!config.displayType) {
			this.config.displayType = '';
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

		if (!_.isNil(this.config.useHorizontalScroll)) {
			this.config.useHorizontalScroll = `${this.config.useHorizontalScroll}`;
		}

		if (!_.isNil(this.config.useShuffle)) {
			this.config.useShuffle = `${this.config.useShuffle}`;
		}

		if (!_.isNil(this.config.displayTitleMain)) {
			this.config.displayTitleMain = `${this.config.displayTitleMain}`;
		}

		if (!_.isNil(this.config.displaySubtitleMain)) {
			this.config.displaySubtitleMain = `${this.config.displaySubtitleMain}`;
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
