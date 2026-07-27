# Digital Asset Links (barre d’adresse TWA)

Si l’app Android affiche l’URL `tanstack-start-ts.npaysant.workers.dev` + une croix en haut,
Chrome n’a **pas** validé le lien site ↔ app (Trusted Web Activity).

## Cause habituelle

Play **re-signe** l’APK avec sa propre clé (« signature d’application Google Play »).
`assetlinks.json` doit contenir **l’empreinte SHA-256 de la clé de signature Play**,
pas seulement celle du keystore d’upload.

## Où la copier (Play Console)

1. Ton app → **Tester et publier** / **Configuration** → **Intégrité de l’appli**  
   (ou **Configuration de l’application** → **Signature d’application**)
2. Section **Clé de signature d’application** (pas « clé d’envoi / upload »)
3. Copier **Empreinte du certificat SHA-256**
4. Envoyer cette valeur à l’agent / l’ajouter dans  
   `public/.well-known/assetlinks.json` → `sha256_cert_fingerprints`
5. Redeploy web (`npm run build && npm run deploy`)
6. Sur le téléphone : vider le cache Chrome ou réinstaller l’app, puis rouvrir

Fichier live :  
https://tanstack-start-ts.npaysant.workers.dev/.well-known/assetlinks.json
