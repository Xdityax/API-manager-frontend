export const ROLE_ADMIN = 'admin'
export const ROLE_PROVIDER = 'owner'
export const ROLE_CONSUMER = 'consumer'

export const normalizeRole = (role) => {
  if (role === 'provider') return ROLE_PROVIDER
  return role
}

export const getRoleLabel = (role) => {
  const normalized = normalizeRole(role)

  if (normalized === ROLE_ADMIN) return 'Admin'
  if (normalized === ROLE_PROVIDER) return 'API Provider'
  if (normalized === ROLE_CONSUMER) return 'Consumer'
  return 'User'
}

export const getDashboardPathForRole = (role) => {
  const normalized = normalizeRole(role)

  if (normalized === ROLE_ADMIN) return '/admin/dashboard'
  if (normalized === ROLE_PROVIDER) return '/provider/dashboard'
  if (normalized === ROLE_CONSUMER) return '/consumer/dashboard'
  return '/signin'
}

export const isAllowedRole = (role, allowedRoles = []) => {
  const normalized = normalizeRole(role)
  return allowedRoles.includes(normalized)
}
