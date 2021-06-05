/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env browser */
import _ from 'lodash';
import { CSS_STYLE } from '../const';
import PlayController from './PlayController';
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

const getHeight = (el: HTMLElement): number => {
	const height = Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight, el.scrollHeight, el.offsetHeight);
	return height;
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

const createEpisodesView = (
	playController: PlayController,
	plexProtocol: string,
	ip: string,
	port: string,
	token: string,
	data: Record<string, any>
): HTMLElement => {
	const episodeContainer = document.createElement('div');
	episodeContainer.className = 'episodeContainer';
	episodeContainer.style.width = `${CSS_STYLE.episodeWidth}px`;
	const episodeThumbURL = `${plexProtocol}://${ip}:${port}/photo/:/transcode?width=${CSS_STYLE.episodeWidth}&height=${CSS_STYLE.episodeHeight}&minSize=1&upscale=1&url=${data.thumb}&X-Plex-Token=${token}`;

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

	if (playController.isPlaySupported(data)) {
		const episodeInteractiveArea = document.createElement('div');
		episodeInteractiveArea.className = 'interactiveArea';

		const episodePlayButton = document.createElement('button');
		episodePlayButton.name = 'playButton';
		episodePlayButton.addEventListener('click', episodeEvent => {
			episodeEvent.stopPropagation();
			playController.play(data, true);
		});

		episodeInteractiveArea.append(episodePlayButton);
		episodeElem.append(episodeInteractiveArea);
	}
	episodeContainer.append(episodeElem);

	const episodeTitleElem = document.createElement('div');
	episodeTitleElem.className = 'episodeTitleElem';
	episodeTitleElem.innerHTML = escapeHtml(data.title);
	episodeContainer.append(episodeTitleElem);

	const episodeNumber = document.createElement('div');
	episodeNumber.className = 'episodeNumber';
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
export { escapeHtml, getOffset, isScrolledIntoView, getHeight, createEpisodesView };
