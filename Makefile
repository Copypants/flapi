test:
	@./node_modules/.bin/mocha test/client test/auth test/api-common test/api-authed -R spec

.PHONY: test