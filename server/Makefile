SRC_FILES=$(shell find src/)

node_modules: package.json package-lock.json
	npm ci

build: node_modules $(SRC_FILES)
	npx tsc

lint: node_modules
	npx prettier --check .
	npx tsc --noEmit

.PHONY: dev lint prod
