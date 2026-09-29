# SKYlocation
site de reservation de voiture ou logement

## Administration

Le dashboard est accessible sur `/dashboard`. Les modifications enregistrées sont commitées dans `data/availability.json`, puis publiées par le déploiement Vercel associé au dépôt.

Créer une OAuth App GitHub dont l’URL de callback est `https://votre-domaine/api/auth`, puis configurer dans Vercel :

- `GITHUB_CLIENT_ID` et `GITHUB_CLIENT_SECRET` : identifiants de l’OAuth App, conservés côté serveur.
- `GITHUB_OAUTH_REDIRECT_URI` : URL de callback déclarée dans l’OAuth App, par exemple `https://votre-domaine/api/auth`.
- `GITHUB_OAUTH_SCOPE` : facultatif, `public_repo` par défaut; utiliser `repo` si le dépôt est privé.
- `GITHUB_REPOSITORY` : facultatif, format `proprietaire/depot` (par défaut `phils-johns/SKYlocation`).
- `GITHUB_BRANCH` : facultatif, branche à modifier (par défaut `main`, ou la branche du déploiement Vercel).
- `APP_ORIGIN` : facultatif, origine publique du site si elle diffère du domaine de la requête.

L’utilisateur doit se connecter avec un compte qui peut écrire dans le dépôt. La session OAuth est conservée dans un cookie `HttpOnly`; aucun jeton n’est demandé ou stocké dans le navigateur accessible au JavaScript. Ne pas placer le secret OAuth dans les fichiers du site. Après configuration, redéployer le projet.
