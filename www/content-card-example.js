class ContentCardExample extends HTMLElement {
  data = {}; // placeholder

  width = 138;
  height = 206;
  expandedWidth = 220;
  expandedHeight = 324;
  movieElems = [];
  detailElem = undefined;
  data = {};
  requestTimeout = 3000;
  loading = false;
  maxCount = false;

  renderPage = (hass) => {
    const _this = this;
    if (this) this.innerHTML = "";
    const card = document.createElement("ha-card");
    //card.header = this.config.libraryName;
    this.content = document.createElement("div");
    this.content.style.padding = "16px 16px 100px";

    this.content.innerHTML = "";
    if (this.error != "") {
      this.content.innerHTML = "Error: " + this.error;
    } else if (
      this.data[this.config.libraryName] &&
      this.data[this.config.libraryName].length === 0
    ) {
      this.content.innerHTML =
        "Library " + this.config.libraryName + " has no items.";
    } else if (this.loading) {
      this.content.style.padding = "16px 16px 16px";
      this.content.innerHTML =
        '<div style="display: flex; align-items: center; justify-content: center;"><div class="lds-ring"><div></div><div></div><div></div><div></div></div></div>'; //ttmp
    }

    card.appendChild(this.content);
    this.appendChild(card);

    var count = 0;

    const contentbg = document.createElement("div");
    contentbg.className = "contentbg";
    this.content.appendChild(contentbg);

    this.detailElem = document.createElement("div");
    this.detailElem.className = "detail";
    this.detailElem.innerHTML = "<h1></h1><span class='detailDesc'></span>";
    this.content.appendChild(this.detailElem);

    //todo: figure out why timeout is needed here and do it properly
    setTimeout(function () {
      contentbg.addEventListener("click", function (event) {
        _this.hideBackground();
        _this.minimizeAll();
      });
    }, 1);
    if (this.data[this.config.libraryName]) {
      this.data[this.config.libraryName].some((movieData) => {
        if (count < this.maxCount || !this.maxCount) {
          count++;
          this.content.appendChild(
            this.getMovieElement(movieData, hass, this.data.server_id)
          );
        } else {
          return true;
        }
      });
    }
    const endElem = document.createElement("div");
    endElem.style = "clear:both;";
    this.content.appendChild(endElem);

    this.calculatePositions();
    this.loadCustomStyles();
  };

  set hass(hass) {
    if (!this.content) {
      const _this = this;
      this.error = "";
      if (!this.loading) {
        this.loadInitialData(hass);
      }
    }
  }

  render = (hass) => {
    const _this = this;
    this.previousPositions = [];

    console.log("render");
    //todo: find a better way to detect resize...
    setInterval(() => {
      if (_this.movieElems.length > 0) {
        if (_this.previousPositions.length === 0) {
          for (let i = 0; i < _this.movieElems.length; i++) {
            _this.previousPositions[i] = {};
            _this.previousPositions[i]["top"] =
              _this.movieElems[i].parentElement.offsetTop;
            _this.previousPositions[i]["left"] =
              _this.movieElems[i].parentElement.offsetLeft;
          }
        }
        for (let i = 0; i < _this.movieElems.length; i++) {
          if (
            _this.previousPositions[i] &&
            _this.movieElems[i].dataset.clicked !== "true" &&
            (_this.previousPositions[i]["top"] !==
              _this.movieElems[i].parentElement.offsetTop ||
              _this.previousPositions[i]["left"] !==
                _this.movieElems[i].parentElement.offsetLeft)
          ) {
            _this.renderPage(hass);
            _this.previousPositions = [];
          }
        }
      }
    }, 100);
    this.renderPage(hass);
  };

  loadInitialData = (hass) => {
    this.loading = true;
    this.renderPage(hass);
    const serverRequest = this.getData(
      this.plexProtocol +
        "://" +
        this.config.ip +
        ":" +
        this.config.port +
        "/?X-Plex-Token=" +
        this.config.token
    );
    const sectionsRequest = this.getData(
      this.plexProtocol +
        "://" +
        this.config.ip +
        ":" +
        this.config.port +
        "/library/sections?X-Plex-Token=" +
        this.config.token
    );

    const parser = new DOMParser();
    const sectionsDetails = [];
    Promise.all([serverRequest, sectionsRequest])
      .then((data) => {
        const serverData = parser.parseFromString(data[0], "text/xml");
        const sectionsData = parser.parseFromString(data[1], "text/xml");
        const directories = sectionsData.getElementsByTagName("Directory");

        Array.from(directories).some((directory) => {
          const sectionID = directory.attributes.key.textContent;
          const url =
            this.plexProtocol +
            "://" +
            this.config.ip +
            ":" +
            this.config.port +
            "/library/sections/" +
            sectionID +
            "/all?X-Plex-Token=" +
            this.config.token;
          sectionsDetails.push(this.getData(url));
        });

        Promise.all(sectionsDetails)
          .then((sectionsData) => {
            sectionsData.some((sectionData) => {
              sectionData = parser.parseFromString(sectionData, "text/xml");
              const sectionType = sectionData.getElementsByTagName(
                "MediaContainer"
              )[0].attributes.viewGroup.textContent;
              const sectionTitle = sectionData.getElementsByTagName(
                "MediaContainer"
              )[0].attributes.title1.textContent;
              this.data[sectionTitle] = [];
              let titles = [];
              if (sectionType == "movie") {
                titles = sectionData.getElementsByTagName("Video");
              } else if (sectionType == "show") {
                titles = sectionData.getElementsByTagName("Directory");
              } else {
                //todo
              }
              Array.from(titles).some((title) => {
                this.data[sectionTitle].push({
                  title: title.attributes.title
                    ? title.attributes.title.textContent
                    : undefined,
                  summary: title.attributes.summary
                    ? title.attributes.summary.textContent
                    : undefined,
                  key: title.attributes.key
                    ? title.attributes.key.textContent
                    : undefined,
                  guid: title.attributes.guid
                    ? title.attributes.guid.textContent
                    : undefined,
                  rating: title.attributes.rating
                    ? title.attributes.rating.textContent
                    : undefined,
                  audienceRating: title.attributes.audienceRating
                    ? title.attributes.audienceRating.textContent
                    : undefined,
                  year: title.attributes.year
                    ? title.attributes.year.textContent
                    : undefined,
                  thumb: title.attributes.thumb
                    ? title.attributes.thumb.textContent
                    : undefined,
                  art: title.attributes.art
                    ? title.attributes.art.textContent
                    : undefined,
                });
              });
            });
            if (this.data[this.config.libraryName] === undefined) {
              this.error =
                "Library name " + this.config.libraryName + " does not exist.";
            }

            this.loading = false;
            this.render(hass);
          })
          .catch((err) => {
            this.error =
              "Plex sections requests did not respond within " +
              this.requestTimeout / 1000 +
              " seconds.";
            this.renderPage(hass);
          });
      })
      .catch((err) => {
        this.error =
          "Plex server did not respond within " +
          this.requestTimeout / 1000 +
          " seconds.";
        this.renderPage(hass);
      });
  };

  //todo: run also on resize
  calculatePositions = () => {
    const _this = this;
    //todo: figure out why loop is needed here and do it properly
    const setLeftOffsetsInterval = setInterval(() => {
      _this.movieElems = _this.getElementsByClassName("movieElem");
      for (let i = 0; i < _this.movieElems.length; i++) {
        if (_this.movieElems[i].offsetLeft === 0) {
          break;
        } else {
          clearInterval(setLeftOffsetsInterval);
        }
        _this.movieElems[i].style.left = _this.movieElems[i].offsetLeft + "px";
        _this.movieElems[i].dataset.left = _this.movieElems[i].offsetLeft;
        _this.movieElems[i].style.top = _this.movieElems[i].offsetTop + "px";
        _this.movieElems[i].dataset.top = _this.movieElems[i].offsetTop;
      }
    }, 10);
  };

  minimizeAll = () => {
    for (let i = 0; i < this.movieElems.length; i++) {
      if (this.movieElems[i].dataset.clicked === "true") {
        this.movieElems[i].style.width = this.width + "px";
        this.movieElems[i].style.height = this.height + "px";
        this.movieElems[i].style["z-index"] = 1;
        this.movieElems[i].style.position = "absolute";
        this.movieElems[i].style.left = this.movieElems[i].dataset.left + "px";
        this.movieElems[i].style.top = this.movieElems[i].dataset.top + "px";
        const __this = this;
        setTimeout(function () {
          __this.movieElems[i].dataset.clicked = false;
        }, 500);
      }
    }
    this.hideDetails();
  };

  hideDetails = () => {
    this.detailElem.style.color = "rgba(255,255,255,0)";
    this.detailElem.style["z-index"] = "0";
  };

  showDetails = (data) => {
    this.detailElem.children[0].innerHTML = data.title;
    this.detailElem.children[1].innerHTML = data.summary;
    this.detailElem.style.color = "rgba(255,255,255,1)";
    this.detailElem.style["z-index"] = "4";
  };

  showBackground = () => {
    const contentbg = this.getElementsByClassName("contentbg");
    contentbg[0].style["z-index"] = 2;
    contentbg[0].style["background-color"] = "rgba(0,0,0,0.9)";
  };

  hideBackground = () => {
    const contentbg = this.getElementsByClassName("contentbg");
    contentbg[0].style["z-index"] = 1;
    contentbg[0].style["background-color"] = "rgba(0,0,0,0)";
  };

  getMovieElement = (data, hass, server_id) => {
    const _this = this;
    const thumbURL =
      this.plexProtocol +
      "://" +
      this.config.ip +
      ":" +
      this.config.port +
      "/photo/:/transcode?width=" +
      this.expandedWidth +
      "&height=" +
      this.expandedHeight +
      "&minSize=1&upscale=1&url=" +
      data.thumb +
      "&X-Plex-Token=" +
      this.config.token;

    const container = document.createElement("div");
    container.className = "container";
    container.style.width = this.width + "px";
    container.style.height = this.height + 30 + "px";

    const movieElem = document.createElement("div");
    movieElem.className = "movieElem";
    movieElem.style =
      "width:" +
      this.width +
      "px; height:" +
      this.height +
      "px; background-image: url('" +
      thumbURL +
      "'); ";

    movieElem.addEventListener("click", function (event) {
      console.log(data);
      if (this.dataset.clicked === "true") {
        _this.hideDetails();
        this.style.width = _this.width + "px";
        this.style.height = _this.height + "px";
        this.style["z-index"] = 1;
        this.style.top = this.dataset.top + "px";
        this.style.left = this.dataset.left + "px";

        const __this = this;
        setTimeout(function () {
          __this.dataset.clicked = false;
        }, 500);

        _this.hideBackground();
      } else {
        _this.minimizeAll();
        _this.showDetails(data);
        const doc = document.documentElement;
        const top =
          (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
        _this.showBackground();
        this.style.width = _this.expandedWidth + "px";
        this.style.height = _this.expandedHeight + "px";
        this.style["z-index"] = 3;
        this.style.left = "16px";
        this.style.top = top + 16 + "px";
        this.dataset.clicked = true;
      }
    });

    const playButton = this.getPlayButton();
    const interactiveArea = document.createElement("div");
    interactiveArea.className = "interactiveArea";
    interactiveArea.append(playButton);

    movieElem.append(interactiveArea);

    playButton.addEventListener("click", function (event) {
      event.stopPropagation();
      var keyParts = data.key.split("/");
      var movieID = keyParts[3];
      var command =
        "am start -a android.intent.action.VIEW 'plex://server://" +
        server_id +
        "/com.plexapp.plugins.library/library/metadata/" +
        movieID +
        "'";

      console.log(command);
      var entity_id = _this.config.entity_id;
      hass.callService("androidtv", "adb_command", {
        entity_id,
        command,
      });
    });

    const titleElem = document.createElement("div");
    titleElem.innerHTML = data.title;
    titleElem.className = "titleElem";
    titleElem.style["margin-top"] = this.height + "px";

    const yearElem = document.createElement("div");
    yearElem.innerHTML = data.year;
    yearElem.className = "yearElem";

    container.appendChild(movieElem);
    container.appendChild(titleElem);
    container.appendChild(yearElem);

    return container;
  };

  loadCustomStyles = () => {
    let style = document.createElement("style");

    style.textContent = `
        .detail h1 {
          text-overflow: ellipsis; 
          white-space: nowrap; 
          overflow: hidden;
          position: relative;
          padding: 5px 0px;
        }
        .detailDesc {
  
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
          color: rgba(255,255,255,0);
        }
        .contentbg {
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0);
          z-index: 0;
          transition: 0.5s;
          left: 0;
          top: 0;
        }
        .yearElem {
          color:hsla(0,0%,100%,.45);
          position: relative;
        }
        .titleElem {
          text-overflow: ellipsis; 
          white-space: nowrap; 
          overflow: hidden;
          position: relative;
        }
        .movieElem {
          margin-bottom:5px;
          background-repeat: no-repeat; 
          background-size: contain; 
          border-radius: 5px;
          transition: 0.5s;
          position: absolute;
          z-index: 1;
        }
        .container {
          z-index: 1;
          float:left;
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
          background: rgba(0,0,0,0.3);
        }
        button[name="playButton"] {
          width: 40px;
          height: 40px;
          border: 2px solid white;
          border-radius: 100%;
          margin: auto;
          cursor: pointer;
          transition: 0.2s;
        }
        button[name="playButton"]:hover {
          background: orange !important;
          border: 2px solid orange !important;
        }
        button[name="playButton"]:focus {
          outline: 0;
          background: orange !important;
          border: 2px solid orange !important;
          box-shadow: 0 0 0 3px orange !important;
        }
        
        button[name="playButton"]::after {
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
  
        .interactiveArea button[name="playButton"] {
          background: rgba(0,0,0,0.0);
          border: 2px solid rgba(255,255,255,0.0);
        }
  
        .interactiveArea:hover button[name="playButton"] {
          background: rgba(0,0,0,0.4);
          border: 2px solid rgba(255,255,255,1);
        }
  
        .interactiveArea button[name="playButton"]:after {
          border-color: transparent transparent transparent rgba(255,255,255,0);
        }
  
        .interactiveArea:hover button[name="playButton"]:after {
          border-color: transparent transparent transparent rgba(255,255,255,1);
        }
    
        button[name="playButton"]:hover:after {
          border-color: transparent transparent transparent black !important;
        }
    
        button[name="playButton"]:focus:after {
          border-color: transparent transparent transparent black !important;
        }`;

    this.appendChild(style);
  };

  getPlayButton = () => {
    const playButton = document.createElement("button");
    playButton.name = "playButton";

    return playButton;
  };

  setConfig(config) {
    this.plexProtocol = "http";
    if (!config.entity_id) {
      throw new Error("You need to define an entity_id");
    }
    if (!config.token) {
      throw new Error("You need to define a token");
    }
    if (!config.ip) {
      throw new Error("You need to define a ip");
    }
    if (!config.port) {
      throw new Error("You need to define a port");
    }
    if (!config.libraryName) {
      throw new Error("You need to define a libraryName");
    }
    this.config = config;
    if (config.protocol) {
      this.plexProtocol = config.protocol;
    }
    if (config.maxCount) {
      this.maxCount = config.maxCount;
    }
  }

  getData = (url) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.timeout = this.requestTimeout;
      xhr.onload = function () {
        resolve(xhr.responseText);
      };
      xhr.ontimeout = function (e) {
        reject(e);
      };
      xhr.send(null);
    });
  };

  // The height of your card. Home Assistant uses this to automatically
  // distribute all cards over the available columns.
  getCardSize() {
    return 3;
  }
}

customElements.define("content-card-example", ContentCardExample);
