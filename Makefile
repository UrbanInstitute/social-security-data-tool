all:
		@echo "Try make data"

JSONS := $(wildcard data/json/*.json)
.PHONY: data
data: $(JSONS)
	@mongoimport --db test --collection tables --file $(JSONS)
