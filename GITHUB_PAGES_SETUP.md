# GitHub Pages setup

This package is ready for free GitHub Pages hosting.

## First upload
Upload the contents of this folder to the root of the `main` branch of:
`Dolofonos1997/poe2-build-nexus`

Important: upload the CONTENTS of this folder, not the outer folder itself.

## Enable Pages
In the repository:
1. Settings
2. Pages
3. Under Build and deployment, choose **GitHub Actions**

The included `.github/workflows/deploy-pages.yml` workflow will deploy the site on every push to `main`.

Expected site URL:
https://dolofonos1997.github.io/poe2-build-nexus/

## Future updates
Replace/update the changed files in the repository and commit them. GitHub Actions will redeploy automatically.
