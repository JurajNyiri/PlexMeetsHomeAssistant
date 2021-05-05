import { css } from 'lit-element';
import { CSS_STYLE } from '../const';
/* eslint-env browser */
const style = document.createElement('style');

style.textContent = css`
	.detailPlayAction {
		top: 10px;
		color: rgb(15 17 19);
		font-weight: bold;
		padding: 5px 10px;
		border-radius: 5px;
		cursor: pointer;
		position: relative;
		background: orange;
	}
	.seasons {
		z-index: 4;
		position: absolute;
		top: ${CSS_STYLE.expandedHeight + 16}px;
		width: 100%;
		left: 0;
		padding: 16px;
	}
	.ratingDetail {
		background: #ffffff24;
		padding: 5px 10px;
		border-radius: 5px;
		white-space: nowrap;
		margin-bottom: 10px;
		float: left;
	}
	.contentRatingDetail {
		background: #ffffff24;
		padding: 5px 10px;
		border-radius: 5px;
		margin-right: 10px;
		white-space: nowrap;
		float: left;
		margin-bottom: 10px;
	}
	.clear {
		clear: both;
	}
	.minutesDetail {
		background: #ffffff24;
		padding: 5px 10px;
		border-radius: 5px;
		margin-right: 10px;
		white-space: nowrap;
		float: left;
		margin-bottom: 10px;
	}
	.detail .metaInfo {
		display: block;
	}
	.detail h2 {
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
		position: relative;
		margin: 5px 0px 10px 0px;
		font-size: 16px;
	}
	.detail h1 {
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
		position: relative;
		padding: 5px 0px;
		margin: 16px 0 10px 0;
	}
	.detail {
		visibility: hidden;
		max-height: ${CSS_STYLE.expandedHeight + 16}px;
		display: block;
		overflow: scroll;
		text-overflow: ellipsis;
	}
	.detailDesc {
		position: relative;
	}
	.lds-ring {
		display: inline-block;
		position: relative;
		width: 80px;
		height: 80px;
	}
	.lds-ring div {
		box-sizing: border-box;
		display: block;
		position: absolute;
		width: 64px;
		height: 64px;
		margin: 8px;
		border: 8px solid orange;
		border-radius: 50%;
		animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
		border-color: orange transparent transparent transparent;
	}
	.lds-ring div:nth-child(1) {
		animation-delay: -0.45s;
	}
	.lds-ring div:nth-child(2) {
		animation-delay: -0.3s;
	}
	.lds-ring div:nth-child(3) {
		animation-delay: -0.15s;
	}
	@keyframes lds-ring {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
	.detail {
		position: absolute;
		left: 247px;
		width: calc(100% - 267px);
		z-index: 4;
		transition: 0.5s;
		color: rgba(255, 255, 255, 0);
	}
	.contentbg {
		position: absolute;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0);
		z-index: 0;
		transition: 0.5s;
		left: 0;
		top: 0;
	}
	.yearElem {
		color: hsla(0, 0%, 100%, 0.45);
		position: relative;
	}
	.seasonTitleElem {
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
		position: relative;
		font-weight: bold;
		margin-top: 5px;
		transition: 0.5s;
	}
	.seasonEpisodesCount {
		transition: 0.5s;
	}
	.titleElem {
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
		position: relative;
	}
	.seasonContainer {
		position: relative;
		float: left;
		margin-right: 16px;
		margin-bottom: 15px;
		transition: 0.5s;
	}
	.seasonElem {
		background-repeat: no-repeat;
		background-size: contain;
		border-radius: 5px;
		transition: 0.5s;
	}
	.movieElem {
		margin-bottom: 5px;
		background-repeat: no-repeat;
		background-size: contain;
		border-radius: 5px;
		transition: 0.5s;
		position: absolute;
		z-index: 1;
	}
	.container {
		z-index: 1;
		float: left;
		margin-bottom: 20px;
		margin-right: 10px;
		transition: 0.5s;
	}
	.interactiveArea {
		position: relative;
		width: 100%;
		height: 100%;
		transition: 0.5s;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.interactiveArea:hover {
		background: rgba(0, 0, 0, 0.3);
	}
	button[name='playButton'] {
		width: 40px;
		height: 40px;
		border: 2px solid white;
		border-radius: 100%;
		margin: auto;
		cursor: pointer;
		transition: 0.2s;
	}
	button[name='playButton']:hover {
		background: orange !important;
		border: 2px solid orange !important;
	}
	button[name='playButton']:focus {
		outline: 0;
		background: orange !important;
		border: 2px solid orange !important;
		box-shadow: 0 0 0 3px orange !important;
	}

	button[name='playButton']::after {
		content: '';
		display: inline-block;
		position: relative;
		top: 1px;
		left: 2px;
		border-style: solid;
		border-width: 6px 0 6px 12px;
		border-color: transparent transparent transparent white;
		transition: 0.2s;
	}

	.interactiveArea button[name='playButton'] {
		background: rgba(0, 0, 0, 0);
		border: 2px solid rgba(255, 255, 255, 0);
	}

	.interactiveArea:hover button[name='playButton'] {
		background: rgba(0, 0, 0, 0.4);
		border: 2px solid rgba(255, 255, 255, 1);
	}

	.interactiveArea button[name='playButton']:after {
		border-color: transparent transparent transparent rgba(255, 255, 255, 0);
	}

	.interactiveArea:hover button[name='playButton']:after {
		border-color: transparent transparent transparent rgba(255, 255, 255, 1);
	}

	button[name='playButton']:hover:after {
		border-color: transparent transparent transparent black !important;
	}

	button[name='playButton']:focus:after {
		border-color: transparent transparent transparent black !important;
	}
`.cssText;

export default style;
