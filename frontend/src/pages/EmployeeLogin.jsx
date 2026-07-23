import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, Form, Input, Button, Select, Alert, Typography, Divider } from 'antd'
import { ArrowRightOutlined } from '@ant-design/icons'
import client from '../api/client'
import useAuthStore from '../store/authStore'

const { Title, Text } = Typography

export default function EmployeeLogin() {
  const [departments, setDepartments] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, token, role } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (token && role === 'employee') navigate('/employee/tests')
    if (token && role === 'admin') navigate('/admin/dashboard')
  }, [token, role, navigate])

  useEffect(() => {
    client.get('/departments').then((r) => setDepartments(r.data))
  }, [])

  async function onFinish(values) {
    setLoading(true)
    setError('')
    try {
      const r = await client.post('/auth/employee/identify', values)
      login(r.data.token, r.data.employee, 'employee')
      navigate('/employee/tests')
    } catch (e) {
      setError(e.response?.data?.detail || 'Сотрудник не найден. Обратитесь к специалисту отдела развития.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Title level={3} style={{ margin: 0 }}>АО НПО Ангстрем</Title>
          <Text type="secondary">Система учёта качества обучения</Text>
        </div>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Фамилия" name="last_name" rules={[{ required: true, message: 'Введите фамилию' }]}>
            <Input placeholder="Например: Петров" />
          </Form.Item>
          <Form.Item label="Имя" name="first_name" rules={[{ required: true, message: 'Введите имя' }]}>
            <Input placeholder="Например: Сергей" />
          </Form.Item>
          <Form.Item label="Подразделение" name="department" rules={[{ required: true, message: 'Выберите подразделение' }]}>
            <Select placeholder="Выберите подразделение" showSearch optionFilterProp="children">
              {departments.map((d) => <Select.Option key={d} value={d}>{d}</Select.Option>)}
            </Select>
          </Form.Item>

          {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} showIcon />}

          <Button type="primary" htmlType="submit" block size="large" loading={loading} icon={<ArrowRightOutlined />} iconPosition="end">
            Войти
          </Button>
        </Form>

        <Divider />
        <div style={{ textAlign: 'center' }}>
          <Link to="/admin/login">
            <Text type="secondary" style={{ fontSize: 13 }}>Вход для администратора</Text>
          </Link>
        </div>
      </Card>
    </div>
  )
}
