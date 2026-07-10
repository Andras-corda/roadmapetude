# Tableau de bord de suivi des travaux scolaires — Promotion 2026

Application web statique (HTML/CSS/JS vanilla, sans backend) permettant à
Andras, Christina, Elora, Hugo et Nathan de suivre l'avancement de leurs
travaux pratiques et examens jusqu'aux échéances du **24 juillet 2026**
(objectif principal) et du **19 août 2026** (date limite officielle).

## Aperçu des fonctionnalités

- **Compte à rebours en direct** vers les deux échéances (jours / heures /
  minutes / secondes).
- **Tableau de bord** : nombre total de tâches, terminées, restantes,
  progression globale.
- **Une carte par étudiant**, avec barre de progression et liste des tâches
  dont il est **responsable effectif** (y compris les tâches déléguées par
  un·e camarade, clairement étiquetées "Pour <prénom>").
- **Filtres combinables** : étudiant (propriétaire d'origine), responsable
  effectif, type de cours (T EPR, TECR, ATPJ, INML, HCJV, OCJV), état
  (à faire / en cours / terminé), recherche texte libre.
- **Case à cocher à 3 états** : cliquer sur le rond à gauche d'une tâche
  fait tourner son état À faire → En cours → Terminé.
- **Sauvegarde automatique** dans le `localStorage` du navigateur : rien
  n'est perdu en fermant l'onglet.
- **Mode sombre par défaut**, avec bascule vers un mode clair (mémorisée
  également).
- 100% responsive (ordinateur, tablette, smartphone).

## Structure du projet

```
tableau-de-bord/
├── index.html      Structure de la page
├── style.css        Design ("planche de production" / build board)
├── script.js        Données des tâches, logique, filtres, localStorage
├── README.md         Ce fichier
└── assets/
    └── favicon.svg   Icône du site
```

## Modèle de données

Chaque tâche (dans `script.js`, tableau `TASKS`) possède :

| Champ         | Description                                                        |
|---------------|----------------------------------------------------------------------|
| `id`          | Identifiant unique                                                    |
| `title`       | Intitulé de la tâche                                                  |
| `type`        | Type de cours (T EPR, TECR, ATPJ, INML, HCJV, OCJV)                    |
| `owner`       | Étudiant "propriétaire" du cours (à qui la tâche est due)              |
| `responsible` | Étudiant qui réalise réellement la tâche (peut différer de `owner`)    |
| `status`      | `todo`, `inprogress` ou `done`                                         |

Les cartes du tableau de bord regroupent les tâches par **responsable
effectif** (celui qui doit réellement produire le travail), ce qui reflète
la charge réelle de chacun une fois les délégations prises en compte. Le
filtre "Étudiant" permet lui de retrouver les tâches par propriétaire
d'origine.

Seul l'état (`status`) est modifiable depuis l'interface ; les
modifications sont stockées dans le `localStorage` (clé
`tdb2026_status_overrides`) et fusionnées avec les données de base à
chaque chargement. Pour changer la liste des tâches elle-même
(ajout/suppression/renommage), il faut éditer le tableau `TASKS` dans
`script.js`.

## Utilisation en local

Aucune installation n'est nécessaire. Deux options :

1. Ouvrir directement `index.html` dans un navigateur.
2. Ou, pour éviter d'éventuelles restrictions de sécurité liées à
   `file://`, lancer un petit serveur local depuis le dossier du projet :

   ```bash
   python -m http.server 8000
   ```

   puis ouvrir `http://localhost:8000`.

## Déploiement sur GitHub Pages

1. Créer un dépôt GitHub et y pousser le contenu de ce dossier
   (`index.html`, `style.css`, `script.js`, `README.md`, `assets/`) à la
   racine (ou dans un dossier `docs/`, au choix).
2. Dans le dépôt : **Settings → Pages**.
3. Sous "Build and deployment", choisir **Deploy from a branch**, puis la
   branche (ex. `main`) et le dossier (`/root` ou `/docs`).
3. Après quelques instants, GitHub fournit une URL du type
   `https://<utilisateur>.github.io/<depot>/`.

Aucune base de données ni serveur n'est requis : tout fonctionne côté
navigateur, conformément au cahier des charges.

## Notes techniques

- Polices chargées depuis Google Fonts (Space Grotesk, Inter, JetBrains
  Mono) — nécessite une connexion internet à l'affichage ; sans connexion,
  le site retombe sur les polices système.
- Le stockage utilisé est `window.localStorage` (persistant, propre à
  chaque navigateur/appareil — les cinq étudiants ne partagent pas leurs
  cases cochées entre eux s'ils ouvrent le site sur des machines
  différentes).
- Aucune dépendance externe (pas de framework, pas de build step).
