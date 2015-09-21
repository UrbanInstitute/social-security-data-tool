all:
		@echo "Try make data"

data:
	JSONS := $(shell find $(makefile_dir)/data/$(json) -name "*.json")

	@echo "foo $JSONS"