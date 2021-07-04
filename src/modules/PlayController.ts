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

	private plexPlayerCreateQueue = async (movieID: number, plex: Plex): Promise<Record<string, number>> => {
		const url = `${plex.getBasicURL()}/playQueues?type=video&shuffle=0&repeat=0&continuous=1&own=1&uri=server://${await plex.getServerID()}/com.plexapp.plugins.library/library/metadata/${movieID}`;

		const plexResponse = await axios({
			method: 'post',
			url,
			headers: {
				'X-Plex-Token': plex.token,
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

	private playViaPlexPlayer = async (entity: string | Record<string, any>, movieID: number): Promise<void> => {
		const machineID = this.getPlexPlayerMachineIdentifier(entity);
		let { plex } = this;
		if (_.isObject(entity) && !_.isNil(entity.plex)) {
			plex = entity.plex;
		}
		const { playQueueID, playQueueSelectedMetadataItemID } = await this.plexPlayerCreateQueue(movieID, this.plex);

		let url = plex.getBasicURL();
		url += `/player/playback/playMedia`;
		url += `?type=video`;
		url += `&commandID=1`;
		url += `&providerIdentifier=com.plexapp.plugins.library`;
		url += `&containerKey=/playQueues/${playQueueID}`;
		url += `&key=/library/metadata/${playQueueSelectedMetadataItemID}`;
		url += `&offset=0`;
		url += `&machineIdentifier=${await this.plex.getServerID()}`;
		url += `&protocol=${this.plex.protocol}`;
		url += `&address=${this.plex.ip}`;
		url += `&port=${this.plex.port}`;
		url += `&token=${this.plex.token}`;

		url = plex.authorizeURL(url);

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
				// if we caught CORS error, try to use workaround. Todo: figure out why is the CORS issue happening
				try {
					await this.hass.callService('rest_command', 'pmha_playmedia', {
						// eslint-disable-next-line @typescript-eslint/camelcase
						url,
						// eslint-disable-next-line @typescript-eslint/camelcase
						target_client_identifier: machineID,
						// eslint-disable-next-line @typescript-eslint/camelcase
						client_identifier: 'PlexMeetsHomeAssistant'
					});
				} catch (homeAssistantErr) {
					throw err;
				}
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

	init = async (): Promise<void> => {
		if (!_.isNil(this.entity.plexPlayer)) {
			if (_.isArray(this.entity.plexPlayer)) {
				for (let i = 0; i < this.entity.plexPlayer.length; i += 1) {
					if (_.isObjectLike(this.entity.plexPlayer[i]) && !_.isNil(this.entity.plexPlayer[i].server)) {
						let port: number | false = false;
						if (!_.isNil(this.entity.plexPlayer[i].server.port)) {
							port = this.entity.plexPlayer[i].server.port;
						}
						let protocol: 'http' | 'https' = 'http';
						if (!_.isNil(this.entity.plexPlayer[i].server.protocol)) {
							protocol = this.entity.plexPlayer[i].server.protocol;
						}
						// eslint-disable-next-line no-param-reassign
						this.entity.plexPlayer[i].plex = new Plex(
							this.entity.plexPlayer[i].server.ip,
							port,
							this.entity.plexPlayer[i].server.token,
							protocol
						);
						// eslint-disable-next-line no-await-in-loop
						await this.entity.plexPlayer[i].plex.getClients();
					}
				}
			} else if (
				!_.isNil(this.entity.plexPlayer.server) &&
				!_.isNil(this.entity.plexPlayer.server.ip) &&
				!_.isNil(this.entity.plexPlayer.server.token)
			) {
				let port: number | false = false;
				if (!_.isNil(this.entity.plexPlayer.server.port)) {
					port = this.entity.plexPlayer.server.port;
				}
				let protocol: 'http' | 'https' = 'http';
				if (!_.isNil(this.entity.plexPlayer.server.protocol)) {
					protocol = this.entity.plexPlayer.server.protocol;
				}
				// eslint-disable-next-line no-param-reassign
				this.entity.plexPlayer.plex = new Plex(
					this.entity.plexPlayer.server.ip,
					port,
					this.entity.plexPlayer.server.token,
					protocol
				);
				// eslint-disable-next-line no-await-in-loop
				await this.entity.plexPlayer.plex.getClients();
			}
		}
	};

	private getPlexPlayerMachineIdentifier = (entity: string | Record<string, any>): string => {
		let machineIdentifier = '';

		let { plex } = this;
		let entityName = '';
		if (_.isString(entity)) {
			entityName = entity;
		} else if (_.isObjectLike(entity) && !_.isNil(entity.identifier)) {
			entityName = entity.identifier;
			if (!_.isNil(entity.plex) && entity.plex) {
				plex = entity.plex;
			}
		}

		_.forEach(plex.clients, plexClient => {
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

	private isPlexPlayerSupported = (entity: string | Record<string, any>): boolean => {
		let found = false;
		if (this.getPlexPlayerMachineIdentifier(entity)) {
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
