SRC_FILES=$(shell find src/)

dist: $(SRC_FILES)
	pnpm build

build: dist

lint:
	pnpm prettier --check .
	pnpm tsc --noEmit

dev:
	pnpm tsc --watch

.PHONY: dev lint
