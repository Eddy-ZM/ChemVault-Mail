import app from '../hono/hono';
import userService from '../service/user-service';
import result from '../model/result';
import userContext from '../security/user-context';

app.get('/my/loginUserInfo', async (c) => {
	const currentUser = userContext.getUser(c);
	if (currentUser.externalAccess) {
		return c.json(result.ok(currentUser));
	}

	const user = await userService.loginUserInfo(c, userContext.getUserId(c));
	if (currentUser.authType) {
		user.authType = currentUser.authType;
	}
	return c.json(result.ok(user));
});

app.put('/my/resetPassword', async (c) => {
	await userService.resetPassword(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.delete('/my/delete', async (c) => {
	await userService.delete(c, userContext.getUserId(c));
	return c.json(result.ok());
});

