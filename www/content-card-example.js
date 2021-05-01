class ContentCardExample extends HTMLElement {
  data = {}; // placeholder

  set hass(hass) {
    if (!this.content) {
      this.loadCustomStyles();

      const card = document.createElement("ha-card");
      card.header = this.config.libraryName;
      this.content = document.createElement("div");
      this.content.style.padding = "0 16px 16px";
      this.content.style.cursor = "pointer";
      card.appendChild(this.content);
      this.appendChild(card);
      this.content.innerHTML = "";
      var count = 0;
      var maxCount = false;

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
    }
  }

  getMovieElement = (data, hass, server_id) => {
    const width = 138;
    const height = 206;
    const thumbURL =
      "http://" +
      this.config.plexIP +
      ":" +
      this.config.plexPort +
      "/photo/:/transcode?width=" +
      width +
      "&height=" +
      height +
      "&minSize=1&upscale=1&url=" +
      data.thumb +
      "%3FX-Plex-Token%3DRbdSQWgKZ_3NqxzZnRwk&X-Plex-Token=RbdSQWgKZ_3NqxzZnRwk";

    const container = document.createElement("div");
    container.style.float = "left";
    container.style.width = width + "px";
    container.style["margin-bottom"] = "20px";
    container.style["margin-right"] = "10px";

    const movieElem = document.createElement("div");
    movieElem.style =
      "width:" +
      width +
      "px; height:" +
      height +
      "px; margin-bottom:5px; background-image: url('" +
      thumbURL +
      "'); background-repeat: no-repeat; background-size: contain; border-radius: 5px;";

    const playButton = this.getPlayButton();
    const interactiveArea = document.createElement("div");
    interactiveArea.className = "interactiveArea";
    interactiveArea.append(playButton);

    movieElem.append(interactiveArea);

    const _this = this;
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
    titleElem.style =
      "text-overflow: ellipsis; white-space: nowrap; overflow: hidden;";

    const yearElem = document.createElement("div");
    yearElem.innerHTML = data.year;
    yearElem.style = "color:hsla(0,0%,100%,.45);";

    container.appendChild(movieElem);
    container.appendChild(titleElem);
    container.appendChild(yearElem);

    return container;
  };

  loadCustomStyles = () => {
    let style = document.createElement("style");

    style.textContent = `
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
    if (!config.entity_id) {
      throw new Error("You need to define an entity_id");
    }
    if (!config.plexToken) {
      throw new Error("You need to define a plexToken");
    }
    if (!config.plexIP) {
      throw new Error("You need to define a plexIP");
    }
    if (!config.plexPort) {
      throw new Error("You need to define a plexPort");
    }
    if (!config.libraryName) {
      throw new Error("You need to define a libraryName");
    }
    this.config = config;

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
