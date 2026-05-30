# Znanstveno izvješće: Analiza socijalne mreže likova serije South Park (Social Network Analysis - SNA)

Ovo znanstveno izvješće prikazuje rezultate analize socijalne strukture i odnosa među likovima u animiranoj seriji *South Park* primjenom metodologije analize socijalnih mreža (SNA). Mreža se sastoji od **64 ključna lika** i **221 jedinstvene društvene veze**, kategorizirane u pet različitih tipova odnosa.

---

## 1. Sažetak (Abstract)

Cilj ovog rada je identificirati najutjecajnije likove, društvene "mostove" koji povezuju različite grupe (odrasle i djecu), te brzinu širenja informacija unutar fiktivnog grada South Parka. Korištenjem teorije grafova i algoritama za centralnost (PageRank, Betweenness, Closeness i stupanj povezanosti), analizirali smo pročišćene podatke prikupljene s Fandom Wiki portala i South Park Studios baze podataka. 

Rezultati pokazuju da je **Stan Marsh** središnja figura mreže (100% u svim metrikama centralnosti). Posebno zanimljiv nalaz je iznimno visoka "posrednička" uloga **Chefa** (54% Betweenness Centrality), koji funkcionira kao ključni most između svijeta djece i odraslih, te vodeća uloga **Randyja Marsha** među odraslim likovima (46.7% PageRank).

---

## 2. Metodologija i prikupljanje podataka

### 2.1. Ekstrakcija i pročišćavanje podataka
Podaci su prikupljeni automatskim pretraživanjem infokutija (infoboxes) na portalu *South Park Fandom Wiki* i ručnim usklađivanjem službenih naziva likova s baze *South Park Studios*. Kako bi se osigurala analitička relevantnost mreže, primijenjena su sljedeća pravila filtriranja:
1. **Uklanjanje kolektivnih entiteta**: Skupine poput *"Emo Kids"*, *"Raisins Girls"*, *"The Whites"* ili *"Memberberries"* isključene su jer iskrivljuju individualne interakcije.
2. **Bijela lista obitelji (Family Whitelist)**: Uklonjeni su obskurni likovi koji se pojavljuju u samo jednoj epizodi (npr. Kyleova baka *Cleo Broflovski* ili daljnja rodbina Erica Cartmana), zadržavajući samo članove užih obitelji koji imaju dugoročan utjecaj na narativ.
3. **Povezivanje razreda (Classmate Clique)**: Svi učenici četvrtog razreda (18 učenika, uključujući Timmyja i Jimmyja) povezani su međusobnim prijateljskim vezama (**Friend**), osim u slučajevima kada između njih već postoji specifičniji odnos poput neprijateljstva (**Enemy** - npr. Cartman i Kyle) ili ljubavne veze (**Romance** - npr. Stan i Wendy, Craig i Tweek).

### 2.2. Tipologija odnosa
Društveni odnosi podijeljeni su u pet međusobno isključivih kategorija visoke preciznosti:
*   **Obitelj (Family)** (Zelena): Izravne obiteljske i rodbinske veze (roditelji, braća, sestre).
*   **Romantika (Romance)** (Roza): Trenutne ili bivše ljubavne i partnerske veze.
*   **Prijatelj (Friend)** (Plava): Prijateljski odnosi i vršnjačke veze (razred).
*   **Neprijatelj (Enemy)** (Žuta): Otvoreno neprijateljstvo, rivalstvo ili stalni sukobi.
*   **Kolega (Work)** (Ljubičasta): Poslovni i profesionalni odnosi među odraslima (npr. Randy Marsh i Towelie na Tegridy farmi).
*   **Škola (School)** (Narančasta): Odnosi autoriteta i odgoja između školskog osoblja (profesora, ravnatelja) i učenika.

> [!NOTE]
> **Izolacija školskih veza u rasporedu (Layout)**:
> U analizi prostornog rasporeda (COSE layout), veze tipa **Škola** su izuzete iz fizičkog izračuna privlačnih sila. Razlog tome je što bi stotine veza između školskog osoblja i učenika (npr. g. Garrison i svi učenici) povukle sve čvorove u jednu nepreglednu, zbijenu kuglu. Njihovim izuzimanjem, graf prirodno grupira djecu u središnji razredni krug, a obitelji i odrasle u logična predgrađa oko njih, dok se narančaste školske linije iscrtavaju preko tog prirodnog rasporeda.

---

## 3. Teorijski okvir i matematičke metrike

### 3.1. Stupanj povezanosti (Degree Centrality)
Predstavlja ukupan broj izravnih veza (rubova) koje pojedini čvor (lik) ostvaruje u grafu:
$$C_D(v) = \text{deg}(v)$$
Ova metrika mjeri lokalni utjecaj lika i njegovu neposrednu aktivnost.

### 3.2. Društveni utjecaj (PageRank Centrality)
Kako bi se izbjegla abecedna pristranost (budući da standardni usmjereni PageRank favorizira čvorove ovisno o smjeru indeksiranja veza), implementiran je **neusmjereni PageRank** nad društvenom mrežom (uz izuzimanje školskih veza kako bi se spriječilo umjetno napuhavanje utjecaja profesora):
$$PR(u) = \frac{1 - d}{N} + d \sum_{v \in \Gamma(u)} \frac{PR(v)}{\text{deg}(v)}$$
Gdje je $d = 0.85$ (faktor prigušenja), $N$ je ukupan broj likova, a $\Gamma(u)$ je skup neposrednih susjeda lika $u$. Rezultati su normalizirani kao postotak u odnosu na maksimalnu vrijednost u mreži.

### 3.3. Društveni most (Betweenness Centrality)
Mjeri mjeru u kojoj pojedini lik služi kao "most" ili posrednik između drugih parova likova koji nisu izravno povezani. Lik s visokim Betweennessom kontrolira protok informacija i povezuje različite društvene krugove (npr. školu, roditelje i lokalne kreativce):
$$C_B(v) = \sum_{s \neq v \neq t} \frac{\sigma_{st}(v)}{\sigma_{st}}$$
Gdje je $\sigma_{st}$ ukupan broj najkraćih putova od čvora $s$ do čvora $t$, a $\sigma_{st}(v)$ broj tih putova koji prolaze kroz čvor $v$.

### 3.4. Društvena bliskost (Closeness Centrality)
Mjeri koliko je pojedini lik blizu svim ostalim likovima u mreži, odnosno koliko brzo informacije mogu stići od njega do bilo kojeg drugog čvora u grafu. Računa se kao recipročna vrijednost zbroja najkraćih putova:
$$C_C(u) = \frac{N - 1}{\sum_{v \neq u} d(u, v)}$$
Gdje je $d(u, v)$ duljina najkraćeg puta između $u$ i $v$.

---

## 4. Rezultati analize (Tablični prikaz)

U nastavku su prikazani Top 10 likova za svaku pojedinu metriku. Metrike centralnosti (PageRank, Betweenness i Closeness) izračunate su na grafu bez školskih veza i normalizirane u odnosu na maksimalnu vrijednost (Stan Marsh = 100%).

### Tablica 1: Top 10 likova prema SNA metrikama

| Pozicija | Stupanj (Degree) | Utjecaj (PageRank %) | Društveni most (Betweenness %) | Bliskost (Closeness %) |
| :---: | :--- | :--- | :--- | :--- |
| **1.** | **Stan Marsh** (38) | **Stan Marsh** (100.0%) | **Stan Marsh** (100.0%) | **Stan Marsh** (100.0%) |
| **2.** | **Kyle Broflovski** (31) | **Kyle Broflovski** (66.3%) | **Chef** (54.0%) | **Kyle Broflovski** (89.2%) |
| **3.** | **Kenny McCormick** (30) | **Kenny McCormick** (59.8%) | **Kyle Broflovski** (33.7%) | **Kenny McCormick** (88.4%) |
| **4.** | **Craig Tucker** (29) | **Craig Tucker** (53.6%) | **Kenny McCormick** (32.2%) | **Eric Cartman** (86.3%) |
| **5.** | **Butters Stotch** (28) | **Butters Stotch** (50.6%) | **Herbert Garrison** (31.7%) | **Craig Tucker** (81.1%) |
| **6.** | **Tweek Tweak** (28) | **Tweek Tweak** (50.6%) | **Craig Tucker** (19.8%) | **Butters Stotch** (80.5%) |
| **7.** | **Tolkien Black** (28) | **Tolkien Black** (50.6%) | **Randy Marsh** (17.3%) | **Tweek Tweak** (80.5%) |
| **8.** | **Eric Cartman** (27) | **Eric Cartman** (50.5%) | **Butters Stotch** (13.4%) | **Tolkien Black** (80.5%) |
| **9.** | **Heidi Turner** (26) | **Randy Marsh** (46.7%) | **Tweek Tweak** (13.4%) | **Heidi Turner** (79.3%) |
| **10.**| **Timmy Burch** (26) | **Heidi Turner** (41.6%) | **Tolkien Black** (13.4%) | **Timmy Burch** (79.3%) |

---

## 5. Interpretacija rezultata i rasprava

### 5.1. Dominacija Stana Marsha
U svim metrikama **Stan Marsh** uvjerljivo vodi. Razlog tome je njegova strukturna pozicija: on je član glavne četvorke dječaka (klika), član je razredne klike (Friend veze), ima ljubavnu vezu (Wendy), te ima vrlo razvijenu obiteljsku strukturu (Randy, Sharon, Shelley, djed Marvin). Stan je primarna spojnica koja povezuje djecu s odraslim likovima kroz svog oca Randyja.

### 5.2. Fenomen "Chef" i uloga društvenog mosta
Metrika **Betweenness Centrality** (Društveni most) otkriva iznimno visoku ulogu **Chefa** (54.0%), unatoč tome što on nema najveći broj veza u grafu. 
*   **Zašto je Chef tako visoko?**: U narativu serije, Chef je jedina odrasla osoba kojoj dječaci bezuvjetno vjeruju i kojoj se obraćaju za savjet. Strukturno, Chef se nalazi točno na sjecištu školske klike (učenika) i odraslih građana (roditelja i gradske uprave). On kontrolira protok informacija i služi kao glavni prevoditelj i posrednik između neshvaćene djece i ekscentričnih odraslih.
*   **Garrison i Randy**: **Herbert Garrison** (31.7%) i **Randy Marsh** (17.3%) također funkcioniraju kao mostovi. Garrison povezuje učionicu s upravom škole, dok Randy povezuje obitelj Marsh, Towelieja (posao) te ostale roditelje (Geralda, Stephena) s širim društvenim kontekstom.

### 5.3. Analiza utjecaja ravnatelja: PC Principal vs. Vice Principal Strong Woman
Zanimljiv je kontrast u društvenom utjecaju (PageRank) i bliskosti između ravnatelja škole:
*   **PC Principal** (28.0% PageRank)
*   **Vice Principal Strong Woman** (12.0% PageRank)

> [!IMPORTANT]
> **Uzrok razlike u utjecaju ravnatelja**:
> Iako oboje obnašaju vodeće funkcije u školskoj administraciji i u ljubavnoj su vezi, **PC Principal** ima znatno veći društveni utjecaj. To je zato što PC Principal ostvaruje izravne sukobe i interakcije s glavnim dječacima (npr. Ericom Cartmanom i Buttersom kroz školske kazne) te g. Mackeyjem. **Strong Woman** je narativno uvedena kasnije i njezine su veze primarno ograničene na PC Principala i PC Bebe, što je ostavlja na periferiji mreže bez izravnih mostova prema razrednoj jezgri dječaka.

---

## 6. Dijkstra i najkraći putovi (Dijkstra's Pathfinding)

Uvođenjem Dijkstra algoritma u aplikaciju omogućeno je traženje najbržeg lanca poznanstava između bilo koja dva lika u gradu. 

> [!TIP]
> **Izbjegavanje prečaca kroz školu**:
> Izuzimanjem školskih veza iz Dijkstra algoritma osigurali smo visoku realnost putanja. Primjerice, najkraća putanja između **Stana Marsha** i **Towelieja** bez škole iznosi **2 koraka** i ide preko **Randyja Marsha** (Stan $\rightarrow$ Randy $\rightarrow$ Towelie), što odgovara stvarnom narativu serije (Randy je Stanov otac, a Towelie mu je poslovni partner). 
> Da su školske veze bile uključene, algoritam bi pronašao umjetni prečac preko škole (npr. preko PC Principala ili g. Mackeyja), što bi narušilo socijalni realizam prikaza.

---

## 7. Zaključak

Analiza socijalne mreže South Parka uspješno je dokazala da struktura grafa vjerno oslikava narativni fokus i dinamiku serije. Glavni likovi nisu samo oni koji najviše govore, već oni koji drže mrežu na okupu povezujući različite društvene slojeve. Stan Marsh i dalje ostaje emocionalno i strukturno srce grada, Chef povijesni stup komunikacije, a Randy Marsh motor modernih epizoda koji povezuje lokalno gospodarstvo (Tegridy Farms) s ostatkom zajednice.
