/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env browser */
import { HomeAssistant } from 'custom-card-helpers';
import _ from 'lodash';
import { supported, CSS_STYLE } from './const';
import Plex from './modules/Plex';
import PlayController from './modules/PlayController';
import {
	escapeHtml,
	getOffset,
	isScrolledIntoView,
	getHeight,
	createEpisodesView,
	findTrailerURL,
	isVideoFullScreen
} from './modules/utils';
import style from './modules/style';

class PlexMeetsHomeAssistant extends HTMLElement {
	plexProtocol: 'http' | 'https' = 'http';

	detailsShown = false;

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

	previousPositions: Array<any> = [];

	hassObj: HomeAssistant | undefined;

	contentBGHeight = 0;

	card: HTMLElement | undefined;

	set hass(hass: HomeAssistant) {
		this.hassObj = hass;
		if (this.plex) {
			this.playController = new PlayController(this.hassObj, this.plex, this.config.entity);
		}

		if (!this.content) {
			this.error = '';
			if (!this.loading) {
				this.loadInitialData();
			}
		}
	}

	renderNewElementsIfNeeded = (): void => {
		const loadAdditionalRowsCount = 2; // todo: make this configurable
		const height = getHeight(this.content);
		if (
			!this.detailsShown &&
			window.innerHeight + window.scrollY > height + getOffset(this.content).top - 300 &&
			this.renderedItems > 0
		) {
			console.log('renderNewElementsIfNeeded');
			this.maxRenderCount = this.renderedItems - 1 + this.columnsCount * (loadAdditionalRowsCount * 2);

			this.renderMovieElems();
			this.calculatePositions();
		}
	};

	loadInitialData = async (): Promise<void> => {
		window.addEventListener('scroll', () => {
			this.renderNewElementsIfNeeded();
		});
		window.addEventListener('resize', () => {
			this.renderNewElementsIfNeeded();
		});
		this.loading = true;
		this.renderPage();
		try {
			if (this.plex) {
				await this.plex.init();
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
				throw Error('Plex not initialized.');
			}
		} catch (err) {
			this.error = `Plex server did not respond.<br/>Details of the error: ${escapeHtml(err.message)}`;
			this.renderPage();
		}
	};

	render = (): void => {
		this.previousPositions = [];

		// todo: find a better way to detect resize...
		setInterval(() => {
			if (!this.detailsShown) {
				const videoPlayer = this.getElementsByClassName('videoPlayer')[0] as HTMLElement;
				let isFullScreen = false;
				if (videoPlayer.children.length > 0) {
					isFullScreen = isVideoFullScreen(this);
				}

				if (this.movieElems.length > 0 && !isFullScreen) {
					let renderNeeded = false;
					if (this.previousPositions.length === 0) {
						for (let i = 0; i < this.movieElems.length; i += 1) {
							this.previousPositions[i] = {};
							this.previousPositions[i].top = this.movieElems[i].parentElement.offsetTop;
							this.previousPositions[i].left = this.movieElems[i].parentElement.offsetLeft;
						}
					}
					for (let i = 0; i < this.movieElems.length; i += 1) {
						if (
							this.previousPositions[i] &&
							this.movieElems[i].dataset.clicked !== 'true' &&
							(this.previousPositions[i].top !== this.movieElems[i].parentElement.offsetTop ||
								this.previousPositions[i].left !== this.movieElems[i].parentElement.offsetLeft)
						) {
							renderNeeded = true;
							this.previousPositions = [];
						}
					}
					if (renderNeeded) {
						this.renderPage();
						const contentbg = this.getElementsByClassName('contentbg');
						this.contentBGHeight = getHeight(contentbg[0] as HTMLElement);
					}
				}
			}
		}, 250);

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
			// eslint-disable-next-line consistent-return
			_.forEach(this.data[this.config.libraryName], (movieData: Record<string, any>) => {
				if (
					(!this.maxCount || this.renderedItems < this.maxCount) &&
					(!this.maxRenderCount || this.renderedItems < this.maxRenderCount)
				) {
					const movieElem = this.getMovieElement(movieData);
					let shouldRender = false;
					if (this.looseSearch) {
						let found = false;
						// eslint-disable-next-line consistent-return
						_.forEach(searchValues, value => {
							if (!_.isEmpty(value) && _.includes(_.toUpper(movieData.title), _.toUpper(value))) {
								found = true;
								return false;
							}
						});
						if (found || _.isEmpty(searchValues[0])) {
							shouldRender = true;
						}
					} else if (_.includes(_.toUpper(movieData.title), _.toUpper(this.searchValue))) {
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

		this.detailElem = document.createElement('div');
		this.detailElem.className = 'detail';
		this.detailElem.innerHTML =
			"<h1></h1><h2></h2><span class='metaInfo'></span><span class='detailDesc'></span><div class='clear'></div><button class='detailPlayAction'>Fullscreen Trailer</button>";

		this.content.appendChild(this.detailElem);

		const fullscreenTrailer = this.getElementsByClassName('detailPlayAction')[0] as HTMLElement;
		fullscreenTrailer.addEventListener('click', () => {
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
					const videobg1 = this.getElementsByClassName('videobg1')[0] as HTMLElement;
					const videobg2 = this.getElementsByClassName('videobg2')[0] as HTMLElement;
					videobg1.classList.add('transparent');
					videobg2.classList.add('transparent');

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

				const videobg1 = this.getElementsByClassName('videobg1')[0] as HTMLElement;
				const videobg2 = this.getElementsByClassName('videobg2')[0] as HTMLElement;
				videobg1.classList.remove('transparent');
				videobg2.classList.remove('transparent');
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

			const videobg1 = this.getElementsByClassName('videobg1')[0] as HTMLElement;
			const videobg2 = this.getElementsByClassName('videobg2')[0] as HTMLElement;
			videobg1.classList.remove('transparent');
			videobg2.classList.remove('transparent');
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

					this.detailElem.children[0].innerHTML = escapeHtml(data.title);
					this.detailElem.children[1].innerHTML = escapeHtml(data.year);
					(this.detailElem.children[1] as HTMLElement).dataset.year = escapeHtml(data.year);
					console.log(data.rating);
					this.detailElem.children[2].innerHTML = `${(data.duration !== undefined
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
					this.detailElem.children[3].innerHTML = escapeHtml(data.summary);
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
			if (data.childCount > 0) {
				this.seasonElemFreshlyLoaded = true;
				const seasonsData = await this.plex.getLibraryData(data.key.split('/')[3]);
				if (this.seasonsElem) {
					this.seasonsElem.style.display = 'block';
					this.seasonsElem.innerHTML = '';
					this.seasonsElem.style.transition = `0s`;
					this.seasonsElem.style.top = `${top + 2000}px`;
				}

				_.forEach(seasonsData, seasonData => {
					if (this.seasonsElem) {
						this.seasonsElemHidden = false;
						const seasonContainer = document.createElement('div');
						seasonContainer.className = 'seasonContainer';
						seasonContainer.style.width = `${CSS_STYLE.width}px`;
						const thumbURL = `${this.plexProtocol}://${this.config.ip}:${this.config.port}/photo/:/transcode?width=${CSS_STYLE.expandedWidth}&height=${CSS_STYLE.expandedHeight}&minSize=1&upscale=1&url=${seasonData.thumb}&X-Plex-Token=${this.config.token}`;

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
														if (this.episodesElem && this.playController) {
															this.episodesElem.append(
																createEpisodesView(
																	this.playController,
																	this.plexProtocol,
																	this.config.ip,
																	this.config.port,
																	this.config.token,
																	episodeData
																)
															);
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
				const movieDetails = await this.plex.getDetails(data.key.split('/')[3]);
				if (this.videoElem) {
					const trailerURL = findTrailerURL(movieDetails);
					if (trailerURL !== '') {
						const videoPlayer = this.getElementsByClassName('videoPlayer')[0] as HTMLElement;
						const video = document.createElement('video');
						video.style.height = '100%';
						video.style.width = '100%';
						video.controls = false;
						const source = document.createElement('source');
						source.type = 'video/mp4';
						source.src = this.plex.authorizeURL(
							`${this.plex.getBasicURL()}${movieDetails.Extras.Metadata[0].Media[0].Part[0].key}`
						);
						video.appendChild(source);
						videoPlayer.appendChild(video);

						video.load();
						video.play();
						let playingFired = false;

						const videobg1 = this.getElementsByClassName('videobg1')[0] as HTMLElement;
						const videobg2 = this.getElementsByClassName('videobg2')[0] as HTMLElement;
						video.addEventListener('click', event => {
							if (isVideoFullScreen(this)) {
								event.stopPropagation();
							}
						});
						const fullScreenChangeAction = () => {
							if (this.videoElem) {
								if (isVideoFullScreen(this)) {
									videobg1.classList.add('transparent');
									videobg2.classList.add('transparent');

									this.videoElem.classList.add('maxZIndex');
									video.controls = true;
								} else {
									videobg1.classList.remove('transparent');
									videobg2.classList.remove('transparent');

									this.videoElem.classList.remove('maxZIndex');
									video.controls = false;
									window.scroll({
										top: getOffset(this.activeMovieElem as Element).top - 70,
										behavior: 'smooth'
									});
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
					}
				}

				const extras = movieDetails.Extras.Metadata;

				this.episodesElemFreshlyLoaded = true;
				if (this.episodesElem) {
					this.episodesElemHidden = false;
					this.episodesElem.style.display = 'block';
					this.episodesElem.innerHTML = '';
					this.episodesElem.style.transition = `0s`;
					this.episodesElem.style.top = `${top + 2000}px`;

					_.forEach(extras, extrasData => {
						if (this.episodesElem && this.playController) {
							this.episodesElem.append(
								createEpisodesView(
									this.playController,
									this.plexProtocol,
									this.config.ip,
									this.config.port,
									this.config.token,
									extrasData
								)
							);
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
		}
	};

	resizeBackground = (): void => {
		if (this.seasonsElem && this.episodesElem && this.card) {
			const contentbg = this.getElementsByClassName('contentbg')[0] as HTMLElement;
			if (this.contentBGHeight === 0) {
				this.contentBGHeight = getHeight(contentbg);
			}
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

	getMovieElement = (data: any): HTMLDivElement => {
		const thumbURL = `${this.plexProtocol}://${this.config.ip}:${this.config.port}/photo/:/transcode?width=${CSS_STYLE.expandedWidth}&height=${CSS_STYLE.expandedHeight}&minSize=1&upscale=1&url=${data.thumb}&X-Plex-Token=${this.config.token}`;

		const container = document.createElement('div');
		container.className = 'container';
		container.style.width = `${CSS_STYLE.width}px`;
		container.style.height = `${CSS_STYLE.height + 30}px`;

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

		interactiveArea.className = 'interactiveArea';
		if (this.playController && this.playController.isPlaySupported(data)) {
			interactiveArea.append(playButton);
		}

		movieElem.append(interactiveArea);

		playButton.addEventListener('click', event => {
			event.stopPropagation();

			if (this.hassObj && this.playController) {
				this.playController.play(data, true);
			}
		});

		const titleElem = document.createElement('div');
		titleElem.innerHTML = escapeHtml(data.title);
		titleElem.className = 'titleElem';
		titleElem.style.marginTop = `${CSS_STYLE.height}px`;

		const yearElem = document.createElement('div');
		yearElem.innerHTML = escapeHtml(data.year);
		yearElem.className = 'yearElem';

		container.appendChild(movieElem);
		container.appendChild(titleElem);
		container.appendChild(yearElem);

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
		if (!config.entity || config.entity.length === 0 || !_.isObject(config.entity)) {
			throw new Error('You need to define at least one entity');
		}
		if (_.isObject(config.entity)) {
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
		}
		if (!config.token) {
			throw new Error('You need to define a token');
		}
		if (!config.ip) {
			throw new Error('You need to define a ip');
		}
		if (!config.port) {
			throw new Error('You need to define a port');
		}
		if (!config.libraryName) {
			throw new Error('You need to define a libraryName');
		}
		this.config = config;
		if (config.protocol) {
			this.plexProtocol = config.protocol;
		}
		if (config.maxCount) {
			this.maxCount = config.maxCount;
		}

		this.plex = new Plex(this.config.ip, this.config.port, this.config.token, this.plexProtocol, this.config.sort);
	};

	getCardSize = (): number => {
		return 3;
	};
}

customElements.define('plex-meets-homeassistant', PlexMeetsHomeAssistant);
