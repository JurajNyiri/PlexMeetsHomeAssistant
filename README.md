# PlexMeetsHomeAssistant

Custom integration which integrates plex into Home Assistant and makes it possible to launch movies or tv shows on TV with a simple click

**This is an extremely early version of integration / card aimed mostly for experienced users and/or developers.**

## Installation

- Add [custom repository](https://hacs.xyz/docs/faq/custom_repositories/) to HACS, url: `https://github.com/JurajNyiri/PlexMeetsHomeAssistant`.

![Adding lovelace custom repository](https://github.com/JurajNyiri/PlexMeetsHomeAssistant/blob/main/images/3.png)

- Reload browser, clear cache as usual
- Create a new Home Assistant tab, turn on panel mode
- Add a new card, see configuration below.

## Configuration

**type**: 'custom:plex-meets-homeassistant'

**token**: Enter your [Plex Token](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)

**ip**: Enter ip address of plex server. You can also enter hostname without protocol or port.

**port**: Enter port of your plex sever.

**protocol**: _Optional_ Protocol to use for Plex. Defaults to "http".

**maxCount**: _Optional_ Maximum number of items to display in card.

**entity**: You need to configure at least one supported media_player entity.

- **androidtv**: Entity id of your media_player configured via [Android TV](https://www.home-assistant.io/integrations/androidtv/). See [detailed instructions](https://github.com/JurajNyiri/PlexMeetsHomeAssistant/tree/main#android-tv).
- **kodi**: Entity id of your media_player configured via [Kodi](https://www.home-assistant.io/integrations/kodi/). See [detailed instructions](https://github.com/JurajNyiri/PlexMeetsHomeAssistant/tree/main#kodi).

Example of card configuration:

```
type: 'custom:plex-meets-homeassistant'
token: QWdsqEXAMPLETOKENqwerty
ip: 192.168.13.37
port: 32400
libraryName: Movies
protocol: http
maxCount: 10
entity:
  kodi: media_player.kodi_123456qwe789rty
  androidtv: media_player.living_room_nvidia_shield
```

If you are using Home Assistant via HTTPS, you need to specify port `https` for Plex and have Plex available on https connection.

## Detailed configuration instructions for end devices

_You can combine multiple supported entities_, in that case, entity for supported content will be chosen in order how you entered them.

As an example, if content can be played / shown both by kodi and androidtv, and you entered kodi first, it will be shown by kodi. If it cannot be played by kodi but can be played by androidtv, androidtv will be used.

This will also work with play button being shown, it will only show when you can actually play content on your device.

Play button is only visible if all the conditions inside Availability section of end devices below are met.

### Android TV or Fire TV

**Difficulity to setup**: Easy

**Steps**:

- Setup [Android TV](https://www.home-assistant.io/integrations/androidtv/). You need just a [default configuration](https://www.home-assistant.io/integrations/androidtv/#configuration), no optional parameters needed.
- Use entity_id of media_player provided by Android TV integration in card, example: `androidtv: media_player.living_room_nvidia_shield`.

**Availability**:

- Provided entity ID needs to exists
- Provided entity ID needs to have attributes
- Provided entity ID needs to have attribute adb_response

### Kodi

**Difficulity to setup**: Moderate

**Steps**:

- Install and configure [PlexKodiConnect](https://github.com/croneter/PlexKodiConnect#download-and-installation) on Kodi itself.
- Setup [Kodi](https://www.home-assistant.io/integrations/kodi/) integration for your device.
- Install and configure integration [Kodi Recently Added Media](https://github.com/jtbgroup/kodi-media-sensors#installation) and its sensor **kodi_media_sensor_search**

<details>
    <summary>Images of installation of Kodi Recently Added Media</summary>

![Click on add integration in integrations](https://github.com/JurajNyiri/PlexMeetsHomeAssistant/blob/main/images/kodi_setup/1.png)

![Find integration Kodi Media Sensors](https://github.com/JurajNyiri/PlexMeetsHomeAssistant/blob/main/images/kodi_setup/2.png)

![Configure integration Kodi Media Sensors](https://github.com/JurajNyiri/PlexMeetsHomeAssistant/blob/main/images/kodi_setup/3.png)

</details>

- Use entity_id of media_player provided by Kodi integration in card, example: `media_player.kodi_123456qwe789rty`.

**Availability**:

- Provided entity ID needs to exists
- Provided entity ID has to have 'kodi\_' in the entity_id
- Entity 'sensor.kodi_media_sensor_search' needs to exist
- State of both entities cannot be 'unavailable'
- State of kodi cannot be 'off'

## Ask for help or help development

Join [Discord](https://discord.gg/5W9Ttp2R) or [Home Assistant Community](https://community.home-assistant.io/t/custom-component-card-plex-meets-home-assistant/304349).

## Images

![View without hover](https://github.com/JurajNyiri/PlexMeetsHomeAssistant/blob/main/images/1.png)

![View with hover](https://github.com/JurajNyiri/PlexMeetsHomeAssistant/blob/main/images/2.png)
