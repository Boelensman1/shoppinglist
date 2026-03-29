project_dir = $(or $(wildcard packages/$1),$1)

install:
	pnpm install

clean-%:
	$(MAKE) -C $(call project_dir,$*) clean

build-%: install
	$(MAKE) -C $(call project_dir,$*) build

lint-%: install
	$(MAKE) -C $(call project_dir,$*) lint

lint-next: build-server

test-%:
	$(MAKE) -C $(call project_dir,$*) test

build: build-server build-next
lint: lint-shared lint-server lint-next
test: test-server test-next
clean: clean-server clean-next
	rm -rf node_modules

.PHONY: install lint test clean
