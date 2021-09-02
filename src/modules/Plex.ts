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

	requestTimeout = 10000;

	sort: string;

	sections: Array<Record<string, any>> = [];

	providers: Array<Record<string, any>> = [];

	livetv: Record<string, any> = {};

	livetvepg: Record<string, any> = {};

	collections: Array<Record<string, any>> | false = false;

	playlists: Array<Record<string, any>> = [];

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
		await Promise.all([this.getSections(), this.getClients(), this.getServerID()]);
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

	getProviders = async (): Promise<any> => {
		if (_.isEmpty(this.providers)) {
			const url = this.authorizeURL(`${this.getBasicURL()}/media/providers`);
			const providersData = await axios.get(url, {
				timeout: this.requestTimeout
			});
			this.providers = providersData.data.MediaContainer.MediaProvider;
		}
		return this.providers;
	};

	getLiveTV = async (): Promise<Record<string, any>> => {
		if (_.isEmpty(this.livetv)) {
			const returnData: Record<string, any> = {};
			const providers = await this.getProviders();
			const liveTVRequests: Array<Promise<any>> = [];
			const liveTVRequestsNames: Array<string> = [];
			_.forEach(providers, provider => {
				if (_.isEqual(provider.protocols, 'livetv')) {
					const url = this.authorizeURL(`${this.getBasicURL()}/${provider.identifier}/tags?type=310`);
					liveTVRequests.push(
						axios.get(url, {
							timeout: this.requestTimeout
						})
					);
					liveTVRequestsNames.push(provider.title);
				}
			});
			const allResults = await Promise.all(liveTVRequests);
			_.forEach(allResults, (result, key) => {
				returnData[liveTVRequestsNames[key]] = result.data.MediaContainer.Directory;
			});
			this.livetv = returnData;
		}
		return this.livetv;
	};

	getEPG = async (): Promise<Record<string, any>> => {
		if (_.isEmpty(this.livetvepg)) {
			const returnData: Record<string, any> = {};
			const providers = await this.getProviders();
			const liveTVRequests: Array<Promise<any>> = [];
			const liveTVRequestsNames: Array<string> = [];
			_.forEach(providers, provider => {
				if (_.isEqual(provider.protocols, 'livetv')) {
					let url = this.authorizeURL(`${this.getBasicURL()}/${provider.identifier}/grid?type=1&sort=beginsAt`);
					url += `&endsAt>=${Math.floor(Date.now() / 1000)}`;
					url += `&beginsAt<=${Math.floor(Date.now() / 1000)}`;
					liveTVRequests.push(
						axios.get(url, {
							timeout: this.requestTimeout
						})
					);
					liveTVRequestsNames.push(provider.title);
				}
			});
			const allResults = await Promise.all(liveTVRequests);
			_.forEach(allResults, (result, key) => {
				returnData[liveTVRequestsNames[key]] = {};
				_.forEach(result.data.MediaContainer.Metadata, data => {
					returnData[liveTVRequestsNames[key]][data.Media[0].channelCallSign] = data;
				});
			});
			this.livetvepg = returnData;
		}
		return this.livetvepg;
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

	getSections = async (): Promise<Array<Record<string, any>>> => {
		if (_.isEmpty(this.sections)) {
			const url = this.authorizeURL(`${this.getBasicURL()}/library/sections`);
			const sectionsData = await axios.get(url, {
				timeout: this.requestTimeout
			});
			this.sections = sectionsData.data.MediaContainer.Directory;
		}
		return this.sections;
	};

	getCollections = async (): Promise<Array<Record<string, any>>> => {
		if (!_.isArray(this.collections)) {
			const sections = await this.getSections();
			const collectionRequests: Array<Promise<any>> = [];
			_.forEach(sections, section => {
				collectionRequests.push(this.getCollection(section.key));
			});
			const allResults = await Promise.all(collectionRequests);
			const collections: Array<Record<string, any>> = [];
			_.forEach(allResults, result => {
				_.forEach(result, collection => {
					collections.push(collection);
				});
			});
			this.collections = collections;
		}
		return this.collections;
	};

	getPlaylists = async (): Promise<Array<Record<string, any>>> => {
		if (_.isEmpty(this.playlists)) {
			this.playlists = [];
			const url = this.authorizeURL(`${this.getBasicURL()}/playlists`);
			const playlistsData = await axios.get(url, {
				timeout: this.requestTimeout
			});
			this.playlists = playlistsData.data.MediaContainer.Metadata;
		}
		return this.playlists;
	};

	getCollection = async (sectionID: number): Promise<Array<Record<string, any>>> => {
		const url = this.authorizeURL(`${this.getBasicURL()}/library/sections/${sectionID}/collections`);
		const collectionsData = await axios.get(url, {
			timeout: this.requestTimeout
		});
		return _.isNil(collectionsData.data.MediaContainer.Metadata) ? [] : collectionsData.data.MediaContainer.Metadata;
	};

	getSectionData = async (sectionID: number): Promise<any> => {
		return this.exportSectionsData([await this.getSectionDataWithoutProcessing(sectionID)]);
	};

	private getChildren = async (childrenURL: string): Promise<any> => {
		const bulkItems = 50;
		let url = this.authorizeURL(`${this.getBasicURL()}${childrenURL}`);
		url += `&sort=${this.sort}`;
		let result: Record<string, any> = {};
		try {
			result = await axios.get(url, {
				timeout: this.requestTimeout
			});
		} catch (err) {
			// probably hitting limit of items to return, we need to request in parts
			if (_.includes(err.message, 'Request failed with status code 500')) {
				url += `&X-Plex-Container-Start=0&X-Plex-Container-Size=${bulkItems}`;
				result = await axios.get(url, {
					timeout: this.requestTimeout
				});
				const { totalSize } = result.data.MediaContainer;
				let startOfItems = bulkItems;
				const sectionsRequests: Array<Promise<any>> = [];
				while (startOfItems < totalSize) {
					sectionsRequests.push(
						axios.get(
							this.authorizeURL(
								`${this.getBasicURL()}${childrenURL}?sort=${
									this.sort
								}&X-Plex-Container-Start=${startOfItems}&X-Plex-Container-Size=${bulkItems}`
							),
							{
								timeout: this.requestTimeout
							}
						)
					);
					startOfItems += bulkItems;
				}
				const allResults = await Promise.all(sectionsRequests);
				_.forEach(allResults, multiResult => {
					result.data.MediaContainer.Metadata = _.concat(
						result.data.MediaContainer.Metadata,
						multiResult.data.MediaContainer.Metadata
					);
				});
			} else {
				throw err;
			}
		}
		return result.data.MediaContainer.Metadata;
	};

	getCollectionData = async (collectionKey: string): Promise<any> => {
		return this.getChildren(collectionKey);
	};

	getPlaylistData = async (playlistKey: string): Promise<any> => {
		return this.getChildren(playlistKey);
	};

	private getSectionDataWithoutProcessing = async (sectionID: number): Promise<any> => {
		const bulkItems = 50;
		let url = this.authorizeURL(`${this.getBasicURL()}/library/sections/${sectionID}/all`);
		url += `&sort=${this.sort}`;
		let result: Record<string, any> = {};
		try {
			result = await axios.get(url, {
				timeout: this.requestTimeout
			});
		} catch (err) {
			// probably hitting limit of items to return, we need to request in parts
			if (_.includes(err.message, 'Request failed with status code 500')) {
				url += `&X-Plex-Container-Start=0&X-Plex-Container-Size=${bulkItems}`;
				result = await axios.get(url, {
					timeout: this.requestTimeout
				});
				const { totalSize } = result.data.MediaContainer;
				let startOfItems = bulkItems;
				const sectionsRequests: Array<Promise<any>> = [];
				while (startOfItems < totalSize) {
					sectionsRequests.push(
						axios.get(
							this.authorizeURL(
								`${this.getBasicURL()}/library/sections/${sectionID}/all?sort=${
									this.sort
								}&X-Plex-Container-Start=${startOfItems}&X-Plex-Container-Size=${bulkItems}`
							),
							{
								timeout: this.requestTimeout
							}
						)
					);
					startOfItems += bulkItems;
				}
				const allResults = await Promise.all(sectionsRequests);
				_.forEach(allResults, multiResult => {
					result.data.MediaContainer.Metadata = _.concat(
						result.data.MediaContainer.Metadata,
						multiResult.data.MediaContainer.Metadata
					);
				});
			} else {
				throw err;
			}
		}
		return result;
	};

	getSectionsData = async (): Promise<any> => {
		const sections = await this.getSections();
		const sectionsRequests: Array<Promise<any>> = [];
		_.forEach(sections, section => {
			sectionsRequests.push(this.getSectionDataWithoutProcessing(section.key));
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
