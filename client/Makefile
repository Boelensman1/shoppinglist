SRC_FILES=$(shell find src/)

node_modules: package.json package-lock.json
	npm ci

dev: node_modules
	npx vite --host

dist: node_modules $(SRC_FILES)
	npx tsc
	npx vite build --base=/shoppinglist

lint: node_modules
	npx prettier --check .
	npx eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0
	npx tsc

preview: node_modules
	npx vite preview

.PHONY: dev lint preview
