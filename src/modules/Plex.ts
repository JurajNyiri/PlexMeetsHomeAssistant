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

	getSectionData = async (sectionID: string, type: string | false = false): Promise<any> => {
		return this.exportSectionsData([await this.getSectionDataWithoutProcessing(sectionID, type)]);
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

	private getSectionDataWithoutProcessing = async (sectionID: string, type: string | false = false): Promise<any> => {
		const bulkItems = 50;
		let url = this.authorizeURL(`${this.getBasicURL()}/library/sections/${sectionID}/all`);
		url += `&sort=${this.sort}`;
		if (type) {
			url += `&type=${type}`;
		}
		url += `&includeCollections=1&includeExternalMedia=1&includeAdvanced=1&includeMeta=1`;
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

	tune = async (channelID: string, session: string): Promise<any> => {
		// eslint-disable-next-line no-param-reassign
		session = 'PlexMeetsHomeAssistant3';
		console.log(channelID);
		// Todo: what is 12? do we need to get this from somewhere and change?
		let url = this.authorizeURL(
			`${this.getBasicURL()}/livetv/dvrs/12/channels/${channelID}/tune?X-Plex-Language=en-us`
		);
		console.log('Starting tune process...');
		url = `${this.getBasicURL()}/livetv/dvrs/12/channels/`;
		url += `${channelID}`;
		url += `/tune`;
		url += `?X-Plex-Client-Identifier=${session}`;
		url += `&X-Plex-Session-Identifier=${session}`;

		const tuneData = (
			await axios.post(this.authorizeURL(url), {
				timeout: this.requestTimeout
			})
		).data.MediaContainer;

		console.log('Tuning started.');

		let startURL = `${this.getBasicURL()}/video/:/transcode/universal/start.mpd`;
		startURL += `?hasMDE=1`;
		startURL += `&path=${encodeURIComponent(tuneData.MediaSubscription[0].MediaGrabOperation[0].Metadata.key)}`;
		startURL += `&mediaIndex=0`;
		startURL += `&partIndex=0`;
		startURL += `&protocol=dash`;
		startURL += `&fastSeek=1`;
		startURL += `&directPlay=0`;
		startURL += `&directStream=1`;
		startURL += `&subtitleSize=100`;
		startURL += `&audioBoost=100`;
		startURL += `&location=lan`;
		startURL += `&addDebugOverlay=0`;
		startURL += `&autoAdjustQuality=0`;
		startURL += `&directStreamAudio=1`;
		startURL += `&mediaBufferSize=102400`;
		startURL += `&session=${session}`;
		startURL += `&subtitles=burn`;
		startURL += `&copyts=0`;
		startURL += `&Accept-Language=en-GB`;
		startURL += `&X-Plex-Session-Identifier=${session}`;
		startURL += `&X-Plex-Client-Profile-Extra=append-transcode-target-codec%28type%3DvideoProfile%26context%3Dstreaming%26audioCodec%3Daac%26protocol%3Ddash%29`;
		startURL += `&X-Plex-Incomplete-Segments=1`;
		startURL += `&X-Plex-Product=Plex%20Web`;
		startURL += `&X-Plex-Version=4.59.2`;
		startURL += `&X-Plex-Client-Identifier=${session}`;
		startURL += `&X-Plex-Platform=Chrome`;
		startURL += `&X-Plex-Platform-Version=92.0`;
		startURL += `&X-Plex-Sync-Version=2`;
		startURL += `&X-Plex-Features=external-media%2Cindirect-media`;
		startURL += `&X-Plex-Model=bundled`;
		startURL += `&X-Plex-Device=OSX`;
		startURL += `&X-Plex-Device-Name=Chrome`;
		startURL += `&X-Plex-Device-Screen-Resolution=1792x444%2C1792x1120`;
		startURL += `&X-Plex-Language=en-GB`;

		let decisionURL = `${this.getBasicURL()}/video/:/transcode/universal/decision`;

		decisionURL += `?advancedSubtitles=text`;
		decisionURL += `&audioBoost=100`;
		decisionURL += `&autoAdjustQuality=0`;
		decisionURL += `&directPlay=1`;
		decisionURL += `&directStream=1`;
		decisionURL += `&directStreamAudio=1`;
		decisionURL += `&fastSeek=1`;
		decisionURL += `&hasMDE=1`;
		decisionURL += `&location=lan`;
		decisionURL += `&mediaIndex=0`;
		decisionURL += `&partIndex=0`;
		decisionURL += `&path=${tuneData.MediaSubscription[0].MediaGrabOperation[0].Metadata.key}`;
		decisionURL += `&protocol=*`;
		decisionURL += `&session=${session}`;
		decisionURL += `&skipSubtitles=1`;
		decisionURL += `&videoBitrate=200000`;
		decisionURL += `&videoQuality=100`;
		decisionURL += `&X-Plex-Client-Identifier=${session}`;
		decisionURL += `&X-Plex-Platform=Android`;

		const url2 = this.authorizeURL(
			`${this.getBasicURL()}${
				tuneData.MediaSubscription[0].MediaGrabOperation[0].Metadata.key
			}?includeBandwidths=1&offset=-1&X-Plex-Incomplete-Segments=1&X-Plex-Session-Identifier=${session}`
		);

		console.log('Getting info about channel stream...');
		const res2 = await axios.get(url2, {
			timeout: 60000
		});

		console.log(res2.data);

		if (_.isNil(res2.data.MediaContainer.Metadata[0].Media[0].TranscodeSession)) {
			console.log('NOT STARTED - Starting...');
			const res1 = await axios.get(this.authorizeURL(startURL), {
				timeout: 60000
			});
			console.log(res1);
			console.log('____');
		}

		const sleep = async (ms: number): Promise<void> => {
			return new Promise(resolve => setTimeout(resolve, ms));
		};

		console.log('Deciding...');
		let res = await axios.get(this.authorizeURL(decisionURL), {
			timeout: this.requestTimeout
		});
		while (parseFloat(res.data.MediaContainer.Metadata[0].Media[0].Part[0].key.split('offset=')[1].split('&')[0]) < 3) {
			// eslint-disable-next-line no-await-in-loop
			await sleep(500);
			// eslint-disable-next-line no-await-in-loop
			res = await axios.get(this.authorizeURL(decisionURL), {
				timeout: this.requestTimeout
			});
			console.log('Waiting for new url...');
		}
		return res.data.MediaContainer.Metadata[0].Media[0].Part[0].key;
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
