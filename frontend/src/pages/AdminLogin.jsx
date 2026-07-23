import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, Form, Input, Button, Alert, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import client from '../api/client'
import useAuthStore from '../store/authStore'

const { Title, Text } = Typography

export default function AdminLogin() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, token, role } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (token && role === 'admin') navigate('/admin/dashboard')
  }, [token, role, navigate])

  async function onFinish(values) {
    setLoading(true)
    setError('')
    try {
      const r = await client.post('/auth/admin/login', values)
      login(r.data.token, r.data.admin, 'admin')
      navigate('/admin/dashboard')
    } catch (e) {
      setError(e.response?.data?.detail || 'Неверный логин или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Title level={4} style={{ margin: 0 }}>АО НПО Ангстрем</Title>
          <Text type="secondary">Вход для администратора</Text>
        </div>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Логин" name="username" rules={[{ required: true, message: 'Введите логин' }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item label="Пароль" name="password" rules={[{ required: true, message: 'Введите пароль' }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} showIcon />}
          <Button type="primary" htmlType="submit" block loading={loading}>Войти</Button>
        </Form>
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/"><ArrowLeftOutlined style={{ marginRight: 6 }} />Вернуться на главную</Link>
        </div>
      </Card>
    </div>
  )
}
