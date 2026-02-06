#!/bin/bash

set -e

echo "--- Pulling latest changes ---"
git pull

echo "--- Installing dependencies ---"
npm i

echo "--- Building project ---"
npm run build

echo "--- Restarting PM2 process 11 ---"
pm2 restart 11

echo "--- Reloading Nginx ---"
sudo systemctl reload nginx

echo "--- Deployment finished successfully! ---"
