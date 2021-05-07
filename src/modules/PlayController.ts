/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { HomeAssistant } from 'custom-card-helpers';
import _ from 'lodash';
import Plex from './Plex';

class PlayController {
	entity: Record<string, any>;

	hass: HomeAssistant;

	plex: Plex;

	supported: any = {
		// kodi: ['movie', 'episode'],
		kodi: ['movie'],
		androidtv: ['movie', 'show', 'season', 'episode']
	};

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
		return foundResult;
	};

	play = async (data: Record<string, any>, instantPlay = false): Promise<void> => {
		const playService = this.getPlayService(data);
		switch (playService) {
			case 'kodi':
				await this.playViaKodi(data.title, data.type);
				break;
			case 'androidtv':
				await this.playViaAndroidTV(data.key.split('/')[3], instantPlay);
				break;
			default:
				throw Error(`No service available to play ${data.title}!`);
		}
	};

	private playViaKodi = async (title: string, type: string): Promise<void> => {
		const kodiData = await this.getKodiSearch(title);
		if (type === 'movie') {
			await this.hass.callService('kodi', 'call_method', {
				// eslint-disable-next-line @typescript-eslint/camelcase
				entity_id: this.entity.kodi,
				method: 'Player.Open',
				item: {
					// eslint-disable-next-line @typescript-eslint/camelcase
					movieid: kodiData.movieid
				}
			});
		} else if (type === 'episode') {
			console.log('TODO');
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
				if ((key === 'kodi' && this.isKodiSupported()) || (key === 'androidtv' && this.isAndroidTVSupported())) {
					service = key;
					return false;
				}
			}
		});
		return service;
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
				this.hass.states[this.entity.kodi].state !== 'unavailable' &&
				_.includes(this.entity.kodi, 'kodi_')
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
