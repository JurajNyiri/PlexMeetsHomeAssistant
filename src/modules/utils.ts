/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env browser */
import { HomeAssistant } from 'custom-card-helpers';
import { Connection } from 'home-assistant-js-websocket';
import _ from 'lodash';
import { CSS_STYLE } from '../const';
import Plex from './Plex';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const escapeHtml = (unsafe: any): string => {
	if (unsafe) {
		return unsafe
			.toString()
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}
	return '';
};

const createTextElement = () => {
	const textElem = document.createElement('ha-textfield');

	textElem.style.width = "100%"
	textElem.style.marginTop = "10px"
	textElem.style.marginBottom = "10px"
	return textElem;
}

const setTextElementValue = (element: any, value: String | undefined) => {
	if (value !== undefined) {
		element.value = value;
	} else {
		element.value = ''
	}
}

const fetchEntityRegistry = (conn: Connection): Promise<Array<Record<string, any>>> =>
	conn.sendMessagePromise({
		type: 'config/entity_registry/list'
	});

const getHeight = (el: HTMLElement): number => {
	const height = Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight, el.scrollHeight, el.offsetHeight);
	return height;
};
const getWidth = (el: HTMLElement): number => {
	const width = Math.max(el.scrollWidth, el.offsetWidth, el.clientWidth, el.scrollWidth, el.offsetWidth);
	return width;
};

const getOffset = (el: Element): Record<string, any> => {
	let x = 0;
	let y = 0;
	while (
		el &&
		(el as HTMLElement).offsetParent &&
		!_.isNaN((el as HTMLElement).offsetLeft) &&
		!_.isNaN((el as HTMLElement).offsetTop)
	) {
		x += (el as HTMLElement).offsetLeft - (el as HTMLElement).scrollLeft;
		y += (el as HTMLElement).offsetTop - (el as HTMLElement).scrollTop;
		const tmp = (el as HTMLElement).offsetParent;
		if (tmp) {
			// eslint-disable-next-line no-param-reassign
			el = tmp;
		}
	}
	return { top: y, left: x };
};

const getDetailsBottom = (
	seasonContainers: HTMLCollectionOf<HTMLElement>,
	episodeContainers: HTMLCollectionOf<HTMLElement>,
	activeElem: HTMLElement
): number | false => {
	const lastSeasonContainer = seasonContainers[seasonContainers.length - 1];
	const lastEpisodeContainer = episodeContainers[episodeContainers.length - 1];
	let detailBottom: number | false = false;

	if (seasonContainers.length > 0 && parseInt(activeElem.style.top, 10) > 0) {
		detailBottom = getHeight(lastSeasonContainer) + parseInt(getOffset(lastSeasonContainer).top, 10) + 10;
	} else if (episodeContainers.length > 0) {
		detailBottom = getHeight(lastEpisodeContainer) + parseInt(getOffset(lastEpisodeContainer).top, 10) + 10;
	}
	return detailBottom;
};

const hasEpisodes = (media: Array<Record<string, any>>): boolean => {
	let result = false;
	// eslint-disable-next-line consistent-return
	_.forEach(media, data => {
		if (_.isEqual(data.type, 'episode')) {
			result = true;
			return false;
		}
	});
	return result;
};

const isVideoFullScreen = (_this: any): boolean => {
	const videoPlayer = _this.getElementsByClassName('videoPlayer')[0] as HTMLElement;
	const video = videoPlayer.children[0] as any;
	if (!video) return false;
	const body = document.getElementsByTagName('body')[0];
	return (
		(video.offsetWidth === body.offsetWidth && video.offsetHeight === body.offsetHeight) ||
		(_this.videoElem && _this.videoElem.classList.contains('simulatedFullScreen'))
	);
};

const getOldPlexServerErrorMessage = (libraryName: string): string => {
	return `PlexMeetsHomeAssistant: 404 Error requesting library feed for ${libraryName}. Plex API might have changed or using outdated server. Library ${libraryName} will not work.`;
};

const findTrailerURL = (movieData: Record<string, any>): string => {
	let foundURL = '';
	if (movieData.Extras && movieData.Extras.Metadata && movieData.Extras.Metadata.length > 0) {
		// eslint-disable-next-line consistent-return
		_.forEach(movieData.Extras.Metadata, extra => {
			if (extra.subtype === 'trailer') {
				foundURL = extra.Media[0].Part[0].key;
				return false;
			}
		});
	}
	return foundURL;
};
const clickHandler = (elem: HTMLButtonElement, clickFunction: Function, holdFunction: Function): void => {
	let longpress = false;
	let presstimer: any = null;

	const cancel = (e: any): void => {
		e.stopPropagation();
		if (presstimer !== null) {
			clearTimeout(presstimer);
			presstimer = null;
		}
	};

	const click = (e: any): boolean => {
		e.stopPropagation();
		if (presstimer !== null) {
			clearTimeout(presstimer);
			presstimer = null;
		}

		if (longpress) {
			return false;
		}

		clickFunction(e);
		return true;
	};

	const start = (e: any): void => {
		e.stopPropagation();
		if (e.type === 'click' && e.button !== 0) {
			return;
		}

		longpress = false;

		presstimer = setTimeout(() => {
			holdFunction(e);
			longpress = true;
		}, 1000);
	};
	elem.addEventListener('mousedown', start);
	elem.addEventListener('touchstart', start);
	elem.addEventListener('click', click);
	elem.addEventListener('mouseout', cancel);
	elem.addEventListener('touchend', cancel);
	elem.addEventListener('touchleave', cancel);
	elem.addEventListener('touchcancel', cancel);
};

const sleep = async (ms: number): Promise<void> => {
	return new Promise(resolve => setTimeout(resolve, ms));
};

const getState = async (hass: HomeAssistant, entityID: string): Promise<Record<string, any>> => {
	return hass.callApi('GET', `states/${entityID}`);
};

const padWithZeroes = (number: number, length: number): string => {
	let myString = `${number}`;
	while (myString.length < length) {
		myString = `0${myString}`;
	}

	return myString;
};

const waitUntilState = async (hass: HomeAssistant, entityID: string, state: string): Promise<void> => {
	let entityState = await getState(hass, entityID);

	while (entityState.state !== state) {
		// eslint-disable-next-line no-await-in-loop
		entityState = await getState(hass, entityID);
		// eslint-disable-next-line no-await-in-loop
		await sleep(1000);
	}
};

const createTrackView = (
	playController: any,
	plex: Plex,
	data: Record<string, any>,
	fontSize1: number,
	fontSize2: number,
	isEven: boolean
): HTMLElement => {
	const margin1 = fontSize1 / 4;
	const margin2 = fontSize2 / 4;
	const trackContainer = document.createElement('tr');
	trackContainer.classList.add('trackContainer');
	if (isEven) {
		trackContainer.classList.add('even');
	} else {
		trackContainer.classList.add('odd');
	}

	const trackIndexElem = document.createElement('td');
	trackIndexElem.className = 'trackIndexElem';
	trackIndexElem.innerHTML = `<span class="trackIndex">${escapeHtml(data.index)}</span>`;

	trackIndexElem.style.fontSize = `${fontSize1}px`;
	trackIndexElem.style.lineHeight = `${fontSize1}px`;
	trackIndexElem.style.marginBottom = `${margin1}px`;

	const trackInteractiveArea = document.createElement('div');
	trackInteractiveArea.className = 'trackInteractiveArea';
	if (playController) {
		const trackPlayButton = playController.getPlayButton(data.type);
		trackPlayButton.addEventListener('click', (trackEvent: MouseEvent) => {
			trackEvent.stopPropagation();
			playController.play(data, true);
		});
		if (playController.isPlaySupported(data)) {
			trackPlayButton.classList.remove('disabled');
		}
		trackInteractiveArea.append(trackPlayButton);
	}
	trackIndexElem.append(trackInteractiveArea);

	trackContainer.append(trackIndexElem);

	const trackTitleElem = document.createElement('td');
	trackTitleElem.className = 'trackTitleElem';
	if (!_.isEmpty(data.title)) {
		trackTitleElem.innerHTML = escapeHtml(data.title);
	} else if (!_.isEmpty(data.titleSort)) {
		trackTitleElem.innerHTML = escapeHtml(data.titleSort);
	}

	trackTitleElem.style.fontSize = `${fontSize1}px`;
	trackTitleElem.style.lineHeight = `${fontSize1}px`;
	trackTitleElem.style.marginBottom = `${margin1}px`;

	trackContainer.append(trackTitleElem);

	const duration = _.get(data, 'Media[0].duration');
	const trackLengthElem = document.createElement('td');
	trackLengthElem.className = 'trackLengthElem';

	trackLengthElem.style.fontSize = `${fontSize1}px`;
	trackLengthElem.style.lineHeight = `${fontSize1}px`;
	trackLengthElem.style.marginBottom = `${margin1}px`;

	if (duration) {
		const minutes = Math.floor(duration / 60 / 1000);
		const seconds = Math.round((duration - minutes * 1000) / 6000);
		trackLengthElem.innerHTML = escapeHtml(`${padWithZeroes(minutes, 2)}:${padWithZeroes(seconds, 2)}`);
	}
	trackContainer.append(trackLengthElem);

	trackContainer.addEventListener('click', episodeEvent => {
		episodeEvent.stopPropagation();
	});
	return trackContainer;
};
const createEpisodesView = (
	playController: any,
	plex: Plex,
	data: Record<string, any>,
	fontSize1: number,
	fontSize2: number
): HTMLElement => {
	const episodeContainer = document.createElement('div');
	episodeContainer.className = 'episodeContainer';
	episodeContainer.style.width = `${CSS_STYLE.episodeWidth}px`;
	const episodeThumbURL = plex.authorizeURL(
		`${plex.getBasicURL()}/photo/:/transcode?width=${CSS_STYLE.episodeWidth}&height=${CSS_STYLE.episodeHeight
		}&minSize=1&upscale=1&url=${data.thumb}`
	);

	const episodeElem = document.createElement('div');
	episodeElem.className = 'episodeElem';
	episodeElem.style.width = `${CSS_STYLE.episodeWidth}px`;
	episodeElem.style.height = `${CSS_STYLE.episodeHeight}px`;
	episodeElem.style.backgroundImage = `url('${episodeThumbURL}')`;
	episodeElem.dataset.clicked = 'false';

	if (typeof data.lastViewedAt === 'undefined') {
		const toViewElem = document.createElement('div');
		toViewElem.className = 'toViewEpisode';
		episodeElem.appendChild(toViewElem);
	}

	const episodeInteractiveArea = document.createElement('div');
	episodeInteractiveArea.className = 'interactiveArea';
	if (playController) {
		const episodePlayButton = playController.getPlayButton(data.type);
		episodePlayButton.addEventListener('click', (episodeEvent: MouseEvent) => {
			episodeEvent.stopPropagation();
			playController.play(data, true);
		});
		if (playController.isPlaySupported(data)) {
			episodePlayButton.classList.remove('disabled');
		}
		episodeInteractiveArea.append(episodePlayButton);
	}

	episodeElem.append(episodeInteractiveArea);
	episodeContainer.append(episodeElem);

	const episodeTitleElem = document.createElement('div');
	episodeTitleElem.className = 'episodeTitleElem';
	episodeTitleElem.innerHTML = escapeHtml(data.title);

	const margin1 = fontSize1 / 4;
	const margin2 = fontSize2 / 4;
	episodeTitleElem.style.fontSize = `${fontSize1}px`;
	episodeTitleElem.style.lineHeight = `${fontSize1}px`;
	episodeTitleElem.style.marginBottom = `${margin1}px`;

	episodeContainer.append(episodeTitleElem);

	const episodeNumber = document.createElement('div');
	episodeNumber.className = 'episodeNumber';
	episodeNumber.style.fontSize = `${fontSize2}px`;
	episodeNumber.style.lineHeight = `${fontSize2}px`;
	episodeNumber.style.marginTop = `${margin2}px`;
	episodeNumber.style.marginBottom = `${margin2}px`;
	if (data.type === 'episode') {
		episodeNumber.innerHTML = escapeHtml(`Episode ${escapeHtml(data.index)}`);
	} else if (data.type === 'clip') {
		let text = '';
		switch (data.subtype) {
			case 'behindTheScenes':
				text = 'Behind the Scenes';
				break;
			case 'trailer':
				text = 'Trailer';
				break;
			case 'scene':
				text = 'Scene';
				break;
			case 'sceneOrSample':
				text = 'Scene';
				break;
			default:
				text = data.subtype;
				break;
		}
		episodeNumber.innerHTML = escapeHtml(text);
	}
	episodeContainer.append(episodeNumber);

	episodeContainer.addEventListener('click', episodeEvent => {
		episodeEvent.stopPropagation();
	});
	return episodeContainer;
};

const isScrolledIntoView = (elem: HTMLElement): boolean => {
	const rect = elem.getBoundingClientRect();
	const elemTop = rect.top;
	const elemBottom = rect.bottom;

	// Only completely visible elements return true:
	const isVisible = elemTop >= 0 && elemBottom <= window.innerHeight;
	// Partially visible elements return true:
	// isVisible = elemTop < window.innerHeight && elemBottom >= 0;
	return isVisible;
};

// eslint-disable-next-line import/prefer-default-export
export {
	escapeHtml,
	getOffset,
	isScrolledIntoView,
	getHeight,
	createEpisodesView,
	findTrailerURL,
	isVideoFullScreen,
	hasEpisodes,
	getOldPlexServerErrorMessage,
	getWidth,
	getDetailsBottom,
	clickHandler,
	fetchEntityRegistry,
	waitUntilState,
	getState,
	createTrackView,
	createTextElement,
	setTextElementValue
};
