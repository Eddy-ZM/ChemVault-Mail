import http from '@/axios/index.js';

export function emailList(accountId, allReceive, emailId, timeSort, size, type, options = {}) {
    return http.get('/email/list', {params: {accountId, allReceive, emailId, timeSort, size, type, ...options}})
}

export function emailDelete(emailIds) {
    return http.delete('/email/delete?emailIds=' + emailIds)
}

export function emailLatest(emailId, accountId, allReceive) {
    return http.get('/email/latest', {params: {emailId, accountId, allReceive}, noMsg: true, timeout: 35 * 1000})
}

export function emailRead(emailIds) {
    return http.put('/email/read', {emailIds})
}

export function emailFlag(emailIds, flagged = 1) {
    return http.put('/email/flag', {emailIds, flagged})
}

export function emailArchive(emailIds, archived = 1) {
    return http.put('/email/archive', {emailIds, archived})
}

export function emailCategory(emailIds, category = '') {
    return http.put('/email/category', {emailIds, category})
}

export function emailCategories() {
    return http.get('/email/categories')
}

export function emailSend(form,progress) {
    return http.post('/email/send', form,{
        onUploadProgress: (e) => {
            progress(e)
        },
        noMsg: true
    })
}
