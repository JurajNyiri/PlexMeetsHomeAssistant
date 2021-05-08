/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { HomeAssistant } from 'custom-card-helpers';
import _ from 'lodash';
import axios from 'axios';
import Plex from './Plex';
import { supported } from '../const';

class PlayController {
	entity: Record<string, any>;

	hass: HomeAssistant;

	plex: Plex;

	supported: any = supported;

	constructor(hass: HomeAssistant, plex: Plex, entity: Record<string, any>) {
		this.hass = hass;
		this.plex = plex;
		this.entity = entity;
	}

	private getState = async (entityID: string): Promise<Record<string, any>> => {
		return this.hass.callApi('GET', `states/${entityID}`);
	};

	private getKodiSearchResults = async (): Promise<Record<string, any>> => {
		return JSON.parse((await this.getState('sensor.kodi_media_sensor_search')).attributes.data);
	};

	private getKodiSearch = async (search: string): Promise<Record<string, any>> => {
		await this.hass.callService('kodi_media_sensors', 'call_method', {
			// eslint-disable-next-line @typescript-eslint/camelcase
			entity_id: 'sensor.kodi_media_sensor_search',
			method: 'search',
			item: {
				// eslint-disable-next-line @typescript-eslint/camelcase
				media_type: 'all',
				value: search
			}
		});
		const results = await this.getKodiSearchResults();
		let foundResult = {};
		_.forEach(results, result => {
			if (_.isEqual(result.title, search)) {
				foundResult = result;
				return false;
			}
		});
		if (_.isEmpty(foundResult)) {
			throw Error(`Title ${search} not found in Kodi.`);
		}
		return foundResult;
	};

	private getKodiTVShowSeason = async (tvshowID: number, seasonNumber: number): Promise<Record<string, any>> => {
		// todo: check for specials if they work
		await this.hass.callService('kodi_media_sensors', 'call_method', {
			// eslint-disable-next-line @typescript-eslint/camelcase
			entity_id: 'sensor.kodi_media_sensor_search',
			method: 'search',
			item: {
				// eslint-disable-next-line @typescript-eslint/camelcase
				media_type: 'tvshow',
				value: tvshowID
			}
		});
		let foundResult = {};
		const results = await this.getKodiSearchResults();
		_.forEach(results, result => {
			if (_.isEqual(result.season, seasonNumber)) {
				foundResult = result;
				return false;
			}
		});
		if (_.isEmpty(foundResult)) {
			throw Error(`Season ${seasonNumber} not found in Kodi for TV Show ${tvshowID}.`);
		}
		return foundResult;
	};

	play = async (data: Record<string, any>, instantPlay = false): Promise<void> => {
		const playService = this.getPlayService(data);
		switch (playService) {
			case 'kodi':
				await this.playViaKodi(data, data.type);
				break;
			case 'androidtv':
				await this.playViaAndroidTV(data.key.split('/')[3], instantPlay);
				break;
			case 'plexPlayer':
				await this.playViaPlexPlayer(data.key.split('/')[3]);
				break;
			default:
				throw Error(`No service available to play ${data.title}!`);
		}
	};

	private plexPlayerCreateQueue = async (movieID: number): Promise<Record<string, number>> => {
		const url = `${this.plex.protocol}://${this.plex.ip}:${
			this.plex.port
		}/playQueues?type=video&shuffle=0&repeat=0&continuous=1&own=1&uri=server://${await this.plex.getServerID()}/com.plexapp.plugins.library/library/metadata/${movieID}`;

		const plexResponse = await axios({
			method: 'post',
			url,
			headers: {
				'X-Plex-Token': this.plex.token,
				'X-Plex-Client-Identifier': 'PlexMeetsHomeAssistant'
			}
		});
		if (plexResponse.status !== 200) {
			throw Error('Error reaching Plex to generate queue');
		}
		return {
			playQueueID: plexResponse.data.MediaContainer.playQueueID,
			playQueueSelectedMetadataItemID: plexResponse.data.MediaContainer.playQueueSelectedMetadataItemID
		};
	};

	private playViaPlexPlayer = async (movieID: number): Promise<void> => {
		const { playQueueID, playQueueSelectedMetadataItemID } = await this.plexPlayerCreateQueue(movieID);

		const url = `${this.plex.protocol}://${this.plex.ip}:${this.plex.port}/player/playback/playMedia?address=${
			this.plex.ip
		}&commandID=1&containerKey=/playQueues/${playQueueID}?window=100%26own=1&key=/library/metadata/${playQueueSelectedMetadataItemID}&machineIdentifier=${await this.plex.getServerID()}&offset=0&port=${
			this.plex.port
		}&token=${this.plex.token}&type=video&protocol=${this.plex.protocol}`;
		const plexResponse = await axios({
			method: 'post',
			url,
			headers: {
				'X-Plex-Target-Client-Identifier': this.entity.plexPlayer,
				'X-Plex-Client-Identifier': 'PlexMeetsHomeAssistant'
			}
		});
		if (plexResponse.status !== 200) {
			throw Error('Error while asking plex to play a movie - server request error.');
		}
		if (!_.includes(plexResponse.data, 'status="OK"')) {
			throw Error('Error while asking plex to play a movie - target device not available.');
		}
	};

	private playViaKodi = async (data: Record<string, any>, type: string): Promise<void> => {
		if (type === 'movie') {
			const kodiData = await this.getKodiSearch(data.title);
			await this.hass.callService('kodi', 'call_method', {
				// eslint-disable-next-line @typescript-eslint/camelcase
				entity_id: this.entity.kodi,
				method: 'Player.Open',
				item: {
					movieid: kodiData.movieid
				}
			});
		} else if (type === 'episode') {
			const kodiData = await this.getKodiSearch(data.grandparentTitle);
			const episodesData = await this.getKodiTVShowSeason(kodiData.tvshowid, data.parentIndex);
			let foundEpisode: any = {};
			_.forEach(episodesData.episodes, episodeData => {
				if (_.isEqual(episodeData.episode, data.index)) {
					foundEpisode = episodeData;
					return false;
				}
			});

			if (_.isEmpty(foundEpisode)) {
				throw Error(
					`Episode ${data.index} not found in Kodi for TV Show ${data.grandparentTitle} (id: ${kodiData.tvshowid}) season ${data.parentIndex}.`
				);
			}
			await this.hass.callService('kodi', 'call_method', {
				// eslint-disable-next-line @typescript-eslint/camelcase
				entity_id: this.entity.kodi,
				method: 'Player.Open',
				item: {
					episodeid: foundEpisode.episodeid
				}
			});
		} else {
			throw Error(`Plex type ${type} is not supported in Kodi.`);
		}
	};

	private playViaAndroidTV = async (mediaID: number, instantPlay = false): Promise<void> => {
		const serverID = await this.plex.getServerID();
		let command = `am start`;

		if (instantPlay) {
			command += ' --ez "android.intent.extra.START_PLAYBACK" true';
		}

		command += ` -a android.intent.action.VIEW 'plex://server://${serverID}/com.plexapp.plugins.library/library/metadata/${mediaID}'`;

		this.hass.callService('androidtv', 'adb_command', {
			// eslint-disable-next-line @typescript-eslint/camelcase
			entity_id: this.entity.androidtv,
			command: 'HOME'
		});
		this.hass.callService('androidtv', 'adb_command', {
			// eslint-disable-next-line @typescript-eslint/camelcase
			entity_id: this.entity.androidtv,
			command
		});
	};

	private getPlayService = (data: Record<string, any>): string => {
		let service = '';
		_.forEach(this.entity, (value, key) => {
			if (_.includes(this.supported[key], data.type)) {
				if (
					(key === 'kodi' && this.isKodiSupported()) ||
					(key === 'androidtv' && this.isAndroidTVSupported()) ||
					(key === 'plexPlayer' && this.isPlexPlayerSupported())
				) {
					service = key;
					return false;
				}
			}
		});
		return service;
	};

	// todo: finish check
	isPlexPlayerSupported = (): boolean => {
		return true;
	};

	isPlaySupported = (data: Record<string, any>): boolean => {
		return !_.isEmpty(this.getPlayService(data));
	};

	private isKodiSupported = (): boolean => {
		if (this.entity.kodi) {
			return (
				this.hass.states[this.entity.kodi] &&
				this.hass.states['sensor.kodi_media_sensor_search'] &&
				this.hass.states['sensor.kodi_media_sensor_search'].state !== 'unavailable' &&
				this.hass.states[this.entity.kodi].state !== 'off' &&
				this.hass.states[this.entity.kodi].state !== 'unavailable'
			);
		}
		return false;
	};

	private isAndroidTVSupported = (): boolean => {
		return (
			this.hass.states[this.entity.androidtv] &&
			this.hass.states[this.entity.androidtv].attributes &&
			this.hass.states[this.entity.androidtv].attributes.adb_response !== undefined
		);
	};
}

export default PlayController;
