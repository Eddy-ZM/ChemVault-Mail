const CHEMVAULT_USER_SSO = 'chemvault-user'
const CHEMVAULT_PRODUCTS = [
  {
    key: 'files',
    visual: 'files',
    icon: 'solar:folder-with-files-bold-duotone',
    productName: 'ChemVault Files',
    zhProductName: 'ChemVault Files',
    sessionDescription: 'Restoring file system session',
    zhSessionDescription: '正在恢复文件系统会话',
    hosts: ['file.chemvault.science', 'files.chemvault.science'],
    pageSuffixes: ['.chemvault-files.pages.dev']
  },
  {
    key: 'app',
    visual: 'app',
    icon: 'solar:widget-5-bold-duotone',
    productName: 'ChemVault App',
    zhProductName: 'ChemVault App',
    sessionDescription: 'Continuing app sign-in',
    zhSessionDescription: '正在继续应用登录',
    hosts: ['app.chemvault.science'],
    pageSuffixes: ['.chemvault-app.pages.dev']
  },
  {
    key: 'docs',
    visual: 'docs',
    icon: 'solar:document-text-bold-duotone',
    productName: 'ChemVault Docs',
    zhProductName: 'ChemVault Docs',
    sessionDescription: 'Continuing document sign-in',
    zhSessionDescription: '正在继续文档登录',
    hosts: ['docs.chemvault.science'],
    pageSuffixes: ['.chemvault-docs.pages.dev']
  },
  {
    key: 'user',
    visual: 'user',
    icon: 'solar:user-id-bold-duotone',
    productName: 'ChemVault User Center',
    zhProductName: 'ChemVault User Center',
    sessionDescription: 'Continuing account sign-in',
    zhSessionDescription: '正在继续账户登录',
    hosts: ['user.chemvault.science'],
    pageSuffixes: ['.chemvault-user.pages.dev']
  }
]

export function chemVaultSsoAuthorizeUrlFromSearch(search) {
  return chemVaultSsoAuthorizeUrlFromParams(new URLSearchParams(search || ''))
}

export function chemVaultSsoSourceFromSearch(search) {
  return chemVaultSsoSourceFromParams(new URLSearchParams(search || ''))
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

function chemVaultSsoSourceFromParams(source) {
  if (!hasChemVaultSsoContext(source.get('sso'), source.get('redirect_uri'), source.get('return_to'))) return null
  return chemVaultProductFromReturnTo(source.get('return_to'))
}

function ssoAuthorizePath(params) {
  const query = params.toString()
  return `/api/sso/chemvault-user/authorize${query ? `?${query}` : ''}`
}

export function chemVaultProductFromReturnTo(returnTo) {
  if (!returnTo || typeof returnTo !== 'string') return null

  try {
    const url = new URL(returnTo)
    return productForHost(url.hostname)
  } catch {
    return null
  }
}

function productForHost(hostname) {
  return CHEMVAULT_PRODUCTS.find((product) =>
    product.hosts.includes(hostname) ||
    product.pageSuffixes.some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix))
  ) || null
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
