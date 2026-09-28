# Huni Piano

Isang web piano na nakikinig sa boses mo at iniilawan ang notang pinakamalapit sa
iyong kinakanta. Maaari ka ring magpatugtog ng mga key para maikumpara ang tunog.

## Patakbuhin

```bash
npm install
npm start
```

Pagkatapos, buksan ang `http://localhost:3000` sa browser.

## Paano gamitin

1. Pindutin ang **I-on ang mikropono** at payagan ang microphone access.
2. Kumanta o humuni ng isang malinaw na nota. Lalabas ang pangalan, frequency, at
   tuning accuracy nito, at iilaw ang katumbas na piano key.
3. Pindutin ang mga piano key o gamitin ang `A W S E D F T G Y H U J K` para
   pakinggan ang mga nota mula C4 hanggang C5.

> Kailangan ng secure context ang microphone sa maraming browser. Gumamit ng
> `localhost` habang local development, o HTTPS kapag naka-host sa ibang device.

## Tala

- Pinoproseso ang audio sa browser lamang; walang boses na ipinapadala o sine-save
  ng app.
- Pinakamaganda ang resulta sa tahimik na lugar at kapag isang nota lamang ang
  kinakanta sa bawat pagkakataon.
