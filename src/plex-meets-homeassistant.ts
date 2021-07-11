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
	fetchEntityRegistry
} from './modules/utils';
import style from './modules/style';

declare global {
	interface Window {
		customCards: any;
	}
}

class PlexMeetsHomeAssistant extends HTMLElement {
	plexProtocol: 'http' | 'https' = 'http';

	plexPort: number | false = false;

	detailsShown = false;

	entityRegistry: Array<Record<string, any>> = [];

	runBefore = '';

	playTrailer: string | boolean = true;

	showExtras = true;

	previousPageWidth = 0;

	runAfter = '';

	renderNewElementsIfNeededTimeout: any;

	columnsCount = 0;

	renderedItems = 0;

	plex: Plex | undefined;

	maxRenderCount: number | boolean = false;

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

	error = '';

	content: any;

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
			this.renderedItems > 0
		) {
			this.maxRenderCount = this.renderedItems - 1 + this.columnsCount * (loadAdditionalRowsCount * 2);

			this.renderMovieElems();
			this.calculatePositions();
		}
	};

	loadInitialData = async (): Promise<void> => {
		if (this.hassObj) {
			this.entityRegistry = await fetchEntityRegistry(this.hassObj.connection);
		}

		window.addEventListener('scroll', () => {
			// todo: improve performance by calculating this when needed only
			if (this.detailsShown && this.activeMovieElem && !isVideoFullScreen(this)) {
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
		});

		if (this.card) {
			this.previousPageWidth = this.card.offsetWidth;
		}
		this.resizeBackground();
		this.initialDataLoaded = true;
	};

	renderInitialData = async (): Promise<void> => {
		let { entity } = JSON.parse(JSON.stringify(this.config));

		const processEntity = (entityObj: Record<string, any>, entityString: string): void => {
			_.forEach(this.entityRegistry, entityInRegister => {
				if (_.isEqual(entityInRegister.entity_id, entityString)) {
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
						default:
						// pass
					}
				}
			});
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
				this.playController = new PlayController(this.hassObj, this.plex, entity, this.runBefore, this.runAfter);
				if (this.playController) {
					await this.playController.init();
				}
				await this.plex.init();

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

				const [serverID, plexSections] = await Promise.all([this.plex.getServerID(), this.plex.getSectionsData()]);
				// eslint-disable-next-line @typescript-eslint/camelcase
				this.data.serverID = serverID;
				_.forEach(plexSections, section => {
					this.data[section.title1] = section.Metadata;
				});

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

		const searchInput = document.createElement('input');
		searchInput.type = 'text';
		searchInput.value = this.searchValue;
		searchInput.placeholder = `Search ${this.config.libraryName}...`;

		searchInput.addEventListener('keyup', () => {
			this.searchValue = searchInput.value;
			this.renderPage();
			this.focus();
			this.renderNewElementsIfNeeded();
		});

		searchContainer.appendChild(searchInput);
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
			const hasEpisodesResult = hasEpisodes(this.data[this.config.libraryName]);
			// eslint-disable-next-line consistent-return
			_.forEach(this.data[this.config.libraryName], (movieData: Record<string, any>) => {
				if (
					(!this.maxCount || this.renderedItems < this.maxCount) &&
					(!this.maxRenderCount || this.renderedItems < this.maxRenderCount)
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
						_.includes(_.toUpper(movieData.grandparentTitle), _.toUpper(this.searchValue))
					) {
						shouldRender = true;
					}
					if (shouldRender) {
						count += 1;
						if (count > this.renderedItems) {
							this.content.appendChild(movieElem);
							this.renderedItems += 1;
						}
					}
					if (lastRowTop !== movieElem.getBoundingClientRect().top) {
						if (lastRowTop !== 0 && this.columnsCount === 0) {
							this.columnsCount = this.renderedItems - 1;
						}
						lastRowTop = movieElem.getBoundingClientRect().top;
						if (!isScrolledIntoView(movieElem) && !this.maxRenderCount && this.renderedItems > 0) {
							this.maxRenderCount = this.renderedItems - 1 + this.columnsCount * loadAdditionalRowsCount;
						}
					}
				} else {
					return true;
				}
			});
		}

		const contentbg = this.getElementsByClassName('contentbg')[0] as HTMLElement;
		this.contentBGHeight = getHeight(contentbg);
	};

	renderPage = (): void => {
		if (this.card) {
			const marginRight = 10; // needs to be equal to .container margin right
			const areaSize =
				this.card.offsetWidth - parseInt(this.card.style.paddingRight, 10) - parseInt(this.card.style.paddingLeft, 10);
			const postersInRow = Math.floor(areaSize / CSS_STYLE.minimumWidth);
			CSS_STYLE.width = areaSize / postersInRow - marginRight;
			CSS_STYLE.height = CSS_STYLE.width * CSS_STYLE.ratio;

			const episodesInRow = Math.floor(areaSize / CSS_STYLE.minimumEpisodeWidth);

			CSS_STYLE.episodeWidth = Math.floor(areaSize / episodesInRow - marginRight);
			CSS_STYLE.episodeHeight = Math.round(CSS_STYLE.episodeWidth * CSS_STYLE.episodeRatio);
		}

		this.renderedItems = 0;
		this.columnsCount = 0;
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
			this.card.appendChild(this.searchInput());
			this.appendChild(this.card);
		}

		this.content = document.createElement('div');
		this.content.innerHTML = this.loadCustomStyles();

		if (this.error !== '') {
			this.content.innerHTML += `Error: ${this.error}`;
		} else if (this.data[this.config.libraryName] && this.data[this.config.libraryName].length === 0) {
			this.content.innerHTML += `Library ${escapeHtml(this.config.libraryName)} has no items.`;
		} else if (this.loading) {
			this.content.style.padding = '16px 16px 16px';
			this.content.appendChild(spinner);
		}

		this.card.appendChild(this.content);

		const contentbg = document.createElement('div');
		contentbg.className = 'contentbg';
		this.content.appendChild(contentbg);

		const contentArt = document.createElement('div');
		contentArt.className = 'contentArt';

		const contentArtBG1 = document.createElement('div');
		contentArtBG1.className = 'videobg1';
		contentArt.appendChild(contentArtBG1);

		const contentArtBG2 = document.createElement('div');
		contentArtBG2.className = 'videobg2';
		contentArt.appendChild(contentArtBG2);

		this.content.appendChild(contentArt);

		this.detailElem = document.createElement('div');
		this.detailElem.className = 'detail';
		this.detailElem.innerHTML = `<h1 class='detailsTitle'></h1>
			<h2 class='detailsYear'></h2>
			<span class='metaInfo'></span>
			<button class='detailPlayAction'>Fullscreen Trailer</button>
			<div class='clear'></div>
			<span class='detailDesc'></span>
			<div class='clear'></div>
			<table>
				<tr>
					<td class='metaInfoDetails'>
						Directed by
					</td>
					<td class='metaInfoDetailsData'>
						...
					</td>
				</tr>
				<tr>
					<td class='metaInfoDetails'>
						Written by
					</td>
					<td class='metaInfoDetailsData'>
						...
					</td>
				</tr>
				<tr>
					<td class='metaInfoDetails'>
						Studio
					</td>
					<td class='metaInfoDetailsData'>
						...
					</td>
				</tr>
				<tr>
					<td class='metaInfoDetails'>
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

		this.content.appendChild(this.detailElem);

		const fullscreenTrailer = this.getElementsByClassName('detailPlayAction')[0] as HTMLElement;
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
		this.content.appendChild(this.seasonsElem);

		this.episodesElem = document.createElement('div');
		this.episodesElem.className = 'episodes';
		this.episodesElem.addEventListener('click', () => {
			this.hideBackground();
			this.minimizeAll();
		});
		this.content.appendChild(this.episodesElem);

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

		this.content.appendChild(this.videoElem);

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
		this.content.appendChild(endElem);

		this.renderMovieElems();
		this.calculatePositions();
		this.loadCustomStyles();
	};

	calculatePositions = (): void => {
		// todo: figure out why interval is needed here and do it properly
		const setLeftOffsetsInterval = setInterval(() => {
			this.movieElems = this.getElementsByClassName('movieElem');
			for (let i = 0; i < this.movieElems.length; i += 1) {
				if (this.movieElems[i].offsetLeft === 0) {
					break;
				} else {
					clearInterval(setLeftOffsetsInterval);
				}
				this.movieElems[i].style.left = `${this.movieElems[i].offsetLeft}px`;
				this.movieElems[i].dataset.left = this.movieElems[i].offsetLeft;
				this.movieElems[i].style.top = `${this.movieElems[i].offsetTop}px`;
				this.movieElems[i].dataset.top = this.movieElems[i].offsetTop;
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
					seasonElemLocal.style.width = `${CSS_STYLE.width}px`;
					seasonElemLocal.style.height = `${CSS_STYLE.height - 3}px`;
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
			if (parseInt(this.movieElems[i].style.width, 10) > CSS_STYLE.width) {
				this.movieElems[i].style.width = `${CSS_STYLE.width}px`;
				this.movieElems[i].style.height = `${CSS_STYLE.height}px`;
				this.movieElems[i].style['z-index'] = 1;
				this.movieElems[i].style.position = 'absolute';
				this.movieElems[i].style.left = `${this.movieElems[i].dataset.left}px`;
				this.movieElems[i].style.top = `${this.movieElems[i].dataset.top}px`;
				this.movieElems[i].dataset.clicked = false;
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
		const fullscreenTrailer = this.getElementsByClassName('detailPlayAction')[0] as HTMLElement;
		fullscreenTrailer.style.visibility = 'hidden';
	};

	showDetails = async (data: any): Promise<void> => {
		this.detailsShown = true;
		const top = this.getTop();
		if (this.detailElem) {
			this.detailElem.style.transition = '0s';
			this.detailElem.style.top = `${top - 1000}px`;
			clearInterval(this.showDetailsTimeout);
			this.showDetailsTimeout = setTimeout(() => {
				if (this.detailElem) {
					this.detailElem.style.visibility = 'visible';
					this.detailElem.style.transition = '0.7s';
					this.detailElem.style.top = `${top}px`;

					const directorElem = this.getElementsByClassName('metaInfoDetailsData')[0] as HTMLElement;
					if (directorElem.parentElement) {
						if (data.Director && data.Director.length > 0) {
							directorElem.innerHTML = escapeHtml(data.Director[0].tag);
							directorElem.parentElement.style.display = 'table-row';
						} else {
							directorElem.parentElement.style.display = 'none';
						}
					}

					const writerElem = this.getElementsByClassName('metaInfoDetailsData')[1] as HTMLElement;
					if (writerElem.parentElement) {
						if (data.Writer && data.Writer.length > 0) {
							writerElem.innerHTML = escapeHtml(data.Writer[0].tag);
							writerElem.parentElement.style.display = 'table-row';
						} else {
							writerElem.parentElement.style.display = 'none';
						}
					}
					const studioElem = this.getElementsByClassName('metaInfoDetailsData')[2] as HTMLElement;
					if (studioElem.parentElement) {
						if (data.studio) {
							studioElem.innerHTML = escapeHtml(data.studio);
							studioElem.parentElement.style.display = 'table-row';
						} else {
							studioElem.parentElement.style.display = 'none';
						}
					}
					const genreElem = this.getElementsByClassName('metaInfoDetailsData')[3] as HTMLElement;
					if (genreElem.parentElement) {
						if (data.Genre && data.Genre.length > 0) {
							let genre = '';
							_.forEach(data.Genre, tag => {
								genre += `${tag.tag}, `;
							});
							genreElem.innerHTML = escapeHtml(genre.slice(0, -2));
							genreElem.parentElement.style.display = 'table-row';
						} else {
							genreElem.parentElement.style.display = 'none';
						}
					}
					(this.getElementsByClassName('detailsTitle')[0] as HTMLElement).innerHTML = escapeHtml(data.title);
					(this.getElementsByClassName('detailsYear')[0] as HTMLElement).innerHTML = escapeHtml(data.year);
					(this.getElementsByClassName('metaInfo')[0] as HTMLElement).innerHTML = `${(data.duration !== undefined
						? `<span class='minutesDetail'>${Math.round(
								parseInt(escapeHtml(data.duration), 10) / 60 / 1000
						  )} min</span>`
						: '') +
						(data.contentRating !== undefined
							? `<span class='contentRatingDetail'>${escapeHtml(data.contentRating)}</span>`
							: '') +
						(data.rating !== undefined
							? `<span class='ratingDetail'>${data.rating < 5 ? '&#128465;' : '&#11088;'}&nbsp;${Math.round(
									parseFloat(escapeHtml(data.rating)) * 10
							  ) / 10}</span>`
							: '')}<div class='clear'></div>`;
					(this.getElementsByClassName('detailDesc')[0] as HTMLElement).innerHTML = escapeHtml(data.summary);

					/* todo temp disabled
					if (data.type === 'movie') {
						(this.detailElem.children[5] as HTMLElement).style.visibility = 'visible';
						this.detailElem.children[5].innerHTML = 'Play';
					} else {
						(this.detailElem.children[5] as HTMLElement).style.visibility = 'hidden';
					}
					*/

					this.detailElem.style.color = 'rgba(255,255,255,1)';
					this.detailElem.style.zIndex = '4';
				}
			}, 200);
		}
		if (this.plex) {
			let seasonsData: Record<string, any> = {};
			if (_.isEqual(data.type, 'episode')) {
				seasonsData = await this.plex.getLibraryData(data.grandparentKey.split('/')[3]);
			} else if (data.childCount > 0) {
				seasonsData = await this.plex.getLibraryData(data.key.split('/')[3]);
			}
			const dataDetails = await this.plex.getDetails(data.key.split('/')[3]);
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
							const fullscreenTrailer = this.getElementsByClassName('detailPlayAction')[0] as HTMLElement;
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
			if (!_.isEmpty(seasonsData)) {
				this.seasonElemFreshlyLoaded = true;
				if (this.seasonsElem) {
					this.seasonsElem.style.display = 'block';
					this.seasonsElem.innerHTML = '';
					this.seasonsElem.style.transition = `0s`;
					this.seasonsElem.style.top = `${top + 2000}px`;
				}

				_.forEach(seasonsData, seasonData => {
					if (this.seasonsElem && this.plex) {
						this.seasonsElemHidden = false;
						const seasonContainer = document.createElement('div');
						seasonContainer.className = 'seasonContainer';
						seasonContainer.style.width = `${CSS_STYLE.width}px`;
						const thumbURL = `${this.plex.getBasicURL()}/photo/:/transcode?width=${CSS_STYLE.expandedWidth}&height=${
							CSS_STYLE.expandedHeight
						}&minSize=1&upscale=1&url=${seasonData.thumb}&X-Plex-Token=${this.config.token}`;

						const seasonElem = document.createElement('div');
						seasonElem.className = 'seasonElem';
						seasonElem.style.width = `${CSS_STYLE.width}px`;
						seasonElem.style.height = `${CSS_STYLE.height - 3}px`;
						seasonElem.style.backgroundImage = `url('${thumbURL}')`;
						seasonElem.dataset.clicked = 'false';

						if (this.playController && !this.playController.isPlaySupported(seasonData)) {
							seasonElem.style.cursor = 'pointer';
						}

						const interactiveArea = document.createElement('div');
						interactiveArea.className = 'interactiveArea';
						if (seasonData.leafCount - seasonData.viewedLeafCount > 0) {
							const toViewElem = document.createElement('div');
							toViewElem.className = 'toViewSeason';
							toViewElem.innerHTML = (seasonData.leafCount - seasonData.viewedLeafCount).toString();
							interactiveArea.appendChild(toViewElem);
						}

						if (this.playController && this.playController.isPlaySupported(seasonData)) {
							const playButton = this.getPlayButton();
							playButton.addEventListener('click', event => {
								event.stopPropagation();
								if (this.plex && this.playController) {
									this.playController.play(seasonData, true);
								}
							});

							interactiveArea.append(playButton);
						}
						seasonElem.append(interactiveArea);
						seasonContainer.append(seasonElem);

						const seasonTitleElem = document.createElement('div');
						seasonTitleElem.className = 'seasonTitleElem';
						seasonTitleElem.innerHTML = escapeHtml(seasonData.title);
						seasonContainer.append(seasonTitleElem);

						const seasonEpisodesCount = document.createElement('div');
						seasonEpisodesCount.className = 'seasonEpisodesCount';
						seasonEpisodesCount.innerHTML = `${escapeHtml(seasonData.leafCount)} episodes`;
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

										seasonContainer.style.top = `${-CSS_STYLE.expandedHeight}px`;
										seasonElem.style.width = `${CSS_STYLE.expandedWidth}px`;
										seasonElem.style.height = `${CSS_STYLE.expandedHeight - 6}px`;
										seasonElem.style.zIndex = '3';

										seasonElem.style.marginLeft = `-${getOffset(seasonElem).left -
											getOffset(this.activeMovieElem).left}px`;

										seasonTitleElem.style.color = 'rgba(255,255,255,0)';
										seasonEpisodesCount.style.color = 'rgba(255,255,255,0)';

										if (this.detailElem) {
											(this.detailElem.children[1] as HTMLElement).innerHTML = seasonData.title;
										}
										(async (): Promise<void> => {
											if (seasonData.leafCount > 0 && this.plex) {
												this.episodesElemFreshlyLoaded = true;
												const episodesData = await this.plex.getLibraryData(seasonData.key.split('/')[3]);
												if (this.episodesElem) {
													this.episodesElemHidden = false;
													this.episodesElem.style.display = 'block';
													this.episodesElem.innerHTML = '';
													this.episodesElem.style.transition = `0s`;
													this.episodesElem.style.top = `${top + 2000}px`;
													_.forEach(episodesData, episodeData => {
														if (this.episodesElem && this.playController && this.plex) {
															this.episodesElem.append(createEpisodesView(this.playController, this.plex, episodeData));
														}
													});
													clearInterval(this.episodesLoadTimeout);
													this.episodesLoadTimeout = setTimeout(() => {
														if (this.episodesElem) {
															this.episodesElem.style.transition = `0.7s`;
															this.episodesElem.style.top = `${top + CSS_STYLE.expandedHeight + 16}px`;

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
						this.seasonsElem.style.top = `${top + CSS_STYLE.expandedHeight + 16}px`;

						this.resizeBackground();
					}
				}, 200);
			} else {
				this.episodesElemFreshlyLoaded = true;
				if (this.episodesElem) {
					this.episodesElemHidden = false;
					this.episodesElem.style.display = 'block';
					this.episodesElem.innerHTML = '';
					this.episodesElem.style.transition = `0s`;
					this.episodesElem.style.top = `${top + 2000}px`;
					if (_.isEqual(data.type, 'season')) {
						const episodesData = await this.plex.getLibraryData(data.key.split('/')[3]);
						_.forEach(episodesData, episodeData => {
							if (this.episodesElem && this.playController && this.plex) {
								this.episodesElem.append(createEpisodesView(this.playController, this.plex, episodeData));
							}
						});
					} else if (this.showExtras) {
						const extras = dataDetails.Extras.Metadata;
						_.forEach(extras, extrasData => {
							if (this.episodesElem && this.playController && this.plex) {
								this.episodesElem.append(createEpisodesView(this.playController, this.plex, extrasData));
							}
						});
					}
					clearInterval(this.episodesLoadTimeout);
					this.episodesLoadTimeout = setTimeout(() => {
						if (this.episodesElem) {
							this.episodesElem.style.transition = `0.7s`;
							this.episodesElem.style.top = `${top + CSS_STYLE.expandedHeight + 16}px`;

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
	};

	hideBackground = (): void => {
		const contentbg = this.getElementsByClassName('contentbg')[0] as HTMLElement;
		contentbg.classList.remove('no-transparency');
		contentbg.style.zIndex = '1';
		contentbg.style.backgroundColor = 'rgba(0,0,0,0)';
		const contentArt = this.getElementsByClassName('contentArt')[0] as HTMLElement;
		contentArt.style.display = 'none';
	};

	activateMovieElem = (movieElem: HTMLElement): void => {
		const movieElemLocal = movieElem;
		if (movieElem.dataset.clicked === 'true') {
			this.minimizeAll();
			this.activeMovieElem = undefined;
			this.hideDetails();
			movieElemLocal.style.width = `${CSS_STYLE.width}px`;
			movieElemLocal.style.height = `${CSS_STYLE.height}px`;
			movieElemLocal.style.zIndex = '1';
			movieElemLocal.style.top = `${movieElem.dataset.top}px`;
			movieElemLocal.style.left = `${movieElem.dataset.left}px`;

			setTimeout(() => {
				movieElemLocal.dataset.clicked = 'false';
			}, 500);

			this.hideBackground();
		} else {
			const top = this.getTop();
			this.showDetails(this.activeMovieElemData);
			this.showBackground();
			movieElemLocal.style.width = `${CSS_STYLE.expandedWidth}px`;
			movieElemLocal.style.height = `${CSS_STYLE.expandedHeight}px`;
			movieElemLocal.style.zIndex = '3';
			movieElemLocal.style.left = '16px';
			movieElemLocal.style.top = `${top + 16}px`;
			movieElemLocal.dataset.clicked = 'true';
			this.activeMovieElem = movieElemLocal;
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
				thumbURL = `${this.plex.getBasicURL()}/photo/:/transcode?width=${CSS_STYLE.expandedWidth}&height=${
					CSS_STYLE.expandedHeight
				}&minSize=1&upscale=1&url=${data.grandparentThumb}&X-Plex-Token=${this.config.token}`;
			} else {
				thumbURL = `${this.plex.getBasicURL()}/photo/:/transcode?width=${CSS_STYLE.expandedWidth}&height=${
					CSS_STYLE.expandedHeight
				}&minSize=1&upscale=1&url=${data.thumb}&X-Plex-Token=${this.config.token}`;
			}
		}

		const container = document.createElement('div');
		container.className = 'container';
		container.style.width = `${CSS_STYLE.width}px`;
		if (hasAdditionalData) {
			container.style.height = `${CSS_STYLE.height + 50}px`;
		} else {
			container.style.height = `${CSS_STYLE.height + 30}px`;
		}

		const movieElem = document.createElement('div');
		movieElem.className = 'movieElem';

		movieElem.style.width = `${CSS_STYLE.width}px`;
		movieElem.style.height = `${CSS_STYLE.height}px`;
		movieElem.style.backgroundImage = `url('${thumbURL}')`;
		if (this.playController && !this.playController.isPlaySupported(data)) {
			movieElem.style.cursor = 'pointer';
		}

		movieElem.addEventListener('click', () => {
			this.activeMovieElemData = data;
			this.activateMovieElem(movieElem);
		});

		const playButton = this.getPlayButton();
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
			interactiveArea.appendChild(toViewElem);
		}

		if (data.viewOffset > 0 && data.duration > 0) {
			const toViewElem = document.createElement('div');
			toViewElem.className = 'viewProgress';
			toViewElem.style.width = `${(data.viewOffset / data.duration) * 100}%`;
			interactiveArea.appendChild(toViewElem);
		}

		interactiveArea.className = 'interactiveArea';
		if (this.playController && this.playController.isPlaySupported(data)) {
			interactiveArea.append(playButton);
		}

		movieElem.append(interactiveArea);

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

		const titleElem = document.createElement('div');
		if (_.isEqual(data.type, 'episode')) {
			titleElem.innerHTML = escapeHtml(data.grandparentTitle);
		} else {
			titleElem.innerHTML = escapeHtml(data.title);
		}
		titleElem.className = 'titleElem';
		titleElem.style.marginTop = `${CSS_STYLE.height}px`;

		const yearElem = document.createElement('div');
		if (_.isEqual(data.type, 'episode')) {
			yearElem.innerHTML = escapeHtml(data.title);
		} else {
			yearElem.innerHTML = escapeHtml(data.year);
		}
		yearElem.className = 'yearElem';

		const additionalElem = document.createElement('div');
		if (_.isEqual(data.type, 'episode')) {
			additionalElem.innerHTML = escapeHtml(`S${data.parentIndex} E${data.index}`);
			additionalElem.className = 'additionalElem';
		}

		container.appendChild(movieElem);
		container.appendChild(titleElem);
		container.appendChild(yearElem);
		container.appendChild(additionalElem);

		return container;
	};

	loadCustomStyles = (): string => {
		// this.appendChild(style);
		return `<style>${style.innerHTML}</style>`;
	};

	getPlayButton = (): HTMLButtonElement => {
		const playButton = document.createElement('button');
		playButton.name = 'playButton';
		return playButton;
	};

	setConfig = (config: any): void => {
		this.plexProtocol = 'http';
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
		if (!config.token) {
			throw new Error('You need to define a token');
		}
		if (!config.ip) {
			throw new Error('You need to define a ip');
		}
		if (!config.libraryName) {
			throw new Error('You need to define a libraryName');
		}
		this.config = config;
		if (config.protocol) {
			this.plexProtocol = config.protocol;
		}
		if (config.port) {
			this.plexPort = config.port;
		}
		if (config.maxCount && config.maxCount !== '') {
			this.maxCount = config.maxCount;
		}
		if (config.runBefore) {
			this.runBefore = config.runBefore;
		}
		if (config.runAfter) {
			this.runAfter = config.runAfter;
		}
		if (!_.isNil(config.playTrailer)) {
			this.playTrailer = config.playTrailer;
		}
		if (!_.isNil(config.showExtras)) {
			this.showExtras = config.showExtras;
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
