import BizError from '../error/biz-error';
import { accountConst } from '../const/entity-const';
import { t } from '../i18n/i18n';
import fileUtils from '../utils/file-utils';
import constant from '../const/constant';
import r2Service from './r2-service';

const validAvatarType = new Set(Object.values(accountConst.avatarType));
const imageDataUrlReg = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;
const imageUrlReg = /^https?:\/\//i;

const accountAvatarService = {
	async normalize(c, params) {
		const avatarType = params.avatarType || accountConst.avatarType.INITIAL;

		if (!validAvatarType.has(avatarType)) {
			throw new BizError(t('invalidAvatarType'));
		}

		if (avatarType !== accountConst.avatarType.CUSTOM) {
			return { avatarType, avatar: '' };
		}

		const avatar = (params.avatar || '').trim();

		if (!avatar) {
			throw new BizError(t('emptyAvatar'));
		}

		if (imageUrlReg.test(avatar)) {
			return { avatarType, avatar };
		}

		if (!imageDataUrlReg.test(avatar)) {
			throw new BizError(t('invalidAvatar'));
		}

		const file = fileUtils.base64ToFile(avatar, 'avatar');
		const arrayBuffer = await file.arrayBuffer();
		const key = constant.AVATAR_PREFIX + await fileUtils.getBuffHash(arrayBuffer) + fileUtils.getExtFileName(file.name);

		await r2Service.putObj(c, key, arrayBuffer, {
			contentType: file.type,
			cacheControl: 'public, max-age=31536000, immutable',
			contentDisposition: `inline; filename="${file.name}"`
		});

		return { avatarType, avatar: key };
	}
};

export default accountAvatarService;
