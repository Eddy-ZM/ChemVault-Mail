import http from '@/axios/index.js';

export function loginUserInfo(config = {}) {
    return http.get('/my/loginUserInfo', config)
}

export function userDelete() {
    return http.delete('/my/delete')
}

export function mailClientConfig() {
    return http.get('/my/mail-client/config')
}

export function createMailClientAppPassword(params) {
    return http.post('/my/mail-client/app-passwords', params)
}

export function revokeMailClientAppPassword(id) {
    return http.put(`/my/mail-client/app-passwords/${id}/revoke`)
}
