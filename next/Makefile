SRC_FILES=$(shell find src/)

clean:
	rm -rf node_modules

build: $(SRC_FILES) tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs
	NEXT_TELEMETRY_DISABLED=1 pnpm next build --webpack
	cp -r public build/standalone/ && cp -r build/static build/standalone/build/

serve: build
	node build/standalone/server.js

dev:
	NEXT_PUBLIC_LOCAL=1 NEXT_PUBLIC_DISABLE_SW=1 NEXT_TELEMETRY_DISABLED=1 PORT=4101 pnpm --no-install next dev --turbopack

test:
	echo 'no tests yet'
	#pnpm vitest

lint:
	pnpm --no-install prettier --check .
	pnpm --no-install eslint
	pnpm --no-install tsc --noEmit

.PHONY: dev clean lint test
