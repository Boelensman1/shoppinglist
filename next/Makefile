SRC_FILES=$(shell find src/)
INSTALL_DEPS=node_modules ../server/build

clean:
	rm -rf node_modules build

build: $(INSTALL_DEPS) $(SRC_FILES) tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs
	NEXT_TELEMETRY_DISABLED=1 pnpm next build --webpack
	@if [ -e build ]; then touch build; fi

build-prod:
	rm -rf ./build
	NODE_ENV=production $(MAKE) build

serve: build-prod
	NEXT_TELEMETRY_DISABLED=1 pnpm next start

dev: $(INSTALL_DEPS)
	NEXT_PUBLIC_LOCAL=1 NEXT_PUBLIC_DISABLE_SW=1 NEXT_TELEMETRY_DISABLED=1 PORT=4101 pnpm --no-install next dev --turbopack

test: $(INSTALL_DEPS)
	echo 'no tests yet'
	#pnpm vitest

node_modules: ../server/build
	$(MAKE) -C .. install
	@if [ -e node_modules ]; then touch node_modules; fi

../server/build: FORCE
	$(MAKE) -C ../server build

lint: $(INSTALL_DEPS)
	pnpm --no-install prettier --check .
	pnpm --no-install eslint
	pnpm --no-install tsc --noEmit

.PHONY: dev clean lint test build-prod FORCE
