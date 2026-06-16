import BizError from '../error/biz-error';
import constant from '../const/constant';
import jwtUtils from '../utils/jwt-utils';
import KvConst from '../const/kv-const';
import dayjs from 'dayjs';
import userService from '../service/user-service';
import permService from '../service/perm-service';
import { t } from '../i18n/i18n'
import app from '../hono/hono';
import { userConst } from '../const/entity-const';
import {
	ACCESS_AUTH_TYPE,
	EXTERNAL_ACCESS_PERM_KEYS,
	accessEmailFromHeaders,
	createExternalAccessUser,
	isExternalWriteBlocked,
	isInternalAccessEmail
} from './cloudflare-access';

const exclude = [
	'/login',
	'/register',
	'/oss',
	'/setting/websiteConfig',
	'/webhooks',
	'/init',
	'/public/genToken',
	'/telegram',
	'/test',
	'/oauth'
];

const requirePerms = [
	'/email/send',
	'/email/delete',
	'/account/list',
	'/account/delete',
	'/account/add',
	'/account/setAvatar',
	'/my/delete',
	'/analysis/echarts',
	'/role/add',
	'/role/list',
	'/role/delete',
	'/role/tree',
	'/role/set',
	'/role/setDefault',
	'/allEmail/list',
	'/allEmail/delete',
	'/allEmail/batchDelete',
	'/allEmail/latest',
	'/setting/setBackground',
	'/setting/deleteBackground',
	'/setting/set',
	'/setting/query',
	'/setting/setBlacklist',
	'/user/delete',
	'/user/setPwd',
	'/user/setStatus',
	'/user/setType',
	'/user/list',
	'/user/restore',
	'/user/resetSendCount',
	'/user/add',
	'/user/deleteAccount',
	'/user/allAccount',
	'/user/setAccountAvatar',
	'/user/setUserAvatar',
	'/regKey/add',
	'/regKey/list',
	'/regKey/delete',
	'/regKey/clearNotUse',
	'/regKey/history'
];

const premKey = {
	'email:delete': ['/email/delete'],
	'email:send': ['/email/send'],
	'account:add': ['/account/add'],
	'account:query': ['/account/list'],
	'account:delete': ['/account/delete'],
	'account:set-avatar': ['/account/setAvatar'],
	'my:delete': ['/my/delete'],
	'role:add': ['/role/add'],
	'role:set': ['/role/set','/role/setDefault'],
	'role:query': ['/role/list', '/role/tree'],
	'role:delete': ['/role/delete'],
	'user:query': ['/user/list','/user/allAccount'],
	'user:add': ['/user/add'],
	'user:reset-send': ['/user/resetSendCount'],
	'user:set-pwd': ['/user/setPwd'],
	'user:set-status': ['/user/setStatus', '/user/restore'],
	'user:set-type': ['/user/setType'],
	'user:delete': ['/user/delete','/user/deleteAccount'],
	'user:set-account-avatar': ['/user/setAccountAvatar', '/user/setUserAvatar'],
	'all-email:query': ['/allEmail/list','/allEmail/latest'],
	'all-email:delete': ['/allEmail/delete','/allEmail/batchDelete'],
	'setting:query': ['/setting/query'],
	'setting:set': ['/setting/set', '/setting/setBackground','/setting/deleteBackground','/setting/setBlacklist'],
	'analysis:query': ['/analysis/echarts'],
	'reg-key:add': ['/regKey/add'],
	'reg-key:query': ['/regKey/list','/regKey/history'],
	'reg-key:delete': ['/regKey/delete','/regKey/clearNotUse'],
};

app.use('*', async (c, next) => {

	const path = c.req.path;

	const index = exclude.findIndex(item => {
		return path.startsWith(item);
	});

	if (index > -1) {
		return await next();
	}

	if (path.startsWith('/public')) {

		const userPublicToken = await c.env.kv.get(KvConst.PUBLIC_KEY);
		const publicToken = c.req.header(constant.TOKEN_HEADER);
		if (publicToken !== userPublicToken) {
			throw new BizError(t('publicTokenFail'), 401);
		}
		return await next();
	}


	const auth = await resolveAuth(c);

	if (!auth) {
		throw new BizError(t('authExpired'), 401);
	}

	if (auth.user.externalAccess && isExternalWriteBlocked(path, c.req.method)) {
		throw new BizError(t('unauthorized'), 403);
	}

	const permIndex = requirePerms.findIndex(item => {
		return path.startsWith(item);
	});

	if (permIndex > -1) {

		const permKeys = auth.user.externalAccess ? EXTERNAL_ACCESS_PERM_KEYS : await permService.userPermKeys(c, auth.user.userId);

		const userPaths = permKeyToPaths(permKeys);

		const userPermIndex = userPaths.findIndex(item => {
			return path.startsWith(item);
		});

		if (userPermIndex === -1 && auth.user.email !== c.env.admin) {
			throw new BizError(t('unauthorized'), 403);
		}

	}

	if (auth.authType === ACCESS_AUTH_TYPE.JWT) {
		const { authInfo, userId } = auth;
		const refreshTime = dayjs(authInfo.refreshTime).startOf('day');
		const nowTime = dayjs().startOf('day')

		if (!nowTime.isSame(refreshTime)) {
			authInfo.refreshTime = dayjs().toISOString();
			await userService.updateUserInfo(c, authInfo.user.userId);
			await c.env.kv.put(KvConst.AUTH_INFO + userId, JSON.stringify(authInfo), { expirationTtl: constant.TOKEN_EXPIRE });
		}
	}

	c.set('user', auth.user)

	return await next();
});

async function resolveAuth(c) {
	const accessEmail = await accessEmailFromHeaders(name => c.req.header(name), c.env);
	const jwtAuth = await resolveJwtAuth(c, Boolean(accessEmail));
	if (jwtAuth) {
		return jwtAuth;
	}

	return resolveCloudflareAccessAuth(c, accessEmail);
}

async function resolveJwtAuth(c, allowAccessFallback = false) {
	const jwt = c.req.header(constant.TOKEN_HEADER);
	const result = await jwtUtils.verifyToken(c, jwt);

	if (!result) {
		return null;
	}

	const { userId, token } = result;
	const authInfo = await c.env.kv.get(KvConst.AUTH_INFO + userId, { type: 'json' });

	if (!authInfo) {
		if (allowAccessFallback) {
			return null;
		}
		throw new BizError(t('authExpired'), 401);
	}

	if (!authInfo.tokens.includes(token)) {
		if (allowAccessFallback) {
			return null;
		}
		throw new BizError(t('authExpired'), 401);
	}

	return {
		authType: ACCESS_AUTH_TYPE.JWT,
		authInfo,
		token,
		userId,
		user: authInfo.user
	};
}

async function resolveCloudflareAccessAuth(c, accessEmail = null) {
	if (!accessEmail) {
		return null;
	}

	const userRow = await userService.selectByEmail(c, accessEmail);

	if (userRow?.status === userConst.status.BAN) {
		throw new BizError(t('isBanUser'), 403);
	}

	if (userRow && isInternalAccessEmail(userRow.email, c.env.domain, c.env.admin)) {
		return {
			authType: ACCESS_AUTH_TYPE.CLOUDFLARE_ACCESS,
			user: {
				...userRow,
				authType: ACCESS_AUTH_TYPE.CLOUDFLARE_ACCESS
			}
		};
	}

	return {
		authType: ACCESS_AUTH_TYPE.CLOUDFLARE_ACCESS,
		user: createExternalAccessUser(accessEmail)
	};
}

export function permKeyToPaths(permKeys) {

	const paths = [];

	for (const key of permKeys) {
		const routeList = premKey[key];
		if (routeList && Array.isArray(routeList)) {
			paths.push(...routeList);
		}
	}
	return paths;
}
