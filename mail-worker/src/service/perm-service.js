import orm from '../entity/orm';
import perm from '../entity/perm';
import { eq, ne, and, asc } from 'drizzle-orm';
import rolePerm from '../entity/role-perm';
import user from '../entity/user';
import role from '../entity/role';
import { permConst } from '../const/entity-const';
import { t } from '../i18n/i18n'

const avatarPerms = [
	{ name: '邮箱头像修改', permKey: 'account:set-avatar', pid: 21, type: 2, sort: 3 },
	{ name: '用户邮箱头像修改', permKey: 'user:set-account-avatar', pid: 6, type: 2, sort: 8 }
];

const filesRootPerm = { name: 'ChemVault Files', permKey: 'files', pid: 0, type: 1, sort: 7 };
const filesPerms = [
	{ name: '文件查看', permKey: 'files:read', type: 2, sort: 0 },
	{ name: '文件写入', permKey: 'files:write', type: 2, sort: 1 },
	{ name: '文件删除', permKey: 'files:delete', type: 2, sort: 2 },
	{ name: '文件分享', permKey: 'files:share', type: 2, sort: 3 },
	{ name: '文件权限管理', permKey: 'files:manage', type: 2, sort: 4 }
];

export async function ensureAvatarPerms(c) {
	const promises = avatarPerms.map(item => c.env.db.prepare(`
		INSERT INTO perm (name, perm_key, pid, type, sort)
		SELECT ?, ?, ?, ?, ?
		WHERE NOT EXISTS (SELECT 1 FROM perm WHERE perm_key = ?)
	`).bind(item.name, item.permKey, item.pid, item.type, item.sort, item.permKey).run());

	await Promise.all(promises);
}

export async function ensureFilesPerms(c) {
	await c.env.db.prepare(`
		INSERT INTO perm (name, perm_key, pid, type, sort)
		SELECT ?, ?, ?, ?, ?
		WHERE NOT EXISTS (SELECT 1 FROM perm WHERE perm_key = ?)
	`).bind(filesRootPerm.name, filesRootPerm.permKey, filesRootPerm.pid, filesRootPerm.type, filesRootPerm.sort, filesRootPerm.permKey).run();

	const promises = filesPerms.map(item => c.env.db.prepare(`
		INSERT INTO perm (name, perm_key, pid, type, sort)
		SELECT ?, ?, parent.perm_id, ?, ?
		FROM perm parent
		WHERE parent.perm_key = 'files'
			AND NOT EXISTS (SELECT 1 FROM perm WHERE perm_key = ?)
	`).bind(item.name, item.permKey, item.type, item.sort, item.permKey).run());

	await Promise.all(promises);
}

const permService = {
	async tree(c) {
		await ensureAvatarPerms(c);
		await ensureFilesPerms(c);

		const pList = await orm(c).select().from(perm).where(eq(perm.pid, 0)).orderBy(asc(perm.sort)).all();
		const cList = await orm(c).select().from(perm).where(ne(perm.pid, 0)).orderBy(asc(perm.sort)).all();

		cList.forEach(cItem => {
			cItem.name = t('perms.' + cItem.name)
		})

		pList.forEach(pItem => {
			pItem.name = t('perms.' + pItem.name)
			pItem.children = cList.filter(cItem => cItem.pid === pItem.permId)
		})
		return pList;
	},

	async userPermKeys(c, userId) {
		const userPerms = await orm(c).select({permKey: perm.permKey}).from(user)
			.leftJoin(role, eq(role.roleId,user.type))
			.rightJoin(rolePerm, eq(rolePerm.roleId,role.roleId))
			.leftJoin(perm, eq(rolePerm.permId,perm.permId))
			.where(and(eq(user.userId,userId),eq(perm.type,permConst.type.BUTTON)))
			.all();
		return userPerms.map(perm => perm.permKey);
	},

	async rolePermKeys(c, roleId) {
		const normalizedRoleId = Number(roleId);
		if (!Number.isInteger(normalizedRoleId) || normalizedRoleId <= 0) {
			return [];
		}

		const { results = [] } = await c.env.db.prepare(`
			SELECT p.perm_key
			FROM role_perm rp
			LEFT JOIN perm p ON rp.perm_id = p.perm_id
			WHERE rp.role_id = ? AND p.type = ${permConst.type.BUTTON}
		`).bind(normalizedRoleId).all();

		return results.map(row => row.perm_key).filter(Boolean);
	}
}

export default permService
