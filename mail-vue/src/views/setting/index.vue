<template>
  <div class="box">
    <div class="container">
      <div class="title">{{$t('profile')}}</div>
      <div class="item">
        <div>{{$t('username')}}</div>
        <div>
          <span v-if="setNameShow" class="edit-name-input">
            <el-input v-model="accountName"  ></el-input>
            <span class="edit-name" @click="setName">
             {{$t('save')}}
            </span>
          </span>
          <span v-else class="user-name">
            <span >{{ userStore.user.name }}</span>
            <span class="edit-name" @click="showSetName">
             {{$t('change')}}
            </span>
          </span>
        </div>
      </div>
      <div class="item">
        <div>{{$t('emailAccount')}}</div>
        <div>{{ userStore.user.email }}</div>
      </div>
      <div class="item">
        <div>{{$t('accountManagement')}}</div>
        <div class="account-management">
          <span>{{$t('accountManagementDesc')}}</span>
          <el-button type="primary" @click="openUserSystemSettings">{{$t('openUserSystem')}}</el-button>
        </div>
      </div>
    </div>
    <div class="language">
      <div class="title">{{$t('language')}}</div>
      <el-select
          :model-value="langSelect"
          class="language-select"
          placeholder="Select"
          @change="changeLang"
      >
        <el-option label="中文" value="zh" @pointerdown.prevent.stop="changeLang('zh')"/>
        <el-option label="English" value="en" @pointerdown.prevent.stop="changeLang('en')"/>
      </el-select>
    </div>
    <div class="mail-client">
      <div class="title">{{$t('mailClientTitle')}}</div>
      <div class="mail-client-tip">{{$t('mailClientSecurityTip')}}</div>
      <div class="mail-client-config" v-if="mailClient.config">
        <div class="config-panel">
          <div class="config-title">{{$t('incomingMail')}}</div>
          <div class="config-row"><span>{{$t('protocol')}}</span><strong>{{ mailClient.config.incoming.protocol }}</strong></div>
          <div class="config-row"><span>{{$t('server')}}</span><strong>{{ mailClient.config.incoming.host }}</strong></div>
          <div class="config-row"><span>{{$t('port')}}</span><strong>{{ mailClient.config.incoming.port }}</strong></div>
          <div class="config-row"><span>{{$t('security')}}</span><strong>{{ mailClient.config.incoming.security }}</strong></div>
          <div class="config-row"><span>{{$t('username')}}</span><strong>{{ mailClient.config.incoming.username }}</strong></div>
        </div>
        <div class="config-panel">
          <div class="config-title">{{$t('outgoingMail')}}</div>
          <div class="config-row"><span>{{$t('protocol')}}</span><strong>{{ mailClient.config.outgoing.protocol }}</strong></div>
          <div class="config-row"><span>{{$t('server')}}</span><strong>{{ mailClient.config.outgoing.host }}</strong></div>
          <div class="config-row"><span>{{$t('port')}}</span><strong>{{ mailClient.config.outgoing.port }}</strong></div>
          <div class="config-row"><span>{{$t('security')}}</span><strong>{{ mailClient.config.outgoing.security }}</strong></div>
          <div class="config-row"><span>{{$t('username')}}</span><strong>{{ mailClient.config.outgoing.username }}</strong></div>
        </div>
      </div>
      <div class="app-password-create">
        <el-input
            v-model="mailClient.name"
            :placeholder="$t('appPasswordNamePlaceholder')"
            maxlength="80"
            clearable
        />
        <el-button type="primary" :loading="mailClient.creating" @click="createAppPassword">
          {{$t('generateAppPassword')}}
        </el-button>
      </div>
      <div class="one-time-password" v-if="mailClient.oneTimePassword">
        <div>
          <span>{{$t('oneTimePassword')}}</span>
          <strong>{{ mailClient.oneTimePassword }}</strong>
        </div>
        <el-button @click="copyOneTimePassword">{{$t('copy')}}</el-button>
      </div>
      <el-table
          v-if="mailClient.config"
          :data="mailClient.config.appPasswords"
          v-loading="mailClient.loading"
          class="app-password-table"
          size="small"
      >
        <el-table-column prop="name" :label="$t('name')" min-width="160"/>
        <el-table-column prop="emailAddress" :label="$t('emailAccount')" min-width="190"/>
        <el-table-column :label="$t('createdAt')" min-width="160">
          <template #default="{ row }">{{ row.createdAt || '-' }}</template>
        </el-table-column>
        <el-table-column :label="$t('lastUsedAt')" min-width="160">
          <template #default="{ row }">{{ row.lastUsedAt || '-' }}</template>
        </el-table-column>
        <el-table-column :label="$t('status')" width="110">
          <template #default="{ row }">
            <el-tag :type="row.revoked ? 'info' : 'success'">
              {{ row.revoked ? $t('revoked') : $t('active') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('action')" width="110">
          <template #default="{ row }">
            <el-button
                type="danger"
                size="small"
                :disabled="row.revoked"
                @click="revokeAppPassword(row)"
            >
              {{$t('revoke')}}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div class="del-email" v-perm="'my:delete'">
      <div class="title">{{$t('deleteUser')}}</div>
      <div style="color: var(--regular-text-color);">
        {{$t('delAccountMsg')}}
      </div>
      <div>
        <el-button type="primary" @click="deleteConfirm">{{$t('deleteUserBtn')}}</el-button>
      </div>
    </div>
  </div>
</template>
<script setup>
import {reactive, ref, defineOptions, onMounted} from 'vue'
import {
  createMailClientAppPassword,
  mailClientConfig,
  revokeMailClientAppPassword,
  userDelete
} from "@/request/my.js";
import {useUserStore} from "@/store/user.js";
import router from "@/router/index.js";
import {accountSetName} from "@/request/account.js";
import {useAccountStore} from "@/store/account.js";
import {useI18n} from "vue-i18n";
import {useSettingStore} from "@/store/setting.js";

const { t } = useI18n()
const accountStore = useAccountStore()
const settingStore = useSettingStore()
const userStore = useUserStore();
const setNameShow = ref(false)
const accountName = ref(null)
const langSelect = ref(settingStore.lang)
const mailClient = reactive({
  loading: false,
  creating: false,
  name: '',
  oneTimePassword: '',
  config: null,
})
const USER_SYSTEM_DEFAULT_URL = 'https://user.chemvault.science'

defineOptions({
  name: 'setting'
})

onMounted(() => {
  loadMailClientConfig()
})

function loadMailClientConfig() {
  mailClient.loading = true
  mailClientConfig().then(data => {
    mailClient.config = data
  }).finally(() => {
    mailClient.loading = false
  })
}

function createAppPassword() {
  if (!mailClient.name.trim()) {
    ElMessage({
      message: t('appPasswordNameRequired'),
      type: 'error',
      plain: true,
    })
    return
  }

  mailClient.creating = true
  createMailClientAppPassword({
    name: mailClient.name.trim(),
    scopes: ['imap', 'smtp']
  }).then(data => {
    mailClient.oneTimePassword = data.plainAppPassword
    mailClient.name = ''
    loadMailClientConfig()
  }).finally(() => {
    mailClient.creating = false
  })
}

function revokeAppPassword(row) {
  ElMessageBox.confirm(t('revokeAppPasswordConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    revokeMailClientAppPassword(row.id).then(() => {
      loadMailClientConfig()
    })
  })
}

function copyOneTimePassword() {
  navigator.clipboard?.writeText(mailClient.oneTimePassword)
  ElMessage({
    message: t('copySuccessMsg'),
    type: 'success',
    plain: true,
  })
}

function openUserSystemSettings() {
  window.location.assign(userSystemUrl('/settings/security'))
}

function userSystemUrl(path) {
  const base = (import.meta.env.VITE_USER_SYSTEM_URL || USER_SYSTEM_DEFAULT_URL).trim()
  try {
    return new URL(path, base.endsWith('/') ? base : `${base}/`).toString()
  } catch (e) {
    return `${USER_SYSTEM_DEFAULT_URL}${path}`
  }
}

function showSetName() {
  accountName.value = userStore.user.name
  setNameShow.value = true
}

function setName() {

  if (!accountName.value) {
    ElMessage({
      message: t('emptyUserNameMsg'),
      type: 'error',
      plain: true,
    })
    return;
  }

  setNameShow.value = false
  let name = accountName.value

  if (name === userStore.user.name) {
    return
  }

  userStore.user.name = accountName.value

  accountSetName(userStore.user.account.accountId,name).then(() => {
    ElMessage({
      message: t('saveSuccessMsg'),
      type: 'success',
      plain: true,
    })

    accountStore.changeUserAccountName = name

  }).catch(() => {
    userStore.user.name = name
  })
}

function changeLang(lang) {
  let setting = {}
  try {
    setting = JSON.parse(localStorage.getItem('setting') || '{}')
  } catch (e) {
    setting = {}
  }
  localStorage.setItem('setting', JSON.stringify({...setting, lang}))
  window.location.reload()
}

const deleteConfirm = () => {
  ElMessageBox.confirm(t('delAccountConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userDelete().then(() => {
      localStorage.removeItem('token');
      router.replace('/login');
      ElMessage({
        message: t('delSuccessMsg'),
        type: 'success',
        plain: true,
      })
    })
  })
}

</script>
<style scoped lang="scss">
.box {
  padding: 40px 40px;

  @media (max-width: 767px) {
    padding: 30px 30px;
  }

  .title {
    font-size: 18px;
    font-weight: bold;
  }

  .container {
    font-size: 14px;
    display: grid;
    gap: 20px;
    margin-bottom: 40px;

    .item {
      display: grid;
      grid-template-columns: 50px 1fr;
      gap: 140px;
      position: relative;
      .user-name {
        display: grid;
        grid-template-columns: auto 1fr;
        span:first-child {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
      }

      .edit-name-input {
        position: absolute;
        bottom: -6px;
        .el-input {
          width: min(200px,calc(100vw - 222px));
        }
      }

      .edit-name {
        color: #4dabff;
        padding-left: 10px;
        cursor: pointer;
      }

      div.account-management {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px 14px;
        color: var(--regular-text-color);
        overflow: visible;
        white-space: normal;
        text-overflow: clip;
      }

      @media (max-width: 767px) {
        gap: 70px;
      }

      div:first-child {
        font-weight: bold;
      }

      div:last-child {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }
  }

  .language {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 40px;

    .language-select {
      width: 100px;
    }
  }

  .mail-client {
    display: grid;
    gap: 18px;
    margin-bottom: 40px;

    .mail-client-tip {
      color: var(--regular-text-color);
      line-height: 1.6;
      font-size: 14px;
    }

    .mail-client-config {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }
    }

    .config-panel {
      border: 1px solid var(--el-border-color);
      border-radius: 8px;
      padding: 16px;
      display: grid;
      gap: 10px;
      background: var(--el-bg-color);
    }

    .config-title {
      font-weight: 700;
      margin-bottom: 4px;
    }

    .config-row {
      display: grid;
      grid-template-columns: 96px minmax(0, 1fr);
      gap: 12px;
      font-size: 14px;

      span {
        color: var(--regular-text-color);
      }

      strong {
        min-width: 0;
        overflow-wrap: anywhere;
      }
    }

    .app-password-create {
      display: grid;
      grid-template-columns: minmax(220px, 360px) auto;
      gap: 12px;
      justify-content: start;

      @media (max-width: 767px) {
        grid-template-columns: 1fr;
      }
    }

    .one-time-password {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border: 1px solid var(--el-color-warning-light-5);
      background: var(--el-color-warning-light-9);
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 14px;

      strong {
        display: block;
        margin-top: 4px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        overflow-wrap: anywhere;
      }
    }

    .app-password-table {
      max-width: 100%;
    }
  }

  .del-email {
    font-size: 14px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
}
</style>
