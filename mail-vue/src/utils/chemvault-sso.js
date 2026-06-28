const CHEMVAULT_USER_SSO = 'chemvault-user'

export function chemVaultSsoAuthorizeUrlFromSearch(search) {
  return chemVaultSsoAuthorizeUrlFromParams(new URLSearchParams(search || ''))
}

export function chemVaultSsoAuthorizeUrlFromQuery(query) {
  if (!hasChemVaultSsoContext(singleQueryValue(query?.sso), singleQueryValue(query?.redirect_uri), singleQueryValue(query?.return_to))) return ''

  const params = new URLSearchParams()
  setIfPresent(params, 'client_id', singleQueryValue(query?.client_id))
  setIfPresent(params, 'redirect_uri', singleQueryValue(query?.redirect_uri))
  setIfPresent(params, 'return_to', singleQueryValue(query?.return_to))
  return ssoAuthorizePath(params)
}

function chemVaultSsoAuthorizeUrlFromParams(source) {
  if (!hasChemVaultSsoContext(source.get('sso'), source.get('redirect_uri'), source.get('return_to'))) return ''

  const params = new URLSearchParams()
  setIfPresent(params, 'client_id', source.get('client_id'))
  setIfPresent(params, 'redirect_uri', source.get('redirect_uri'))
  setIfPresent(params, 'return_to', source.get('return_to'))
  return ssoAuthorizePath(params)
}

function ssoAuthorizePath(params) {
  const query = params.toString()
  return `/api/sso/chemvault-user/authorize${query ? `?${query}` : ''}`
}

function setIfPresent(params, key, value) {
  if (typeof value === 'string' && value.trim()) params.set(key, value)
}

function singleQueryValue(value) {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

function hasChemVaultSsoContext(sso, redirectUri, returnTo) {
  if (sso === CHEMVAULT_USER_SSO) return true
  return Boolean(redirectUri && returnTo)
}
