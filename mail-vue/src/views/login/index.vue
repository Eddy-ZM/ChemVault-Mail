<template>
  <div id="login-box" :style=" background ? 'background: var(--el-bg-color)' : ''">
    <div id="background-wrap" v-if="!settingStore.settings.background" class="logo-wallpaper" aria-hidden="true">
      <img class="logo-wallpaper-image" :src="mailLogoSrc" alt="">
    </div>
    <div v-else :style="background"></div>
    <Transition name="auth-stage">
      <div v-if="authenticating" class="auth-overlay" :data-auth-source="authExperience.key" role="status" aria-live="polite">
        <div class="auth-panel">
          <div class="auth-visual" :class="`auth-visual--${authExperience.visual}`" aria-hidden="true">
            <div class="auth-ring"></div>
            <svg v-if="authExperience.visual === 'files'" class="auth-folder" viewBox="0 0 36 36" aria-hidden="true">
              <path d="M5.5 13A3.5 3.5 0 0 1 9 9.5h6.3l3.1 3H27A3.5 3.5 0 0 1 30.5 16v9A3.5 3.5 0 0 1 27 28.5H9A3.5 3.5 0 0 1 5.5 25V13Z" fill="currentColor" opacity=".16" />
              <path d="M6.8 14.5h11.7l2.9 3H29M9 28h18a2 2 0 0 0 2-2v-8.5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2V26a2 2 0 0 0 2 2Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M13 21h10M13 24h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
            <Icon v-else class="auth-mail" :icon="authExperience.icon" width="36" height="36" />
            <Icon class="auth-key" icon="solar:key-minimalistic-bold-duotone" width="24" height="24" />
            <div class="auth-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div class="auth-copy">
            <span class="auth-title">{{ authTitle }}</span>
            <span class="auth-desc">{{ authDesc }}</span>
          </div>
          <div class="auth-progress" aria-hidden="true">
            <span></span>
          </div>
        </div>
      </div>
    </Transition>
    <div class="form-wrapper">
      <div class="container">
        <span class="form-title">ChemVault</span>
        <span class="form-desc" v-if="show === 'login'">{{ $t('loginTitle') }}</span>
        <span class="form-desc" v-else>{{ $t('regTitle') }}</span>
        <div v-show="show === 'login'">
          <el-input :class="!hideLoginDomain ? 'email-input' : ''" v-model="form.email"
                    type="text" :placeholder="$t('emailAccount')" :aria-label="$t('emailAccount')" autocomplete="username">
            <template #append v-if="!hideLoginDomain">
              <div @click.stop="openSelect">
                <el-select
                    v-if="show === 'login'"
                    ref="mySelect"
                    v-model="suffix"
                    :placeholder="$t('select')"
                    :aria-label="$t('emailDomain')"
                    class="select"
                >
                  <el-option
                      v-for="item in domainList"
                      :key="item"
                      :label="item"
                      :value="item"
                  />
                </el-select>
                <div style="color: var(--el-text-color-primary)">
                  <span>{{ suffix }}</span>
                  <Icon class="setting-icon" icon="mingcute:down-small-fill" width="20" height="20"/>
                </div>
              </div>
            </template>
          </el-input>
          <el-input v-model="form.password" :placeholder="$t('password')" :aria-label="$t('password')" type="password" autocomplete="current-password">
          </el-input>
          <el-button class="btn" type="primary" @click="submit" :loading="loginLoading"
          >{{ $t('loginBtn') }}
          </el-button>
          <el-button class="btn" v-if="settingStore.settings.linuxdoSwitch"  style="margin-top: 10px"  @click="linuxDoLogin">
            <el-avatar :src="linuxDoLogoSrc" :size="18" style="margin-right: 10px" />LinuxDo
          </el-button>
        </div>
        <div v-show="canRegister && show !== 'login'">
          <el-input :class="!hideLoginDomain ? 'email-input' : ''" v-model="registerForm.email" type="text" :placeholder="$t('emailAccount')"
                    :aria-label="$t('emailAccount')" autocomplete="username">
            <template #append v-if="!hideLoginDomain">
              <div @click.stop="openSelect">
                <el-select
                    v-if="show !== 'login'"
                    ref="mySelect"
                    v-model="suffix"
                    :placeholder="$t('select')"
                    :aria-label="$t('emailDomain')"
                    class="select"
                >
                  <el-option
                      v-for="item in domainList"
                      :key="item"
                      :label="item"
                      :value="item"
                  />
                </el-select>
                <div>
                  <span>{{ suffix }}</span>
                  <Icon class="setting-icon" icon="mingcute:down-small-fill" width="20" height="20"/>
                </div>
              </div>
            </template>
          </el-input>
          <el-input v-model="registerForm.password" :placeholder="$t('password')" :aria-label="$t('password')" type="password" autocomplete="new-password"/>
          <el-input v-model="registerForm.confirmPassword" :placeholder="$t('confirmPwd')" :aria-label="$t('confirmPwd')" type="password"
                    autocomplete="new-password"/>
          <el-input v-if="settingStore.settings.regKey === 0" v-model="registerForm.code" :placeholder="$t('regKey')" :aria-label="$t('regKey')"
                    type="text" autocomplete="one-time-code"/>
          <el-input v-if="settingStore.settings.regKey === 2" v-model="registerForm.code"
                    :placeholder="$t('regKeyOptional')" :aria-label="$t('regKeyOptional')" type="text" autocomplete="one-time-code"/>
          <div v-show="verifyShow"
               class="register-turnstile"
               :data-sitekey="settingStore.settings.siteKey"
               data-callback="onTurnstileSuccess"
               data-error-callback="onTurnstileError"
               data-after-interactive-callback="loadAfter"
               data-before-interactive-callback="loadBefore"
          >
            <span style="font-size: 12px;color: #F56C6C" v-if="botJsError">{{ $t('verifyModuleFailed') }}</span>
          </div>
          <el-button class="btn" style="margin: 0" type="primary" @click="submitRegister" :loading="registerLoading"
          >{{ $t('regBtn') }}
          </el-button>
          <el-button v-if="settingStore.settings.linuxdoSwitch" class="btn" style="margin-top: 10px"  @click="linuxDoLogin">
            <el-avatar :src="linuxDoLogoSrc" :size="18" style="margin-right: 10px" />LinuxDo
          </el-button>
        </div>
        <template v-if="canRegister">
          <div class="switch" @click="show = 'register'" v-if="show === 'login'">{{ $t('noAccount') }}
            <span>{{ $t('regSwitch') }}</span></div>
          <div class="switch" @click="show = 'login'" v-else>{{ $t('hasAccount') }} <span>{{ $t('loginSwitch') }}</span>
          </div>
        </template>
      </div>
    </div>
    <el-dialog class="bind-dialog" v-model="showBindForm"  title="注册邮箱" >
      <div class="bind-container">
        <el-input :class="!hideLoginDomain ? 'email-input' : ''" v-model="bindForm.email" type="text" :placeholder="$t('emailAccount')" :aria-label="$t('emailAccount')" autocomplete="username">
          <template #append v-if="!hideLoginDomain">
            <div @click.stop="openSelect">
              <el-select
                  ref="mySelect"
                  v-model="suffix"
                  :placeholder="$t('select')"
                  :aria-label="$t('emailDomain')"
                  class="select"
              >
                <el-option
                    v-for="item in domainList"
                    :key="item"
                    :label="item"
                    :value="item"
                />
              </el-select>
              <div>
                <span>{{ suffix }}</span>
                <Icon class="setting-icon" icon="mingcute:down-small-fill" width="20" height="20"/>
              </div>
            </div>
          </template>
        </el-input>
        <el-input v-if="settingStore.settings.regKey === 0" v-model="bindForm.code" :placeholder="$t('regKey')" :aria-label="$t('regKey')"
                  type="text" autocomplete="one-time-code"/>
        <el-input v-if="settingStore.settings.regKey === 2" v-model="bindForm.code"
                  :placeholder="$t('regKeyOptional')" :aria-label="$t('regKeyOptional')" type="text" autocomplete="one-time-code"/>
        <el-button class="btn" type="primary" @click="bind" :loading="bindLoading"
        >绑定
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import router from "@/router";
import {computed, nextTick, reactive, ref, watch} from "vue";
import {login} from "@/request/login.js";
import {register} from "@/request/login.js";
import {websiteConfig} from "@/request/setting.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {useUserStore} from "@/store/user.js";
import {useUiStore} from "@/store/ui.js";
import {Icon} from "@iconify/vue";
import {cvtR2Url} from "@/utils/convert.js";
import {loginUserInfo} from "@/request/my.js";
import {permsToRouter} from "@/perm/perm.js";
import {useI18n} from "vue-i18n";
import {oauthBindUser, oauthLinuxDoLogin} from "@/request/ouath.js";
import {chemVaultSsoAuthorizeUrlFromSearch, chemVaultSsoSourceFromSearch} from "@/utils/chemvault-sso.js";
import {publicAsset} from "@/utils/public-asset.js";

const {t, locale} = useI18n();
const accountStore = useAccountStore();
const userStore = useUserStore();
const uiStore = useUiStore();
const settingStore = useSettingStore();
const loginLoading = ref(false)
const bindLoading = ref(false)
const oauthLoading = ref(false);
const showBindForm = ref(false);
const show = ref('login')
const mailLogoSrc = publicAsset('mail.png');
const linuxDoLogoSrc = publicAsset('image/linuxdo.webp');
const isDesktopApp =
  navigator.userAgent.includes("ChemVaultMail");
const pendingSsoAuthorizeUrl = chemVaultSsoAuthorizeUrlFromSearch(window.location.search);
const pendingSsoSource = chemVaultSsoSourceFromSearch(window.location.search);
const defaultAuthExperience = {
  key: 'mail',
  visual: 'mail',
  icon: 'solar:letter-bold-duotone',
  productName: 'ChemVault Mail',
  zhProductName: 'ChemVault Mail',
  sessionDescription: 'Securing mailbox session',
  zhSessionDescription: '正在建立安全邮箱会话'
};
const authenticating = computed(() => loginLoading.value || oauthLoading.value || bindLoading.value);
const authExperience = computed(() => pendingSsoAuthorizeUrl && pendingSsoSource ? pendingSsoSource : defaultAuthExperience);
const isPendingProductSso = computed(() => Boolean(pendingSsoAuthorizeUrl && pendingSsoSource));
const authTitle = computed(() => {
  if (isPendingProductSso.value) {
    const productName = locale.value === 'zh' ? authExperience.value.zhProductName : authExperience.value.productName;
    return locale.value === 'zh' ? `正在返回 ${productName}` : `Returning to ${productName}`;
  }
  return locale.value === 'zh' ? '正在认证' : 'Authenticating';
});
const authDesc = computed(() => locale.value === 'zh' ? authExperience.value.zhSessionDescription : authExperience.value.sessionDescription);
const canRegister = computed(() => Number(settingStore.settings.register) === 0);
const isLocalReleasePreview = import.meta.env.VITE_APP_ENV === 'release'
    && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

watch(canRegister, (enabled) => {
  if (!enabled && show.value !== 'login') {
    show.value = 'login';
  }
})

watch(() => settingStore.domainList, (list) => {
  if (!suffix.value && list.length > 0) {
    suffix.value = list[0]
  }
})

const bindForm = reactive({
  email: '',
  oauthUserId: '',
  code: ''
})

const form = reactive({
  email: '',
  password: '',

});
const mySelect = ref()
const suffix = ref('')
const registerForm = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  code: null
})
const domainList = computed(() => settingStore.domainList);
const registerLoading = ref(false)
suffix.value = settingStore.domainList[0] || '@chemvault.science'
const verifyShow = ref(false)
let verifyToken = ''
let turnstileId = null
let botJsError = ref(false)
let verifyErrorCount = 0

window.onTurnstileSuccess = (token) => {
  verifyToken = token;
};

window.onTurnstileError = (e) => {
  if (verifyErrorCount >= 4) {
    return
  }
  verifyErrorCount++
  console.warn('人机验加载失败', e)
  setTimeout(() => {
    nextTick(() => {
      if (!turnstileId) {
        turnstileId = window.turnstile.render('.register-turnstile')
      } else {
        window.turnstile.reset(turnstileId);
      }
    })
  }, 1500)
};

window.loadAfter = () => {}

window.loadBefore = () => {}

const loginOpacity = computed(() => {
  const opacity = settingStore.settings.loginOpacity
  return uiStore.dark ? `rgba(0, 0, 0, ${opacity})` : `rgba(255, 255, 255, ${opacity})`
})

const loginDarkenFactor = computed(() => {
  const factor = Number(settingStore.settings.loginDarkenFactor ?? 0)
  if (Number.isNaN(factor)) return 0
  return Math.min(1, Math.max(0, factor))
})

const hideLoginDomain = computed(() => settingStore.settings.loginDomain === 1)

const background = computed(() => {
  const bg = settingStore.settings.background
  if (!bg) return ''
  const bgUrl = cvtR2Url(bg)
  return {
    'background-image': `
      linear-gradient(rgba(0, 0, 0, ${loginDarkenFactor.value}), rgba(0, 0, 0, ${loginDarkenFactor.value})),
      url(${bgUrl})
    `,
    'background-repeat': 'no-repeat, no-repeat',
    'background-size': 'cover, cover',
    'background-position': 'center, center'
  }
})

const openSelect = () => {
  mySelect.value.toggleMenu()
}

const getFullEmail = (email) => {
  return hideLoginDomain.value ? email : email + suffix.value
}

const getEmailName = (email) => {
  return email.split('@')[0]
}

function linuxDoLogin() {
  const clientId = settingStore.settings.linuxdoClientId
  const redirectUri = encodeURIComponent(settingStore.settings.linuxdoCallbackUrl)
  window.location.href =
      `https://connect.linux.do/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid+profile+email`
}

linuxDoGetUser();

async function linuxDoGetUser() {

  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')

  if (!code) {
    return
  }

  oauthLoading.value = true
  oauthLinuxDoLogin(code).then(data => {

      bindForm.oauthUserId = data.userInfo.oauthUserId;

      if (!data.token) {
        showBindForm.value = true
        oauthLoading.value = false
        ElMessage({
          message: '请注册绑定一个邮箱',
          type: 'warning',
          duration: 4000,
          plain: true,
        })
        return;
      }

    saveToken(data.token);
  }).catch(() => {
    oauthLoading.value = false
  })

  cleanLinuxDoCallbackUrl()
}

function bind() {

  if (!bindForm.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }


  if (getEmailName(bindForm.email).length < settingStore.settings.minEmailPrefix) {
    ElMessage({
      message: t('minEmailPrefix', {msg: settingStore.settings.minEmailPrefix}),
      type: 'error',
      plain: true,
    })
    return
  }

  let email = getFullEmail(bindForm.email);


  if (!isEmail(email)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (settingStore.settings.regKey === 0) {

    if (!bindForm.code) {

      ElMessage({
        message: t('emptyRegKeyMsg'),
        type: 'error',
        plain: true,
      })
      return
    }

  }

  const form = {email, oauthUserId: bindForm.oauthUserId, code: bindForm.code}

  bindLoading.value = true
  oauthBindUser(form).then(data => {
    saveToken(data.token)
  }).catch(() => {
    bindLoading.value = false
  })
}

const submit = () => {

  if (!form.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  let email = getFullEmail(form.email);

  if (!isEmail(email)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!form.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  loginLoading.value = true
  login(email, form.password).then(async data => {
    await saveToken(data.token)
  }).finally(() => {
    loginLoading.value = false
  })
}

async function saveToken(token) {
  localStorage.setItem('token', token)
  refreshWebsiteConfig()
  const user = await loginUserInfo();
  accountStore.currentAccountId = user.account.accountId;
  accountStore.currentAccount = user.account;
  userStore.user = user;
  const routers = permsToRouter(user.permKeys || []);
  routers.forEach(routerData => {
    router.addRoute('layout', routerData);
  });
  if (pendingSsoAuthorizeUrl) {
    window.location.replace(pendingSsoAuthorizeUrl)
    return
  }
  await router.replace({name: 'layout'})
  uiStore.showNotice()
  oauthLoading.value = false;
  bindLoading.value = false;
}

function cleanLinuxDoCallbackUrl() {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('code')) return

  params.delete('code')
  params.delete('state')
  const query = params.toString()
  const cleanUrl = `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  window.history.replaceState({}, '', cleanUrl)
}

function refreshWebsiteConfig() {
  if (isLocalReleasePreview) {
    return
  }
  websiteConfig({noMsg: true}).then(setting => {
    settingStore.settings = setting
    settingStore.domainList = Array.isArray(setting.domainList) && setting.domainList.length > 0
        ? setting.domainList
        : ['@chemvault.science']
    if (!suffix.value && settingStore.domainList.length > 0) {
      suffix.value = settingStore.domainList[0]
    }
    document.title = setting.title
  }).catch(e => {
    if (import.meta.env.DEV) {
      console.warn('ChemVault Mail config unavailable on login screen.', e)
    }
  })
}


function submitRegister() {

  if (!canRegister.value) {
    show.value = 'login'
    return
  }

  if (!registerForm.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (getEmailName(registerForm.email).length < settingStore.settings.minEmailPrefix) {
    ElMessage({
      message: t('minEmailPrefix', {msg: settingStore.settings.minEmailPrefix}),
      type: 'error',
      plain: true,
    })
    return
  }

  const email = getFullEmail(registerForm.email);

  if (!isEmail(email)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!registerForm.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (registerForm.password.length < 6) {
    ElMessage({
      message: t('pwdLengthMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (registerForm.password !== registerForm.confirmPassword) {

    ElMessage({
      message: t('confirmPwdFailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (settingStore.settings.regKey === 0) {

    if (!registerForm.code) {

      ElMessage({
        message: t('emptyRegKeyMsg'),
        type: 'error',
        plain: true,
      })
      return
    }

  }

  if (!verifyToken && (settingStore.settings.registerVerify === 0 || (settingStore.settings.registerVerify === 2 && settingStore.settings.regVerifyOpen))) {
    if (!verifyShow.value) {
      verifyShow.value = true
      nextTick(() => {
        if (!turnstileId) {
          try {
            turnstileId = window.turnstile.render('.register-turnstile')
          } catch (e) {
            botJsError.value = true
            console.warn('人机验证js加载失败')
          }
        } else {
          window.turnstile.reset('.register-turnstile')
        }
      })
    } else if (!botJsError.value) {
      ElMessage({
        message: t('botVerifyMsg'),
        type: "error",
        plain: true
      })
    }
    return;
  }

  registerLoading.value = true

  const form = {
    email,
    password: registerForm.password,
    token: verifyToken,
    code: registerForm.code
  }

  register(form).then(({regVerifyOpen}) => {
    show.value = 'login'
    registerForm.email = ''
    registerForm.password = ''
    registerForm.confirmPassword = ''
    registerForm.code = ''
    registerLoading.value = false
    verifyToken = ''
    settingStore.settings.regVerifyOpen = regVerifyOpen
    verifyShow.value = false
    ElMessage({
      message: t('regSuccessMsg'),
      type: 'success',
      plain: true,
    })
  }).catch(res => {

    registerLoading.value = false

    if (res.code === 400) {
      verifyToken = ''
      settingStore.settings.regVerifyOpen = true
      if (turnstileId) {
        window.turnstile.reset(turnstileId)
      } else {
        nextTick(() => {
          turnstileId = window.turnstile.render('.register-turnstile')
        })
      }
      verifyShow.value = true

    }
  });
}

</script>


<style>
.el-select-dropdown__item {
  padding: 0 15px;
}

.no-autofill-pwd {
  .el-input__inner {
    -webkit-text-security: disc !important;
  }
}
</style>

<style lang="scss" scoped>

.form-wrapper {
  position: fixed;
  right: 0;
  height: 100%;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  @media (max-width: 767px) {
    width: 100%;
  }
}

.auth-stage-enter-active,
.auth-stage-leave-active {
  transition:
      opacity var(--motion-duration-base) var(--motion-smooth),
      transform var(--motion-duration-base) var(--motion-smooth);
}

.auth-stage-enter-from,
.auth-stage-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.auth-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(241, 247, 252, 0.66);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

:global(.dark) .auth-overlay {
  background: rgba(10, 12, 14, 0.68);
}

.auth-panel {
  width: min(360px, calc(100vw - 40px));
  padding: 24px;
  border: 1px solid rgba(24, 144, 255, 0.18);
  border-radius: 8px;
  background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 252, 255, 0.86)),
      var(--el-bg-color);
  box-shadow:
      0 24px 70px rgba(24, 87, 140, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

:global(.dark) .auth-panel {
  border-color: rgba(102, 177, 255, 0.18);
  background:
      linear-gradient(180deg, rgba(31, 34, 38, 0.94), rgba(18, 20, 23, 0.88)),
      var(--el-bg-color);
  box-shadow:
      0 24px 70px rgba(0, 0, 0, 0.42),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.auth-visual {
  position: relative;
  display: grid;
  place-items: center;
  height: 116px;
  overflow: hidden;
  border-radius: 8px;
  background-image:
      linear-gradient(rgba(24, 144, 255, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(24, 144, 255, 0.08) 1px, transparent 1px);
  background-size: 22px 22px;
}

:global(.dark) .auth-visual {
  background-image:
      linear-gradient(rgba(102, 177, 255, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(102, 177, 255, 0.08) 1px, transparent 1px);
}

.auth-ring {
  width: 74px;
  height: 74px;
  border: 1px solid rgba(24, 144, 255, 0.26);
  border-radius: 50%;
  animation: auth-ring-pulse 1.8s var(--motion-smooth) infinite;
}

.auth-mail {
  position: absolute;
  color: var(--el-color-primary);
  filter: drop-shadow(0 10px 18px rgba(24, 144, 255, 0.22));
  animation: auth-mail-flight 2.2s var(--motion-smooth) infinite;
}

.auth-folder {
  position: absolute;
  width: 36px;
  height: 36px;
  color: #0071e3;
  filter: drop-shadow(0 10px 18px rgba(0, 113, 227, 0.22));
  animation: auth-folder-scan 2.2s var(--motion-smooth) infinite;
}

.auth-overlay[data-auth-source="files"] .auth-ring {
  border-color: rgba(0, 113, 227, 0.26);
}

.auth-overlay[data-auth-source="files"] .auth-dots span {
  background: #0071e3;
}

.auth-overlay[data-auth-source="files"] .auth-progress {
  background: rgba(0, 113, 227, 0.14);
}

.auth-overlay[data-auth-source="files"] .auth-progress span {
  background: linear-gradient(90deg, #0071e3, #13a8a8);
}

.auth-key {
  position: absolute;
  right: calc(50% - 44px);
  top: 44px;
  color: #13a8a8;
  animation: auth-key-unlock 2.2s var(--motion-smooth) infinite;
}

.auth-dots {
  position: absolute;
  bottom: 14px;
  display: flex;
  gap: 6px;
}

.auth-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-primary);
  opacity: 0.35;
  animation: auth-dot-step 1.2s ease-in-out infinite;
}

.auth-dots span:nth-child(2) {
  animation-delay: 120ms;
}

.auth-dots span:nth-child(3) {
  animation-delay: 240ms;
}

.auth-copy {
  display: grid;
  gap: 4px;
  margin-top: 18px;
  text-align: center;
}

.auth-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--el-text-color-primary);
}

.auth-desc {
  color: var(--form-desc-color);
  font-size: 13px;
  line-height: 1.45;
}

.auth-progress {
  position: relative;
  height: 4px;
  margin-top: 18px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(24, 144, 255, 0.14);
}

.auth-progress span {
  position: absolute;
  inset: 0 auto 0 0;
  width: 42%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--el-color-primary), #13a8a8);
  animation: auth-progress 1.35s ease-in-out infinite;
}

@keyframes auth-mail-flight {
  0% {
    opacity: 0;
    transform: translate3d(-110px, 4px, 0) scale(0.78) rotate(-10deg);
  }
  22% {
    opacity: 1;
  }
  52% {
    transform: translate3d(0, -2px, 0) scale(1) rotate(0deg);
  }
  78% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate3d(110px, -4px, 0) scale(0.82) rotate(10deg);
  }
}

@keyframes auth-folder-scan {
  0% {
    opacity: 0;
    transform: translate3d(0, 12px, 0) scale(0.86);
  }
  22% {
    opacity: 1;
  }
  52% {
    transform: translate3d(0, -2px, 0) scale(1);
  }
  78% {
    opacity: 1;
    transform: translate3d(0, -2px, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate3d(0, -12px, 0) scale(0.9);
  }
}

@keyframes auth-key-unlock {
  0%, 42% {
    opacity: 0;
    transform: translate3d(0, 6px, 0) rotate(-18deg) scale(0.82);
  }
  58%, 82% {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate3d(0, -4px, 0) rotate(8deg) scale(0.88);
  }
}

@keyframes auth-ring-pulse {
  0%, 100% {
    transform: scale(0.9);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

@keyframes auth-dot-step {
  0%, 100% {
    opacity: 0.28;
    transform: translateY(0);
  }
  45% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

@keyframes auth-progress {
  0% {
    transform: translateX(-105%);
  }
  55% {
    transform: translateX(72%);
  }
  100% {
    transform: translateX(245%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-ring,
  .auth-mail,
  .auth-folder,
  .auth-key,
  .auth-dots span,
  .auth-progress span {
    animation-duration: 1ms;
    animation-iteration-count: 1;
  }
}

.container {
  background: v-bind(loginOpacity);
  padding-left: 40px;
  padding-right: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 450px;
  height: 100%;
  border-left: 1px solid var(--login-border);
  box-shadow: var(--el-box-shadow-light);
  @media (max-width: 1024px) {
    padding: 20px 18px;
    width: 384px;
    margin-left: 18px;
  }
  @media (max-width: 767px) {
    border: 1px solid var(--login-border);
    padding: 20px 18px;
    border-radius: 6px;
    height: fit-content;
    width: 100%;
    margin-right: 18px;
    margin-left: 18px;
  }

  .btn {
    height: 36px;
    width: 100%;
    border-radius: 6px;
  }

  .form-desc {
    margin-top: 5px;
    margin-bottom: 18px;
    color: var(--form-desc-color);
  }

  .form-title {
    font-weight: bold;
    font-size: 22px !important;
    width: 100%;
    text-align: center;
  }

  .switch {
    margin-top: 20px;
    text-align: center;

    span {
      color: var(--login-switch-color);
      cursor: pointer;
    }
  }

  :deep(.el-input__wrapper) {
    border-radius: 6px;
    background: var(--el-bg-color);
  }

  .email-input :deep(.el-input__wrapper) {
    border-radius: 6px 0 0 6px;
    background: var(--el-bg-color);
  }

  .el-input {
    height: 38px;
    width: 100%;
    margin-bottom: 18px;

    :deep(.el-input__inner) {
      height: 36px;
    }
  }
}

:deep(.el-select-dropdown__item) {
  padding: 0 10px;
}

:deep(.bind-dialog) {
  width: 400px !important;
  @media (max-width: 440px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

.bind-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

.setting-icon {
  position: relative;
  top: 6px;
}

:deep(.el-input-group__append) {
  padding: 0 !important;
  padding-left: 8px !important;
  padding-right: 4px !important;
  background: var(--el-bg-color);
  border-radius: 0 8px 8px 0;
}

:deep(.el-button+.el-button) {
  margin: 0;
}

.register-turnstile {
  margin-bottom: 18px;
}

.select {
  position: absolute;
  right: 30px;
  width: 100px;
  opacity: 0;
  pointer-events: none;
}

.custom-style {
  margin-bottom: 10px;
}

.custom-style .el-segmented {
  --el-border-radius-base: 6px;
  width: 180px;
}


#login-box {
  position: relative;
  background: var(--el-bg-color);
  font: 100% Arial, sans-serif;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  display: grid;
  grid-template-columns: 1fr;
}

:global(.dark) #login-box {
  background: var(--el-bg-color);
}


#background-wrap {
  position: fixed;
  inset: 0;
  height: 100%;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.logo-wallpaper {
  background: var(--el-bg-color);
}

.logo-wallpaper-image {
  position: absolute;
  top: 50%;
  left: clamp(96px, 28vw, 420px);
  width: min(360px, 38vw);
  max-height: 58vh;
  object-fit: contain;
  opacity: 0.08;
  transform: translate(-50%, -50%);
  user-select: none;
}

:global(.dark) .logo-wallpaper-image {
  opacity: 0.13;
  filter: saturate(0.95) brightness(1.12);
}

@media (max-width: 767px) {
  .logo-wallpaper-image {
    top: 32%;
    left: 50%;
    width: min(220px, 56vw);
    opacity: 0.07;
  }
}

</style>
