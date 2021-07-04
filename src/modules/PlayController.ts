/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env browser */
import { HomeAssistant } from 'custom-card-helpers';
import _ from 'lodash';
import axios from 'axios';
import Plex from './Plex';
import { supported } from '../const';

class PlayController {
	entity: Record<string, any>;

	plexPlayerEntity = '';

	hass: HomeAssistant;

	plex: Plex;

	runBefore: Array<string> | false = false;

	runAfter: Array<string> | false = false;

	supported: any = supported;

	constructor(hass: HomeAssistant, plex: Plex, entity: Record<string, any>, runBefore: string, runAfter: string) {
		this.hass = hass;
		this.plex = plex;
		this.entity = entity;
		if (!_.isEmpty(runBefore) && this.hass.states[runBefore]) {
			this.runBefore = runBefore.split('.');
		}
		if (!_.isEmpty(runAfter) && this.hass.states[runAfter]) {
			this.runAfter = runAfter.split('.');
		}
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
			// eslint-disable-next-line no-alert
			alert(`Title ${search} not found in Kodi.`);
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
		console.log(data);
		if (_.isArray(this.runBefore)) {
			await this.hass.callService(this.runBefore[0], this.runBefore[1], {});
		}
		const entity = this.getPlayService(data);
		switch (entity.key) {
			case 'kodi':
				await this.playViaKodi(entity.value, data, data.type);
				break;
			case 'androidtv':
				await this.playViaAndroidTV(entity.value, data.key.split('/')[3], instantPlay);
				break;
			case 'plexPlayer':
				await this.playViaPlexPlayer(entity.value, data.key.split('/')[3]);
				break;
			case 'cast':
				this.playViaCast(entity.value, data.Media[0].Part[0].key);
				break;
			default:
				throw Error(`No service available to play ${data.title}!`);
		}
		if (_.isArray(this.runAfter)) {
			await this.hass.callService(this.runAfter[0], this.runAfter[1], {});
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

	private playViaPlexPlayer = async (entityName: string, movieID: number): Promise<void> => {
		const machineID = this.getPlexPlayerMachineIdentifier(entityName);
		const { playQueueID, playQueueSelectedMetadataItemID } = await this.plexPlayerCreateQueue(movieID);

		const url = `${this.plex.protocol}://${this.plex.ip}:${this.plex.port}/player/playback/playMedia?address=${
			this.plex.ip
		}&commandID=1&containerKey=/playQueues/${playQueueID}?window=100%26own=1&key=/library/metadata/${playQueueSelectedMetadataItemID}&machineIdentifier=${await this.plex.getServerID()}&offset=0&port=${
			this.plex.port
		}&token=${this.plex.token}&type=video&protocol=${this.plex.protocol}`;
		try {
			const plexResponse = await axios({
				method: 'post',
				url,
				headers: {
					'X-Plex-Target-Client-Identifier': machineID,
					'X-Plex-Client-Identifier': 'PlexMeetsHomeAssistant'
				}
			});
			if (plexResponse.status !== 200) {
				throw Error('Error while asking plex to play a movie - server request error.');
			}
			if (!_.includes(plexResponse.data, 'status="OK"')) {
				throw Error('Error while asking plex to play a movie - target device not available.');
			}
		} catch (err) {
			if (_.includes(err.message, '404')) {
				throw Error('Defined plexPlayer is currently not available for playback.');
			} else {
				throw err;
			}
		}
	};

	private playViaKodi = async (entityName: string, data: Record<string, any>, type: string): Promise<void> => {
		if (type === 'movie') {
			const kodiData = await this.getKodiSearch(data.title);
			await this.hass.callService('kodi', 'call_method', {
				// eslint-disable-next-line @typescript-eslint/camelcase
				entity_id: entityName,
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
				entity_id: entityName,
				method: 'Player.Open',
				item: {
					episodeid: foundEpisode.episodeid
				}
			});
		} else {
			throw Error(`Plex type ${type} is not supported in Kodi.`);
		}
	};

	private playViaCast = (entityName: string, mediaLink: string): void => {
		this.hass.callService('media_player', 'play_media', {
			// eslint-disable-next-line @typescript-eslint/camelcase
			entity_id: entityName,
			// eslint-disable-next-line @typescript-eslint/camelcase
			media_content_type: 'video',
			// eslint-disable-next-line @typescript-eslint/camelcase
			media_content_id: this.plex.authorizeURL(`${this.plex.getBasicURL()}${mediaLink}`)
		});
	};

	private playViaAndroidTV = async (entityName: string, mediaID: number, instantPlay = false): Promise<void> => {
		const serverID = await this.plex.getServerID();
		let command = `am start`;

		if (instantPlay) {
			command += ' --ez "android.intent.extra.START_PLAYBACK" true';
		}

		command += ` -a android.intent.action.VIEW 'plex://server://${serverID}/com.plexapp.plugins.library/library/metadata/${mediaID}'`;

		this.hass.callService('androidtv', 'adb_command', {
			// eslint-disable-next-line @typescript-eslint/camelcase
			entity_id: entityName,
			command: 'HOME'
		});
		this.hass.callService('androidtv', 'adb_command', {
			// eslint-disable-next-line @typescript-eslint/camelcase
			entity_id: entityName,
			command
		});
	};

	private getPlayService = (data: Record<string, any>): Record<string, string> => {
		let service: Record<string, string> = {};
		_.forEach(this.entity, (value, key) => {
			if (_.isEmpty(service)) {
				const entityVal = value;
				if (_.isArray(entityVal)) {
					_.forEach(entityVal, entity => {
						if (_.includes(this.supported[key], data.type)) {
							if (
								(key === 'kodi' && this.isKodiSupported(entity)) ||
								(key === 'androidtv' && this.isAndroidTVSupported(entity)) ||
								(key === 'plexPlayer' && this.isPlexPlayerSupported(entity)) ||
								(key === 'cast' && this.isCastSupported(entity))
							) {
								service = { key, value: entity };
								return false;
							}
						}
					});
				} else if (_.includes(this.supported[key], data.type)) {
					if (
						(key === 'kodi' && this.isKodiSupported(entityVal)) ||
						(key === 'androidtv' && this.isAndroidTVSupported(entityVal)) ||
						(key === 'plexPlayer' && this.isPlexPlayerSupported(entityVal)) ||
						(key === 'cast' && this.isCastSupported(entityVal))
					) {
						service = { key, value: entityVal };
						return false;
					}
				}
			}
		});
		return service;
	};

	private getPlexPlayerMachineIdentifier = (entityName: string): string => {
		let machineIdentifier = '';
		_.forEach(this.plex.clients, plexClient => {
			if (
				_.isEqual(plexClient.machineIdentifier, entityName) ||
				_.isEqual(plexClient.product, entityName) ||
				_.isEqual(plexClient.name, entityName) ||
				_.isEqual(plexClient.host, entityName) ||
				_.isEqual(plexClient.address, entityName)
			) {
				machineIdentifier = plexClient.machineIdentifier;
				return false;
			}
		});
		return machineIdentifier;
	};

	isPlaySupported = (data: Record<string, any>): boolean => {
		return !_.isEmpty(this.getPlayService(data));
	};

	private isPlexPlayerSupported = (entityName: string): boolean => {
		let found = false;
		if (this.getPlexPlayerMachineIdentifier(entityName)) {
			found = true;
		}
		return found || !_.isEqual(this.runBefore, false);
	};

	private isKodiSupported = (entityName: string): boolean => {
		if (entityName) {
			const hasKodiMediaSearchInstalled =
				this.hass.states['sensor.kodi_media_sensor_search'] &&
				this.hass.states['sensor.kodi_media_sensor_search'].state !== 'unavailable';
			return (
				(this.hass.states[entityName] &&
					this.hass.states[entityName].state !== 'off' &&
					this.hass.states[entityName].state !== 'unavailable' &&
					hasKodiMediaSearchInstalled) ||
				(!_.isEqual(this.runBefore, false) && hasKodiMediaSearchInstalled)
			);
		}
		return false;
	};

	private isCastSupported = (entityName: string): boolean => {
		return (
			(this.hass.states[entityName] &&
				!_.isNil(this.hass.states[entityName].attributes) &&
				this.hass.states[entityName].state !== 'unavailable') ||
			!_.isEqual(this.runBefore, false)
		);
	};

	private isAndroidTVSupported = (entityName: string): boolean => {
		return (
			(this.hass.states[entityName] &&
				!_.isEqual(this.hass.states[entityName].state, 'off') &&
				this.hass.states[entityName].attributes &&
				this.hass.states[entityName].attributes.adb_response !== undefined) ||
			!_.isEqual(this.runBefore, false)
		);
	};
}

export default PlayController;
