export default {
'scratchpad': [[
`Prázdná stránka na to, co si potřebujete právě zapsat: telefonní číslo, koncept, seznam úkolů. Vše, co napíšete, se po každé pauze uloží, takže pád, restart nebo náhodné zavření karty nic neztratí. Používejte několik bloků, přejmenujte je a každý stáhněte jako textový soubor.`,
`Text se ukládá do localStorage vašeho prohlížeče jen na tomto zařízení: nic se nenahrává a není tu účet. To také znamená, že se poznámky nesynchronizují do jiných zařízení a vymazání dat webů, soukromé okno nebo jiný prohlížeč začíná prázdný. Stavový řádek ukazuje, zda uložení vyšlo (úložiště může být v soukromém režimu zablokováno). Do poznámkového bloku neukládejte hesla ani důvěrná data; k tomu použijte nástroj pro šifrované poznámky nebo správce hesel.`],
[`Pište do bloku; ukládá se automaticky.`,`Přidávejte nebo přejmenovávejte bloky pro různá témata.`,`Text zkopírujte nebo stáhněte, když ho potřebujete jinde.`],
[[`Kde se ukládá můj text?`,`Jen v tomto prohlížeči na tomto zařízení (localStorage). Neodesílá se na žádný server.`],[`Přijdu o něj, když vymažu data prohlížení?`,`Ano. Důležité poznámky stáhněte jako soubor.`]]],
'checklist-maker': [[
`Vytvořte kontrolní seznam pro spuštění, cestu nebo postup: přidávejte položky, odškrtávejte je, přeřazujte a sledujte ukazatel průběhu a procento hotového. Seznam zkopírujte jako text se značkami [x] a [ ] k vložení do tiketu nebo zprávy.`,
`Seznam se ukládá do localStorage tohoto prohlížeče a při každé změně se překreslí; průběh je počet odškrtnutých položek dělený celkem. Nejsou tu účty ani synchronizace, takže je to soukromý seznam jedné osoby na jednom zařízení. Pro sdílené seznamy použijte týmový nástroj; pro tištěný kontrolní seznam zkopírujte text do dokumentu.`],
[`Napište položku a stisknutím Enter ji přidejte.`,`Odškrtávejte položky; posouvejte je nahoru nebo mažte.`,`Zkopírujte seznam nebo odstraňte hotové položky.`],
[[`Je můj seznam soukromý?`,`Ano. Zůstává ve vašem prohlížeči a nikdy se nenahrává.`],[`Mohu kontrolní seznam sdílet?`,`Použijte „Kopírovat jako text“ a vložte ho do zprávy nebo dokumentu.`]]],
'kanban-board': [[
`Načrtněte svou práci jako karty ve třech sloupcích: co čeká, co děláte teď a co je hotovo. Přetahujte karty mezi sloupci (nebo používejte šipky), přidávejte karty psaním a zkopírujte tabuli jako Markdown pro hlášení stavu.`,
`Tabule je malá datová struktura ze sloupců a karet, po každé změně uložená do localStorage a kreslená nativním přetahováním prohlížeče plus tlačítky šipek pro uživatele klávesnice. Je to záměrně osobní nástroj: nic se nesdílí ani nesynchronizuje, což také znamená, že není registrace a žádná data na serveru. Omezení počtu karet v „Doing“ je základní kanbanový návyk, který tato jednoduchá tabule zviditelňuje.`],
[`Přidejte karty do sloupce „To do“.`,`Přetáhněte je do „Doing“ a „Done“ (nebo použijte šipky).`,`Zkopírujte tabuli jako Markdown, když potřebujete hlásit.`],
[[`Může tabuli používat více lidí?`,`Ne, je uložena ve vašem vlastním prohlížeči. Je pro osobní plánování.`],[`Jak přesunu karty klávesnicí?`,`Tabulátorem přejděte na kartu a použijte tlačítka ← a →.`]]],
'tally-counter': [[
`Počítejte lidi u dveří, hlasy na schůzce nebo věci na polici: obří tlačítko plus, tlačítko minus, krok 1, 2, 5 nebo 10 a klávesnice (mezerník nebo ↑ přičítá, ↓ odečítá). Číslo se po zavření stránky pamatuje.`,
`Počet se drží v paměti a po každém kliknutí zapisuje do localStorage, takže ho opětovné načtení nebo náhodné zavření neztratí. Tlačítka jsou velká pro dotykové obrazovky a zkratky jsou vypnuty, když píšete do pole. Nepoužívá se síť ani účet.`],
[`Stiskněte plus nebo mezerník pro počítání nahoru.`,`Opravte chybu minusem nebo ↓.`,`Vynulujte, když začínáte další počítání.`],
[[`Ukládá se číslo?`,`Ano, v tomto prohlížeči, dokud ho nevynulujete nebo nevymažete data webů.`],[`Mohu počítat po pěti?`,`Ano. V seznamu zvolte „Počítat po 5“ nebo 10.`]]],
'markdown-table-of-contents': [[
`Vložte README nebo dokument a získáte vnořený seznam odkazů na všechny nadpisy, připravený k vložení nahoru. Zvolte úrovně nadpisů, odrážky nebo čísla a volitelně vložte hotový obsah do dokumentu hned za titul.`,
`Nadpisy se čtou řádek po řádku s vynecháním bloků kódu (takže „# comment“ ve výňatku shellu se nepovažuje za nadpis) a řádkové formátování, jako odkazy, kód a zdůraznění, se z textu odkazu odstraní. Kotvy sledují pravidla GitHubu: malá písmena, odstraněná interpunkce (písmena a číslice každého jazyka zůstanou), mezery změněné na pomlčky a zdvojené nadpisy dostanou přípony -1, -2. Jiné rendery (GitLab, VS Code, generátory statických webů) používají velmi podobná, ale ne totožná pravidla, proto odkazy otestujte v cílové platformě.`],
[`Vložte dokument v Markdownu.`,`Zvolte úrovně nadpisů a styl seznamu.`,`Zkopírujte obsah do dokumentu.`],
[[`Proč některé odkazy na mém webu nefungují?`,`Pravidla kotev se mezi platformami mírně liší. Tento nástroj používá pravidla GitHubu.`],[`Ignorují se nadpisy v blocích kódu?`,`Ano.`]]],
'template-variable-filler': [[
`Napište šablonu jednou se značkami jako {{name}} a {{date}} a při každém použití vyplňte hodnoty. Pole formuláře se automaticky objeví pro každý zástupný symbol, výsledek se aktualizuje při psaní a nevyplněné symboly zůstanou viditelné, aby se na nic nezapomnělo.`,
`Šablona se prohledá na značky {{name}} (uvnitř jsou povolena písmena, číslice, mezery, tečky, pomlčky a podtržítka), různá jména se stanou vstupními poli v pořadí výskytu a každý výskyt se nahradí zadanou hodnotou. Nahrazení probíhá ve vašem prohlížeči, takže důvěrné údaje zůstanou soukromé. Funguje pro e-maily, odpovědi podpory, smlouvy i prompty pro AI.`],
[`Napište šablonu se {{zástupnými symboly}}.`,`Vyplňte pole, která se objeví.`,`Zkopírujte hotový text.`],
[[`Může se zástupný symbol vyskytnout vícekrát?`,`Ano. Každý výskyt se nahradí stejnou hodnotou.`],[`Co když pole nechám prázdné?`,`Zástupný symbol zůstane v textu, takže vidíte, co chybí.`]]],
'decision-matrix': [[
`Porovnáváte dodavatele, pracovní nabídky nebo nástroje? Vypište kritéria, každému dejte váhu od 1 do 10, ohodnoťte každou možnost od 0 do 10 podle kritéria a uvidíte vážený součet s nejlepší možností zvýrazněnou. Jsou-li první dvě příliš blízko, objeví se upozornění.`,
`Vážené skóre možnosti je Σ(skóre × váha) ÷ Σ(vah), což udržuje výsledek na stejné škále 0–10. Explicitní váhy vynutí rozhovor o tom, co je důležité, než se možnosti ohodnotí, a v tom je většina hodnoty. Matice je pomůcka k přemýšlení, ne orákulum: když se výsledek zdá špatný, pravděpodobně je špatná některá váha.`],
[`Nastavte kritéria a jejich váhy.`,`Ohodnoťte každou možnost podle kritéria.`,`Přečtěte si vážené součty a probíhejte těsné případy.`],
[[`Jak zvolit váhy?`,`Nejdůležitějšímu kritériu dejte 10 a ostatní k němu přepočítejte. Na vahách se dohodněte před hodnocením.`],[`Je nejvyšší skóre vždy správná volba?`,`Je to nejlepší shoda s vašimi uvedenými prioritami. Záleží na citlivosti: změňte váhy a uvidíte, zda se vítěz změní.`]]],
'daily-standup-formatter': [[
`Napište tři krátké seznamy a získáte aktualizaci připravenou k vložení do Slacku, Teams nebo e-mailu: tučné nadpisy, úhledné odrážky, prázdné sekce vyplněné „Nic k hlášení“ nebo „Žádné“. Zvolte tučné písmo ve stylu Slacku, Markdown nebo prostý text.`,
`Každý řádek se ořízne, úvodní odrážky nebo pomlčky se odstraní a každá položka se zapíše s odrážkou. Slack a Teams používají pro tučné jednoduché hvězdičky, Markdown dvojité a prostý text dvojtečku, což obstará volba formátu. Nic se neodesílá; text se jen přeformátuje ve vašem prohlížeči. Dobrá aktualizace je konkrétní a krátká: výsledky, ne činnosti.`],
[`Napište, co jste udělali, co uděláte a překážky, jednu položku na řádek.`,`Zvolte formát.`,`Zkopírujte aktualizaci do chatu.`],
[[`Co dělá dobrou standupovou aktualizaci?`,`Výsledky místo činností, jeden řádek na položku a překážky, které jmenují, kdo může pomoci.`],[`Funguje to pro Microsoft Teams?`,`Ano. Pro tučné nadpisy použijte formát Slack/Teams.`]]],
};
