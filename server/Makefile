SRC_FILES=$(shell find src/)
INSTALL_DEPS=node_modules

clean:
	rm -rf ./node_modules build

node_modules:
	$(MAKE) -C .. install
	@if [ -e node_modules ]; then touch node_modules; fi

build: $(INSTALL_DEPS) $(SRC_FILES)
	pnpm tsc
	@if [ -e build ]; then touch build; fi

lint: $(INSTALL_DEPS)
	pnpm prettier --check .
	pnpm tsc --noEmit -p tsconfig.lint.json

test: $(INSTALL_DEPS)
	pnpm vitest run

test-watch: $(INSTALL_DEPS)
	pnpm vitest

test-ui: $(INSTALL_DEPS)
	pnpm vitest --ui

dev: $(INSTALL_DEPS)
	NODE_ENV=development pnpm tsx watch ./src/index.mts

.PHONY: dev lint test clean FORCE
