# CogniTest — Documentation PFE

Documentation du **Projet de Fin d'Études (PFE)** pour la plateforme **CogniTest** (`digital-model`).

## Contenu du dossier

| Fichier | Description |
|---------|-------------|
| [`RAPPORT-PFE.md`](./RAPPORT-PFE.md) | Rapport complet (source Markdown) : table des matières, 4 chapitres, intro/conclusion |
| [`RAPPORT-PFE.pdf`](./RAPPORT-PFE.pdf) | Version PDF générée à partir du Markdown |
| [`generate-pdf.sh`](./generate-pdf.sh) | Script shell de génération du PDF |
| [`generate-pdf.py`](./generate-pdf.py) | Générateur Python (fpdf2, recommandé) |

## Informations projet

| Élément | Valeur |
|---------|--------|
| **Titre** | Conception et réalisation de CogniTest : plateforme web de batteries cognitives et mathématiques numériques |
| **Application** | CogniTest (`digital-model`) |
| **Stack** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase (Auth + Postgres + RLS) |
| **Déploiement** | Netlify (`netlify.toml`) |
| **Référence technique** | [`docs/PROJECT-OVERVIEW.md`](../PROJECT-OVERVIEW.md) |

## Structure du rapport (4 chapitres)

1. **Cadre général du projet** — organisme d'accueil, problématique, Scrum, planification  
2. **Étude fonctionnelle** — typologie des tests, acteurs, besoins, cas d'utilisation, KPIs  
3. **Étude conceptuelle** — UML, architecture applicative (Next.js + Supabase)  
4. **Réalisation du projet** — implémentation, interfaces, déploiement  

## Personnalisation avant soutenance

Remplacez les champs entre crochets dans `RAPPORT-PFE.md` :

- `[Nom de l'étudiant(e)]`
- `[École / Université]`
- `[Organisme d'accueil]`
- `[Encadrant académique]` / `[Encadrant entreprise]`
- `[Année universitaire]`
- `[Dates du stage]`

Puis régénérez le PDF (voir ci-dessous).

## Générer le PDF

### Prérequis (recommandé)

- Python 3.9+
- `fpdf2` : `pip3 install -r docs/pfe/requirements-pfe.txt`

### Commande

```bash
./docs/pfe/generate-pdf.sh
```

Ou directement :

```bash
python3 docs/pfe/generate-pdf.py
```

### Alternative Node (plus lente)

```bash
npx --yes md-to-pdf docs/pfe/RAPPORT-PFE.md
```

### Alternative sans Node

1. Ouvrir `RAPPORT-PFE.md` dans VS Code / Cursor.  
2. Extension « Markdown PDF » ou export via Pandoc :  
   `pandoc docs/pfe/RAPPORT-PFE.md -o docs/pfe/RAPPORT-PFE.pdf`  
3. Imprimer depuis le navigateur : ouvrir le HTML généré par Pandoc (`-t html`) → Imprimer → Enregistrer en PDF.

## Ajouter des figures

Pour un rapport Word/LaTeX final :

1. Captures d'écran : page d'accueil (`/`), tableau de bord (`/dashboard`), domaines (`/domains`), lanceur de test (`/tests/[testId]`), résultats (`/results`).  
2. Diagrammes : architecture (§3 du rapport), cas d'utilisation, schéma Supabase (`supabase/migrations/`).  
3. Insérer les images dans `docs/pfe/figures/` et référencer dans le Markdown : `![Légende](./figures/dashboard.png)`.

## Licence et éthique

Les batteries inspirées d'outils standardisés (TVPS, Raven, Beery, etc.) sont des **implémentations de démonstration/recherche**. Vérifier les droits d'utilisation avant toute diffusion publique (voir `docs/PROJECT-OVERVIEW.md` §13).

## Liens utiles

- Code source : racine du dépôt `digital-model`
- Architecture détaillée : [`docs/PROJECT-OVERVIEW.md`](../PROJECT-OVERVIEW.md)
- Migrations base : [`supabase/migrations/`](../../supabase/migrations/)
- Catalogue des tests : [`lib/mock-data.ts`](../../lib/mock-data.ts), [`supabase/seed.sql`](../../supabase/seed.sql)
