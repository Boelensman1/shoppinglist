project_dir = $(or $(wildcard packages/$1),$1)

install:
	pnpm install

build-%:
	$(MAKE) -C $(call project_dir,$*) build

build-server build-next: build-shared

lint-%:
	$(MAKE) -C $(call project_dir,$*) lint

test-%:
	$(MAKE) -C $(call project_dir,$*) test

lint: lint-shared lint-server lint-next
test: test-server test-next

.PHONY: install lint test
