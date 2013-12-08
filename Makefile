test:
	@./node_modules/.bin/mocha test/client test/auth test/api-common test/api-authed -R spec auth false

test-with-auth:
	@./node_modules/.bin/mocha test/client test/auth test/api-common test/api-authed -R spec auth true

.PHONY: test