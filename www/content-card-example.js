class ContentCardExample extends HTMLElement {
  data = {}; // placeholder

  set hass(hass) {
    if (!this.content) {
      this.loadCustomStyles();

      //todo: replace this with a proper integration
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.open("GET", "/local/plexData.json", false); // false for synchronous request
      xmlHttp.send(null);
      this.data = JSON.parse(xmlHttp.responseText);

      const card = document.createElement("ha-card");
      card.header = "Movies";
      this.content = document.createElement("div");
      this.content.style.padding = "0 16px 16px";
      this.content.style.cursor = "pointer";
      card.appendChild(this.content);
      this.appendChild(card);
      this.content.innerHTML = "";
      var count = 0;
      var maxCount = 10;
      this.data.Movies.some((movieData) => {
        if (count < maxCount) {
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
    const thumbURL =
      "http://" +
      this.config.plexIP +
      ":" +
      this.config.plexPort +
      data.thumb +
      "?X-Plex-Token=" +
      this.config.plexToken;
    const thumbSmall =
      "http://" +
      this.config.plexIP +
      ":" +
      this.config.plexPort +
      "/photo/:/transcode?width=138&height=206&minSize=1&upscale=1&url=" +
      data.thumb +
      "%3FX-Plex-Token%3DRbdSQWgKZ_3NqxzZnRwk&X-Plex-Token=RbdSQWgKZ_3NqxzZnRwk";
    //const thumbElem = document.createElement("img");
    //thumbElem.src = thumbURL;
    //thumbElem.style = "width:100%;";
    const movieElem = document.createElement("div");
    //movieElem.appendChild(thumbElem);
    movieElem.style =
      "float:left; width:138px; height:206px; margin-right:10px; margin-bottom:10px; background-image: url('" +
      thumbSmall +
      "'); background-repeat: no-repeat; background-size: contain;";
    movieElem.innerHTML = data.title;

    const playButton = this.getPlayButton();
    movieElem.append(playButton);

    const _this = this;
    movieElem.addEventListener("click", function (event) {
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
    return movieElem;
  };

  loadCustomStyles = () => {
    let style = document.createElement("style");

    style.textContent = `
      button[name="playButton"] {
        width: 50px;
        height: 50px;
        background: red;
        border: none;
        border-radius: 100%;
        margin: auto;
        cursor: pointer;
      }
      button[name="playButton"]:focus {
        outline: 0;
        border: 1px solid hsl(210, 58%, 69%);
        box-shadow: 0 0 0 3px hsla(210, 76%, 57%, 0.5);
      }
      
      button[name="playButton"]::after {
        content: '';
        display: inline-block;
        position: relative;
        top: 1px;
        left: 3px;
        border-style: solid;
        border-width: 10px 0 10px 20px;
        border-color: transparent transparent transparent white;
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
      throw new Error("You need to define an entity ID");
    }
    if (!config.plexToken) {
      throw new Error("You need to define an plex token");
    }
    if (!config.plexIP) {
      throw new Error("You need to define an plex IP");
    }
    if (!config.plexPort) {
      throw new Error("You need to define an plex port");
    }
    this.config = config;

    //this.data =
  }

  // The height of your card. Home Assistant uses this to automatically
  // distribute all cards over the available columns.
  getCardSize() {
    return 3;
  }
}

customElements.define("content-card-example", ContentCardExample);
