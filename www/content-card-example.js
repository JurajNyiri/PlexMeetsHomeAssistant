class ContentCardExample extends HTMLElement {
  data = {}; // placeholder

  width = 138;
  height = 206;
  expandedWidth = 220;
  expandedHeight = 324;

  set hass(hass) {
    if (!this.content) {
      this.loadCustomStyles();

      const card = document.createElement("ha-card");
      //card.header = this.config.libraryName;
      this.content = document.createElement("div");
      this.content.style.padding = "16px 16px 100px";
      card.appendChild(this.content);
      this.appendChild(card);
      this.content.innerHTML = "";
      var count = 0;
      var maxCount = false;

      const contentbg = document.createElement("div");
      contentbg.className = "contentbg";
      this.content.appendChild(contentbg);

      //todo: figure out why timeout is needed here and do it properly
      const _this = this;
      setTimeout(function () {
        contentbg.addEventListener("click", function (event) {
          _this.hideBackground();
          _this.minimizeAll();
        });
      }, 1);

      this.data[this.config.libraryName].some((movieData) => {
        if (count < maxCount || !maxCount) {
          count++;
          this.content.appendChild(
            this.getMovieElement(movieData, hass, this.data.server_id)
          );
        } else {
          return true;
        }
      });
      const endElem = document.createElement("div");
      endElem.style = "clear:both;";
      this.content.appendChild(endElem);

      this.calculatePositions();
    }
  }

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
        this.movieElems[i].dataset.clicked = false;
      }
    }
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
      if (this.dataset.clicked === "true") {
        this.style.width = _this.width + "px";
        this.style.height = _this.height + "px";
        this.style["z-index"] = 1;
        this.style.position = "absolute";
        this.style.left = this.dataset.left + "px";
        this.dataset.clicked = false;

        _this.hideBackground();
      } else {
        _this.minimizeAll();
        _this.showBackground();
        this.style.width = _this.expandedWidth + "px";
        this.style.height = _this.expandedHeight + "px";
        this.style["z-index"] = 3;
        this.style.position = "fixed";
        this.style.left = "16px";
        this.dataset.clicked = true;
      }
    });

    const playButton = this.getPlayButton();
    const interactiveArea = document.createElement("div");
    interactiveArea.className = "interactiveArea";
    interactiveArea.append(playButton);

    movieElem.append(interactiveArea);

    playButton.addEventListener("click", function (event) {
      var keyParts = data.key.split("/");
      var movieID = keyParts[keyParts.length - 1];
      var command =
        "am start -a android.intent.action.VIEW 'plex://server://" +
        server_id +
        "/com.plexapp.plugins.library/library/metadata/" +
        movieID +
        "'";
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

    //todo: replace this with a proper integration
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", "/local/plexData.json", false); // false for synchronous request
    xmlHttp.send(null);
    this.data = JSON.parse(xmlHttp.responseText);

    if (this.data[this.config.libraryName] === undefined) {
      throw new Error(
        "Library name " + this.config.libraryName + " does not exist."
      );
    }
  }

  // The height of your card. Home Assistant uses this to automatically
  // distribute all cards over the available columns.
  getCardSize() {
    return 3;
  }
}

customElements.define("content-card-example", ContentCardExample);
