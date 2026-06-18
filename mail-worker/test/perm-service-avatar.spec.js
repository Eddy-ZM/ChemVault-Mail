import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prepare, bind, run, all, select } = vi.hoisted(() => ({
	prepare: vi.fn(),
	bind: vi.fn(),
	run: vi.fn(),
	all: vi.fn(),
	select: vi.fn()
}));

vi.mock('../src/entity/orm.js', () => ({
	default: () => ({
		select
	})
}));

vi.mock('../src/i18n/i18n.js', () => ({
	t: (key) => key.replace('perms.', '')
}));

function query(rows) {
	return {
		from() {
			return this;
		},
		where() {
			return this;
		},
		orderBy() {
			return {
				all: vi.fn().mockResolvedValue(rows)
			};
		}
	};
}

describe('perm service supplemental permissions', () => {
	let permService;
	const c = { env: { db: { prepare } } };

	beforeEach(async () => {
		vi.clearAllMocks();
		run.mockResolvedValue();
		all.mockResolvedValue({ results: [] });
		bind.mockReturnValue({ run, all });
		prepare.mockReturnValue({ bind });
		select
			.mockReturnValueOnce(query([
				{ permId: 21, name: '邮箱侧栏' },
				{ permId: 103, name: 'ChemVault Files' }
			]))
			.mockReturnValueOnce(query([
				{ permId: 101, name: '邮箱头像修改', permKey: 'account:set-avatar', pid: 21, type: 2, sort: 3 },
				{ permId: 102, name: '用户邮箱头像修改', permKey: 'user:set-account-avatar', pid: 6, type: 2, sort: 8 },
				{ permId: 103, name: 'ChemVault Files', permKey: 'files', pid: 0, type: 1, sort: 7 },
				{ permId: 104, name: '文件查看', permKey: 'files:read', pid: 103, type: 2, sort: 0 },
				{ permId: 105, name: '文件写入', permKey: 'files:write', pid: 103, type: 2, sort: 1 },
				{ permId: 106, name: '文件删除', permKey: 'files:delete', pid: 103, type: 2, sort: 2 },
				{ permId: 107, name: '文件分享', permKey: 'files:share', pid: 103, type: 2, sort: 3 },
				{ permId: 108, name: '文件权限管理', permKey: 'files:manage', pid: 103, type: 2, sort: 4 }
			]));
		permService = (await import('../src/service/perm-service.js')).default;
	});

	it('ensures avatar and ChemVault Files permissions exist before returning the role tree', async () => {
		const tree = await permService.tree(c);

		expect(prepare).toHaveBeenCalledTimes(8);
		expect(bind).toHaveBeenCalledWith('邮箱头像修改', 'account:set-avatar', 21, 2, 3, 'account:set-avatar');
		expect(bind).toHaveBeenCalledWith('用户邮箱头像修改', 'user:set-account-avatar', 6, 2, 8, 'user:set-account-avatar');
		expect(bind).toHaveBeenCalledWith('ChemVault Files', 'files', 0, 1, 7, 'files');
		expect(bind).toHaveBeenCalledWith('文件查看', 'files:read', 2, 0, 'files:read');
		expect(bind).toHaveBeenCalledWith('文件写入', 'files:write', 2, 1, 'files:write');
		expect(bind).toHaveBeenCalledWith('文件删除', 'files:delete', 2, 2, 'files:delete');
		expect(bind).toHaveBeenCalledWith('文件分享', 'files:share', 2, 3, 'files:share');
		expect(bind).toHaveBeenCalledWith('文件权限管理', 'files:manage', 2, 4, 'files:manage');
		expect(run).toHaveBeenCalledTimes(8);
		expect(tree[0].children.map(item => item.permKey)).toContain('account:set-avatar');
		const filesNode = tree.find(item => item.name === 'ChemVault Files');
		expect(filesNode.children.map(item => item.permKey)).toEqual([
			'files:read',
			'files:write',
			'files:delete',
			'files:share',
			'files:manage'
		]);
	});

	it('returns button permission keys for a configured role', async () => {
		all.mockResolvedValue({
			results: [
				{ perm_key: 'all-email:query' },
				{ perm_key: 'all-email:delete' },
				{ perm_key: 'email:send' },
				{ perm_key: '' },
				{ perm_key: null }
			]
		});

		const keys = await permService.rolePermKeys(c, 12);

		expect(prepare).toHaveBeenCalledWith(expect.stringContaining('FROM role_perm'));
		expect(bind).toHaveBeenCalledWith(12);
		expect(keys).toEqual(['all-email:query', 'all-email:delete', 'email:send']);
	});
});
