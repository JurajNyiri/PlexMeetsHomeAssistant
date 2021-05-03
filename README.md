# PlexMeetsHomeAssistant

Custom integration which integrates plex into Home Assistant and makes it possible to launch movies or tv shows on TV with a simple click

**This is an extremely early version of integration / card aimed mostly for experienced users and/or developers.**

## Installation

1. Add [custom repository](https://hacs.xyz/docs/faq/custom_repositories/) to HACS, url: `https://github.com/JurajNyiri/PlexMeetsHomeAssistant`.
2. Reload browser, clear cache as usual
3. Create a new Home Assistant tab, turn on panel mode
4. Add a new card to it:

```
type: 'custom:plex-meets-homeassistant'
token: Plex token
ip: Plex IP address
port: Plex port
entity_id: Android TV media_player entity
libraryName: Plex library name that you wish to display
protocol: Optional - protocol to use for plex, defaults to http
maxCount: Optional - maximum number of items to display
```

If you are using Home Assistant via HTTPS, you need to specify port `https` for Plex and have Plex available on https connection.

## Images

![View without hover](https://github.com/JurajNyiri/PlexMeetsHomeAssistant/blob/main/images/1.png)

![View with hover](https://github.com/JurajNyiri/PlexMeetsHomeAssistant/blob/main/images/2.png)

## Ask for help or help development

Join [Discord](https://discord.gg/5W9Ttp2R) or [Home Assistant Community](https://community.home-assistant.io/t/custom-component-card-plex-meets-home-assistant/304349).
