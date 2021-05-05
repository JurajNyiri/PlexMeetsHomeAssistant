/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env browser */
import { HomeAssistant } from 'custom-card-helpers';
import _ from 'lodash';
import Plex from './modules/Plex';
import PlayController from './modules/PlayController';
import { escapeHtml } from './modules/utils';
import { CSS_STYLE, LOREM_IPSUM } from './const';
import style from './modules/style';

class PlexMeetsHomeAssistant extends HTMLElement {
	plexProtocol: 'http' | 'https' = 'http';

	plex: Plex | undefined;

	playController: PlayController | undefined;

	movieElems: any = [];

	seasonElemFreshlyLoaded = false;

	detailElem: HTMLElement | undefined;

	seasonsElem: HTMLElement | undefined;

	data: Record<string, any> = {};

	config: Record<string, any> = {};

	requestTimeout = 3000;

	loading = false;

	maxCount: false | number = false;

	playSupported = false;

	error = '';

	content: any;

	previousPositions: Array<any> = [];

	hassObj: HomeAssistant | undefined;

	set hass(hass: HomeAssistant) {
		this.hassObj = hass;
		if (this.plex) {
			this.playController = new PlayController(this.hassObj, this.plex, this.config.entity_id);
		}

		if (!this.content) {
			if (this.playController) {
				this.playSupported = this.playController.isPlaySupported();
			}

			this.error = '';
			if (!this.loading) {
				this.loadInitialData();
			}
		}
	}

	loadInitialData = async (): Promise<void> => {
		this.loading = true;
		this.renderPage();
		try {
			if (this.plex) {
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
			// todo: proper timeout here
			this.error = `Plex server did not respond.<br/>Details of the error: ${escapeHtml(err.message)}`;
			this.renderPage();
		}
	};

	render = (): void => {
		this.previousPositions = [];

		// todo: find a better way to detect resize...
		setInterval(() => {
			if (this.movieElems.length > 0) {
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
				}
			}
		}, 100);

		this.renderPage();
	};

	renderPage = (): void => {
		if (this) this.innerHTML = '';
		const card = document.createElement('ha-card');
		// card.header = this.config.libraryName;
		this.content = document.createElement('div');
		this.content.style.padding = '16px 16px 100px';

		this.content.innerHTML = '';
		if (this.error !== '') {
			this.content.innerHTML = `Error: ${this.error}`;
		} else if (this.data[this.config.libraryName] && this.data[this.config.libraryName].length === 0) {
			this.content.innerHTML = `Library ${escapeHtml(this.config.libraryName)} has no items.`;
		} else if (this.loading) {
			this.content.style.padding = '16px 16px 16px';
			this.content.innerHTML =
				'<div style="display: flex; align-items: center; justify-content: center;"><div class="lds-ring"><div></div><div></div><div></div><div></div></div></div>';
		}

		card.appendChild(this.content);
		this.appendChild(card);

		let count = 0;

		const contentbg = document.createElement('div');
		contentbg.className = 'contentbg';
		this.content.appendChild(contentbg);

		this.detailElem = document.createElement('div');
		this.detailElem.className = 'detail';
		this.detailElem.innerHTML =
			"<h1></h1><h2></h2><span class='metaInfo'></span><span class='detailDesc'></span><div class='clear'></div>";

		if (this.playSupported) {
			// todo: temp disabled
			// this.detailElem.innerHTML += "<span class='detailPlayAction'></span>";
		}

		this.content.appendChild(this.detailElem);

		this.seasonsElem = document.createElement('div');
		this.seasonsElem.className = 'seasons';
		this.seasonsElem.addEventListener('click', () => {
			this.hideBackground();
			this.minimizeAll();
		});
		this.content.appendChild(this.seasonsElem);

		// todo: figure out why timeout is needed here and do it properly
		setTimeout(() => {
			contentbg.addEventListener('click', () => {
				this.hideBackground();
				this.minimizeAll();
			});
		}, 1);
		if (this.data[this.config.libraryName]) {
			// eslint-disable-next-line consistent-return
			_.forEach(this.data[this.config.libraryName], (movieData: Record<string, any>) => {
				if (!this.maxCount || count < this.maxCount) {
					count += 1;
					this.content.appendChild(this.getMovieElement(movieData, this.data.serverID));
				} else {
					return true;
				}
			});
		}
		const endElem = document.createElement('div');
		endElem.className = 'clear';
		this.content.appendChild(endElem);

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

	minimizeAll = (): void => {
		for (let i = 0; i < this.movieElems.length; i += 1) {
			if (this.movieElems[i].dataset.clicked === 'true') {
				this.movieElems[i].style.width = `${CSS_STYLE.width}px`;
				this.movieElems[i].style.height = `${CSS_STYLE.height}px`;
				this.movieElems[i].style['z-index'] = 1;
				this.movieElems[i].style.position = 'absolute';
				this.movieElems[i].style.left = `${this.movieElems[i].dataset.left}px`;
				this.movieElems[i].style.top = `${this.movieElems[i].dataset.top}px`;
				setTimeout(() => {
					this.movieElems[i].dataset.clicked = false;
				}, 500);
			}
		}
		if (this.seasonsElem) {
			const doc = document.documentElement;
			const top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
			this.seasonsElem.style.top = `${top + 2000}px`;
			setTimeout(() => {
				if (this.seasonsElem && !this.seasonElemFreshlyLoaded) {
					this.seasonsElem.innerHTML = '';
					this.seasonsElem.style.display = 'none';
					// fix for a specific case when user scrolls outside of normal home assistant area for seasons look
					const contentbg = this.getElementsByClassName('contentbg');
					(contentbg[0] as HTMLElement).style.height = '100%';
				}
			}, 700);
		}

		this.hideDetails();
	};

	hideDetails = (): void => {
		const doc = document.documentElement;
		const top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
		if (this.detailElem) {
			this.detailElem.style.top = `${top - 1000}px`;
			this.detailElem.style.color = 'rgba(255,255,255,0)';
			this.detailElem.style.zIndex = '0';
			this.detailElem.style.visibility = 'hidden';
		}
	};

	showDetails = async (data: any): Promise<void> => {
		const doc = document.documentElement;
		const top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
		if (this.detailElem) {
			this.detailElem.style.transition = '0s';
			this.detailElem.style.top = `${top - 1000}px`;

			setTimeout(() => {
				if (this.detailElem) {
					this.detailElem.style.visibility = 'visible';
					this.detailElem.style.transition = '0.7s';
					this.detailElem.style.top = `${top}px`;

					this.detailElem.children[0].innerHTML = escapeHtml(data.title);
					this.detailElem.children[1].innerHTML = escapeHtml(data.year);
					this.detailElem.children[2].innerHTML = `${(data.duration !== undefined
						? `<span class='minutesDetail'>${Math.round(
								parseInt(escapeHtml(data.duration), 10) / 60 / 1000
						  )} min</span>`
						: '') +
						(data.contentRating !== undefined
							? `<span class='contentRatingDetail'>${escapeHtml(data.contentRating)}</span>`
							: '') +
						(data.rating !== undefined
							? `<span class='ratingDetail'>${data.rating < 5 ? '&#128465;' : '&#11088;'}&nbsp;${escapeHtml(
									data.rating
							  )}</span>`
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
		if (this.plex && data.childCount > 0) {
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
					const seasonContainer = document.createElement('div');
					seasonContainer.className = 'seasonContainer';
					seasonContainer.style.width = `${CSS_STYLE.width}px`;
					const thumbURL = `${this.plexProtocol}://${this.config.ip}:${this.config.port}/photo/:/transcode?width=${CSS_STYLE.expandedWidth}&height=${CSS_STYLE.expandedHeight}&minSize=1&upscale=1&url=${seasonData.thumb}&X-Plex-Token=${this.config.token}`;

					const seasonElem = document.createElement('div');
					seasonElem.className = 'seasonElem';
					seasonElem.style.width = `${CSS_STYLE.width}px`;
					seasonElem.style.height = `${CSS_STYLE.height}px`;
					seasonElem.style.backgroundImage = `url('${thumbURL}')`;

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
						(async (): Promise<void> => {
							if (this.plex) {
								console.log(seasonData);
								console.log(await this.plex.getLibraryData(seasonData.key.split('/')[3]));
							}
						})();
					});

					this.seasonsElem.append(seasonContainer);
					setTimeout(() => {
						this.seasonElemFreshlyLoaded = false;
					}, 700);
				}
			});

			setTimeout(() => {
				if (this.seasonsElem) {
					this.seasonsElem.style.transition = `0.7s`;
					this.seasonsElem.style.top = `${top + CSS_STYLE.expandedHeight + 16}px`;

					const requiredBodyHeight =
						parseInt(this.seasonsElem.style.top.replace('px', ''), 10) + this.seasonsElem.scrollHeight;
					const contentbg = this.getElementsByClassName('contentbg');

					if (requiredBodyHeight > (contentbg[0] as HTMLElement).scrollHeight) {
						(contentbg[0] as HTMLElement).style.height = `${requiredBodyHeight}px`;
					}
				}
			}, 200);

			console.log(seasonsData);
		}
	};

	showBackground = (): void => {
		const contentbg = this.getElementsByClassName('contentbg');
		(contentbg[0] as HTMLElement).style.zIndex = '2';
		(contentbg[0] as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.9)';
	};

	hideBackground = (): void => {
		const contentbg = this.getElementsByClassName('contentbg');
		(contentbg[0] as HTMLElement).style.zIndex = '1';
		(contentbg[0] as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0)';
	};

	getMovieElement = (data: any, serverID: string): HTMLDivElement => {
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
		if (!this.playSupported) {
			movieElem.style.cursor = 'pointer';
		}

		const self = this;
		movieElem.addEventListener('click', function handleClick() {
			if (this.dataset.clicked === 'true') {
				self.hideDetails();
				this.style.width = `${CSS_STYLE.width}px`;
				this.style.height = `${CSS_STYLE.height}px`;
				this.style.zIndex = '1';
				this.style.top = `${this.dataset.top}px`;
				this.style.left = `${this.dataset.left}px`;

				setTimeout(() => {
					this.dataset.clicked = 'false';
				}, 500);

				self.hideBackground();
			} else {
				self.minimizeAll();
				self.showDetails(data);
				const doc = document.documentElement;
				const top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
				self.showBackground();
				this.style.width = `${CSS_STYLE.expandedWidth}px`;
				this.style.height = `${CSS_STYLE.expandedHeight}px`;
				this.style.zIndex = '3';
				this.style.left = '16px';
				this.style.top = `${top + 16}px`;
				this.dataset.clicked = 'true';
			}
		});

		const playButton = this.getPlayButton();
		const interactiveArea = document.createElement('div');
		interactiveArea.className = 'interactiveArea';
		if (this.playSupported) {
			interactiveArea.append(playButton);
		}

		movieElem.append(interactiveArea);

		playButton.addEventListener('click', event => {
			event.stopPropagation();
			const keyParts = data.key.split('/');
			const movieID = keyParts[3];

			if (this.hassObj && this.playController) {
				this.playController.play(movieID);
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

	loadCustomStyles = (): void => {
		this.appendChild(style);
	};

	getPlayButton = (): HTMLButtonElement => {
		const playButton = document.createElement('button');
		playButton.name = 'playButton';
		return playButton;
	};

	setConfig = (config: any): void => {
		this.plexProtocol = 'http';
		if (!config.entity_id) {
			throw new Error('You need to define an entity_id');
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

		this.plex = new Plex(this.config.ip, this.config.port, this.config.token, this.plexProtocol);
	};

	getCardSize = (): number => {
		return 3;
	};
}

customElements.define('plex-meets-homeassistant', PlexMeetsHomeAssistant);
