test:
	@./node_modules/.bin/mocha test/client test/auth test/api-common test/api-authed -R spec auth true

test-without-auth:
	@./node_modules/.bin/mocha test/client test/auth test/api-common test/api-authed -R spec auth false

.PHONY: test