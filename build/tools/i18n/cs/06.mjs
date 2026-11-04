export default {
'color-converter': [[
`Zadejte barvu v libovolném běžném zápisu (#2557D6, rgb(37 87 214), hsl(223 70% 48%), cmyk(83 59 0 16) nebo název jako coral) a získáte všechny ostatní, připravené ke zkopírování. Použijte výběr barev nebo – v Chrome a Edge – kapátko, kterým odeberete barvu odkudkoli na obrazovce.`,
`Základem je RGB. HSL a HSV se odvozují standardními vzorci, HEX je RGB v šestnáctkové soustavě (s alfa kanálem jako osmou a devátou číslicí, je-li přítomen) a CMYK používá prostý převod K = 1 − max(R, G, B), z něhož vychází C, M a Y. Toto CMYK je jen hrubé vodítko: skutečné tiskové barvy závisejí na barvě, papíru a profilu. Hodnoty alfa z rgb(… / 50%) a 8místného HEX se zachovají.`],
[`Zadejte barvu nebo použijte výběr či kapátko.`,`Přečtěte si všechny formáty.`,`Zkopírujte ten, který potřebujete.`],
[[`Jak převést HEX na RGB?`,`Rozdělte šest číslic na dvojice a každou čtěte jako šestnáctkové číslo: #2557D6 → 25, 57, D6 → 37, 87, 214.`],[`Lze RGB převést na CMYK přesně?`,`Ne přesně: obrazovky a tiskárny mají různé barevné rozsahy. Vzorec je dobrý odhad; pro tiskové zakázky použijte pracovní postup se správou barev.`]]],
'uuid-generator': [[
`Vytvořte jedno UUID nebo deset tisíc: verze 4 (náhodná) pro obecné použití nebo verze 7, která začíná časovým razítkem, takže se ID řadí podle času vzniku a indexy databází zůstanou rychlé. Výstupní formáty zahrnují velká písmena, bez pomlček, složené závorky Microsoftu a seznamy v uvozovkách SQL.`,
`Verze 4 nastavuje 122 ze 128 bitů z crypto.getRandomValues, kryptograficky bezpečného generátoru prohlížeče; zbylých 6 bitů značí verzi (4) a variantu. Verze 7 (RFC 9562) vkládá unixový čas v milisekundách do prvních 48 bitů a zbytek vyplní náhodnými bity. Pravděpodobnost kolize v4 je zanedbatelná: k 50% šanci na jediný duplikát byste museli vygenerovat asi 2,7 trilionu UUID.`],
[`Zvolte verzi, počet a formát.`,`Změňte nastavení nebo stiskněte „Generovat novou dávku“.`,`Zkopírujte seznam.`],
[[`Jaký je rozdíl mezi UUID a GUID?`,`V praxi žádný. GUID je název Microsoftu pro stejný 128bitový identifikátor.`],[`Mám jako klíč databáze použít v4 nebo v7?`,`Obvykle v7: je dost náhodné, aby bylo jedinečné, ale s časem roste, což zabraňuje fragmentaci indexu.`]]],
'number-base-converter': [[
`Zadejte číslo v libovolné soustavě od 2 do 36 a uvidíte ho binárně, osmičkově, desítkově, šestnáctkově a v jedné další soustavě podle výběru. Předpony jako 0x a 0b a podtržítka se chápou a čísla mohou být libovolně velká, protože nástroj používá celá čísla libovolné přesnosti místo pohyblivé řádové čárky.`,
`Vstup se čte číslici po číslici ve zvolené soustavě do BigInt, takže hodnoty nad 2^53 jsou přesné (kde by běžná čísla JavaScriptu ztrácela číslice), a pak se zapíše v každé cílové soustavě pomocí toString(base). Neplatné číslice jsou pojmenovány v chybové zprávě. Počet bitů ukazuje, kolik binárních číslic číslo potřebuje, tedy zda se vejde do 8, 16, 32 nebo 64 bitů.`],
[`Zadejte číslo a zvolte jeho soustavu.`,`Přečtěte si ostatní soustavy.`,`Zkopírujte potřebnou hodnotu.`],
[[`Jak převést hex na desítkové?`,`Každá šestnáctková číslice má šestnáctinásobnou hodnotu té vpravo: FF = 15×16 + 15 = 255.`],[`Jak velké číslo zvládne?`,`Pevný limit není; omezením je jen paměť.`]]],
'basic-auth-header-generator': [[
`Zadejte uživatelské jméno a heslo a získáte přesnou hlavičku HTTP i odpovídající volbu curl. Užitečné pro testování API, nastavení webhooků nebo reverzní proxy.`,
`Autentizace HTTP Basic (RFC 7617) spojí jméno a heslo dvojtečkou, výsledek zakóduje jako Base64 (UTF-8) a pošle jako „Authorization: Basic <hodnota>“. Příklad z RFC, Aladdin / open sesame, dává QWxhZGRpbjpvcGVuIHNlc2FtZQ==. Base64 není šifrování, takže přihlašovací údaje přečte každý, kdo požadavek uvidí: Basic používejte jen přes HTTPS. Váš vstup zůstává ve vašem prohlížeči.`],
[`Zadejte uživatelské jméno a heslo.`,`Zkopírujte hlavičku nebo volbu curl.`,`Používejte jen přes HTTPS.`],
[[`Je autentizace Basic bezpečná?`,`Jen přes HTTPS. Přihlašovací údaje jsou pouze zakódované v Base64, ne zašifrované.`],[`Může uživatelské jméno obsahovat dvojtečku?`,`Ne. První dvojtečka odděluje uživatele a heslo, takže jméno ji obsahovat nesmí.`]]],
'hex-alpha-calculator': [[
`Přidejte hex barvě průhlednost: zadejte krytí v procentech a získáte dvoumístnou příponu a se základní barvou i úplný 8místný kód (#2557D680). Tabulka uvádí obvyklé kroky od 0 do 100 procent.`,
`Alfa kanál sahá od 0 do 255, takže hex alfa = zaokrouhlení(krytí ÷ 100 × 255), zapsané šestnáctkově: 50 % → 127,5 → 128 → 80, 80 % → 204 → CC. CSS a prohlížeče používají #RRGGBBAA (alfa na konci); zdroje Androidu používají #AARRGGBB (alfa na začátku), proto ověřte, co vaše platforma očekává.`],
[`Zadejte krytí v procentech.`,`Volitelně zadejte základní barvu.`,`Zkopírujte příponu nebo úplnou barvu.`],
[[`Kolik je 50 % krytí v hex?`,`80 (desítkově 128), takže #000000 při poloviční průhlednosti je #00000080.`],[`Používá Android stejné pořadí?`,`Ne: Android píše alfa na začátku (#80000000).`]]],
'meta-viewport-generator': [[
`Značka meta viewport říká mobilním prohlížečům, aby použily šířku zařízení místo předstírání 980pixelového stolního počítače. Zvolte možnosti a zkopírujte značku; generátor ponechává zapnuté přibližování gestem, protože jeho vypnutí porušuje požadavky na přístupnost.`,
`„width=device-width, initial-scale=1“ je doporučená výchozí hodnota. viewport-fit=cover dovolí obsahu sahat pod výřez na iPhonech (kombinujte s safe-area insets v CSS) a pevná šířka je jen pro zvláštní případy. maximum-scale a user-scalable=no se záměrně nenabízejí: brání slabozrakým uživatelům v přibližování (WCAG 1.4.4).`],
[`Zvolte šířku a počáteční měřítko.`,`Přidejte viewport-fit, navrhujete-li pro telefony s výřezem.`,`Zkopírujte značku do <head>.`],
[[`Potřebuji tuto značku?`,`Ano, pro každý responzivní web. Bez ní telefony zobrazí zmenšené rozvržení pro stolní počítač.`],[`Mám zakázat přibližování?`,`Ne. Škodí přístupnosti a většina prohlížečů to stejně ignoruje.`]]],
'favicon-html-generator': [[
`Vyberte, jaké soubory ikon máte, a získáte správné značky <link> v pořadí, které prohlížeče preferují, a hotový manifest webové aplikace. Spojte s Generátorem favicon a ikon aplikací, kterým vytvoříte samotné obrázky.`,
`Moderní nastavení potřebuje málo: ikonu SVG (škáluje, podporuje tmavý režim), záložní .ico nebo PNG 32 px, apple-touch-icon 180 px a manifest s ikonami 192 a 512 px pro Android a instalovatelné webové aplikace. Značky a manifest používají zadanou složku, takže cesty fungují z každé stránky.`],
[`Zadejte složku s ikonami.`,`Zaškrtněte ikony, které dodáváte, a nastavte barvu motivu.`,`Zkopírujte značky do <head> a uložte manifest.`],
[[`Jaké velikosti favicon potřebuji?`,`SVG nebo PNG/ICO 32×32 pro prohlížeče, 180×180 pro zařízení Apple a 192×192 a 512×512 pro Android.`],[`Kam dát favicon.ico?`,`Do kořenové složky webu; prohlížeče se tam standardně ptají.`]]],
'query-string-builder': [[
`Vypište parametry jako řádky key=value a získáte zakódovaný řetězec dotazu, volitelně připojený k základní URL. Mezery, ampersandy, rovnítka, diakritika a emoji se správně escapují a opakované klíče lze zapsat jako tag=a&tag=b, tag[]=a&tag[]=b nebo tag=a,b.`,
`Každý klíč a hodnota se zakóduje jako UTF-8 s procentními escapy pomocí encodeURIComponent plus znaky, které vynechává (! ' ( ) *), takže je výsledek bezpečný v každé URL. Mezery se změní na %20 nebo na +, zvolíte-li styl kódování formulářů. Opětovné kódování celé URL by kódovalo dvojitě (%2520), proto sestavte řetězec dotazu jednou a připojte ho. Prázdné klíče se přeskočí.`],
[`Zadejte parametry jako řádky key=value.`,`Zvolte, jak se zapisují mezery a opakované klíče.`,`Zkopírujte řetězec dotazu nebo úplnou URL.`],
[[`%20 nebo + pro mezery?`,`%20 funguje v URL všude. + znamená mezeru jen v řetězcích dotazu kódovaných jako formulář (application/x-www-form-urlencoded).`],[`Proč se & změní na %26?`,`Protože doslovné & uvnitř hodnoty by jinak začalo nový parametr.`]]],
};
