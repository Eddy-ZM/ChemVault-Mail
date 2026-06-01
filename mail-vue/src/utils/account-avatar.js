import {cvtR2Url} from "@/utils/convert.js";

const AVATAR_TYPE = {
  INITIAL: 'initial',
  LOGO: 'logo',
  CUSTOM: 'custom'
};

export function getAccountInitial(account) {
  const source = (account?.name || account?.email || '').trim();
  const name = source.includes('@') ? source.split('@')[0] : source;
  return (name.charAt(0) || '?').toUpperCase();
}

export function resolveAccountAvatar(account) {
  const avatarType = account?.avatarType || AVATAR_TYPE.INITIAL;

  if (avatarType === AVATAR_TYPE.LOGO) {
    return {type: 'image', src: '/mail.png'};
  }

  if (avatarType === AVATAR_TYPE.CUSTOM && account?.avatar) {
    return {type: 'image', src: cvtR2Url(account.avatar)};
  }

  return {type: 'initial', text: getAccountInitial(account)};
}

export {AVATAR_TYPE};
