SRC_FILES=$(shell find src/)

build: $(SRC_FILES)
	pnpm tsc

lint:
	pnpm prettier --check .
	pnpm tsc --noEmit

test:
	npm test

dev:
	pnpm tsx watch ./src/index.mts

.PHONY: dev lint test
