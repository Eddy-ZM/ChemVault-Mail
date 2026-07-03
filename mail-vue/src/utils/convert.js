import {useSettingStore} from "@/store/setting.js";
export function cvtR2Url(key) {

    if (!key) {
        return ''
    }

    if (/^(https?:|data:|blob:)/.test(key)) {
        return key
    }

    const { settings } = useSettingStore();

    let domain = settings.r2Domain

    if (!domain) {
        return toDesktopPublicUrl(key);
    }

    if (!domain.startsWith('http')) {
        return 'https://' + domain + '/' + key
    }

    if (domain.endsWith("/")) {
        domain = domain.slice(0, -1);
    }
    return domain + '/' + key
}

function toDesktopPublicUrl(key) {
    if (import.meta.env.VITE_DESKTOP !== 'true') {
        return key;
    }

    const publicOrigin = getDesktopPublicOrigin();
    if (!publicOrigin) {
        return key;
    }

    return `${publicOrigin}/${key.replace(/^\/+/, '')}`;
}

function getDesktopPublicOrigin() {
    const baseUrl = import.meta.env.VITE_PUBLIC_SITE_URL || import.meta.env.VITE_BASE_URL;

    if (!baseUrl) {
        return '';
    }

    try {
        const parsed = new URL(baseUrl);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
            return parsed.origin;
        }
    } catch (error) {
        return '';
    }

    return '';
}

export function toOssDomain(domain) {

    if (!domain) {
        return ''
    }

    if (!domain.startsWith('http')) {
        return 'https://' + domain
    }

    if (domain.endsWith("/")) {
        domain = domain.slice(0, -1);
    }

    return domain
}
