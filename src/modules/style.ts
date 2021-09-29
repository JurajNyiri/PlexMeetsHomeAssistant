import { css } from 'lit-element';
import { CSS_STYLE } from '../const';
/* eslint-env browser */
const style = document.createElement('style');

style.textContent = css`
	.maxZIndex {
		z-index: 6 !important;
	}
	.transparent {
		visibility: hidden !important;
	}
	.detailPlayAction {
		color: rgb(15 17 19);
		font-weight: bold;
		float: left;
		padding: 7px 10px;
		border-radius: 5px;
		cursor: pointer;
		position: relative;
		background: orange;
		border: none;
		margin-right: 10px;
	}
	.detailPlayAction.disabled {
		cursor: default;
		background-color: gray;
		color: white;
	}
	.detailPlayTrailerAction {
		color: rgb(15 17 19);
		font-weight: bold;
		float: left;
		padding: 7px 10px;
		border-radius: 5px;
		cursor: pointer;
		position: relative;
		background: orange;
		border: none;
		visibility: hidden;
	}
	.seasons {
		z-index: 5;
		position: absolute;
		top: ${CSS_STYLE.expandedHeight + 16}px;
		width: calc(100% - 22px);
		left: 0;
		padding: 16px;
		display: none;
	}
	.episodes {
		z-index: 5;
		position: absolute;
		top: ${CSS_STYLE.expandedHeight + 16}px;
		width: calc(100% - 22px);
		left: 0;
		padding: 16px;
		display: none;
	}
	.additionalElem {
		color: hsla(0, 0%, 100%, 0.45);
		position: relative;
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
	}
	.ratingDetail {
		background: #ffffff24;
		padding: 5px 10px;
		border-radius: 5px;
		white-space: nowrap;
		margin-bottom: 10px;
		float: left;
		margin-right: 10px;
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
		float: left;
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

	.detail::-webkit-scrollbar {
		display: none;
	}

	.detail {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	.searchContainer {
		position: relative;
		z-index: 2;
		padding-right: 8px;
	}

	.searchContainer input {
		width: calc(100% - 26px);
		padding: 10px;
		margin-bottom: 10px;
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
		z-index: 5;
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
		background-size: cover;
	}
	.stop-scrolling {
		height: 100%;
		overflow: hidden;
	}
	.contentArt {
		position: absolute;
		background-color: rgba(0, 0, 0, 0);
		z-index: 2;
		left: 0;
		top: 0;
		background-size: cover;
		display: none;
		-webkit-animation: fadein 0.5s; /* Safari, Chrome and Opera > 12.1 */
		-moz-animation: fadein 0.5s; /* Firefox < 16 */
		-ms-animation: fadein 0.5s; /* Internet Explorer */
		-o-animation: fadein 0.5s; /* Opera < 12.1 */
		animation: fadein 0.5s;
	}
	.yearElem {
		color: hsla(0, 0%, 100%, 0.45);
		position: relative;
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
	}
	.viewProgress {
		background: #e5a00d;
		height: 3px;
		bottom: 0;
		position: absolute;
	}
	.toViewEpisode {
		position: relative;
		height: 28px;
		width: 28px;
		float: right;
		display: block;
		background: #e5a00d;
		font-weight: bold;
		color: black;
		transition: 0.5s;
		right: -14px;
		top: -14px;
		transform: rotate(45deg);
	}
	@keyframes fadein {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Firefox < 16 */
	@-moz-keyframes fadein {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Safari, Chrome and Opera > 12.1 */
	@-webkit-keyframes fadein {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Internet Explorer */
	@-ms-keyframes fadein {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Opera < 12.1 */
	@-o-keyframes fadein {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	.toViewSeason {
		position: relative;
		top: 5px;
		right: 5px;
		float: right;
		display: block;
		border-radius: 5px;
		background: #e5a00d;
		font-weight: bold;
		color: black;
		padding: 1px 6px;
		transition: 0.5s;
	}
	.seasonTitleElem {
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
		position: relative;
		font-weight: bold;
		margin-top: 5px;
		transition: 0.5s;
		color: white;
	}
	.episodeTitleElem {
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
		position: relative;
		font-weight: bold;
		margin-top: 5px;
		transition: 0.5s;
		color: white;
	}
	.seasonEpisodesCount {
		transition: 0.5s;
		color: white;
	}
	.episodeNumber {
		color: white;
	}
	.titleElem {
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
		position: relative;
		min-width: 100% !important;
	}
	.seasonContainer {
		position: relative;
		float: left;
		margin-right: 10px;
		margin-bottom: 15px;
		transition: 0.5s;
	}
	.episodeContainer {
		position: relative;
		float: left;
		margin-right: 10px;
		margin-bottom: 15px;
		transition: 0.5s;
	}
	.metaInfoDetails {
		color: hsla(0, 0%, 98%, 0.45);
		text-transform: uppercase;
		margin-top: 10px;
	}
	.simulatedFullScreen {
		background: black;
		height: 100%;
	}
	.episodeElem {
		background-repeat: no-repeat;
		background-size: contain;
		border-radius: 5px;
		transition: 0.5s;
		background: black;
		overflow: hidden;
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
		background-size: cover;
		overflow: hidden;
		border-radius: 5px;
		transition: 0.5s;
		position: absolute;
		z-index: 1;
	}
	.plexMeetsContainer {
		z-index: 1;
		float: left;
		margin-bottom: 20px;
		margin-right: 10px;
		transition: 0.5s;
	}
	.no-transparency {
		background-color: rgba(0, 0, 0, 1) !important;
	}
	.videobg1 {
		position: absolute;
		background-image: linear-gradient(rgba(0, 0, 0, 1), rgba(0, 0, 0, 0.2));
		height: 50%;
		top: 0;
		width: 100%;
	}
	.videobg2 {
		position: absolute;
		background-image: linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 1));
		height: 50%;
		top: 50%;
		width: 100%;
	}
	.video {
		position: absolute;
		z-index: 3;
		visibility: hidden;
	}
	.movieExtras {
		z-index: 5;
		position: absolute;
		top: 340px;
		width: calc(100% - 32px);
		left: 0;
		padding: 16px;
	}
	.interactiveArea {
		position: relative;
		width: 100%;
		height: 100%;
		transition: 0.5s;
	}
	.interactiveArea:hover {
		background: rgba(0, 0, 0, 0.3);
	}
	button[name='playButton'].disabled,
	button[name='playButton'].touchDevice {
		display: none;
	}
	button[name='playButton'] {
		width: 40px;
		height: 40px;
		border: 2px solid white;
		border-radius: 100%;
		cursor: pointer;
		transition: 0.2s;
		margin: 0 auto;
		left: calc(50% - 20px);
		display: block;
		top: calc(50% - 20px);
		position: absolute;
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
