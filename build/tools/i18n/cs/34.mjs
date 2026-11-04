export default {
'json-formatter': [[
`Vložte JSON a získáte ho odsazený, minimalizovaný nebo s seřazenými klíči, nebo uvidíte přesně, kde je neplatný: řádek, sloupec a co se očekávalo, s problematickým řádkem a ukazatelem. Volba přijme JSON s komentáři a koncovými čárkami, jak je znáte z konfiguračních souborů.`,
`Kontrola používá vlastní malý parser k vysvětlení chyb, protože prohlížeče je hlásí různě nebo bez polohy. Data se zpracují a znovu zapíšou ve vašem prohlížeči; čísla si zachovají přesnost JavaScriptu, takže celá čísla nad 9 007 199 254 740 991 mohou ztratit číslice. Statistika ukazuje typ, počet klíčů, hloubku vnoření a velikost.`],
[`Vložte JSON nebo otevřete soubor.`,`Zvolte odsazení, minimalizaci nebo řazení klíčů.`,`Zkopírujte či stáhněte výsledek, nebo opravte zobrazenou chybu.`],
[[`Proč se píše „Trailing comma“?`,`Přísný JSON nepovoluje čárku za poslední položkou. Odstraňte ji, nebo zaškrtněte volbu pro komentáře a koncové čárky.`],[`Jsou velká čísla bezpečná?`,`Čísla nad 2^53 v JavaScriptu ztrácejí přesnost. Pokud záleží na přesných číslicích, držte takové hodnoty jako řetězce.`]]],
'data-format-converter': [[
`Vložte data v jednom formátu a získáte je v jiném: JSON na YAML pro konfigurační soubory, YAML na JSON pro API, XML na JSON a zpět. Vstupní formát se pozná automaticky a odsazení lze zvolit.`,
`XML má atributy a text, které JSON nezná, proto se používá obvyklá konvence: atributy se stanou klíči s „@“, smíšený text „#text“ a opakované prvky poli; zpětný převod to obrátí. Komentáře XML a zpracovávací instrukce se zahodí. YAML se čte a zapisuje knihovnou js-yaml. Vše běží ve vašem prohlížeči.`],
[`Vložte data nebo otevřete soubor.`,`Zvolte cílový formát (vstup se pozná automaticky).`,`Zkopírujte nebo stáhněte výsledek.`],
[[`Proč se atributy XML objeví jako „@název“?`,`JSON atributy nemá. Předpona „@“ je označí, aby šly zase převést zpět na atributy.`],[`Zůstanou komentáře YAML?`,`Ne. Komentáře nejsou součástí dat a při převodu se zahodí.`]]],
'sql-formatter': [[
`Vložte dlouhý jednořádkový dotaz a získáte ho naformátovaný, s každou klauzulí na vlastním řádku, odsazenými spojeními a podmínkami a klíčovými slovy velkými písmeny. Zvolte dialekt (standardní SQL, PostgreSQL, MySQL, MariaDB, SQLite, SQL Server, Oracle, BigQuery, Snowflake), velikost písmen klíčových slov a odsazení.`,
`Formátovač je open-source knihovna sql-formatter běžící ve vašem prohlížeči; dotazy se nikam neodesílají, což je důležité, když obsahují názvy tabulek nebo hodnoty ze skutečného systému. Pouze formátuje; neověřuje, zda by dotaz běžel, a neobvyklá syntaxe výrobce může být zalomena jinak, než byste to udělali.`],
[`Vložte SQL.`,`Zvolte dialekt, velikost písmen klíčových slov a odsazení.`,`Zkopírujte naformátovaný dotaz.`],
[[`Kontroluje moje SQL?`,`Ne. Pouze formátuje. Syntaktická chyba se může projevit jako chyba formátování, ale dotaz, který vypadá platně, může v databázi stejně selhat.`],[`Jaký dialekt zvolit?`,`Ten vaší databáze. Standardní SQL stačí pro jednoduché dotazy; funkce specifické pro výrobce se nejlépe formátují s odpovídajícím dialektem.`]]],
'regex-tester': [[
`Napište vzor a text a uvidíte každou shodu zvýrazněnou, s polohou (řádek a sloupec), číslovanými a pojmenovanými skupinami. Přepínejte příznaky (g, i, m, s, u) a zkuste nahrazení, například <$1>, abyste viděli výsledek. Spolu s vysvětlovačem regexů pomáhá vzory sestavit a pochopit.`,
`Test používá engine regulárních výrazů vašeho prohlížeče (JavaScript) a běží v pracovním vlákně na pozadí, které se po dvou sekundách zastaví, takže vzor s katastrofálním vracením (například (a+)+ na dlouhém textu) stránku nezamrazí; místo toho dostanete zprávu. Jiné enginy (PCRE, Python, .NET) se liší v detailech, jako je lookbehind a syntaxe pojmenovaných skupin.`],
[`Zadejte vzor a zvolte příznaky.`,`Vložte nebo napište testovací text.`,`Přečtěte si zvýrazněné shody a skupiny a zkuste nahrazení.`],
[[`Proč se píše, že vzor trval příliš dlouho?`,`Vnořená opakování jako (a+)+ nebo (.*)* mohou u některých vstupů trvat exponenciálně dlouho. Udělejte vzor přesnější.`],[`Bude můj vzor fungovat v Pythonu nebo PHP?`,`Často, ale ne vždy. Funkce jako lookbehind, pojmenované skupiny a příznaky se mezi enginy liší; testujte v cílovém jazyce.`]]],
'markdown-previewer': [[
`Napište nebo vložte Markdown a uvidíte vedle něj vykreslené nadpisy, seznamy, seznamy úkolů, tabulky, citace, bloky kódu, odkazy a obrázky. Tlačítko kopírování dá vygenerované HTML. Otevřete soubor .md a zkontrolujte README před commitem.`,
`Vykreslovač podporuje běžné funkce CommonMark a navíc tabulky, seznamy úkolů a přeškrtnutí ve stylu GitHubu. Surové HTML v textu se zobrazí jako text, nespustí se, a odkazy s nebezpečnými schématy jako javascript: se zneškodní, takže náhled nedůvěryhodného Markdownu je bezpečný. Vzácné funkce (poznámky pod čarou, seznamy definic, vnořené citace se seznamy) nejsou podporovány a vzhled se liší od GitHubu.`],
[`Napište, vložte Markdown nebo otevřete soubor.`,`Zkontrolujte náhled.`,`Zkopírujte HTML nebo Markdown.`],
[[`Vykreslí se HTML uvnitř Markdownu?`,`Ne. Z bezpečnostních důvodů se zobrazí jako text. Pokud potřebujete jiný výsledek, použijte vygenerované HTML.`],[`Vypadá to přesně jako GitHub?`,`Struktura je u běžných funkcí stejná, ale styl je jednodušší.`]]],
'css-html-minifier': [[
`Vložte CSS, HTML nebo JSON a získáte kompaktní verzi bez komentářů a zbytečných mezer, s velikostí před a po. CSS navíc ztratí nadbytečné středníky a jednotky u nuly a získá krátké hexadecimální barvy; HTML ponechá obsah bloků pre, textarea, script a style beze změny.`,
`Je to bezpečný, opatrný minifikátor: odstraní jen to, co nemění fungování kódu, a ponechá řetězce, předformátovaný text a podmíněné komentáře. Nic nepřejmenovává a nepřepisuje JavaScript; k tomu použijte build nástroj. Výsledek vždy otestujte, zejména u HTML s mezerami mezi řádkovými značkami.`],
[`Vložte kód.`,`Zkontrolujte rozpoznaný typ (nebo ho zvolte).`,`Zkopírujte minifikovaný výsledek a porovnejte velikosti.`],
[[`Minifikuje JavaScript?`,`Ne. Bezpečná minifikace JavaScriptu potřebuje úplný parser; použijte build nástroj jako esbuild nebo terser.`],[`Může minifikace HTML rozbít stránku?`,`Zřídka: mezery mezi řádkovými prvky mohou hrát roli. Nástroj ponechává jednotlivé mezery mezi řádkovým obsahem; stránku otestujte.`]]],
'lorem-ipsum-generator': [[
`Zvolte, kolik odstavců, vět nebo slov potřebujete, zda začít klasickým „Lorem ipsum dolor sit amet“, a volitelně odstavce zabalte do značek <p>. Text zkopírujte nebo stáhněte pro makety, šablonu nebo test rozvržení.`,
`Slova pocházejí ze seznamu vypadajícího latinsky a skládá je generátor náhodných čísel se semínkem, takže stejné nastavení vždy dá stejný text, dokud nepožádáte o nový. Text nemá význam, a o to jde: posuzujete vzhled rozvržení, aniž by vás rozptyloval obsah. Pro realistická data jako jména a adresy použijte generátor testovacích dat.`],
[`Zvolte množství a jednotku.`,`Rozhodněte o klasickém začátku a značkách HTML.`,`Text zkopírujte, nebo stiskněte „Vygenerovat nový text“ pro jiný.`],
[[`Je Lorem Ipsum skutečná latina?`,`Je poskládáno z textu Cicerona, takže vypadá jako latina, ale nemá význam.`],[`Mohu dostat text v jiném jazyce?`,`Zde ne. Pro jména, adresy a čísla v němčině nebo angličtině viz generátor testovacích dat.`]]],
};
