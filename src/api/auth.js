import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const authApi = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const registerUser = async (payload) => {
  const { data } = await authApi.post('/register', payload)
  return data
}

export const loginUser = async (payload) => {
  const { data } = await authApi.post('/login', payload)
  return data
}

export const getMe = async (token) => {
  const { data } = await authApi.get('/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return data
}
