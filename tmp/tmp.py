import requests
import xml.etree.ElementTree as ET
import json
import sys

if len(sys.argv) < 3:
    print("Usage: [ip] [port] [token]")
    exit(0)

ip = sys.argv[1]  # Can set to 'localhost' if running on server.
port = sys.argv[2]  # Port for Plex Media Server (default is 32400)
plextoken = sys.argv[3]  # Change to your Plex-Token

main_url = "http://{}:{}/?X-Plex-Token={}".format(ip, port, plextoken)

sections_url = "http://{}:{}/library/sections?X-Plex-Token={}".format(
    ip, port, plextoken
)

serverID = ET.fromstring(requests.get(main_url).text).get("machineIdentifier")


results = {}
results["server_id"] = serverID

sections = ET.fromstring(requests.get(sections_url).text).findall("Directory")
for section in sections:
    sectionTitle = section.attrib.get("title")
    sectionKey = section.attrib.get("key")
    sectionType = section.attrib.get("type")
    results[sectionTitle] = []
    print("Getting section " + sectionKey + "...")
    print(
        "http://{}:{}/library/sections/{}/all?X-Plex-Token={}".format(
            ip, port, sectionKey, plextoken
        )
    )
    titles = ET.fromstring(
        requests.get(
            "http://{}:{}/library/sections/{}/all?X-Plex-Token={}".format(
                ip, port, sectionKey, plextoken
            )
        ).text
    )
    if sectionType == "movie":
        titles = titles.findall("Video")
    elif sectionType == "show":
        titles = titles.findall("Directory")
    else:
        continue
    for title in titles:
        movieObj = {
            "title": title.attrib.get("title"),
            "summary": title.attrib.get("summary"),
            "key": title.attrib.get("key"),
            "guid": title.attrib.get("guid"),
            "rating": title.attrib.get("rating"),
            "audienceRating": title.attrib.get("audienceRating"),
            "year": title.attrib.get("year"),
            "thumb": title.attrib.get("thumb"),
            "art": title.attrib.get("art"),
        }
        results[sectionTitle].append(movieObj)

print("Results saved into plexData.json")
f = open("../www/plexData.json", "w")
f.write(json.dumps(results))
f.close()

"""
results = ET.fromstring(movies_r.text)
list = results.findall("Video")

for movie in list:
    print(movie.attrib.get("title"), "-", movie.attrib.get("year"))


"""
