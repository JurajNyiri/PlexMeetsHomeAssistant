/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import _ from 'lodash';

class Plex {
	ip: string;

	port: number;

	token: string;

	protocol: string;

	serverInfo: Record<string, any> = {};

	constructor(ip: string, port = 32400, token: string, protocol: 'http' | 'https' = 'http') {
		this.ip = ip;
		this.port = port;
		this.token = token;
		this.protocol = protocol;
	}

	getServerID = async (): Promise<any> => {
		if (_.isEmpty(this.serverInfo)) {
			await this.getServerInfo();
		}
		return this.serverInfo.machineIdentifier;
	};

	getServerInfo = async (): Promise<any> => {
		const url = `${this.protocol}://${this.ip}:${this.port}/?X-Plex-Token=${this.token}`;
		this.serverInfo = (await axios.get(url)).data.MediaContainer;
		return this.serverInfo;
	};

	getSections = async (): Promise<any> => {
		const url = `${this.protocol}://${this.ip}:${this.port}/library/sections?X-Plex-Token=${this.token}`;
		return (await axios.get(url)).data.MediaContainer.Directory;
	};

	getSectionsData = async (): Promise<any> => {
		const sections = await this.getSections();
		const sectionsRequests: Array<Promise<any>> = [];
		_.forEach(sections, section => {
			sectionsRequests.push(
				axios.get(
					`${this.protocol}://${this.ip}:${this.port}/library/sections/${section.key}/all?X-Plex-Token=${this.token}`
				)
			);
		});
		return this.exportSectionsData(await Promise.all(sectionsRequests));
	};

	getLibraryData = async (id: number): Promise<any> => {
		const url = `${this.protocol}://${this.ip}:${this.port}/library/metadata/${id}/children?X-Plex-Token=${this.token}`;
		return (await axios.get(url)).data.MediaContainer.Metadata;
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
