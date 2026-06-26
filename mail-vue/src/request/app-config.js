import http from '@/axios/index.js';

export function appConfigQuery() {
    return http.get('/app/admin/config')
}

export function appConfigSet(config) {
    return http.put('/app/admin/config/set', config)
}

export function appTemplatesQuery(params = {}) {
    return http.get('/app/admin/templates', { params })
}

export function appTemplatesSet(params) {
    return http.put('/app/admin/templates/set', params)
}

export function appManifestQuery(params = {}) {
    return http.get('/app/admin/manifest', { params })
}

export function appManifestSet(params) {
    return http.put('/app/admin/manifest/set', params)
}
