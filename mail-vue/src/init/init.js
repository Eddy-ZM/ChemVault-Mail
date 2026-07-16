import {useUserStore} from "@/store/user.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {loginUserInfo} from "@/request/my.js";
import {permsToRouter} from "@/perm/perm.js";
import router from "@/router";
import {websiteConfig} from "@/request/setting.js";
import i18n from "@/i18n/index.js";

const fallbackWebsiteConfig = {
    title: 'ChemVault Mail',
    domainList: ['@chemvault.science'],
    register: 1,
    loginDomain: 1,
    minEmailPrefix: 1,
    loginOpacity: 1,
    loginDarkenFactor: 0,
    linuxdoSwitch: 0,
    background: ''
};

function normalizeWebsiteConfig(setting) {
    const merged = {...fallbackWebsiteConfig, ...(setting || {})};
    merged.domainList = Array.isArray(merged.domainList) && merged.domainList.length > 0
        ? merged.domainList
        : fallbackWebsiteConfig.domainList;
    return merged;
}

function isLocalReleasePreview() {
    return import.meta.env.VITE_APP_ENV === 'release'
        && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
}

export async function init() {
    document.title = '\u200B'

    const settingStore = useSettingStore();
    const userStore = useUserStore();
    const accountStore = useAccountStore();

    const token = localStorage.getItem('token');
    if (!settingStore.lang) {
        let lang = navigator.language.split('-')[0]
        lang = lang === 'zh' ? lang : 'en'
        settingStore.lang = lang
    }

    i18n.global.locale.value = settingStore.lang

    let setting = null;

    if (isLocalReleasePreview()) {
        setting = normalizeWebsiteConfig(null);
        settingStore.settings = setting;
        settingStore.domainList = setting.domainList;
        document.title = setting.title;
        return;
    }

    const userPromise = loginUserInfo({ noMsg: true }).catch(e => {
        if (token) {
            console.error(e);
        }
        return null;
    });

    const settingPromise = websiteConfig({ noMsg: true }).catch(e => {
        console.warn('ChemVault Mail config unavailable; using safe defaults.', e);
        return null;
    });

    const [s, user] = await Promise.all([settingPromise, userPromise]);
    setting = normalizeWebsiteConfig(s);
    settingStore.settings = setting;
    settingStore.domainList = setting.domainList;
    document.title = setting.title;

    if (user) {
        accountStore.currentAccountId = user.account?.accountId || 0;
        accountStore.currentAccount = user.account || {};
        userStore.user = user;

        const routers = permsToRouter(user.permKeys || []);
        routers.forEach(routerData => {
            if (!router.hasRoute(routerData.name)) {
                router.addRoute('layout', routerData);
            }
        });
    }
}
