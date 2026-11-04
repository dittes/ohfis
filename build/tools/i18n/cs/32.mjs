const E = 'Video zpracovává FFmpeg, standardní open-source videonástroj přeložený do WebAssembly, který běží přímo ve vašem prohlížeči. Při prvním použití se stáhne jádro (asi 31 MB), které si prohlížeč ponechá. Nic se nenahrává.';
const L = 'Vše probíhá v paměti vašeho prohlížeče, takže velmi velká videa (několik gigabajtů) nebo dlouhé klipy 4K mohou na telefonu nebo starším počítači selhat; zkuste pak kratší nebo menší klip.';
export default {
'video-trimmer': [[
`Přetáhněte video, přehrajte ho, zastavte tam, kde potřebná část začíná a končí, stiskněte „použít aktuální pozici“ a uložte zkrácené video. Rychlý režim zkopíruje streamy bez překódování, takže i dlouhé video se střihne během vteřin bez ztráty kvality; střih se pak zarovná na nejbližší klíčový snímek. Běžný režim překóduje a je přesný na snímek.`,
`${E} ${L}`],
[`Přetáhněte video a přehrajte ho.`,`Nastavte začátek a konec (nebo použijte aktuální pozici přehrávače).`,`Zvolte rychlý nebo přesný režim a stiskněte „Zkrátit video“.`],
[[`Proč je střih v rychlém režimu trochu nepřesný?`,`Bez překódování může video začít jen na klíčovém snímku, který bývá každou jednu až pět sekund. Vypněte rychlý režim pro střih přesný na snímek.`],[`Jaké formáty mohu otevřít?`,`MP4, MOV, WebM, MKV, AVI a většinu formátů z telefonů a kamer. Výsledek je vždy MP4 (H.264).`]]],
'video-merger': [[
`Přidejte dva nebo více klipů, seřaďte je tlačítky se šipkami a získáte jedno video. Klipy s jinou velikostí nebo snímkovou frekvencí se vloží do jednoho rámu (velikost prvního klipu nebo zvolená) s černými pruhy, takže lze spojit klip z telefonu a záznam obrazovky bez zkreslení.`,
`Zvuk se spojí také; pokud některý klip nemá zvukovou stopu, zvuk všech klipů se vynechá a nástroj vás na to upozorní. ${E} ${L}`],
[`Přidejte videoklipy.`,`Seřaďte je a zvolte velikost rámu.`,`Stiskněte „Spojit videa“ a stáhněte výsledek.`],
[[`Musí mít klipy stejnou velikost?`,`Ne. Každý klip se přizpůsobí zvolenému rámu a při jiném tvaru se doplní černými pruhy.`],[`Mohu přidat přechody?`,`V tomto nástroji ne: klipy se spojí tvrdým střihem.`]]],
'video-converter': [[
`Přetáhněte video a převeďte ho na MP4 (H.264, přehraje se na každém telefonu, televizi i v prohlížeči), WebM (VP8, pro weby), animovaný GIF nebo zvukový soubor (MP3, M4A, WAV). Můžete omezit šířku, odstranit zvuk a zvolit mezi rychlým a kvalitním kódováním.`,
`Převod je obvyklé řešení, když se video někde nepřehraje nebo nenahraje: MOV z iPhonu, MKV nebo AVI ze starších kamer a stahování se změní na běžné MP4. ${E} ${L}`],
[`Přetáhněte video.`,`Zvolte cílový formát a podle potřeby maximální šířku.`,`Stiskněte „Převést“ a stáhněte soubor.`],
[[`Jaký formát zvolit?`,`MP4 téměř pro všechno. WebM pro weby preferující otevřené formáty. GIF jen pro krátké tiché smyčky. MP3, pokud potřebujete jen zvuk.`],[`Snižuje se kvalita?`,`Překódování vždy něco ztratí. „Vysoká kvalita“ drží obraz vizuálně velmi blízko originálu; je pomalejší a dává větší soubor.`]]],
'video-compressor': [[
`Přetáhněte video, zvolte sílu komprese a, pokud obraz nemusí být velký, menší výšku, například 720p, a získáte výrazně menší MP4. Video z telefonu o 500 MB se často zmenší na pětinu bez viditelné ztráty pro sdílení.`,
`Nástroj překóduje H.264 s nastavením stálé kvality (CRF): čím vyšší číslo, tím menší soubor. 23 vypadá téměř jako originál, 28 je dobrý kompromis pro chat a e-mail, nad 33 je ztráta zřetelná. Pomalejší nastavení rychlosti dá při stejné kvalitě o něco menší soubor, ale trvá déle. ${E} ${L}`],
[`Přetáhněte video.`,`Zvolte kvalitu (CRF) a podle potřeby maximální výšku.`,`Stiskněte „Komprimovat video“ a porovnejte velikosti.`],
[[`Jak malý soubor dostanu?`,`Záleží na obsahu. Porovnejte čísla „Před“ a „Výsledek“; zkuste nejdřív CRF 28 s 720 p.`],[`Mohu komprimovat na přesnou velikost, třeba 10 MB?`,`Ne přesně. Zvyšujte CRF a snižujte výšku, dokud výsledek nebude pod limitem.`]]],
'video-crop-rotate-flip': [[
`Opravte video z telefonu natočené na bok, oříznete klip na šířku na svislý formát 9:16 pro Stories a Reels, vytvořte čtvercovou verzi 1:1 nebo překlopte selfie video. Oříznete na standardní poměr stran kolem středu nebo nakreslete přesný obdélník (červený rámeček v náhledu ukazuje, co zůstane), pak otočte po 90° a překlopte vodorovně nebo svisle.`,
`Nejprve se použije oříznutí, pak otočení a překlopení. Výsledek se znovu zakóduje jako MP4; rozměry se zaokrouhlí na sudá čísla, což formát videa vyžaduje. ${E} ${L}`],
[`Přetáhněte video.`,`Zvolte oříznutí (poměr nebo obdélník), otočení a překlopení.`,`Stiskněte „Použít“ a stáhněte.`],
[[`Moje video z telefonu se přehrává na bok.`,`Zvolte otočení o 90° nebo 270°, dokud to nebude sedět; výsledek se uloží se správnou orientací.`],[`Jak udělám svislé video z vodorovného?`,`Zvolte „Na poměr stran“ s 9:16. Střed obrazu zůstane; použijte režim obdélníku pro výběr jiné části.`]]],
'video-resizer': [[
`Zvolte standardní výšku jako 1080p, 720p nebo 480p, šířku nebo přesnou šířku a výšku a získáte zmenšené MP4. Menší videa se rychleji nahrávají, zabírají méně místa a plynule se přehrávají i na slabém připojení.`,
`Při standardní výšce nebo šířce se druhý rozměr dopočítá tak, aby se zachovaly proporce; „přesně“ nastaví oba a může obraz natáhnout. Zvětšení videa nepřidá detaily. ${E} ${L}`],
[`Přetáhněte video.`,`Zvolte výšku, šířku nebo přesnou velikost.`,`Stiskněte „Změnit velikost videa“ a stáhněte.`],
[[`Jakou velikost zvolit?`,`1080p pro běžné použití, 720p pro e-mail a chat, 480p nebo méně pro velmi malé soubory.`],[`Zmenší změna velikosti i soubor?`,`Obvykle výrazně, protože je potřeba uložit méně pixelů. Pro přímé řízení velikosti souboru použijte kompresi videa.`]]],
'video-speed-changer': [[
`Zadejte rychlost od 0,1× do 20×: 0,5 přehrává poloviční rychlostí (zpomalený záběr), 2 dvojnásobnou, 8 udělá z dlouhé nahrávky timelapse. Zvuk se přizpůsobí stejné rychlosti bez změny výšky tónu.`,
`Časování obrazu se mění filtrem setpts z FFmpegu a zvuk řetězem filtrů atempo (každý stupeň zvládá jen koeficienty od 0,5 do 2, takže extrémní rychlosti používají několik). Zpomalený záběr nevymyslí nové snímky, takže velmi pomalý klip může vypadat trhaně. ${E} ${L}`],
[`Přetáhněte video.`,`Zadejte rychlost (pod 1 = pomaleji, nad 1 = rychleji).`,`Stiskněte „Změnit rychlost“ a stáhněte.`],
[[`Zní hlas jako veverka?`,`Ne. Výška tónu se zachová, takže hlasy znějí při mírných rychlostech přirozeně; při extrémních je řeč obtížně srozumitelná.`],[`Mohu změnit rychlost jen části videa?`,`Část vystřihněte nástrojem pro střih videa, změňte její tempo zde a kousky spojte nástrojem pro spojení videí.`]]],
'video-loop': [[
`Zadejte, kolikrát se má klip celkem přehrát (2 až 200), a získáte delší video: pro smyčku na pozadí obrazovky, meditační nebo ambientní klip nebo krátkou animaci, která má běžet minuty.`,
`Rychlý režim klip opakuje bez překódování, takže hotovo je během vteřin bez ztráty; pokud má přehrávač s výsledkem potíže, vypněte ho a překódujte. Velmi dlouhé výsledky jsou velké, proto před spuštěním zkontrolujte délku. ${E} ${L}`],
[`Přetáhněte video.`,`Zadejte, kolikrát se má přehrát.`,`Stiskněte „Vytvořit smyčku“ a stáhněte.`],
[[`Je smyčka plynulá?`,`Soubor prostě přehraje klip znovu od začátku. Pokud konec nesedí na začátek, klip zkraťte tak, aby seděl.`],[`Mohu udělat nekonečnou smyčku?`,`Soubor má vždy konec. Použijte vysoký počet opakování nebo volbu „smyčka“ ve svém přehrávači.`]]],
};
