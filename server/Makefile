SRC_FILES=$(shell find src/)
INSTALL_DEPS=node_modules ../packages/shared/build

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
	pnpm tsc --noEmit

test:
	npm test

dev:
	pnpm tsx watch ./src/index.mts

../packages/shared/build: FORCE
	$(MAKE) -C ../packages/shared build

.PHONY: dev lint test clean FORCE
