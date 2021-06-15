/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import _ from 'lodash';

class Plex {
	ip: string;

	port: number | false;

	token: string;

	protocol: string;

	serverInfo: Record<string, any> = {};

	clients: Array<Record<string, any>> = [];

	requestTimeout = 5000;

	sort: string;

	sections: Array<Record<string, any>> = [];

	constructor(
		ip: string,
		port: number | false = false,
		token: string,
		protocol: 'http' | 'https' = 'http',
		sort = 'titleSort:asc'
	) {
		this.ip = ip;
		this.port = port;
		this.token = token;
		this.protocol = protocol;
		this.sort = sort;
	}

	init = async (): Promise<void> => {
		await this.getClients();
		/*
		setInterval(() => {
			this.getClients();
		}, 30000);
		*/
	};

	getClients = async (): Promise<Record<string, any>> => {
		const url = this.authorizeURL(`${this.getBasicURL()}/clients`);
		try {
			const result = await axios.get(url, {
				timeout: this.requestTimeout
			});
			this.clients = result.data.MediaContainer.Server;
		} catch (err) {
			throw Error(`${err.message} while requesting URL "${url}".`);
		}
		return this.clients;
	};

	getServerID = async (): Promise<any> => {
		if (_.isEmpty(this.serverInfo)) {
			await this.getServerInfo();
		}
		return this.serverInfo.machineIdentifier;
	};

	getServerInfo = async (): Promise<any> => {
		const url = this.authorizeURL(`${this.getBasicURL()}/`);
		this.serverInfo = (
			await axios.get(url, {
				timeout: this.requestTimeout
			})
		).data.MediaContainer;
		return this.serverInfo;
	};

	getSections = async (): Promise<any> => {
		if (_.isEmpty(this.sections)) {
			const url = this.authorizeURL(`${this.getBasicURL()}/library/sections`);
			const sectionsData = await axios.get(url, {
				timeout: this.requestTimeout
			});
			this.sections = sectionsData.data.MediaContainer.Directory;
		}
		return this.sections;
	};

	getSectionsData = async (): Promise<any> => {
		const sections = await this.getSections();
		const sectionsRequests: Array<Promise<any>> = [];
		_.forEach(sections, section => {
			let url = this.authorizeURL(`${this.getBasicURL()}/library/sections/${section.key}/all`);
			url += `&sort=${this.sort}`;
			sectionsRequests.push(
				axios.get(url, {
					timeout: this.requestTimeout
				})
			);
		});
		return this.exportSectionsData(await Promise.all(sectionsRequests));
	};

	getRecentyAdded = async (useHub = false): Promise<any> => {
		if (useHub) {
			const hubs = await this.getHubs();
			let recentlyAddedData: Record<string, any> = {};
			// eslint-disable-next-line consistent-return
			_.forEach(hubs.Hub, hub => {
				if (_.isEqual(hub.key, '/hubs/home/recentlyAdded?type=2')) {
					recentlyAddedData = hub;
					return false;
				}
			});
			return recentlyAddedData;
		}
		const url = this.authorizeURL(
			`${this.getBasicURL()}/hubs/home/recentlyAdded?type=2&X-Plex-Container-Start=0&X-Plex-Container-Size=50`
		);
		return (
			await axios.get(url, {
				timeout: this.requestTimeout
			})
		).data.MediaContainer;
	};

	private getHubs = async (): Promise<any> => {
		const url = this.authorizeURL(
			`${this.getBasicURL()}/hubs?includeEmpty=1&count=50&includeFeaturedTags=1&includeTypeFirst=1&includeStations=1&includeExternalMetadata=1&excludePlaylists=1`
		);
		return (
			await axios.get(url, {
				timeout: this.requestTimeout
			})
		).data.MediaContainer;
	};

	getWatchNext = async (): Promise<any> => {
		const sections = await this.getSections();
		let sectionsString = '';
		_.forEach(sections, section => {
			sectionsString += `${section.key},`;
		});
		sectionsString = sectionsString.slice(0, -1);
		const url = this.authorizeURL(
			`${this.getBasicURL()}/hubs/continueWatching/items?contentDirectoryID=${sectionsString}`
		);
		return (
			await axios.get(url, {
				timeout: this.requestTimeout
			})
		).data.MediaContainer;
	};

	getContinueWatching = async (): Promise<any> => {
		const hubs = await this.getHubs();
		let continueWatchingData: Record<string, any> = {};
		// eslint-disable-next-line consistent-return
		_.forEach(hubs.Hub, hub => {
			if (_.isEqual(hub.key, '/hubs/home/continueWatching')) {
				continueWatchingData = hub;
				return false;
			}
		});
		return continueWatchingData;
	};

	getOnDeck = async (): Promise<any> => {
		const hubs = await this.getHubs();
		let onDeckData: Record<string, any> = {};
		// eslint-disable-next-line consistent-return
		_.forEach(hubs.Hub, hub => {
			if (_.isEqual(hub.key, '/hubs/home/onDeck')) {
				onDeckData = hub;
				return false;
			}
		});
		return onDeckData;
	};

	getBasicURL = (): string => {
		return `${this.protocol}://${this.ip}${this.port === false ? '' : `:${this.port}`}`;
	};

	authorizeURL = (url: string): string => {
		if (!_.includes(url, 'X-Plex-Token')) {
			if (_.includes(url, '?')) {
				return `${url}&X-Plex-Token=${this.token}`;
			}
			return `${url}?X-Plex-Token=${this.token}`;
		}
		return url;
	};

	getDetails = async (id: number): Promise<any> => {
		const url = this.authorizeURL(
			`${this.getBasicURL()}/library/metadata/${id}?includeConcerts=1&includeExtras=1&includeOnDeck=1&includePopularLeaves=1&includePreferences=1&includeReviews=1&includeChapters=1&includeStations=1&includeExternalMedia=1&asyncAugmentMetadata=1&asyncCheckFiles=1&asyncRefreshAnalysis=1&asyncRefreshLocalMediaAgent=1`
		);
		return (
			await axios.get(url, {
				timeout: this.requestTimeout
			})
		).data.MediaContainer.Metadata[0];
	};

	getLibraryData = async (id: number): Promise<any> => {
		const url = this.authorizeURL(`${this.getBasicURL()}/library/metadata/${id}/children`);
		return (
			await axios.get(url, {
				timeout: this.requestTimeout
			})
		).data.MediaContainer.Metadata;
	};

	private exportSectionsData = (sectionsData: Array<any>): Array<any> => {
		const processedData: Array<any> = [];
		_.forEach(sectionsData, sectionData => {
			processedData.push(sectionData.data.MediaContainer);
		});
		return processedData;
	};
}

export default Plex;
