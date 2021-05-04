/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';

class Plex {
	ip: string;

	port: number;

	token: string;

	protocol: string;

	constructor(ip: string, port = 32400, token: string, protocol: 'http' | 'https' = 'http') {
		this.ip = ip;
		this.port = port;
		this.token = token;
		this.protocol = protocol;
	}

	getServerInfo = async (): Promise<any> => {
		const url = `${this.protocol}://${this.ip}:${this.port}/?X-Plex-Token=${this.token}`;
		return (await axios.get(url)).data.MediaContainer;
	};

	getSections = async (): Promise<any> => {
		const url = `${this.protocol}://${this.ip}:${this.port}/library/sections?X-Plex-Token=${this.token}`;
		return (await axios.get(url)).data.MediaContainer.Directory;
	};
}

export default Plex;
