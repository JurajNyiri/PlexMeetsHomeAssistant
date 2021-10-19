/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env browser */
import { HomeAssistant } from 'custom-card-helpers';
import _ from 'lodash';
import { supported, CSS_STYLE } from './const';
import Plex from './modules/Plex';
import PlayController from './modules/PlayController';
import PlexMeetsHomeAssistantEditor from './editor';
import {
	escapeHtml,
	getOffset,
	isScrolledIntoView,
	getHeight,
	createEpisodesView,
	findTrailerURL,
	isVideoFullScreen,
	hasEpisodes,
	getOldPlexServerErrorMessage,
	getDetailsBottom,
	clickHandler,
	fetchEntityRegistry,
	getWidth,
	createTrackView
} from './modules/utils';
import style from './modules/style';

declare global {
	interface Window {
		customCards: any;
	}
}

class PlexMeetsHomeAssistant extends HTMLElement {
	renderPageRetries = 0;

	searchInputElem = document.createElement('input');

	plexProtocol: 'http' | 'https' = 'http';

	displayType: string | false = false;

	useHorizontalScroll = false;

	displayTitleMain = true;

	displaySubtitleMain = true;

	plexPort: number | false = false;

	epgData: Record<string, any> = {};

	detailsShown = false;

	entityRegistry: Array<Record<string, any>> = [];

	runBefore = '';

	playTrailer: string | boolean = true;

	showExtras = true;

	isVisible = true;

	showSearch = true;

	previousPageWidth = 0;

	runAfter = '';

	renderNewElementsIfNeededTimeout: any;

	columnsCount = 0;

	renderedRows = 0;

	renderedItems = 0;

	plex: Plex | undefined;

	maxRenderCount: number | boolean = false;

	minWidth: number = CSS_STYLE.minimumWidth;

	minEpisodeWidth: number = CSS_STYLE.minimumEpisodeWidth;

	minExpandedWidth: number = CSS_STYLE.expandedWidth;

	minExpandedHeight: number = CSS_STYLE.expandedHeight;

	fontSize1 = 14;

	fontSize2 = 14;

	fontSize3 = 28;

	fontSize4 = 16;

	seasonContainerClickEnabled = true;

	showDetailsTimeout: any;

	showSeasonElemTimeout: any;

	seasonTitleColorTimeout: any;

	moveElemTimeout: any;

	hideSeasonsTimeout: any;

	hideEpisodesTimeout: any;

	scrollDownInactiveSeasonsTimeout: any;

	episodesLoadTimeout: any;

	episodesElemFreshlyLoadedTimeout: any;

	seasonElemFreshlyLoadedTimeout: any;

	looseSearch = false;

	playController: PlayController | undefined;

	movieElems: any = [];

	searchValue = '';

	activeMovieElem: HTMLElement | undefined;

	activeMovieElemData: Record<string, any> = {};

	seasonElemFreshlyLoaded = false;

	episodesElemFreshlyLoaded = false;

	detailElem: HTMLElement | undefined;

	seasonsElem: HTMLElement | undefined;

	seasonsElemHidden = true;

	videoElem: HTMLElement | undefined;

	episodesElem: HTMLElement | undefined;

	episodesElemHidden = true;

	data: Record<string, any> = {};

	config: Record<string, any> = {};

	loading = false;

	maxCount: false | number = false;

	maxRows: false | number = false;

	error = '';

	content: any;

	contentContainer: any;

	hassObj: HomeAssistant | undefined;

	contentBGHeight = 0;

	card: HTMLElement | undefined;

	initialDataLoaded = false;

	set hass(hass: HomeAssistant) {
		this.hassObj = hass;

		if (!this.initialDataLoaded) {
			this.loadInitialData();
		}
	}

	static getConfigElement(): HTMLElement {
		return document.createElement('plex-meets-homeassistant-editor');
	}

	renderNewElementsIfNeeded = (): void => {
		const loadAdditionalRowsCount = 2; // todo: make this configurable
		const height = getHeight(this.content);
		if (
			!this.detailsShown &&
			window.innerHeight + window.scrollY > height + getOffset(this.content).top - 300 &&
			this.renderedItems > 0 &&
			this.renderedItems < this.data[this.config.libraryName].length &&
			(!this.maxRows || this.renderedRows < this.config.maxRows)
		) {
			this.maxRenderCount = this.renderedItems + this.columnsCount * (loadAdditionalRowsCount * 2);
			this.renderMovieElems();
			this.calculatePositions();
		}
	};

	loadInitialData = async (): Promise<void> => {
		this.initialDataLoaded = true;
		setInterval(() => {
			const isVisibleNow = !_.isNull(this.offsetParent);
			if (isVisibleNow && !this.isVisible) {
				this.renderPage();
			}
			this.isVisible = isVisibleNow;
		}, 100);
		if (this.hassObj) {
			this.entityRegistry = await fetchEntityRegistry(this.hassObj.connection);
		}

		window.addEventListener('scroll', () => {
			// todo: improve performance by calculating this when needed only
			if (this.detailsShown && this.activeMovieElem && !isVideoFullScreen(this) && this.isVisible) {
				const seasonContainers = this.getElementsByClassName('seasonContainer') as HTMLCollectionOf<HTMLElement>;
				const episodeContainers = this.getElementsByClassName('episodeContainer') as HTMLCollectionOf<HTMLElement>;
				const seasonElems = this.getElementsByClassName('seasonElem') as HTMLCollectionOf<HTMLElement>;
				let activeElem = this.activeMovieElem;
				// eslint-disable-next-line consistent-return
				_.forEach(seasonElems, seasonElem => {
					if (_.isEqual(seasonElem.dataset.clicked, 'true')) {
						activeElem = seasonElem;
						return false;
					}
				});

				const detailTop = parseInt(getOffset(activeElem as Element).top, 10) - 70;
				const detailBottom = getDetailsBottom(seasonContainers, episodeContainers, activeElem);
				if (this.getTop() < detailTop) {
					window.scroll({
						top: detailTop
					});
					this.children[0].classList.add('stop-scrolling');
				} else if (detailBottom) {
					if (window.innerHeight < detailBottom - detailTop) {
						if (detailBottom && this.getTop() + window.innerHeight > detailBottom) {
							window.scroll({
								top: detailBottom - window.innerHeight
							});
							this.children[0].classList.add('stop-scrolling');
						}
					} else if (detailTop !== -70 && detailBottom !== -10) {
						window.scroll({
							top: detailTop
						});
						this.children[0].classList.add('stop-scrolling');
					}
				}
			}

			this.renderNewElementsIfNeeded();
		});
		window.addEventListener('resize', () => {
			if (this.isVisible) {
				if (!this.detailsShown) {
					const videoPlayer = this.getElementsByClassName('videoPlayer')[0] as HTMLElement;
					let isFullScreen = false;
					if (videoPlayer.children.length > 0) {
						isFullScreen = isVideoFullScreen(this);
					}

					if (this.card && this.movieElems.length > 0 && !isFullScreen) {
						if (this.previousPageWidth !== this.card.offsetWidth) {
							this.previousPageWidth = this.card.offsetWidth;
							this.renderPage();
							const contentbg = this.getElementsByClassName('contentbg');
							this.contentBGHeight = getHeight(contentbg[0] as HTMLElement);
						}
					}
				}
				this.renderNewElementsIfNeeded();
			}
		});

		if (this.card) {
			this.previousPageWidth = this.card.offsetWidth;
		}
		this.resizeBackground();
	};

	renderInitialData = async (): Promise<void> => {
		let { entity } = JSON.parse(JSON.stringify(this.config));

		const processEntity = (entityObj: Record<string, any>, entityString: string): void => {
			let realEntityString = entityString;
			let isPlexPlayer = false;
			if (_.startsWith(entityString, 'plexPlayer | ')) {
				// eslint-disable-next-line prefer-destructuring
				realEntityString = entityString.split(' | ')[3];
				isPlexPlayer = true;
			} else if (
				_.startsWith(entityString, 'androidtv | ') ||
				_.startsWith(entityString, 'kodi | ') ||
				_.startsWith(entityString, 'cast | ') ||
				_.startsWith(entityString, 'input_select | ') ||
				_.startsWith(entityString, 'input_text | ')
			) {
				// eslint-disable-next-line prefer-destructuring
				realEntityString = entityString.split(' | ')[1];
				isPlexPlayer = false;
			}
			if (isPlexPlayer) {
				if (_.isNil(entityObj.plexPlayer)) {
					// eslint-disable-next-line no-param-reassign
					entityObj.plexPlayer = [];
				}
				entityObj.plexPlayer.push(realEntityString);
			} else {
				_.forEach(this.entityRegistry, entityInRegister => {
					if (_.isEqual(entityInRegister.entity_id, realEntityString)) {
						switch (entityInRegister.platform) {
							case 'cast':
								if (_.isNil(entityObj.cast)) {
									// eslint-disable-next-line no-param-reassign
									entityObj.cast = [];
								}
								entityObj.cast.push(entityInRegister.entity_id);
								break;
							case 'androidtv':
								if (_.isNil(entityObj.androidtv)) {
									// eslint-disable-next-line no-param-reassign
									entityObj.androidtv = [];
								}
								entityObj.androidtv.push(entityInRegister.entity_id);
								break;
							case 'kodi':
								if (_.isNil(entityObj.kodi)) {
									// eslint-disable-next-line no-param-reassign
									entityObj.kodi = [];
								}
								entityObj.kodi.push(entityInRegister.entity_id);
								break;
							case 'input_select':
								if (_.isNil(entityObj.inputSelect)) {
									// eslint-disable-next-line no-param-reassign
									entityObj.inputSelect = [];
								}
								entityObj.inputSelect.push(entityInRegister.entity_id);
								break;
							case 'input_text':
								if (_.isNil(entityObj.inputText)) {
									// eslint-disable-next-line no-param-reassign
									entityObj.inputText = [];
								}
								entityObj.inputText.push(entityInRegister.entity_id);
								break;
							default:
							// pass
						}
					}
				});
			}
		};

		const entityOrig = entity;
		if (_.isString(entityOrig)) {
			entity = {};
			processEntity(entity, entityOrig);
		} else if (_.isArray(entityOrig)) {
			entity = {};
			_.forEach(entityOrig, entityStr => {
				processEntity(entity, entityStr);
			});
		}
		this.loading = true;
		this.renderPage();
		try {
			if (this.plex && this.hassObj) {
				this.playController = new PlayController(
					this,
					this.hassObj,
					this.plex,
					entity,
					this.runBefore,
					this.runAfter,
					this.config.libraryName,
					this.entityRegistry
				);
				if (this.playController) {
					await this.playController.init();
				}
				await this.plex.init();
				const plexAllSections = await this.plex.getSections();

				const getOnDeck = async (): Promise<void> => {
					if (this.plex) {
						try {
							const onDeck = await this.plex.getOnDeck();
							this.data.Deck = onDeck.Metadata;
						} catch (err) {
							if (_.includes(err.message, 'Request failed with status code 404')) {
								console.warn(getOldPlexServerErrorMessage('Deck'));
							} else {
								throw err;
							}
						}
					}
				};
				const getContinueWatching = async (): Promise<void> => {
					if (this.plex) {
						try {
							const continueWatching = await this.plex.getContinueWatching();
							this.data['Continue Watching'] = continueWatching.Metadata;
						} catch (err) {
							if (_.includes(err.message, 'Request failed with status code 404')) {
								console.warn(getOldPlexServerErrorMessage('Continue Watching'));
							} else {
								throw err;
							}
						}
					}
				};
				const getWatchNext = async (): Promise<void> => {
					if (this.plex) {
						try {
							const watchNext = await this.plex.getWatchNext();
							this.data['Watch Next'] = watchNext.Metadata;
						} catch (err) {
							if (_.includes(err.message, 'Request failed with status code 404')) {
								console.warn(getOldPlexServerErrorMessage('Watch Next'));
							} else {
								throw err;
							}
						}
					}
				};
				const getRecentyAdded = async (): Promise<void> => {
					if (this.plex) {
						try {
							const recentlyAdded = await this.plex.getRecentyAdded();
							this.data['Recently Added'] = recentlyAdded.Metadata;
						} catch (err) {
							if (_.includes(err.message, 'Request failed with status code 404')) {
								try {
									console.warn(
										'PlexMeetsHomeAssistant: Using old endpoint for recently added tv shows. Consider updating your Plex server.'
									);
									const recentlyAdded = await this.plex.getRecentyAdded(true);
									this.data['Recently Added'] = recentlyAdded.Metadata;
									// eslint-disable-next-line no-shadow
								} catch (err) {
									if (_.includes(err.message, 'Request failed with status code 404')) {
										console.warn(getOldPlexServerErrorMessage('Recently Added'));
									} else {
										throw err;
									}
								}
							} else {
								throw err;
							}
						}
					}
				};

				const getLiveTV = async (): Promise<void> => {
					if (this.plex) {
						const liveTV = await this.plex.getLiveTV();
						_.forEach(liveTV, (data, key) => {
							this.data[key] = data;
							_.forEach(this.data[key], (value, innerKey) => {
								this.data[key][innerKey].type = 'epg';
							});
						});
					}
				};

				const getEPG = async (): Promise<void> => {
					if (this.plex) {
						this.epgData = await this.plex.getEPG();
					}
				};

				let sectionKey: string | false = false;
				_.forEach(plexAllSections, (section: Record<string, any>) => {
					if (_.isEqual(section.title, this.config.libraryName)) {
						sectionKey = section.key;
						return false;
					}
					return true;
				});
				const loadDataRequests = [];
				if (sectionKey) {
					loadDataRequests.push(this.plex.getSectionData(sectionKey, this.displayType));
				}
				if (_.isEqual(this.config.libraryName, 'Deck')) {
					loadDataRequests.push(getOnDeck());
				} else if (_.isEqual(this.config.libraryName, 'Continue Watching')) {
					loadDataRequests.push(getContinueWatching());
				} else if (_.isEqual(this.config.libraryName, 'Watch Next')) {
					loadDataRequests.push(getWatchNext());
				} else if (_.isEqual(this.config.libraryName, 'Recently Added')) {
					loadDataRequests.push(getRecentyAdded());
				}

				loadDataRequests.push(getLiveTV());
				loadDataRequests.push(getEPG());

				const [plexSections] = await Promise.all(loadDataRequests);
				_.forEach(this.epgData, (value, key) => {
					_.forEach(this.data[key], (libraryData, libraryKey) => {
						if (!_.isNil(this.epgData[key][libraryData.channelCallSign])) {
							this.data[key][libraryKey].epg = this.epgData[key][libraryData.channelCallSign];
						}
					});
				});

				if (plexSections && sectionKey) {
					_.forEach(plexSections, section => {
						this.data[section.librarySectionTitle] = section.Metadata;
					});
				}
				const collections = await this.plex.getCollections();
				let collectionToGet: Record<string, any> = {};
				_.forEach(collections, collection => {
					if (this.plex && _.isEqual(collection.title, this.config.libraryName)) {
						collectionToGet = collection;
					}
				});
				if (!_.isNil(collectionToGet.key)) {
					this.data[collectionToGet.title] = await this.plex.getCollectionData(collectionToGet.key);
				}

				const playlists = await this.plex.getPlaylists();
				let playlistToGet: Record<string, any> = {};
				_.forEach(playlists, playlist => {
					if (this.plex && _.isEqual(playlist.title, this.config.libraryName)) {
						playlistToGet = playlist;
					}
				});
				if (!_.isNil(playlistToGet.key)) {
					this.data[playlistToGet.title] = await this.plex.getPlaylistData(playlistToGet.key);
				}

				if (this.data[this.config.libraryName] === undefined) {
					this.error = `Library name ${this.config.libraryName} does not exist.`;
				}

				this.loading = false;
				this.render();
			} else {
				setTimeout(() => {
					this.renderInitialData();
				}, 250);
			}
		} catch (err) {
			this.error = `Plex server did not respond.<br/>Details of the error: ${escapeHtml(err.message)}`;
			this.renderPage();
		}
	};

	render = (): void => {
		this.renderPage();
	};

	private searchInput = (): HTMLElement => {
		const searchContainer = document.createElement('div');
		searchContainer.className = 'searchContainer';

		this.searchInputElem = document.createElement('input');
		this.searchInputElem.type = 'text';
		this.searchInputElem.value = this.searchValue;
		this.searchInputElem.placeholder = `Search ${this.config.libraryName}...`;

		this.searchInputElem.addEventListener('keyup', () => {
			if (!_.isEqual(this.searchInputElem.value, this.searchValue)) {
				this.searchValue = this.searchInputElem.value;
				this.renderPage();
				this.focus();
			}
		});

		searchContainer.appendChild(this.searchInputElem);
		return searchContainer;
	};

	renderMovieElems = (): void => {
		if (this.data[this.config.libraryName] && this.renderedItems < this.data[this.config.libraryName].length) {
			let count = 0;
			// eslint-disable-next-line consistent-return
			const searchValues = _.split(this.searchValue, ' ');
			// eslint-disable-next-line consistent-return
			let lastRowTop = 0;

			const loadAdditionalRowsCount = 2; // todo: make this configurable
			this.renderedRows = 0;
			this.columnsCount = 0;
			const hasEpisodesResult = hasEpisodes(this.data[this.config.libraryName]);
			_.forEach(this.data[this.config.libraryName], (movieData: Record<string, any>) => {
				if (
					(!this.maxCount || this.renderedItems < this.maxCount) &&
					(!this.maxRenderCount || this.renderedItems < this.maxRenderCount) &&
					(!this.maxRows || this.renderedRows <= this.maxRows)
				) {
					const movieElem = this.getMovieElement(movieData, hasEpisodesResult);
					let shouldRender = false;
					if (this.looseSearch) {
						let found = false;
						// eslint-disable-next-line consistent-return
						_.forEach(searchValues, value => {
							if (
								(!_.isEmpty(value) && _.includes(_.toUpper(movieData.title), _.toUpper(value))) ||
								_.includes(_.toUpper(movieData.parentTitle), _.toUpper(value)) ||
								_.includes(_.toUpper(movieData.grandparentTitle), _.toUpper(value))
							) {
								found = true;
								return false;
							}
						});
						if (found || _.isEmpty(searchValues[0])) {
							shouldRender = true;
						}
					} else if (
						_.includes(_.toUpper(movieData.title), _.toUpper(this.searchValue)) ||
						_.includes(_.toUpper(movieData.parentTitle), _.toUpper(this.searchValue)) ||
						_.includes(_.toUpper(movieData.grandparentTitle), _.toUpper(this.searchValue)) ||
						_.includes(_.toUpper(movieData.tag), _.toUpper(this.searchValue)) ||
						_.includes(_.toUpper(_.get(movieData, 'epg.title')), _.toUpper(this.searchValue))
					) {
						shouldRender = true;
					}
					if (shouldRender) {
						count += 1;
						if (count > this.renderedItems) {
							this.contentContainer.appendChild(movieElem);
							if (this.useHorizontalScroll) {
								const marginRight = 10;
								if (_.isEmpty(this.contentContainer.style.width)) {
									this.contentContainer.style.width = `${parseFloat(movieElem.style.width) + marginRight}px`;
								} else {
									this.contentContainer.style.width = `${parseFloat(this.contentContainer.style.width) +
										parseFloat(movieElem.style.width) +
										marginRight}px`;
								}
							}

							this.renderedItems += 1;
						}
					}
					if (shouldRender && lastRowTop !== movieElem.getBoundingClientRect().top && !this.useHorizontalScroll) {
						this.renderedRows += 1;
						if (lastRowTop !== 0 && this.columnsCount === 0) {
							this.columnsCount = this.renderedItems - 1;
						}
						lastRowTop = movieElem.getBoundingClientRect().top;
						if (!isScrolledIntoView(movieElem) && !this.maxRenderCount && this.renderedItems > 0) {
							this.maxRenderCount = this.renderedItems - 1 + this.columnsCount * loadAdditionalRowsCount;
						}
					}
					if (this.maxRows && this.renderedRows > this.maxRows && !this.useHorizontalScroll) {
						movieElem.remove();
					}
					return true;
				}
				return false;
			});
		}

		const contentbg = this.getElementsByClassName('contentbg')[0] as HTMLElement;
		this.contentBGHeight = getHeight(contentbg);
	};

	renderPage = (): void => {
		this.searchInputElem.placeholder = `Search ${this.config.libraryName}...`;
		if (this.showSearch) {
			this.searchInputElem.style.display = 'block';
		} else {
			this.searchInputElem.style.display = 'none';
		}

		if (this.card) {
			const marginRight = 10; // needs to be equal to .container margin right
			const areaSize =
				this.card.offsetWidth - parseInt(this.card.style.paddingRight, 10) - parseInt(this.card.style.paddingLeft, 10);
			const postersInRow = Math.floor(areaSize / this.minWidth);
			if (areaSize > 0) {
				CSS_STYLE.width = areaSize / postersInRow - marginRight;
				CSS_STYLE.height = CSS_STYLE.width * CSS_STYLE.ratio;
				const episodesInRow = Math.floor(areaSize / this.minEpisodeWidth);

				CSS_STYLE.episodeWidth = Math.floor(areaSize / episodesInRow - marginRight);
				CSS_STYLE.episodeHeight = Math.round(CSS_STYLE.episodeWidth * CSS_STYLE.episodeRatio);
			} else if (this.renderPageRetries < 10) {
				// sometimes it loop forever, todo: properly fix!
				setTimeout(() => {
					this.renderPageRetries += 1;
					this.renderPage();
				}, 250);
			}
		}

		this.renderedItems = 0;
		// this.columnsCount = 0;

		const spinner = document.createElement('div');
		spinner.style.display = 'flex';
		spinner.style.alignItems = 'center';
		spinner.style.justifyContent = 'center';
		spinner.innerHTML = '<div class="lds-ring"><div></div><div></div><div></div><div></div></div>';
		if (this.content) {
			this.content.remove();
		}

		if (!this.card) {
			this.card = document.createElement('ha-card');
			this.card.style.transition = '0.5s';
			this.card.style.overflow = 'hidden';
			this.card.style.padding = '16px';
			this.card.style.paddingRight = '6px';

			const titleContainer = document.createElement('h1');
			titleContainer.classList.add('card-header');
			titleContainer.style.paddingRight = '0px';
			titleContainer.style.paddingLeft = '0px';
			titleContainer.style.paddingTop = '0px';
			titleContainer.style.paddingBottom = '0px';

			const titleElem = document.createElement('div');
			titleElem.classList.add('name');
			titleElem.textContent = this.config.title;

			titleContainer.appendChild(titleElem);

			if (!_.isNil(this.config.title) && !_.isEmpty(this.config.title)) {
				titleContainer.style.display = 'block';
			} else {
				titleContainer.style.display = 'none';
			}

			this.card.appendChild(titleContainer);

			this.card.appendChild(this.searchInput());
			if (this.showSearch) {
				this.searchInputElem.style.display = 'block';
			} else {
				this.searchInputElem.style.display = 'none';
			}

			this.appendChild(this.card);
		}

		this.content = document.createElement('div');
		this.content.innerHTML = this.loadCustomStyles();
		if (this.useHorizontalScroll) {
			this.content.style.overflowX = 'auto';
			this.content.style.whiteSpace = 'nowrap';
		}

		if (this.error !== '') {
			this.content.innerHTML += `Error: ${this.error}`;
		} else if (this.data[this.config.libraryName] && this.data[this.config.libraryName].length === 0) {
			this.content.innerHTML += `Library ${escapeHtml(this.config.libraryName)} has no items.`;
		} else if (this.loading) {
			this.content.style.padding = '16px 16px 16px';
			this.content.appendChild(spinner);
		}

		this.card.appendChild(this.content);

		this.contentContainer = document.createElement('div');
		this.contentContainer.className = 'contentContainer';
		// this.contentContainer.style.height = `${CSS_STYLE.height}px`;
		this.content.appendChild(this.contentContainer);

		const contentbg = document.createElement('div');
		contentbg.className = 'contentbg';
		this.contentContainer.appendChild(contentbg);

		const contentArt = document.createElement('div');
		contentArt.className = 'contentArt';

		const contentArtBG1 = document.createElement('div');
		contentArtBG1.className = 'videobg1';
		contentArt.appendChild(contentArtBG1);

		const contentArtBG2 = document.createElement('div');
		contentArtBG2.className = 'videobg2';
		contentArt.appendChild(contentArtBG2);

		this.contentContainer.appendChild(contentArt);

		this.detailElem = document.createElement('div');
		this.detailElem.className = 'detail';
		this.detailElem.innerHTML = `<h1 class='detailsTitle'></h1>
			<h2 class='detailsYear'></h2>
			<span class='metaInfo'></span>`;

		if (this.playController) {
			const playActionButton = this.playController.getPlayActionButton();
			playActionButton.style.fontSize = `${this.fontSize4}px`;
			playActionButton.style.lineHeight = `${this.fontSize4}px`;
			playActionButton.style.marginTop = `${this.fontSize4 / 4}px`;
			playActionButton.style.marginBottom = `${this.fontSize4 / 4}px`;
			playActionButton.style.marginRight = `${this.fontSize4 / 4}px`;
			playActionButton.style.padding = `${this.fontSize4 / 2}px ${this.fontSize4}px`;
			this.detailElem.appendChild(playActionButton);
		}

		this.detailElem.innerHTML += `
			<button class='detailPlayTrailerAction'>Fullscreen Trailer</button>
			<div class='clear'></div>
			<span class='detailDesc'></span>
			<div class='clear'></div>
			<table>
				<tr>
					<td class='metaInfoDetails' style='font-size:${this.fontSize4}px; line-height:${this.fontSize4}px; margin-top:${this
			.fontSize4 / 4}px; margin-bottom:${this.fontSize4 / 4}px; margin-right:${this.fontSize4 / 4}px;'>
						Directed by
					</td>
					<td class='metaInfoDetailsData'>
						...
					</td>
				</tr>
				<tr>
					<td class='metaInfoDetails' style='font-size:${this.fontSize4}px; line-height:${this.fontSize4}px; margin-top:${this
			.fontSize4 / 4}px; margin-bottom:${this.fontSize4 / 4}px; margin-right:${this.fontSize4 / 4}px;'>
						Written by
					</td>
					<td class='metaInfoDetailsData'>
						...
					</td>
				</tr>
				<tr>
					<td class='metaInfoDetails' style='font-size:${this.fontSize4}px; line-height:${this.fontSize4}px; margin-top:${this
			.fontSize4 / 4}px; margin-bottom:${this.fontSize4 / 4}px; margin-right:${this.fontSize4 / 4}px;'>
						Studio
					</td>
					<td class='metaInfoDetailsData'>
						...
					</td>
				</tr>
				<tr>
					<td class='metaInfoDetails' style='font-size:${this.fontSize4}px; line-height:${this.fontSize4}px; margin-top:${this
			.fontSize4 / 4}px; margin-bottom:${this.fontSize4 / 4}px; margin-right:${this.fontSize4 / 4}px;'>
						Genre
					</td>
					<td class='metaInfoDetailsData'>
						...
					</td>
				</tr>
			</table>`;

		this.detailElem.addEventListener('click', () => {
			this.hideBackground();
			this.minimizeAll();
		});

		this.contentContainer.appendChild(this.detailElem);

		const fullscreenTrailer = this.getElementsByClassName('detailPlayTrailerAction')[0] as HTMLElement;
		fullscreenTrailer.addEventListener('click', event => {
			event.stopPropagation();
			if (this.videoElem) {
				const videoPlayer = this.getElementsByClassName('videoPlayer')[0] as HTMLElement;
				const video = videoPlayer.children[0] as any;
				if (video.requestFullscreen) {
					video.requestFullscreen();
				} else if (video.webkitRequestFullscreen) {
					video.webkitRequestFullscreen();
				} else if (video.msRequestFullscreen) {
					video.msRequestFullscreen();
				} else {
					const videobgs1 = this.getElementsByClassName('videobg1');
					const videobgs2 = this.getElementsByClassName('videobg2');
					// eslint-disable-next-line no-restricted-syntax
					for (const videobg1 of videobgs1) {
						videobg1.classList.add('transparent');
					}
					// eslint-disable-next-line no-restricted-syntax
					for (const videobg2 of videobgs2) {
						videobg2.classList.add('transparent');
					}

					this.videoElem.classList.add('maxZIndex');
					this.videoElem.classList.add('simulatedFullScreen');
					video.controls = true;
				}
			}
		});

		this.seasonsElem = document.createElement('div');
		this.seasonsElem.className = 'seasons';
		this.seasonsElem.addEventListener('click', () => {
			this.hideBackground();
			this.minimizeAll();
		});
		this.contentContainer.appendChild(this.seasonsElem);

		this.episodesElem = document.createElement('div');
		this.episodesElem.className = 'episodes';
		this.episodesElem.addEventListener('click', () => {
			this.hideBackground();
			this.minimizeAll();
		});
		this.contentContainer.appendChild(this.episodesElem);

		this.videoElem = document.createElement('div');
		this.videoElem.className = 'video';
		this.videoElem.addEventListener('click', event => {
			const videoPlayer = this.getElementsByClassName('videoPlayer')[0] as HTMLElement;
			const video = videoPlayer.children[0] as any;
			if (isVideoFullScreen(this)) {
				event.stopPropagation();
				if (this.videoElem) {
					this.videoElem.classList.remove('maxZIndex');
					this.videoElem.classList.remove('simulatedFullScreen');
				}

				const videobgs1 = this.getElementsByClassName('videobg1');
				const videobgs2 = this.getElementsByClassName('videobg2');
				// eslint-disable-next-line no-restricted-syntax
				for (const videobg1 of videobgs1) {
					videobg1.classList.remove('transparent');
				}
				// eslint-disable-next-line no-restricted-syntax
				for (const videobg2 of videobgs2) {
					videobg2.classList.remove('transparent');
				}

				video.controls = false;
			} else {
				this.hideBackground();
				this.minimizeAll();
			}
		});

		const videoBG1 = document.createElement('div');
		videoBG1.className = 'videobg1';
		this.videoElem.appendChild(videoBG1);

		const videoBG2 = document.createElement('div');
		videoBG2.className = 'videobg2';
		this.videoElem.appendChild(videoBG2);

		const videoPlayer = document.createElement('div');
		videoPlayer.className = 'videoPlayer';
		this.videoElem.appendChild(videoPlayer);

		this.contentContainer.appendChild(this.videoElem);

		// todo: figure out why timeout is needed here and do it properly
		setTimeout(() => {
			contentbg.addEventListener('click', () => {
				this.hideBackground();
				this.minimizeAll();
			});
			contentArt.addEventListener('click', () => {
				this.hideBackground();
				this.minimizeAll();
			});
		}, 1);

		const endElem = document.createElement('div');
		endElem.className = 'clear';
		this.contentContainer.appendChild(endElem);

		this.renderMovieElems();
		this.calculatePositions();
		this.loadCustomStyles();
	};

	calculatePositions = (): void => {
		// return; // temp
		// todo: figure out why interval is needed here and do it properly
		const setLeftOffsetsInterval = setInterval(() => {
			this.movieElems = this.getElementsByClassName('movieElem');
			for (let i = 0; i < this.movieElems.length; i += 1) {
				if (this.movieElems[i].offsetLeft === 0) {
					break;
				} else {
					clearInterval(setLeftOffsetsInterval);
				}
				/*
				this.movieElems[i].style.left = `${this.movieElems[i].offsetLeft}px`;
				this.movieElems[i].dataset.left = this.movieElems[i].offsetLeft;
				this.movieElems[i].style.top = `${this.movieElems[i].offsetTop}px`;
				this.movieElems[i].dataset.top = this.movieElems[i].offsetTop;
				this.movieElems[i].style.position = 'absolute';
				*/
			}
		}, 100);
	};

	minimizeSeasons = (): void => {
		this.seasonsElemHidden = false;
		if (this.seasonsElem) {
			_.forEach(this.seasonsElem.childNodes, child => {
				const seasonElem = (child as HTMLElement).children[0] as HTMLElement;
				const seasonTitleElem = (child as HTMLElement).children[1] as HTMLElement;
				const seasonEpisodesCount = (child as HTMLElement).children[2] as HTMLElement;
				seasonElem.style.display = 'block';

				if (typeof seasonElem.children[0].children[0] !== 'undefined') {
					(seasonElem.children[0].children[0] as HTMLElement).style.display = 'block';
				}

				const moveElem = (elem: HTMLElement): void => {
					const seasonElemLocal = elem;
					seasonElemLocal.style.marginTop = '0';
					if (_.isEqual(seasonElem.dataset.type, 'album')) {
						seasonElemLocal.style.width = `${CSS_STYLE.width}px`;
						seasonElemLocal.style.height = `${CSS_STYLE.width}px`;
					} else {
						seasonElemLocal.style.width = `${CSS_STYLE.width}px`;
						seasonElemLocal.style.height = `${CSS_STYLE.height - 3}px`;
					}
					seasonElemLocal.style.zIndex = '3';
					seasonElemLocal.style.marginLeft = `0px`;
					seasonElemLocal.dataset.clicked = 'false';
					seasonTitleElem.style.display = 'block';
					seasonEpisodesCount.style.display = 'block';
					// clearInterval(this.seasonTitleColorTimeout);
					this.seasonTitleColorTimeout = setTimeout(() => {
						seasonTitleElem.style.color = 'rgba(255,255,255,1)';
						seasonEpisodesCount.style.color = 'rgba(255,255,255,1)';
					}, 500);
				};

				if (seasonElem.dataset.clicked === 'true') {
					moveElem(seasonElem);
				} else {
					// clearInterval(this.moveElemTimeout);
					this.moveElemTimeout = setTimeout(() => {
						moveElem(seasonElem);
					}, 100);
				}
			});
		}
	};

	hideVideo = (): void => {
		if (this.videoElem) {
			const videoPlayer = this.getElementsByClassName('videoPlayer')[0] as HTMLElement;
			videoPlayer.innerHTML = '';
			this.videoElem.classList.remove('maxZIndex');
			this.videoElem.classList.remove('simulatedFullScreen');

			const videobgs1 = this.getElementsByClassName('videobg1');
			const videobgs2 = this.getElementsByClassName('videobg2');
			// eslint-disable-next-line no-restricted-syntax
			for (const videobg1 of videobgs1) {
				videobg1.classList.remove('transparent');
			}
			// eslint-disable-next-line no-restricted-syntax
			for (const videobg2 of videobgs2) {
				videobg2.classList.remove('transparent');
			}
		}
	};

	minimizeAll = (): void => {
		this.detailsShown = false;
		if (this.activeMovieElem) {
			this.activeMovieElem.style.display = `block`;
		}

		this.activeMovieElem = undefined;
		for (let i = 0; i < this.movieElems.length; i += 1) {
			if (
				(_.isEqual(parseInt(this.movieElems[i].style.width, 10), this.minExpandedWidth) &&
					_.isEqual(parseInt(this.movieElems[i].style.height, 10), this.minExpandedHeight)) ||
				(_.isEqual(parseInt(this.movieElems[i].style.width, 10), this.minExpandedWidth) &&
					_.isEqual(parseInt(this.movieElems[i].style.height, 10), this.minExpandedWidth))
			) {
				if (_.isEqual(this.movieElems[i].style.width, this.movieElems[i].style.height)) {
					this.movieElems[i].style.width = `${CSS_STYLE.width}px`;
					this.movieElems[i].style.height = `${CSS_STYLE.width}px`;
				} else {
					this.movieElems[i].style.width = `${CSS_STYLE.width}px`;
					this.movieElems[i].style.height = `${CSS_STYLE.height}px`;
				}
				this.movieElems[i].style.left = `${this.movieElems[i].dataset.left}px`;
				this.movieElems[i].style.top = `${this.movieElems[i].dataset.top}px`;

				setTimeout(() => {
					this.movieElems[i].style.transition = '0s';
					this.movieElems[i].style['z-index'] = 1;
					this.movieElems[i].style.position = 'relative';
					this.movieElems[i].style.left = `0px`;
					this.movieElems[i].style.top = `0px`;
					this.movieElems[i].dataset.clicked = false;
					setTimeout(() => {
						this.movieElems[i].style.transition = '0.5s';
					}, 10);
				}, 510);
			}
		}
		this.hideSeasons();
		this.hideEpisodes();
		this.hideDetails();
		this.hideVideo();
		clearInterval(this.showDetailsTimeout);
		clearInterval(this.showSeasonElemTimeout);
		clearInterval(this.seasonTitleColorTimeout);
		clearInterval(this.moveElemTimeout);
		clearInterval(this.scrollDownInactiveSeasonsTimeout);
		clearInterval(this.episodesLoadTimeout);
		clearInterval(this.episodesElemFreshlyLoadedTimeout);
		clearInterval(this.seasonElemFreshlyLoadedTimeout);
	};

	hideSeasons = (): void => {
		if (this.seasonsElem) {
			this.seasonsElemHidden = true;
			const top = this.getTop();
			this.seasonsElem.style.top = `${top + 2000}px`;
			clearInterval(this.hideSeasonsTimeout);
			this.hideSeasonsTimeout = setTimeout(() => {
				if (this.seasonsElem && !this.seasonElemFreshlyLoaded) {
					this.seasonsElem.innerHTML = '';
					this.seasonsElem.style.display = 'none';
					this.resizeBackground();
				}
			}, 700);
		}
	};

	hideEpisodes = (): void => {
		if (this.episodesElem) {
			this.episodesElemHidden = true;
			const top = this.getTop();
			this.episodesElem.style.top = `${top + 2000}px`;
			clearInterval(this.hideEpisodesTimeout);
			this.hideEpisodesTimeout = setTimeout(() => {
				if (this.episodesElem && !this.episodesElemFreshlyLoaded) {
					this.episodesElem.innerHTML = '';
					this.episodesElem.style.display = 'none';
					this.resizeBackground();
				}
			}, 700);
		}
	};

	scrollDownInactiveSeasons = (): void => {
		if (this.seasonsElem) {
			this.seasonsElemHidden = true;
			_.forEach(this.seasonsElem.childNodes, child => {
				const seasonElem = (child as HTMLElement).children[0] as HTMLElement;
				const seasonTitleElem = (child as HTMLElement).children[1] as HTMLElement;
				const seasonEpisodesCount = (child as HTMLElement).children[2] as HTMLElement;
				if (seasonElem.dataset.clicked === 'false') {
					seasonElem.style.marginTop = '1000px';
					seasonElem.style.marginLeft = `0px`;
					this.scrollDownInactiveSeasonsTimeout = setTimeout(() => {
						seasonElem.style.display = 'none';
						seasonTitleElem.style.display = 'none';
						seasonEpisodesCount.style.display = 'none';
					}, 500);
				}
			});
		}
	};

	hideDetails = (): void => {
		const top = this.getTop();
		if (this.detailElem) {
			this.detailElem.style.top = `${top - 1000}px`;
			this.detailElem.style.color = 'rgba(255,255,255,0)';
			this.detailElem.style.zIndex = '0';
			this.detailElem.style.visibility = 'hidden';
		}
		clearTimeout(this.renderNewElementsIfNeededTimeout);
		this.renderNewElementsIfNeededTimeout = setTimeout(() => {
			this.renderNewElementsIfNeeded();
		}, 1000);
		const fullscreenTrailer = this.getElementsByClassName('detailPlayTrailerAction')[0] as HTMLElement;
		fullscreenTrailer.style.visibility = 'hidden';
	};

	showDetails = async (data: any): Promise<void> => {
		this.detailsShown = true;
		const top = this.getTop();
		if (this.detailElem) {
			if (this.playController) {
				this.playController.setPlayActionButtonType(data.type);

				this.playController.setPlayButtonClickFunction((event: MouseEvent) => {
					event.preventDefault();
					event.stopPropagation();
					if (this.playController) {
						this.playController.play(data, true);
					}
				});
			}

			this.detailElem.style.transition = '0s';
			this.detailElem.style.top = `${top - 1000}px`;
			if (!_.isEmpty(_.get(data, 'thumb'))) {
				this.detailElem.style.left = `${this.minExpandedWidth + 30}px`;
			} else {
				this.detailElem.style.left = `16px`;
			}

			clearInterval(this.showDetailsTimeout);
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			this.showDetailsTimeout = setTimeout(async () => {
				if (this.detailElem && this.plex) {
					this.detailElem.style.visibility = 'visible';
					this.detailElem.style.transition = '0.7s';
					this.detailElem.style.top = `${top}px`;

					let mainData = data;
					if (_.isEqual(data.type, 'season')) {
						mainData = await this.plex.getDetails(data.parentKey.split('/')[3]);
						mainData.title = `${mainData.title} - ${data.title}`;
					}
					const directorElem = this.getElementsByClassName('metaInfoDetailsData')[0] as HTMLElement;
					directorElem.style.fontSize = `${this.fontSize4}px`;
					directorElem.style.lineHeight = `${this.fontSize4}px`;
					directorElem.style.marginTop = `${this.fontSize4 / 4}px`;
					directorElem.style.marginBottom = `${this.fontSize4 / 4}px`;
					directorElem.style.display = 'block';
					if (directorElem.parentElement) {
						if (mainData.Director && mainData.Director.length > 0) {
							directorElem.innerHTML = escapeHtml(mainData.Director[0].tag);
							directorElem.parentElement.style.display = 'table-row';
						} else {
							directorElem.parentElement.style.display = 'none';
						}
					}

					const writerElem = this.getElementsByClassName('metaInfoDetailsData')[1] as HTMLElement;
					writerElem.style.fontSize = `${this.fontSize4}px`;
					writerElem.style.lineHeight = `${this.fontSize4}px`;
					writerElem.style.marginTop = `${this.fontSize4 / 4}px`;
					writerElem.style.marginBottom = `${this.fontSize4 / 4}px`;
					writerElem.style.display = 'block';
					if (writerElem.parentElement) {
						if (mainData.Writer && mainData.Writer.length > 0) {
							writerElem.innerHTML = escapeHtml(mainData.Writer[0].tag);
							writerElem.parentElement.style.display = 'table-row';
						} else {
							writerElem.parentElement.style.display = 'none';
						}
					}
					const studioElem = this.getElementsByClassName('metaInfoDetailsData')[2] as HTMLElement;
					studioElem.style.fontSize = `${this.fontSize4}px`;
					studioElem.style.lineHeight = `${this.fontSize4}px`;
					studioElem.style.marginTop = `${this.fontSize4 / 4}px`;
					studioElem.style.marginBottom = `${this.fontSize4 / 4}px`;
					studioElem.style.display = 'block';
					if (studioElem.parentElement) {
						if (mainData.studio) {
							studioElem.innerHTML = escapeHtml(mainData.studio);
							studioElem.parentElement.style.display = 'table-row';
						} else {
							studioElem.parentElement.style.display = 'none';
						}
					}
					const genreElem = this.getElementsByClassName('metaInfoDetailsData')[3] as HTMLElement;
					genreElem.style.fontSize = `${this.fontSize4}px`;
					genreElem.style.lineHeight = `${this.fontSize4}px`;
					genreElem.style.marginTop = `${this.fontSize4 / 4}px`;
					genreElem.style.marginBottom = `${this.fontSize4 / 4}px`;
					genreElem.style.display = 'block';
					if (genreElem.parentElement) {
						if (mainData.Genre && mainData.Genre.length > 0) {
							let genre = '';
							_.forEach(mainData.Genre, tag => {
								genre += `${tag.tag}, `;
							});
							genreElem.innerHTML = escapeHtml(genre.slice(0, -2));
							genreElem.parentElement.style.display = 'table-row';
						} else {
							genreElem.parentElement.style.display = 'none';
						}
					}
					const detailsTitle = this.getElementsByClassName('detailsTitle')[0] as HTMLElement;
					if (!_.isNil(mainData.channelCallSign)) {
						detailsTitle.innerHTML = escapeHtml(mainData.channelCallSign);
					} else {
						detailsTitle.innerHTML = escapeHtml(mainData.title);
					}
					detailsTitle.style.lineHeight = `${this.fontSize3}px`;
					detailsTitle.style.fontSize = `${this.fontSize3}px`;
					detailsTitle.style.marginBottom = `${this.fontSize3 / 4}px`;

					const detailsYear = this.getElementsByClassName('detailsYear')[0] as HTMLElement;
					detailsYear.style.display = 'block';
					detailsYear.style.fontSize = `${this.fontSize4}px`;
					detailsYear.style.lineHeight = `${this.fontSize4}px`;
					detailsYear.style.marginTop = `0px`;
					detailsYear.style.marginBottom = `${this.fontSize4 / 4}px`;
					if (!_.isNil(mainData.year)) {
						detailsYear.innerHTML = escapeHtml(mainData.year);
					} else if (!_.isNil(mainData.epg) && !_.isNil(mainData.epg.title)) {
						detailsYear.innerHTML = escapeHtml(mainData.epg.title);
					} else {
						detailsYear.style.display = 'none';
						detailsYear.innerHTML = '';
					}

					(this.getElementsByClassName('metaInfo')[0] as HTMLElement).innerHTML = `${(mainData.duration !== undefined
						? `<span class='minutesDetail' style='font-size:${this.fontSize4}px; line-height:${
								this.fontSize4
						  }px; margin-top:${this.fontSize4 / 4}px; margin-bottom:${this.fontSize4 / 4}px; margin-right:${this
								.fontSize4 / 4}px; padding:${this.fontSize4 / 2}px ${this.fontSize4}px;'>${Math.round(
								parseInt(escapeHtml(mainData.duration), 10) / 60 / 1000
						  )} min</span>`
						: '') +
						(mainData.contentRating !== undefined
							? `<span class='contentRatingDetail' style='font-size:${this.fontSize4}px; line-height:${
									this.fontSize4
							  }px; margin-top:${this.fontSize4 / 4}px; margin-bottom:${this.fontSize4 / 4}px; margin-right:${this
									.fontSize4 / 4}px; padding:${this.fontSize4 / 2}px ${this.fontSize4}px;'>${escapeHtml(
									mainData.contentRating
							  )}</span>`
							: '') +
						(mainData.rating !== undefined
							? `<span class='ratingDetail' style='font-size:${this.fontSize4}px; line-height:${
									this.fontSize4
							  }px; margin-top:${this.fontSize4 / 4}px; margin-bottom:${this.fontSize4 / 4}px; margin-right:${this
									.fontSize4 / 4}px; padding:${this.fontSize4 / 2}px ${this.fontSize4}px;'>${
									mainData.rating < 5 ? '&#128465;' : '&#11088;'
							  }&nbsp;${Math.round(parseFloat(escapeHtml(mainData.rating)) * 10) / 10}</span>`
							: '')}<div class='clear'></div>`;

					const detailDesc = this.getElementsByClassName('detailDesc')[0] as HTMLElement;
					detailDesc.style.fontSize = `${this.fontSize4}px`;
					detailDesc.style.lineHeight = `${this.fontSize4}px`;
					detailDesc.style.marginTop = `${this.fontSize4 / 4}px`;
					detailDesc.style.marginBottom = `${this.fontSize4 / 4}px`;
					detailDesc.style.display = 'block';
					if (!_.isNil(mainData.summary)) {
						detailDesc.innerHTML = escapeHtml(mainData.summary);
					} else if (!_.isNil(mainData.epg) && !_.isNil(mainData.epg.summary)) {
						detailDesc.innerHTML = escapeHtml(mainData.epg.summary);
					} else {
						detailDesc.innerHTML = '';
						detailDesc.style.display = 'none';
					}

					this.detailElem.style.color = 'rgba(255,255,255,1)';
					this.detailElem.style.zIndex = '4';
					this.detailElem.style.width = `calc(100% - ${this.minExpandedWidth + 30 + 20}px)`;
					if (this.activeMovieElem) {
						this.detailElem.style.maxHeight = `${getHeight(this.activeMovieElem) + 40}px`;
					} else {
						this.detailElem.style.maxHeight = `${this.minExpandedHeight + 20}px`;
					}
				}
			}, 200);
		}
		if (this.plex) {
			let childrenData: Record<string, any> = {};
			if (_.isEqual(data.type, 'episode')) {
				childrenData = await this.plex.getLibraryData(`${data.grandparentKey}/children`);
			} else if (
				data.childCount > 0 ||
				_.isEqual(data.type, 'artist') ||
				_.isEqual(data.type, 'album') ||
				_.includes(data.key, 'folder')
			) {
				childrenData = await this.plex.getLibraryData(data.key);
			}
			let dataDetails: Record<string, any> = {};
			if (!_.isNil(data.key)) {
				if (!_.includes(data.key, 'folder')) {
					dataDetails = await this.plex.getDetails(data.key.split('/')[3]);
				}

				if (this.videoElem) {
					const art = this.plex.authorizeURL(this.plex.getBasicURL() + data.art);
					const trailerURL = findTrailerURL(dataDetails);
					if (trailerURL !== '' && !_.isEqual(this.playTrailer, false)) {
						const videoPlayer = this.getElementsByClassName('videoPlayer')[0] as HTMLElement;
						const video = document.createElement('video');
						video.style.height = '100%';
						video.style.width = '100%';
						video.controls = false;
						if (_.isEqual(this.playTrailer, 'muted')) {
							video.muted = true;
						}
						const source = document.createElement('source');
						source.type = 'video/mp4';
						source.src = this.plex.authorizeURL(
							`${this.plex.getBasicURL()}${dataDetails.Extras.Metadata[0].Media[0].Part[0].key}`
						);
						video.appendChild(source);
						videoPlayer.appendChild(video);

						video.load();
						video.play();
						let playingFired = false;

						const videobgs1 = this.getElementsByClassName('videobg1');
						const videobgs2 = this.getElementsByClassName('videobg2');
						video.addEventListener('click', event => {
							if (isVideoFullScreen(this)) {
								event.stopPropagation();
							}
						});
						const fullScreenChangeAction = (): void => {
							if (this.videoElem) {
								if (isVideoFullScreen(this)) {
									// eslint-disable-next-line no-restricted-syntax
									for (const videobg1 of videobgs1) {
										videobg1.classList.add('transparent');
									}
									// eslint-disable-next-line no-restricted-syntax
									for (const videobg2 of videobgs2) {
										videobg2.classList.add('transparent');
									}

									this.videoElem.classList.add('maxZIndex');
									video.controls = true;
									video.muted = false;
								} else {
									// eslint-disable-next-line no-restricted-syntax
									for (const videobg1 of videobgs1) {
										videobg1.classList.remove('transparent');
									}
									// eslint-disable-next-line no-restricted-syntax
									for (const videobg2 of videobgs2) {
										videobg2.classList.remove('transparent');
									}

									this.videoElem.classList.remove('maxZIndex');
									video.controls = false;
									window.scroll({
										top: getOffset(this.activeMovieElem as Element).top - 70,
										behavior: 'smooth'
									});
									if (_.isEqual(this.playTrailer, 'muted')) {
										video.muted = true;
									}
								}
							}
						};
						video.addEventListener('fullscreenchange', fullScreenChangeAction);
						video.addEventListener('mozfullscreenchange', fullScreenChangeAction);
						video.addEventListener('webkitfullscreenchange', fullScreenChangeAction);
						video.addEventListener('msfullscreenchange', fullScreenChangeAction);

						video.addEventListener('playing', () => {
							if (this.videoElem && !playingFired) {
								const contentbg = this.getElementsByClassName('contentbg')[0] as HTMLElement;
								const fullscreenTrailer = this.getElementsByClassName('detailPlayTrailerAction')[0] as HTMLElement;
								fullscreenTrailer.style.fontSize = `${this.fontSize4}px`;
								fullscreenTrailer.style.lineHeight = `${this.fontSize4}px`;
								fullscreenTrailer.style.marginTop = `${this.fontSize4 / 4}px`;
								fullscreenTrailer.style.marginBottom = `${this.fontSize4 / 4}px`;
								fullscreenTrailer.style.marginRight = `${this.fontSize4 / 4}px`;
								fullscreenTrailer.style.padding = `${this.fontSize4 / 2}px ${this.fontSize4}px`;
								fullscreenTrailer.style.visibility = 'visible';
								contentbg.classList.add('no-transparency');
								playingFired = true;
								this.videoElem.style.width = `${
									(this.getElementsByClassName('searchContainer')[0] as HTMLElement).offsetWidth
								}px`;
								this.videoElem.style.visibility = 'visible';
								this.videoElem.style.top = `${top}px`;
							}
						});
					} else if (!_.isEmpty(art)) {
						const contentArt = this.getElementsByClassName('contentArt')[0] as HTMLElement;
						const contentbg = this.getElementsByClassName('contentbg')[0] as HTMLElement;
						contentArt.style.width = `${window.innerWidth}px`;
						contentArt.style.height = `${window.innerHeight}px`;
						contentArt.style.backgroundImage = `url('${art}')`;
						contentArt.style.top = `${top - 8}px`;
						contentArt.style.transition = '0.5s';

						contentArt.style.display = 'block';
						contentbg.classList.add('no-transparency');
					}
				}
			}
			if (!_.isEmpty(childrenData)) {
				this.seasonElemFreshlyLoaded = true;
				if (this.seasonsElem) {
					this.seasonsElem.style.display = 'block';
					this.seasonsElem.innerHTML = '';
					this.seasonsElem.style.transition = `0s`;
					this.seasonsElem.style.top = `${top + 2000}px`;
				}

				if (_.isEqual(_.get(childrenData[0], 'type'), 'track')) {
					if (this.episodesElem) {
						this.episodesElemHidden = false;
						this.episodesElem.style.display = 'block';
						this.episodesElem.innerHTML = '';
						this.episodesElem.style.transition = `0s`;
						this.episodesElem.style.top = `${top + 2000}px`;
						const tableView = document.createElement('table');
						tableView.style.width = 'calc(100% - 10px)';
						tableView.style.border = 'none';
						tableView.cellSpacing = '0';
						tableView.cellPadding = '0';
						this.episodesElem.append(tableView);
						let isEven = false;
						_.forEach(childrenData, childData => {
							if (this.episodesElem && this.playController && this.plex) {
								if (_.isEqual(childData.type, 'track')) {
									tableView.append(
										createTrackView(this.playController, this.plex, childData, this.fontSize1, this.fontSize2, isEven)
									);
									isEven = !isEven;
								} else {
									this.episodesElem.append(
										createEpisodesView(this.playController, this.plex, childData, this.fontSize1, this.fontSize2)
									);
								}
							}
						});
						clearInterval(this.episodesLoadTimeout);
						this.episodesLoadTimeout = setTimeout(() => {
							if (this.episodesElem) {
								this.episodesElem.style.transition = `0.7s`;
								if (this.activeMovieElem) {
									if (!_.isEmpty(_.get(data, 'thumb'))) {
										this.episodesElem.style.top = `${top + getHeight(this.activeMovieElem) + 16 * 2}px`;
									} else if (this.detailElem) {
										this.episodesElem.style.top = `${top + getHeight(this.detailElem)}px`;
									} else {
										this.episodesElem.style.top = `${top}px`;
									}
								} else {
									this.episodesElem.style.top = `${top + this.minExpandedHeight + 16}px`;
								}

								this.resizeBackground();
							}
						}, 200);
						clearInterval(this.episodesElemFreshlyLoadedTimeout);
						this.episodesElemFreshlyLoadedTimeout = setTimeout(() => {
							this.episodesElemFreshlyLoaded = false;
						}, 700);
					}
				} else {
					_.forEach(childrenData, childData => {
						if (this.seasonsElem && this.plex) {
							this.seasonsElemHidden = false;
							const seasonContainer = document.createElement('div');
							seasonContainer.className = 'seasonContainer';
							seasonContainer.style.width = `${CSS_STYLE.width}px`;
							const thumbURL = `${this.plex.getBasicURL()}/photo/:/transcode?width=${this.minExpandedWidth}&height=${
								this.minExpandedHeight
							}&minSize=1&upscale=1&url=${childData.thumb}&X-Plex-Token=${this.config.token}`;

							const seasonElem = document.createElement('div');
							seasonElem.className = 'seasonElem';
							seasonElem.style.width = `${CSS_STYLE.width}px`;
							if (_.isEqual(childData.type, 'album')) {
								seasonElem.style.height = `${CSS_STYLE.width}px`;
							} else {
								seasonElem.style.height = `${CSS_STYLE.height - 3}px`;
							}

							seasonElem.style.backgroundImage = `url('${thumbURL}')`;
							seasonElem.dataset.clicked = 'false';

							if (this.playController && !this.playController.isPlaySupported(childData)) {
								seasonElem.style.cursor = 'pointer';
							}

							const interactiveArea = document.createElement('div');
							interactiveArea.className = 'interactiveArea';
							if (childData.leafCount - childData.viewedLeafCount > 0) {
								const toViewElem = document.createElement('div');
								toViewElem.className = 'toViewSeason';
								toViewElem.innerHTML = (childData.leafCount - childData.viewedLeafCount).toString();

								toViewElem.style.fontSize = `${this.fontSize4}px`;
								toViewElem.style.lineHeight = `${this.fontSize4}px`;
								toViewElem.style.padding = `${this.fontSize4 / 2}px`;

								interactiveArea.appendChild(toViewElem);
							}

							if (this.playController) {
								const playButton = this.playController.getPlayButton(childData.type);
								if (this.playController.isPlaySupported(childData)) {
									playButton.classList.remove('disabled');
								}
								playButton.addEventListener('click', event => {
									event.stopPropagation();
									if (this.plex && this.playController) {
										this.playController.play(childData, true);
									}
								});

								interactiveArea.append(playButton);
							}

							seasonElem.append(interactiveArea);
							seasonContainer.append(seasonElem);

							const seasonTitleElem = document.createElement('div');
							seasonTitleElem.className = 'seasonTitleElem';
							seasonTitleElem.innerHTML = escapeHtml(childData.title);
							seasonTitleElem.style.fontSize = `${this.fontSize1}px`;
							seasonTitleElem.style.lineHeight = `${this.fontSize1}px`;
							seasonContainer.append(seasonTitleElem);

							const seasonEpisodesCount = document.createElement('div');
							seasonEpisodesCount.className = 'seasonEpisodesCount';
							if (childData.leafCount > 0) {
								seasonEpisodesCount.innerHTML = `${escapeHtml(childData.leafCount)} episodes`;
							} else if (!_.isNil(childData.year)) {
								seasonEpisodesCount.innerHTML = `${escapeHtml(childData.year)} `;
							}

							seasonEpisodesCount.style.fontSize = `${this.fontSize2}px`;
							seasonEpisodesCount.style.lineHeight = `${this.fontSize2}px`;
							seasonContainer.append(seasonEpisodesCount);

							seasonContainer.addEventListener('click', event => {
								event.stopPropagation();
								if (this.seasonContainerClickEnabled) {
									this.seasonContainerClickEnabled = false;
									setTimeout(() => {
										this.seasonContainerClickEnabled = true;
									}, 500);
									if (this.activeMovieElem) {
										if (seasonElem.dataset.clicked === 'false') {
											if (this.playController) {
												this.playController.setPlayActionButtonType(childData.type);
												this.playController.setPlayButtonClickFunction((thisEvent: MouseEvent) => {
													thisEvent.preventDefault();
													thisEvent.stopPropagation();
													if (this.playController) {
														this.playController.play(childData, true);
													}
												});
											}
											if (typeof seasonElem.children[0].children[0] !== 'undefined') {
												(seasonElem.children[0].children[0] as HTMLElement).style.display = 'none';
											}

											seasonElem.dataset.clicked = 'true';
											this.activeMovieElem.style.top = `${top - 1000}px`;
											setTimeout(() => {
												if (this.activeMovieElem) {
													this.activeMovieElem.style.display = 'none';
												}
											}, 500);

											this.scrollDownInactiveSeasons();

											if (this.activeMovieElem) {
												seasonContainer.style.top = `${-getHeight(this.activeMovieElem)}px`;
											} else {
												seasonContainer.style.top = `${-this.minExpandedHeight}px`;
											}

											seasonElem.dataset.type = childData.type;
											seasonElem.style.width = `${this.minExpandedWidth}px`;
											if (_.isEqual(childData.type, 'album')) {
												seasonElem.style.height = `${this.minExpandedWidth}px`;
											} else {
												seasonElem.style.height = `${this.minExpandedHeight - 6}px`;
											}
											seasonElem.style.zIndex = '3';

											seasonElem.style.marginLeft = `-${getOffset(seasonElem).left -
												getOffset(this.activeMovieElem).left}px`;

											seasonTitleElem.style.color = 'rgba(255,255,255,0)';
											seasonEpisodesCount.style.color = 'rgba(255,255,255,0)';

											if (this.detailElem) {
												(this.detailElem.children[1] as HTMLElement).innerHTML = childData.title;
											}
											(async (): Promise<void> => {
												if (this.plex && (childData.leafCount > 0 || _.isEqual(childData.type, 'album'))) {
													this.episodesElemFreshlyLoaded = true;
													const episodesData = await this.plex.getLibraryData(childData.key);
													if (this.episodesElem) {
														this.episodesElemHidden = false;
														this.episodesElem.style.display = 'block';
														this.episodesElem.innerHTML = '';
														this.episodesElem.style.transition = `0s`;
														this.episodesElem.style.top = `${top + 2000}px`;
														const tableView = document.createElement('table');
														tableView.style.width = 'calc(100% - 10px)';
														tableView.style.border = 'none';
														tableView.cellSpacing = '0';
														tableView.cellPadding = '0';
														if (_.isEqual(childData.type, 'album')) {
															this.episodesElem.append(tableView);
														}
														let isEven = false;
														_.forEach(episodesData, episodeData => {
															if (this.episodesElem && this.playController && this.plex) {
																if (_.isEqual(episodeData.type, 'track')) {
																	tableView.append(
																		createTrackView(
																			this.playController,
																			this.plex,
																			episodeData,
																			this.fontSize1,
																			this.fontSize2,
																			isEven
																		)
																	);
																	isEven = !isEven;
																} else {
																	this.episodesElem.append(
																		createEpisodesView(
																			this.playController,
																			this.plex,
																			episodeData,
																			this.fontSize1,
																			this.fontSize2
																		)
																	);
																}
															}
														});
														clearInterval(this.episodesLoadTimeout);
														this.episodesLoadTimeout = setTimeout(() => {
															if (this.episodesElem) {
																this.episodesElem.style.transition = `0.7s`;
																if (this.activeMovieElem) {
																	this.episodesElem.style.top = `${top + getHeight(this.activeMovieElem) + 16 * 2}px`;
																} else {
																	this.episodesElem.style.top = `${top + this.minExpandedHeight + 16}px`;
																}

																this.resizeBackground();
															}
														}, 200);
														clearInterval(this.episodesElemFreshlyLoadedTimeout);
														this.episodesElemFreshlyLoadedTimeout = setTimeout(() => {
															this.episodesElemFreshlyLoaded = false;
														}, 700);
													}
												}
											})();
										} else {
											// todo: change title from season and change media type of play button back
											if (this.playController) {
												this.playController.setPlayActionButtonType(childData.type);
											}
											seasonContainer.style.top = `${seasonContainer.dataset.top}px`;
											this.minimizeSeasons();
											this.hideEpisodes();
											this.activeMovieElem.style.display = `block`;
											setTimeout(() => {
												if (this.activeMovieElem) {
													this.activeMovieElem.style.top = `${top + 16}px`;
												}
											}, 10);

											if (this.detailElem && (this.detailElem.children[1] as HTMLElement)) {
												const { year } = (this.detailElem.children[1] as HTMLElement).dataset;
												if (year) {
													(this.detailElem.children[1] as HTMLElement).innerHTML = year;
												}
											}
										}
									}
								}
							});

							this.seasonsElem.append(seasonContainer);
						}
					});

					_.forEach((this.seasonsElem as HTMLElement).children, elem => {
						const seasonElem = elem as HTMLElement;
						const left = seasonElem.offsetLeft;
						const topElem = seasonElem.offsetTop;
						seasonElem.style.left = `${left}px`;
						seasonElem.dataset.left = `${left}`;
						seasonElem.style.top = `${topElem}px`;
						seasonElem.dataset.top = `${topElem}`;
					});
					_.forEach((this.seasonsElem as HTMLElement).children, elem => {
						const seasonElem = elem as HTMLElement;
						seasonElem.style.position = 'absolute';
					});

					clearInterval(this.seasonElemFreshlyLoadedTimeout);
					this.seasonElemFreshlyLoadedTimeout = setTimeout(() => {
						this.seasonElemFreshlyLoaded = false;
					}, 700);

					clearInterval(this.showSeasonElemTimeout);
					this.showSeasonElemTimeout = setTimeout(() => {
						if (this.seasonsElem) {
							this.seasonsElem.style.transition = `0.7s`;
							if (this.activeMovieElem) {
								this.seasonsElem.style.top = `${top + getHeight(this.activeMovieElem) + 16 * 2}px`;
							} else {
								this.seasonsElem.style.top = `${top + this.minExpandedHeight + 16}px`;
							}

							this.resizeBackground();
						}
					}, 200);
				}
			} else {
				this.episodesElemFreshlyLoaded = true;
				if (this.episodesElem) {
					this.episodesElemHidden = false;
					this.episodesElem.style.display = 'block';
					this.episodesElem.innerHTML = '';
					this.episodesElem.style.transition = `0s`;
					this.episodesElem.style.top = `${top + 2000}px`;
					if (_.isEqual(data.type, 'season')) {
						const episodesData = await this.plex.getLibraryData(data.key);
						_.forEach(episodesData, episodeData => {
							if (this.episodesElem && this.playController && this.plex) {
								this.episodesElem.append(
									createEpisodesView(this.playController, this.plex, episodeData, this.fontSize1, this.fontSize2)
								);
							}
						});
					} else if (this.showExtras && !_.isNil(dataDetails.Extras)) {
						const extras = dataDetails.Extras.Metadata;
						_.forEach(extras, extrasData => {
							if (this.episodesElem && this.playController && this.plex) {
								this.episodesElem.append(
									createEpisodesView(this.playController, this.plex, extrasData, this.fontSize1, this.fontSize2)
								);
							}
						});
					}
					clearInterval(this.episodesLoadTimeout);
					this.episodesLoadTimeout = setTimeout(() => {
						if (this.episodesElem) {
							this.episodesElem.style.transition = `0.7s`;
							this.episodesElem.style.top = `${top + this.minExpandedHeight + 16}px`;

							this.resizeBackground();
						}
					}, 200);
					clearInterval(this.episodesElemFreshlyLoadedTimeout);
					this.episodesElemFreshlyLoadedTimeout = setTimeout(() => {
						this.episodesElemFreshlyLoaded = false;
					}, 700);
				}
			}
		}
	};

	resizeBackground = (): void => {
		if (this.seasonsElem && this.episodesElem && this.card) {
			const contentbg = this.getElementsByClassName('contentbg')[0] as HTMLElement;
			this.contentBGHeight = getHeight(contentbg);
			const requiredSeasonBodyHeight =
				parseInt(this.seasonsElem.style.top.replace('px', ''), 10) + this.seasonsElem.scrollHeight;
			const requiredEpisodeBodyHeight =
				parseInt(this.episodesElem.style.top.replace('px', ''), 10) + this.episodesElem.scrollHeight;

			if (requiredSeasonBodyHeight > this.contentBGHeight && !this.seasonsElemHidden) {
				this.card.style.height = `${requiredSeasonBodyHeight + 16}px`;
			} else if (requiredEpisodeBodyHeight > this.contentBGHeight && !this.episodesElemHidden) {
				this.card.style.height = `${requiredEpisodeBodyHeight + 16}px`;
			} else {
				this.card.style.height = '100%';
			}
		}
	};

	showBackground = (): void => {
		const contentbg = this.getElementsByClassName('contentbg');
		(contentbg[0] as HTMLElement).style.zIndex = '2';
		(contentbg[0] as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.9)';
		(contentbg[0] as HTMLElement).style.display = 'block';
	};

	hideBackground = (): void => {
		const contentbg = this.getElementsByClassName('contentbg')[0] as HTMLElement;
		contentbg.classList.remove('no-transparency');
		contentbg.style.zIndex = '1';
		contentbg.style.backgroundColor = 'rgba(0,0,0,0)';
		contentbg.style.display = 'none';
		const contentArt = this.getElementsByClassName('contentArt')[0] as HTMLElement;
		contentArt.style.display = 'none';
	};

	activateMovieElem = (movieElem: HTMLElement): void => {
		const movieElemLocal = movieElem;
		if (movieElem.dataset.clicked === 'true') {
			this.minimizeAll();
			this.activeMovieElem = undefined;
			this.hideDetails();

			setTimeout(() => {
				movieElemLocal.dataset.clicked = 'false';
			}, 500);

			this.hideBackground();
		} else {
			const top = this.getTop();

			movieElemLocal.style.transition = '0s';
			movieElemLocal.style.left = `${movieElemLocal.offsetLeft - this.content.scrollLeft}px`;
			movieElemLocal.style.top = `${movieElemLocal.offsetTop}px`;
			movieElemLocal.style.position = 'absolute';
			movieElemLocal.dataset.left = `${movieElemLocal.offsetLeft}`;
			movieElemLocal.dataset.top = `${movieElemLocal.offsetTop}`;
			movieElemLocal.style.zIndex = '3';
			setTimeout(() => {
				movieElemLocal.style.transition = '0.5s';

				this.showDetails(this.activeMovieElemData);
				this.showBackground();
				if (_.isEqual(movieElem.style.width, movieElem.style.height)) {
					movieElemLocal.style.width = `${this.minExpandedWidth}px`;
					movieElemLocal.style.height = `${this.minExpandedWidth}px`;
				} else {
					movieElemLocal.style.width = `${this.minExpandedWidth}px`;
					movieElemLocal.style.height = `${this.minExpandedHeight}px`;
				}

				movieElemLocal.style.left = '16px';
				movieElemLocal.style.top = `${top + 16}px`;

				movieElemLocal.dataset.clicked = 'true';
				this.activeMovieElem = movieElemLocal;
			}, 1);
		}
	};

	getTop = (): number => {
		if (this.card) {
			const doc = document.documentElement;
			const top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
			const cardTop = getOffset(this.card).top;
			if (top < cardTop - 64) {
				return 0;
			}
			return top - cardTop + 64;
		}
		return 0;
	};

	getMovieElement = (data: any, hasAdditionalData = false): HTMLDivElement => {
		let thumbURL = '';
		if (this.plex) {
			if (_.isEqual(data.type, 'episode')) {
				thumbURL = `${this.plex.getBasicURL()}/photo/:/transcode?width=${this.minExpandedWidth}&height=${
					this.minExpandedHeight
				}&minSize=1&upscale=1&url=${data.grandparentThumb}&X-Plex-Token=${this.config.token}`;
			} else {
				thumbURL = `${this.plex.getBasicURL()}/photo/:/transcode?width=${this.minExpandedWidth}&height=${
					this.minExpandedHeight
				}&minSize=1&upscale=1&url=${data.thumb}&X-Plex-Token=${this.config.token}`;
			}
		}

		const container = document.createElement('div');
		container.className = 'plexMeetsContainer';
		container.style.width = `${CSS_STYLE.width}px`;

		if (this.displayTitleMain || this.displaySubtitleMain) {
			container.style.marginBottom = '10px';
		} else {
			container.style.marginBottom = '5px';
		}
		if (!_.isNil(data.channelCallSign)) {
			container.style.marginBottom = '10px';
		}

		const movieElem = document.createElement('div');
		movieElem.className = 'movieElem';

		movieElem.style.width = `${CSS_STYLE.width}px`;
		movieElem.style.height = `${CSS_STYLE.height}px`;

		if (
			!_.isNil(data.channelCallSign) ||
			_.isEqual(data.type, 'artist') ||
			_.isEqual(data.type, 'album') ||
			_.includes(data.key, 'folder')
		) {
			if (!_.isEqual(data.type, 'artist') && !_.isEqual(data.type, 'album') && !_.includes(data.key, 'folder')) {
				movieElem.style.backgroundSize = '80%';
			}
			movieElem.style.backgroundColor = 'rgba(0,0,0,0.2)';
			movieElem.style.backgroundPosition = 'center';
			movieElem.style.height = `${CSS_STYLE.width}px`;
		}

		movieElem.style.backgroundImage = `url('${thumbURL}')`;
		if (this.playController && !this.playController.isPlaySupported(data)) {
			movieElem.style.cursor = 'pointer';
		}

		movieElem.addEventListener('click', () => {
			this.activeMovieElemData = data;
			this.activateMovieElem(movieElem);
		});

		const interactiveArea = document.createElement('div');

		if (!(data.viewCount && data.viewCount > 0) && data.type === 'movie') {
			const toViewElem = document.createElement('div');
			toViewElem.className = 'toViewEpisode';
			interactiveArea.appendChild(toViewElem);
		}

		if (data.leafCount - data.viewedLeafCount > 0 && data.type === 'show') {
			const toViewElem = document.createElement('div');
			toViewElem.className = 'toViewSeason';
			toViewElem.innerHTML = (data.leafCount - data.viewedLeafCount).toString();
			toViewElem.style.fontSize = `${this.fontSize4}px`;
			toViewElem.style.lineHeight = `${this.fontSize4}px`;
			toViewElem.style.padding = `${this.fontSize4 / 2}px`;
			interactiveArea.appendChild(toViewElem);
		}

		if (data.viewOffset > 0 && data.duration > 0) {
			const toViewElem = document.createElement('div');
			toViewElem.className = 'viewProgress';
			toViewElem.style.width = `${(data.viewOffset / data.duration) * 100}%`;
			interactiveArea.appendChild(toViewElem);
		}

		interactiveArea.className = 'interactiveArea';

		if (this.playController) {
			const playButton = this.playController.getPlayButton(data.type);
			if (this.playController.isPlaySupported(data)) {
				playButton.classList.remove('disabled');
			}
			interactiveArea.append(playButton);

			clickHandler(
				playButton,
				(event: any): void => {
					event.stopPropagation();

					if (this.hassObj && this.playController) {
						this.playController.play(data, true);
					}
				},
				(event: any): void => {
					console.log('Play version... will be here!');
					event.stopPropagation();
				}
			);
		}

		movieElem.append(interactiveArea);

		const titleElem = document.createElement('div');
		if (_.isEqual(data.type, 'episode')) {
			titleElem.innerHTML = escapeHtml(data.grandparentTitle);
		} else if (!_.isNil(data.channelCallSign)) {
			titleElem.innerHTML = escapeHtml(data.channelCallSign);
		} else {
			titleElem.innerHTML = escapeHtml(data.title);
		}
		const margin1 = this.fontSize1 / 4;
		const margin2 = this.fontSize2 / 4;
		titleElem.className = 'titleElem';
		if (!_.isNil(data.channelCallSign)) {
			titleElem.style.marginTop = `0px`;
		} else {
			titleElem.style.marginTop = `${margin1}px`;
		}
		titleElem.style.fontSize = `${this.fontSize1}px`;
		titleElem.style.marginBottom = `${margin1}px`;
		titleElem.style.lineHeight = `${this.fontSize1}px`;

		const yearElem = document.createElement('div');
		if (_.isEqual(data.type, 'episode')) {
			yearElem.innerHTML = escapeHtml(data.title);
		} else if (!_.isNil(data.year)) {
			yearElem.innerHTML = escapeHtml(data.year);
		} else if (!_.isNil(data.epg)) {
			yearElem.innerHTML = escapeHtml(data.epg.title);
		} else {
			yearElem.innerHTML = '&nbsp;';
		}
		yearElem.className = 'yearElem';
		yearElem.style.fontSize = `${this.fontSize2}px`;
		yearElem.style.lineHeight = `${this.fontSize2}px`;
		yearElem.style.marginTop = `${margin2}px`;
		yearElem.style.marginBottom = `${margin2}px`;

		const additionalElem = document.createElement('div');
		if (_.isEqual(data.type, 'episode')) {
			additionalElem.innerHTML = escapeHtml(`S${data.parentIndex} E${data.index}`);
			additionalElem.className = 'additionalElem';
			additionalElem.style.fontSize = `${this.fontSize2}px`;
			additionalElem.style.lineHeight = `${this.fontSize2}px`;
			additionalElem.style.marginTop = `${margin2}px`;
			additionalElem.style.marginBottom = `${margin2}px`;
		}

		container.appendChild(movieElem);
		if (this.displayTitleMain) {
			container.appendChild(titleElem);
		}
		if (this.displaySubtitleMain) {
			container.appendChild(yearElem);
			container.appendChild(additionalElem);
		}

		return container;
	};

	loadCustomStyles = (): string => {
		// this.appendChild(style);
		return `<style>${style.innerHTML}</style>`;
	};

	setConfig = (config: any): void => {
		this.plexProtocol = 'http';
		if (!config.ip) {
			throw new Error('You need to define a Plex IP Address');
		}
		if (!config.token) {
			throw new Error('You need to define a Plex Token');
		}
		if (!config.libraryName) {
			throw new Error('You need to define a libraryName');
		}
		if (!config.entity || config.entity.length === 0) {
			throw new Error('You need to define at least one entity');
		}
		if (_.isPlainObject(config.entity)) {
			let entityDefined = false;
			// eslint-disable-next-line consistent-return
			_.forEach(config.entity, (value, key) => {
				if (supported[key]) {
					entityDefined = true;
					return false;
				}
			});
			if (!entityDefined) {
				throw new Error('You need to define at least one supported entity');
			}
		} else if (!_.isString(config.entity) && !_.isArray(config.entity)) {
			throw new Error('You need to define at least one supported entity');
		}
		this.config = config;
		if (config.protocol) {
			this.plexProtocol = config.protocol;
		}
		if (config.displayType && !_.isEmpty(config.displayType)) {
			this.displayType = config.displayType;
		}
		if (config.useHorizontalScroll && _.isEqual(config.useHorizontalScroll, 'Yes')) {
			this.useHorizontalScroll = true;
		}
		if (config.displayTitleMain && _.isEqual(config.displayTitleMain, 'No')) {
			this.displayTitleMain = false;
		}
		if (config.displaySubtitleMain && _.isEqual(config.displaySubtitleMain, 'No')) {
			this.displaySubtitleMain = false;
		}
		if (config.port && !_.isEqual(config.port, '')) {
			this.plexPort = config.port;
		} else {
			this.plexPort = false;
		}
		if (config.maxCount && config.maxCount !== '') {
			this.maxCount = config.maxCount;
		}
		if (config.maxRows && config.maxRows !== '' && config.maxRows !== '0' && config.maxRows !== 0) {
			this.maxRows = config.maxRows;
		} else {
			this.maxRows = false;
		}

		if (config.minWidth && config.minWidth !== '' && config.minWidth !== '0' && config.minWidth !== 0) {
			this.minWidth = parseInt(config.minWidth, 10);
		}
		if (
			config.minEpisodeWidth &&
			config.minEpisodeWidth !== '' &&
			config.minEpisodeWidth !== '0' &&
			config.minEpisodeWidth !== 0
		) {
			this.minEpisodeWidth = parseInt(config.minEpisodeWidth, 10);
		}

		if (
			config.minExpandedWidth &&
			config.minExpandedWidth !== '' &&
			config.minExpandedWidth !== '0' &&
			config.minExpandedWidth !== 0
		) {
			this.minExpandedWidth = parseInt(config.minExpandedWidth, 10);
		}

		if (config.fontSize1 && config.fontSize1 !== '' && config.fontSize1 !== '0' && config.fontSize1 !== 0) {
			this.fontSize1 = parseInt(config.fontSize1, 10);
		}
		if (config.fontSize2 && config.fontSize2 !== '' && config.fontSize2 !== '0' && config.fontSize2 !== 0) {
			this.fontSize2 = parseInt(config.fontSize2, 10);
		}
		if (config.fontSize3 && config.fontSize3 !== '' && config.fontSize3 !== '0' && config.fontSize3 !== 0) {
			this.fontSize3 = parseInt(config.fontSize3, 10);
		}
		if (config.fontSize4 && config.fontSize4 !== '' && config.fontSize4 !== '0' && config.fontSize4 !== 0) {
			this.fontSize4 = parseInt(config.fontSize4, 10);
		}

		if (
			config.minExpandedHeight &&
			config.minExpandedHeight !== '' &&
			config.minExpandedHeight !== '0' &&
			config.minExpandedHeight !== 0
		) {
			this.minExpandedHeight = parseInt(config.minExpandedHeight, 10);
		}

		if (config.runBefore && !_.isEqual(config.runBefore, '')) {
			this.runBefore = config.runBefore;
		}
		if (config.runAfter && !_.isEqual(config.runAfter, '')) {
			this.runAfter = config.runAfter;
		}
		if (!_.isNil(config.playTrailer)) {
			this.playTrailer = config.playTrailer;
		}
		if (!_.isNil(config.showExtras)) {
			this.showExtras = config.showExtras;
		}
		if (!_.isNil(config.showSearch)) {
			this.showSearch = config.showSearch;
		}

		this.plex = new Plex(this.config.ip, this.plexPort, this.config.token, this.plexProtocol, this.config.sort);
		this.data = {};
		this.error = '';
		this.renderInitialData();
	};

	getCardSize = (): number => {
		return 3;
	};
}

customElements.define('plex-meets-homeassistant-editor', PlexMeetsHomeAssistantEditor);
customElements.define('plex-meets-homeassistant', PlexMeetsHomeAssistant);

window.customCards = window.customCards || [];
window.customCards.push({
	type: 'plex-meets-homeassistant',
	name: 'Plex meets Home Assistant',
	preview: false,
	description: 'Integrates Plex into Home Assistant. Browse and launch media with a simple click.' // Optional
});
