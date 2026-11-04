export default {
'audio-cutter': [[
`Přetáhněte zvukový soubor, zadejte, kde potřebná část začíná a končí, a uložte ji jako WAV nebo MP3. Můžete ponechat jen tuto část (na vyzvánění, zvukovou ukázku nebo zkrácený rozhovor), nebo ji vystřihnout a zbytek spojit (abyste odstranili zakašlání nebo chybu). Volitelné zesílení a zeslabení na začátku a konci zabraňuje lupnutí v místech střihu.`,
`Soubor dekóduje váš prohlížeč, vzorky se střihají s přesností na jednotlivý vzorek a výsledek se znovu zakóduje, vše ve vašem zařízení. Výstup MP3 používá kodér LAME; WAV zachová každý detail. Nástroj pracuje s časy v sekundách, což je přesné, ale vyžaduje, abyste si nahrávku předem poslechli: přehrajte originál, poznamenejte si časy a výsledek zkontrolujte v přehrávači náhledu před stažením.`],
[`Přetáhněte zvukový soubor.`,`Zvolte „ponechat“ nebo „odstranit“ a zadejte začátek a konec v sekundách.`,`Poslechněte si náhled a stáhněte WAV nebo MP3.`],
[[`Jaké formáty mohu otevřít?`,`Cokoli, co váš prohlížeč přehraje: MP3, M4A/AAC, OGG, Opus, FLAC, WAV a zvuk většiny videosouborů.`],[`Snižuje střih kvalitu?`,`Ne u WAV. Při uložení jako MP3 se zvuk jednou znovu komprimuje, což stojí trochu kvality; použijte 256 nebo 320 kbps, abyste ji zachovali.`]]],
'audio-joiner': [[
`Přidejte dva nebo více zvukových souborů, seřaďte je tlačítky se šipkami a stáhněte jeden spojený soubor jako WAV nebo MP3. Prolnutí v délce několika set milisekund nechá jednu skladbu plynule přejít do další, například u mixu nebo podcastu s hudbou na začátku a na konci.`,
`Všechny soubory váš prohlížeč dekóduje na 44,1 kHz, takže skladby s různými vzorkovacími frekvencemi se spojí bez změny výšky tónu; mono skladba se při míchání se stereo skladbami rozšíří na stereo. Prolnutí používá křivku se stejným výkonem, která drží hlasitost při přechodu stálou. Spojování probíhá v paměti, takže velmi dlouhé nahrávky (hodiny) potřebují počítač s dostatkem RAM.`],
[`Přidejte zvukové soubory.`,`Seřaďte je pomocí ↑ a ↓ a odstraňte ty, které nepotřebujete.`,`Podle chuti nastavte prolnutí, poslechněte si výsledek a stáhněte ho.`],
[[`Jak dosáhnu plynulého přechodu?`,`Nastavte prolnutí 200–2000 ms. Při 0 ms se skladby spojí bez překryvu.`],[`Je omezen počet souborů?`,`Pevný limit není, ale vše se zpracovává ve vašem prohlížeči, takže praktickým limitem je paměť počítače.`]]],
'audio-volume-changer': [[
`Zadejte, o kolik decibelů má být nahrávka hlasitější (+) nebo tišší (−), poslechněte si výsledek a uložte ho jako WAV nebo MP3. +6 dB je zhruba dvakrát hlasitěji, −6 dB na polovinu. Zesílení a zeslabení na začátku a konci lze přidat ve stejném kroku.`,
`Zesílení se použije na každý vzorek. Zhlasitění nahrávky může vytlačit nejhlasitější špičky přes maximum a způsobit ostré zkreslení (clipping), proto nástroj ve výchozím nastavení výsledek zmenší jen tolik, aby se tomu zabránilo, a řekne vám, o kolik. Chcete-li, aby nejhlasitější místo automaticky dosáhlo přesné úrovně, použijte raději normalizaci zvuku.`],
[`Přetáhněte zvukový soubor.`,`Zadejte změnu v dB (kladná = hlasitěji).`,`Zkontrolujte náhled a poznámku o clippingu a pak stáhněte.`],
[[`Kolik dB je dvakrát hlasitěji?`,`Zhruba +6 dB zdvojnásobí úroveň signálu; lidé obvykle slyší +10 dB jako dvakrát hlasitěji.`],[`Proč výsledek není tak hlasitý, jak jsem chtěl?`,`Omezil ho ochranný limiter. Vypněte volbu, abyste zkreslení povolili, nebo u velmi tichých nahrávek použijte normalizaci podobnou kompresoru.`]]],
'audio-reverser': [[
`Přetáhněte nahrávku a dostanete ji obrácenou, připravenou k přehrání nebo stažení jako WAV nebo MP3. Obrácený zvuk se používá pro efekty v hudbě a videu, pro hádanky a pro zábavu s mluveným slovem.`,
`Vzorky každého kanálu se jednoduše čtou od konce k začátku, takže se nic neztratí a dvojí obrácení dá přesně originál. Dlouhé nahrávky se obracejí v paměti, což u minut zvuku trvá okamžik.`],
[`Přetáhněte zvukový soubor.`,`Poslechněte si obrácenou verzi.`,`Stáhněte ji jako WAV nebo MP3.`],
[[`Mohu obrátit jen část nahrávky?`,`Nejprve část vystřihněte nástrojem pro střih zvuku, obraťte ji zde a kousky spojte nástrojem pro spojení zvuku.`],[`Je obrácení bezeztrátové?`,`Ano u WAV. Výstup MP3 se komprimuje ještě jednou.`]]],
'audio-equalizer': [[
`Vyberte předvolbu (zvýraznění basů, zvýraznění výšek, srozumitelná řeč, teplý a měkký zvuk) nebo nastavte pět pásem sami: 60 Hz, 250 Hz, 1 kHz, 4 kHz a 12 kHz, každé od −12 do +12 dB. Výsledek se vykreslí, přehraje ke kontrole a uloží jako WAV nebo MP3.`,
`Každé pásmo je standardní filtr biquad z Audio EQ Cookbook: policové filtry pro nejnižší a nejvyšší pásmo a špičkové filtry se střední šířkou mezi nimi. Zvýraznění pásem může zvýšit celkovou úroveň, proto nástroj výsledek zmenší, kdyby hrozilo přebuzení. Ekvalizér špatnou nahrávku nespraví, ale pár dB na správném místě udělá řeč srozumitelnější a hudbu teplejší.`],
[`Přetáhněte zvukový soubor.`,`Vyberte předvolbu nebo posuňte pět pásem.`,`Poslechněte si výsledek a stáhněte.`],
[[`Které pásmo zlepší řeč?`,`Trocha při 4 kHz (+3 až +5 dB) udělá řeč srozumitelnější; snížení 60–250 Hz zmenší dunění a hučení.`],[`Proč je výsledek tišší, než jsem čekal?`,`Když by zvýraznění signál přebudilo, nástroj snižuje celý výsledek o potřebnou hodnotu.`]]],
'audio-converter': [[
`Přetáhněte zvukový soubor a uložte ho jako MP3 (malý, funguje všude) nebo WAV (nekomprimovaný, pro úpravy). Nástroj také vytáhne zvukovou stopu z videosouboru, například MP4 nebo WebM. Zvolte přenosovou rychlost MP3 od 64 do 320 kbps a podle potřeby převeďte na mono, čímž se velikost sníží na polovinu.`,
`Vstup dekóduje váš prohlížeč a to určuje, co lze otevřít: MP3, AAC/M4A, OGG, Opus, FLAC a WAV fungují v aktuálních prohlížečích, formáty jako WMA nebo AMR obvykle ne. MP3 vzniká kodérem LAME ve vašem prohlížeči. Převod ze ztrátového formátu (MP3, AAC) znovu do MP3 přidá další ztrátu, proto si ponechte originál a použijte vysokou přenosovou rychlost.`],
[`Přetáhněte zvukový nebo video soubor.`,`Zvolte MP3 nebo WAV a kvalitu.`,`Stáhněte převedený soubor.`],
[[`Jakou přenosovou rychlost zvolit?`,`128 kbps stačí na řeč, 192 na běžnou hudbu, 256–320 kbps pro nejlepší kvalitu.`],[`Mohu z videa získat MP3?`,`Ano, přetáhněte videosoubor; převede se jen jeho zvuk. Velmi velká videa potřebují dostatek volné paměti.`]]],
};
