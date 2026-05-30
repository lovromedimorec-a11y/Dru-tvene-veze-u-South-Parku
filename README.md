# South Park Character Network ⚖️

Interaktivni alat za vizualizaciju i analizu socijalne mreže likova iz animirane serije *South Park*. Projekt koristi teoriju grafova za analizu utjecaja likova, pronalaženje najkraćih putova (veza) i usporedbu društvenih metrika.

---

## Pregled

**South Park Character Network** omogućuje istraživanje složenih odnosa u gradu South Park. Kroz interaktivni mrežni graf vizualiziraju se različite vrste odnosa (prijateljstvo, obitelj, ljubav, suparništvo, poslovni i školski odnosi) među **64 ključna lika**. Alat omogućuje dubinsku analizu socijalne strukture serije i pruža uvid u to tko su najvažniji likovi na temelju matematičkih izračuna.

---

## Značajke

*   **Interaktivni graf (Force-Directed)**: Pregledavanje, povlačenje i zumiranje čvorova na grafu pomoću Cytoscape.js biblioteke.
*   **Analiza socijalne centralnosti**: Prikaz i usporedba triju ključnih grafovskih metrika:
    *   **PageRank** (Društveni utjecaj / Popularnost)
    *   **Betweenness Centrality** (Društveni mostovi / Posrednici)
    *   **Closeness Centrality** (Društvena bliskost / Brzina protoka informacija)
*   **Usporedni mod (Comparison Mode)**:
    *   Odabir bilo koja dva lika (Lika A i Lika B) za usporedbu.
    *   Izračun **najkraćeg puta** između njih pomoću Dijkstra algoritma (uz inteligentno izdvajanje školskih veza).
    *   Prikaz **zajedničkih prijatelja** (veza).
    *   Usporedni grafički prikaz statistika pomoću paralelnih progres barova.
*   **Brzo filtriranje**: Označavanje i filtriranje likova prema grupama (**Djeca / Odrasli**) i specifičnim vrstama odnosa (npr. samo ljubavne ili obiteljske veze).
*   **Napredna tražilica**: Pretraživanje likova po imenu uz automatsko uokvirivanje i zumiranje lokalne mreže odabranog lika.
*   **Ljestvica važnosti (Leaderboard)**: Rang-lista likova sortirana prema utjecaju.

---

## Tehnološki stog

*   **Frontend**: Vanilla HTML5, Vanilla CSS3 (neon glassmorphism estetika), JavaScript (ES6).
*   **Vizualizacija**: Cytoscape.js (cose layout).
*   **Analiza i priprema podataka**: Python, NetworkX, Beautiful Soup (scraping s Fandom Wiki API).

---

## Početak rada

1.  Preuzmite ili klonirajte ovaj repozitorij.
2.  U mapi projekta pokrenite lokalni poslužitelj (npr. pomoću Pythona):
    ```bash
    python -m http.server 8000
    ```
3.  Otvorite web preglednik na adresi:
    ```
    http://localhost:8000/
    ```

---

## Znanstveno izvješće

Detaljno znanstveno istraživanje i interpretacija rezultata analize socijalnih mreža (SNA) nalaze se u mapi `report`:
👉 **[Znanstveno izvješće (analysis_results.md)](report/analysis_results.md)**

*Projekt je kreiran u sklopu analize društvenih odnosa i mrežnih struktura.*
