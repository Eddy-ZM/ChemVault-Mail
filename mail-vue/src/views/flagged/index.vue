<template>
  <emailScroll
      type="flagged"
      ref="scroll"
      :getEmailList="getEmailList"
      :emailDelete="emailDelete"
      :email-archive="emailArchive"
      :email-flag="emailFlag"
      :email-category="emailCategory"
      :category-list="categories"
      :email-read="emailRead"
      :star-add="starAdd"
      :star-cancel="starCancel"
      :cancel-success="cancelStar"
      :star-success="addStar"
      :show-unread="true"
      actionLeft="4px"
      @jump="jumpContent"
  />
</template>

<script setup>
import emailScroll from "@/components/email-scroll/index.vue"
import {emailArchive, emailCategory, emailCategories, emailDelete, emailFlag, emailList, emailRead} from "@/request/email.js";
import {starAdd, starCancel} from "@/request/star.js";
import {useAccountStore} from "@/store/account.js";
import {useEmailStore} from "@/store/email.js";
import {defineOptions, onMounted, ref, watch} from "vue";
import router from "@/router/index.js";

defineOptions({
  name: 'flagged'
})

const scroll = ref({})
const categories = ref([])
const accountStore = useAccountStore();
const emailStore = useEmailStore();

onMounted(() => {
  loadCategories()
})

watch(() => accountStore.currentAccountId, () => {
  scroll.value.refreshList();
})

function loadCategories() {
  emailCategories().then(data => {
    categories.value = data || []
  })
}

function jumpContent(email) {
  emailStore.contentData.email = email
  emailStore.contentData.delType = 'logic'
  emailStore.contentData.showUnread = true
  emailStore.contentData.showStar = true
  emailStore.contentData.showReply = true
  router.push('/message')
}

function addStar(email) {
  emailStore.starScroll?.addItem(email)
}

function cancelStar(email) {
  emailStore.starScroll?.deleteEmail([email.emailId])
}

function getEmailList(emailId, size) {
  const accountId = accountStore.currentAccountId;
  const allReceive = accountStore.currentAccount.allReceive;
  return emailList(accountId, allReceive, emailId, 0, size, 0, { folder: 'flagged' }).then(data => {
    loadCategories()
    return data;
  })
}
</script>
