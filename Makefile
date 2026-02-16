install:
	pnpm install

build-shared:
	$(MAKE) -C packages/shared build

build-server: build-shared
	$(MAKE) -C server build

build-next: build-shared
	$(MAKE) -C next build

lint:
	$(MAKE) -C server lint
	$(MAKE) -C next lint

test:
	$(MAKE) -C server test
	$(MAKE) -C next test

.PHONY: install build-shared build-server build-next dev-shared lint test
