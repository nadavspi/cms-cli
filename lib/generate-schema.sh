#!/usr/bin/env bash
TOKEN=$(op read "op://Personal/cms.nadav.is/token")
npx directus-typeforge --host https://cms.nadav.is --token "$TOKEN" -o src/types/directus-schema.ts

