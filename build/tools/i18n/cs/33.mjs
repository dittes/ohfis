const E = 'Video zpracovává FFmpeg, standardní open-source videonástroj přeložený do WebAssembly, který běží přímo ve vašem prohlížeči. Při prvním použití se stáhne jádro (asi 31 MB), které si prohlížeč ponechá. Nic se nenahrává.';
const L = 'Vše probíhá v paměti vašeho prohlížeče, takže velmi velká videa (několik gigabajtů) nebo dlouhé klipy 4K mohou na telefonu nebo starším počítači selhat; zkuste pak kratší nebo menší klip.';
export default {
'video-volume-changer': [[
`Zvyšte nebo snižte hlasitost videa o počet decibelů nebo zvuk zcela odstraňte. +6 dB je zhruba dvakrát hlasitěji, −6 dB na polovinu. Hodí se u příliš tiché nahrávky, videa s hlasitou hudbou nebo takového, které má být tiché, než přidáte vlastní hudbu.`,
`Obraz se kopíruje bez překódování, takže je nástroj rychlý a kvalita obrazu zůstane nedotčena; zpracovává se jen zvuk. Příliš velké zesílení zkreslí hlasité části, proto si výsledek poslechněte. ${E} ${L}`],
[`Přetáhněte video.`,`Zadejte změnu hlasitosti v dB nebo zaškrtněte „odstranit zvuk“.`,`Stiskněte „Použít“ a stáhněte.`],
[[`Mohu ztlumit jen část?`,`Rozdělte video nástrojem pro střih na části, jednu ztlumte a znovu je spojte nástrojem pro spojení videí.`],[`Výsledek je stále příliš tichý.`,`Zvyšte hodnotu dál, nebo zvuk vytáhněte, normalizujte ho normalizací zvuku a přidejte zpět přes „Přidat zvuk do videa“.`]]],
'video-add-audio': [[
`Zvolte video a zvukový soubor (MP3, M4A, WAV, OGG, FLAC) a buď nahraďte původní zvuk, nebo oba smíchejte, s odděleným ovládáním hlasitosti. Dobré pro podložení hudby pod němý klip nebo komentáře ke záznamu obrazovky.`,
`Obraz se kopíruje bez překódování; zvuk se převede na AAC. Ve výchozím nastavení výsledek končí s kratším z obou, takže dlouhá píseň krátké video neprodlouží; odškrtněte volbu, aby zvuk běžel dál přes zmrazený poslední snímek. ${E} ${L}`],
[`Přetáhněte video a zvolte zvukový soubor.`,`Zvolte nahrazení nebo smíchání a nastavte hlasitosti.`,`Stiskněte „Přidat zvuk“ a stáhněte.`],
[[`Hudba je delší než video.`,`Nechte zaškrtnuto „skončit s kratším“: výsledek skončí, když skončí video. Pokud chcete konkrétní část písně, použijte nejdřív nástroj pro střih zvuku.`],[`Moje video nemá zvuk. Funguje míchání?`,`Ano, zvuk se prostě přidá jako jediný zvuk.`]]],
'video-add-text': [[
`Napište text, zvolte velikost, barvu a jednu z devíti poloh, volitelně tmavé pole pod ním pro čitelnost a čas začátku a konce, a získáte video s vypáleným textem. Hodí se pro titulky, popisky, jméno, datum nebo výzvu k akci.`,
`Text se kreslí písmem DejaVu Sans, které pokrývá latinku (včetně češtiny a diakritiky), řečtinu a azbuku; emoji a asijská písma nejsou podporována. Pro titulky sledující řeč použijte samostatný editor titulků. ${E} ${L}`],
[`Přetáhněte video.`,`Napište text a zvolte velikost, barvu a pozici.`,`Podle potřeby nastavte časový rozsah, stiskněte „Přidat text“ a stáhněte.`],
[[`Mohu text zobrazit jen několik vteřin?`,`Ano. Zadejte „od“ a „do“ ve vteřinách; použijte tlačítka „aktuální pozice“, když je video zastavené v pravý okamžik.`],[`Mohu přidat několik textů?`,`Jeden na průchod. Výsledek pošlete nástrojem znovu, abyste přidali další.`]]],
'video-add-image': [[
`Zvolte video a obrázek (pro loga je nejlepší PNG s průhledným pozadím), vyberte jednu z devíti poloh, velikost jako podíl šířky videa, průhlednost a případně kdy se má objevit. Použijte ho k označení vlastních videí vodoznakem nebo k přidání loga kanálu.`,
`Obrázek se škáluje vzhledem k videu, takže jedno nastavení funguje pro klipy s různým rozlišením. Video se znovu zakóduje jako MP4, zvuk zůstane. ${E} ${L}`],
[`Přetáhněte video a zvolte obrázek.`,`Nastavte pozici, velikost, průhlednost a časování.`,`Stiskněte „Přidat obrázek“ a stáhněte.`],
[[`Jaký formát obrázku je nejlepší?`,`PNG s průhledným pozadím. JPG a WebP fungují také, ale nemají průhlednost (WebP a GIF mohou).`],[`Mohu zobrazit logo jen na začátku?`,`Ano. Nastavte „zobrazit do“ na počet vteřin, po které má zůstat.`]]],
'video-logo-remover': [[
`Zadejte pozici a velikost loga (červený rámeček v náhledu ukazuje oblast) a oblast se doplní z okolí. Funguje dobře u malých statických log na klidném pozadí, jako je značka v rohu vlastního záznamu nebo časové razítko.`,
`Nástroj používá filtr delogo z FFmpegu, který oblast interpoluje z okolních pixelů; nedokáže rekonstruovat velkou nebo rušnou část obrazu a zanechává mírné rozmazání. Loga odstraňujte jen z materiálu, který vlastníte nebo který smíte upravovat. ${E} ${L}`],
[`Přetáhněte video.`,`Zadejte vlevo, nahoře, šířku a výšku oblasti loga a zkontrolujte červený rámeček.`,`Stiskněte „Odstranit logo“ a stáhněte.`],
[[`Logo je stále vidět.`,`Udělejte rámeček o něco větší než logo, včetně jeho okrajů a případného stínu.`],[`Funguje to u pohyblivého loga?`,`Jen pokud oblast pokrývá všechny polohy loga; čím větší oblast, tím viditelnější rozmazání.`]]],
'video-to-gif': [[
`Zvolte, kde GIF začíná, jak dlouho běží, snímky za vteřinu a šířku, a získáte animovaný GIF. Několik vteřin při 10–15 snímcích za vteřinu a šířce 480 px dá praktický reakční nebo ukázkový GIF.`,
`Barvy pocházejí z palety vytvořené přesně pro tento klip (filtry palettegen a paletteuse z FFmpegu), což vypadá mnohem lépe než výchozí GIF o 256 barvách. GIFy rychle rostou s délkou, velikostí a snímkovou frekvencí; pro cokoli delšího než pár vteřin je krátké MP4 mnohem menší. ${E} ${L}`],
[`Přetáhněte video a nastavte začátek tlačítkem „použít aktuální pozici“.`,`Zvolte délku, snímkovou frekvenci a šířku.`,`Stiskněte „Vytvořit GIF“ a stáhněte.`],
[[`GIF je obrovský.`,`Zkraťte ho a snižte snímkovou frekvenci na 8–10 a šířku na 320–480 px.`],[`Je tam zvuk?`,`Ne. Formát GIF zvuk nemá.`]]],
'video-stabilizer': [[
`Přetáhněte roztřesený klip z ruky a získáte klidnější verzi. Nastavte, jak velké roztřesení se má opravit (rozsah hledání v pixelech) a zda se okraje vzniklé posunutím obrazu doplní zrcadlením, nebo zůstanou černé.`,
`Tato prohlížečová verze používá základní filtr „deshake“ z FFmpegu. Vyhlazuje malé rychlé záchvěvy, ale silné třesení, vlnění rolling shutter ani jdoucí kameru nespraví tak jako gimbaly telefonů nebo specializované dvouprůchodové stabilizátory; obraz se navíc mírně posouvá, což může vytvořit viditelné okraje. ${E} ${L}`],
[`Přetáhněte video.`,`Zvolte rozsah hledání a zacházení s okraji.`,`Stiskněte „Stabilizovat“, porovnejte s originálem a stáhněte.`],
[[`Výsledek se stále třese.`,`Zvyšte rozsah hledání. Při silném třesení natáčejte se stativem nebo ve stabilizovaném režimu telefonu.`],[`Proč jsou tam divné okraje?`,`Aby se vyrovnal pohyb, obraz se posouvá. Zvolte „Doplnit zrcadlením“ nebo výsledek mírně oříznete.`]]],
};
