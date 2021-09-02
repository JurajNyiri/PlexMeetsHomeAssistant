/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env browser */
import { HomeAssistant } from 'custom-card-helpers';
import _ from 'lodash';
import axios from 'axios';
import Plex from './Plex';
import { supported } from '../const';
import { waitUntilState, getState } from './utils';

class PlayController {
	entity: Record<string, any>;

	plexPlayerEntity = '';

	hass: HomeAssistant;

	plex: Plex;

	runBefore: Array<string> | false = false;

	runAfter: Array<string> | false = false;

	supported: any = supported;

	libraryName: string;

	constructor(
		hass: HomeAssistant,
		plex: Plex,
		entity: Record<string, any>,
		runBefore: string,
		runAfter: string,
		libraryName: string
	) {
		this.hass = hass;
		this.plex = plex;
		this.entity = entity;
		this.libraryName = libraryName;
		if (!_.isEmpty(runBefore) && this.hass.states[runBefore]) {
			this.runBefore = runBefore.split('.');
		}
		if (!_.isEmpty(runAfter) && this.hass.states[runAfter]) {
			this.runAfter = runAfter.split('.');
		}
	}

	private getKodiSearchResults = async (): Promise<Record<string, any>> => {
		return JSON.parse((await getState(this.hass, 'sensor.kodi_media_sensor_search')).attributes.data);
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
			const entityID = `${this.runBefore[0]}.${this.runBefore[1]}`;
			await this.hass.callService(this.runBefore[0], this.runBefore[1], {});

			const entityState = await getState(this.hass, entityID);
			if (_.isEqual(entityState.state, 'on')) {
				await waitUntilState(this.hass, entityID, 'off');
			}
		}
		const entity = this.getPlayService(data);

		let processData = data;
		let provider;
		if (!_.isNil(data.epg)) {
			processData = data.epg;
			provider = '';
		}
		switch (entity.key) {
			case 'kodi':
				await this.playViaKodi(entity.value, processData, processData.type);
				break;
			case 'androidtv':
				if (!_.isNil(data.epg)) {
					const session = `${Math.floor(Date.now() / 1000)}`;
					const streamData = await this.plex.tune(data.channelIdentifier, session);
					console.log(streamData);
					/*
					await this.playViaAndroidTV(
						entity.value,
						streamData.MediaSubscription[0].MediaGrabOperation[0].Metadata.key,
						instantPlay,
						provider
					);
					*/
				} else {
					await this.playViaAndroidTV(entity.value, processData.guid, instantPlay, provider);
				}

				break;
			case 'plexPlayer':
				await this.playViaPlexPlayer(entity.value, processData.key.split('/')[3]);
				break;
			case 'cast':
				if (!_.isNil(data.epg)) {
					const session = `PlexMeetsHomeAssistant-${Math.floor(Date.now() / 1000)}`;
					const streamURL = await this.plex.tune(data.channelIdentifier, session);
					console.log(`${this.plex.getBasicURL()}${streamURL}`);
					// this.playViaCast(entity.value, `${playlistLink}`);
				} else if (this.hass.services.plex) {
					const libraryName = _.isNil(processData.librarySectionTitle)
						? this.libraryName
						: processData.librarySectionTitle;
					try {
						switch (processData.type) {
							case 'movie':
								await this.playViaCastPlex(
									entity.value,
									'movie',
									`plex://${JSON.stringify({
										// eslint-disable-next-line @typescript-eslint/camelcase
										library_name: libraryName,
										title: processData.title
									})}`
								);
								break;
							case 'episode':
								await this.playViaCastPlex(
									entity.value,
									'EPISODE',
									`plex://${JSON.stringify({
										// eslint-disable-next-line @typescript-eslint/camelcase
										library_name: libraryName,
										// eslint-disable-next-line @typescript-eslint/camelcase
										show_name: processData.grandparentTitle,
										// eslint-disable-next-line @typescript-eslint/camelcase
										season_number: processData.parentIndex,
										// eslint-disable-next-line @typescript-eslint/camelcase
										episode_number: processData.index
									})}`
								);
								break;
							default:
								this.playViaCast(entity.value, processData.Media[0].Part[0].key);
						}
					} catch (err) {
						console.log(err);
						this.playViaCast(entity.value, processData.Media[0].Part[0].key);
					}
				} else {
					this.playViaCast(entity.value, processData.Media[0].Part[0].key);
				}
				break;
			default:
				throw Error(`No service available to play ${processData.title}!`);
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
				method: 'get',
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
				// pass
			}
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
		console.log({
			// eslint-disable-next-line @typescript-eslint/camelcase
			entity_id: entityName,
			// eslint-disable-next-line @typescript-eslint/camelcase
			media_content_type: 'video',
			// eslint-disable-next-line @typescript-eslint/camelcase
			media_content_id: this.plex.authorizeURL(`${this.plex.getBasicURL()}${mediaLink}`)
		});
		this.hass.callService('media_player', 'play_media', {
			// eslint-disable-next-line @typescript-eslint/camelcase
			entity_id: entityName,
			// eslint-disable-next-line @typescript-eslint/camelcase
			media_content_type: 'video',
			// eslint-disable-next-line @typescript-eslint/camelcase
			media_content_id: this.plex.authorizeURL(`${this.plex.getBasicURL()}${mediaLink}`)
		});
	};

	private playViaCastPlex = (entityName: string, contentType: string, mediaLink: string): Promise<void> => {
		return this.hass.callService('media_player', 'play_media', {
			// eslint-disable-next-line @typescript-eslint/camelcase
			entity_id: entityName,
			// eslint-disable-next-line @typescript-eslint/camelcase
			media_content_type: contentType,
			// eslint-disable-next-line @typescript-eslint/camelcase
			media_content_id: mediaLink
		});
	};

	private playViaAndroidTV = async (
		entityName: string,
		mediaID: string,
		instantPlay = false,
		provider = 'com.plexapp.plugins.library'
	): Promise<void> => {
		const serverID = await this.plex.getServerID();
		let command = `am start`;

		if (instantPlay) {
			command += ' --ez "android.intent.extra.START_PLAYBACK" true';
		}

		command += ` -a android.intent.action.VIEW 'plex://server://${serverID}/${provider}${mediaID}'`;

		console.log(command);

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
